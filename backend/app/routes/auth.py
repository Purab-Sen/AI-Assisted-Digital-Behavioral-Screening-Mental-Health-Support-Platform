from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import hmac
import hashlib
import struct
import time
import os
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
    Token,
    LoginRequest,
    PasswordChange
)
from app.services.auth_service import (
    get_user_by_email,
    create_user,
    authenticate_user,
    update_user,
    change_password
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password
)
from app.utils.dependencies import get_current_active_user
from app.models.user import User
from app.models.email_verification import EmailVerification
from app.services import email_service
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# OTP helpers — HOTP (RFC 4226) with time-based counter
# ---------------------------------------------------------------------------

def _hotp(secret: bytes, counter: int, digits: int = 6) -> str:
    """
    Generate HOTP code per RFC 4226 (HMAC-Based One-Time Password).
    Uses HMAC-SHA1 with dynamic truncation to produce a 6-digit code.
    """
    # Step 1: Generate HMAC-SHA1 hash of counter
    counter_bytes = struct.pack(">Q", counter)
    hmac_hash = hmac.new(secret, counter_bytes, hashlib.sha1).digest()

    # Step 2: Dynamic truncation (RFC 4226 Section 5.4)
    offset = hmac_hash[-1] & 0x0F
    truncated = struct.unpack(">I", hmac_hash[offset:offset + 4])[0] & 0x7FFFFFFF

    # Step 3: Compute OTP value
    otp_value = truncated % (10 ** digits)
    return f"{otp_value:0{digits}d}"


def _generate_otp() -> tuple[str, str]:
    """
    Generate a 6-digit OTP using HOTP (RFC 4226) algorithm.
    - Secret: derived from app SECRET_KEY + random nonce (ensures uniqueness)
    - Counter: current Unix timestamp in 30-second steps (TOTP-style, RFC 6238)
    Returns (plain_otp, sha256_hash_of_otp).
    """
    # Derive a unique secret per OTP: SECRET_KEY + 16 random bytes
    nonce = os.urandom(16)
    secret = hmac.new(
        settings.SECRET_KEY.encode(),
        nonce,
        hashlib.sha256,
    ).digest()

    # Time-based counter: Unix time / 30s step (RFC 6238 TOTP approach)
    counter = int(time.time()) // 30

    plain = _hotp(secret, counter)
    digest = hashlib.sha256(plain.encode()).hexdigest()
    return plain, digest


def _invalidate_existing_otps(db: Session, user_id: int) -> None:
    """Mark all unused OTPs for this user as used so only the latest is valid."""
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user_id,
        EmailVerification.is_used == False,
    ).update({"is_used": True})
    db.commit()


def _create_otp_record(db: Session, user_id: int, otp_hash: str) -> EmailVerification:
    record = EmailVerification(
        user_id=user_id,
        otp_hash=otp_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Request / Response schemas (inline — auth-specific)
# ---------------------------------------------------------------------------

class RegisterResponse(BaseModel):
    message: str
    requires_email_verification: bool = True
    email: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = create_user(db, user_data)

    # Generate & send OTP
    plain_otp, otp_hash = _generate_otp()
    _create_otp_record(db, user.id, otp_hash)

    background_tasks.add_task(
        email_service.send_otp_email,
        user.email,
        user.first_name,
        plain_otp,
    )

    return RegisterResponse(
        message=(
            "Registration successful! We've sent a 6-digit verification code "
            f"to {user.email}. Please check your inbox (and spam folder)."
        ),
        requires_email_verification=True,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# Verify Email (OTP)
# ---------------------------------------------------------------------------

@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    payload: OTPVerifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address",
        )

    if user.is_email_verified:
        return {"message": "Email is already verified. You can log in."}

    otp_hash = hashlib.sha256(payload.otp.strip().encode()).hexdigest()

    record: EmailVerification | None = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.is_used == False,
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new one.",
        )

    # Check expiry
    now = datetime.now(timezone.utc)
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Verification code has expired (valid for {settings.OTP_EXPIRE_MINUTES} minutes). "
                "Please request a new one."
            ),
        )

    # Check attempts
    if record.attempts >= settings.OTP_MAX_ATTEMPTS:
        record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request a new verification code.",
        )

    # Compare hash
    if record.otp_hash != otp_hash:
        record.attempts += 1
        db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
        )

    # Mark OTP used & verify user
    record.is_used = True
    user.is_email_verified = True
    db.commit()

    # Send welcome email in background
    background_tasks.add_task(
        email_service.send_welcome_email,
        user.email,
        user.first_name,
    )

    # If this user has a pending professional profile, notify admins
    if user.professional_profile and not user.professional_profile.is_verified:
        background_tasks.add_task(
            email_service.send_professional_application_received,
            user.email,
            user.first_name,
            user.professional_profile.specialty,
        )
        if settings.MAIL_ADMIN_EMAIL:
            from app.utils.crypto import decrypt_text
            background_tasks.add_task(
                email_service.send_admin_new_professional_application,
                settings.MAIL_ADMIN_EMAIL,
                f"{user.first_name} {user.last_name}",
                user.email,
                user.professional_profile.specialty,
                user.professional_profile.institution,
            )

    return {"message": "Email verified successfully! You can now log in."}


# ---------------------------------------------------------------------------
# Resend OTP
# ---------------------------------------------------------------------------

@router.post("/resend-otp", status_code=status.HTTP_200_OK)
async def resend_otp(
    payload: ResendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, payload.email)
    if not user:
        # Intentionally vague to prevent user enumeration
        return {"message": "If that email exists, a new code has been sent."}

    if user.is_email_verified:
        return {"message": "Email is already verified."}

    _invalidate_existing_otps(db, user.id)

    plain_otp, otp_hash = _generate_otp()
    _create_otp_record(db, user.id, otp_hash)

    background_tasks.add_task(
        email_service.send_otp_email,
        user.email,
        user.first_name,
        plain_otp,
    )

    return {"message": "A new verification code has been sent to your email address."}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email address before logging in. "
                "Check your inbox for the 6-digit code."
            ),
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=refresh_token)


# ---------------------------------------------------------------------------
# Refresh Token
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=new_access_token, refresh_token=new_refresh_token)


# ---------------------------------------------------------------------------
# Current user info
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    updated_user = update_user(db, current_user, user_data)
    return updated_user


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_user_password(
    password_data: PasswordChange,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    change_password(db, current_user, password_data.new_password)

    background_tasks.add_task(
        email_service.send_password_changed_alert,
        current_user.email,
        current_user.first_name,
    )

    return {"message": "Password changed successfully"}


# ---------------------------------------------------------------------------
# Forgot Password — request OTP
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, payload.email)
    # Always return the same response to prevent user enumeration
    generic = {"message": "If that email is registered, a reset code has been sent."}

    if not user or not user.is_active or not user.is_email_verified:
        return generic

    _invalidate_existing_otps(db, user.id)
    plain_otp, otp_hash = _generate_otp()
    _create_otp_record(db, user.id, otp_hash)

    background_tasks.add_task(
        email_service.send_password_reset_otp,
        user.email,
        user.first_name,
        plain_otp,
    )

    return generic


# ---------------------------------------------------------------------------
# Reset Password — verify OTP and set new password
# ---------------------------------------------------------------------------

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    payload: ResetPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, payload.email)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters.",
        )

    otp_hash = hashlib.sha256(payload.otp.strip().encode()).hexdigest()

    record: EmailVerification | None = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id == user.id,
            EmailVerification.is_used == False,
        )
        .order_by(EmailVerification.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active reset code found. Please request a new one.",
        )

    now = datetime.now(timezone.utc)
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reset code has expired (valid for {settings.OTP_EXPIRE_MINUTES} minutes). Please request a new one.",
        )

    if record.attempts >= settings.OTP_MAX_ATTEMPTS:
        record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request a new reset code.",
        )

    if record.otp_hash != otp_hash:
        record.attempts += 1
        db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reset code. {remaining} attempt(s) remaining.",
        )

    # Mark OTP used and update password
    record.is_used = True
    change_password(db, user, payload.new_password)

    background_tasks.add_task(
        email_service.send_password_changed_alert,
        user.email,
        user.first_name,
    )

    return {"message": "Password reset successfully. You can now log in with your new password."}


