from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    date_of_birth: Optional[date] = None
    # Professional self-registration fields (optional)
    is_professional_applicant: bool = False
    license_number: Optional[str] = Field(None, max_length=100)
    specialty: Optional[str] = Field(None, max_length=255)
    institution: Optional[str] = Field(None, max_length=255)


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=50)
    ethnicity: Optional[str] = Field(None, max_length=100)


class UserResponse(UserBase):
    id: int
    role: UserRole
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    is_active: bool
    is_email_verified: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


# =============================================================================
# Consent Schemas
# =============================================================================

class ConsentLogCreate(BaseModel):
    """Request to record user consent."""
    consent_type: str = Field(..., min_length=1, max_length=100)
    consented: bool
    ip_address: Optional[str] = Field(None, max_length=45)


class ConsentLogResponse(BaseModel):
    """Consent log response."""
    id: int
    user_id: int
    consent_type: str
    consented: bool
    ip_address: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
