"""
Referral Routes

Tiered referral pathway system based on composite assessment data.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User, UserRole
from app.models.referral import Referral
from app.models.professional import ConsultationRequest, ConsultationStatus
from app.schemas.clinical import ReferralCreate, ReferralUpdate, ReferralResponse
from app.services.referral_service import (
    generate_referrals, create_referral_from_suggestion,
    get_referral_types, REFERRAL_TYPES,
)
from app.utils.dependencies import get_current_active_user
from app.utils.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/referrals", tags=["Referrals"])


@router.get("/types")
async def list_referral_types(current_user: User = Depends(get_current_active_user)):
    """Get all referral type definitions."""
    return get_referral_types()


@router.get("/suggestions")
async def get_referral_suggestions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate referral suggestions based on all available assessment data."""
    suggestions = generate_referrals(current_user.id, db)
    # Enrich with type labels
    for s in suggestions:
        type_info = REFERRAL_TYPES.get(s["referral_type"], {})
        s["label"] = type_info.get("label", s["referral_type"].replace("_", " ").title())
        s["description"] = type_info.get("description", "")
        s["specialists"] = type_info.get("specialists", [])
    return suggestions


@router.post("/", response_model=ReferralResponse)
async def create_referral(
    data: ReferralCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a referral (self-service or system-generated)."""
    referral = Referral(
        user_id=current_user.id,
        referral_type=data.referral_type,
        urgency=data.urgency,
        reason=encrypt_text(data.reason) if data.reason else None,
        status="recommended",
        provider_name=data.provider_name,
        provider_specialty=data.provider_specialty,
        provider_contact=data.provider_contact,
        provider_location=data.provider_location,
        follow_up_date=data.follow_up_date,
        notes=encrypt_text(data.notes) if data.notes else None,
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return _format_referral(referral)


@router.post("/patient/{patient_id}", response_model=ReferralResponse)
async def create_referral_for_patient(
    patient_id: int,
    data: ReferralCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a referral for a patient (professional only)."""
    if current_user.role not in (UserRole.PROFESSIONAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Professionals only")

    # Verify consultation
    consultation = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == patient_id,
        ConsultationRequest.professional_id == current_user.id,
        ConsultationRequest.status == ConsultationStatus.ACCEPTED,
    ).first()
    if not consultation and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No active consultation")

    referral = Referral(
        user_id=patient_id,
        professional_id=current_user.id,
        referral_type=data.referral_type,
        urgency=data.urgency,
        reason=encrypt_text(data.reason) if data.reason else None,
        status="recommended",
        provider_name=data.provider_name,
        provider_specialty=data.provider_specialty,
        provider_contact=data.provider_contact,
        provider_location=data.provider_location,
        follow_up_date=data.follow_up_date,
        notes=encrypt_text(data.notes) if data.notes else None,
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return _format_referral(referral)


@router.post("/accept-suggestion")
async def accept_suggestion(
    suggestion: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Accept a generated referral suggestion and save it."""
    referral = create_referral_from_suggestion(
        user_id=current_user.id,
        suggestion=suggestion,
        db=db,
    )
    return _format_referral(referral)


@router.get("/", response_model=list[ReferralResponse])
async def get_my_referrals(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get current user's referrals."""
    query = db.query(Referral).filter(Referral.user_id == current_user.id)
    if status:
        query = query.filter(Referral.status == status)
    referrals = query.order_by(desc(Referral.created_at)).all()
    return [_format_referral(r) for r in referrals]


@router.get("/patient/{patient_id}", response_model=list[ReferralResponse])
async def get_patient_referrals(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get referrals for a patient (professional only)."""
    if current_user.role not in (UserRole.PROFESSIONAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Professionals only")

    consultation = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == patient_id,
        ConsultationRequest.professional_id == current_user.id,
        ConsultationRequest.status == ConsultationStatus.ACCEPTED,
    ).first()
    if not consultation and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No active consultation")

    referrals = (
        db.query(Referral)
        .filter(Referral.user_id == patient_id)
        .order_by(desc(Referral.created_at))
        .all()
    )
    return [_format_referral(r) for r in referrals]


@router.put("/{referral_id}", response_model=ReferralResponse)
async def update_referral(
    referral_id: int,
    data: ReferralUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a referral status or details."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    # Users can update their own, professionals can update their patients'
    is_own = referral.user_id == current_user.id
    is_professional = referral.professional_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    if not (is_own or is_professional or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.status:
        referral.status = data.status
    if data.provider_name is not None:
        referral.provider_name = data.provider_name
    if data.provider_contact is not None:
        referral.provider_contact = data.provider_contact
    if data.provider_location is not None:
        referral.provider_location = data.provider_location
    if data.follow_up_date is not None:
        referral.follow_up_date = data.follow_up_date
    if data.notes is not None:
        referral.notes = encrypt_text(data.notes)

    db.commit()
    db.refresh(referral)
    return _format_referral(referral)


def _format_referral(r: Referral) -> dict:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "professional_id": r.professional_id,
        "referral_type": r.referral_type,
        "urgency": r.urgency,
        "reason": decrypt_text(r.reason) if r.reason else None,
        "status": r.status,
        "provider_name": r.provider_name,
        "provider_specialty": r.provider_specialty,
        "provider_contact": r.provider_contact,
        "provider_location": r.provider_location,
        "follow_up_date": r.follow_up_date,
        "notes": decrypt_text(r.notes) if r.notes else None,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }
