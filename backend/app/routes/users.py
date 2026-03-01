"""
User Routes

User-facing endpoints for managing their own data and sharing with professionals.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.professional import (
    ProfessionalProfile,
    ConsultationRequest
)
from app.models.consent import ConsentLog
from app.schemas.professional import (
    ConsultationRequestCreate,
    ConsultationRequestResponse,
    ProfessionalSearchResult
)
from app.schemas.user import ConsentLogCreate, ConsentLogResponse
from app.utils.dependencies import get_current_active_user

router = APIRouter(prefix="/users", tags=["Users"])


# =============================================================================
# Professional Discovery
# =============================================================================

@router.get("/professionals", response_model=List[ProfessionalSearchResult])
async def search_professionals(
    specialty: Optional[str] = None,
    search: Optional[str] = None,
    verified_only: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Search for verified professionals to share data with.
    """
    query = db.query(ProfessionalProfile).join(
        User, ProfessionalProfile.user_id == User.id
    ).filter(User.is_active == True)
    
    if verified_only:
        query = query.filter(ProfessionalProfile.is_verified == True)
    
    if specialty:
        query = query.filter(ProfessionalProfile.specialty.ilike(f"%{specialty}%"))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term)) |
            (ProfessionalProfile.institution.ilike(search_term))
        )
    
    profiles = query.all()
    
    results = []
    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        results.append(ProfessionalSearchResult(
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            specialty=profile.specialty,
            institution=profile.institution,
            is_verified=profile.is_verified
        ))
    
    return results


# =============================================================================
# Data Sharing / Consultation Requests
# =============================================================================

@router.post("/share", response_model=ConsultationRequestResponse, status_code=status.HTTP_201_CREATED)
async def share_data_with_professional(
    request_data: ConsultationRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Request to share your data with a healthcare professional.
    The professional must accept the request to view your data.
    """
    # Verify the target is a professional
    professional = db.query(User).filter(
        User.id == request_data.professional_id,
        User.role == UserRole.PROFESSIONAL,
        User.is_active == True
    ).first()
    
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional not found"
        )
    
    # Check for existing request
    existing = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == current_user.id,
        ConsultationRequest.professional_id == request_data.professional_id,
        ConsultationRequest.status.in_(["pending", "accepted"])
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active sharing request with this professional"
        )
    
    consultation = ConsultationRequest(
        user_id=current_user.id,
        professional_id=request_data.professional_id,
        status="pending",
        message=request_data.message
    )
    
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    
    return consultation


@router.get("/shares", response_model=List[ConsultationRequestResponse])
async def get_my_sharing_requests(
    status_filter: Optional[str] = Query(None, pattern="^(pending|accepted|declined)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all your data sharing requests.
    """
    query = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == current_user.id
    )
    
    if status_filter:
        query = query.filter(ConsultationRequest.status == status_filter)
    
    requests = query.order_by(ConsultationRequest.created_at.desc()).all()
    return requests


@router.delete("/shares/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_data_sharing(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a data sharing request (removes professional's access).
    """
    consultation = db.query(ConsultationRequest).filter(
        ConsultationRequest.id == request_id,
        ConsultationRequest.user_id == current_user.id
    ).first()
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sharing request not found"
        )
    
    db.delete(consultation)
    db.commit()
    
    return None


# =============================================================================
# Consent Management
# =============================================================================

@router.post("/consent", response_model=ConsentLogResponse, status_code=status.HTTP_201_CREATED)
async def record_consent(
    consent_data: ConsentLogCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Record user consent for a specific action (data collection, sharing, etc.).
    """
    consent = ConsentLog(
        user_id=current_user.id,
        consent_type=consent_data.consent_type,
        consented=consent_data.consented,
        ip_address=consent_data.ip_address
    )
    
    db.add(consent)
    db.commit()
    db.refresh(consent)
    
    return consent


@router.get("/consents", response_model=List[ConsentLogResponse])
async def get_my_consents(
    consent_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all consent records for the current user.
    """
    query = db.query(ConsentLog).filter(
        ConsentLog.user_id == current_user.id
    )
    
    if consent_type:
        query = query.filter(ConsentLog.consent_type == consent_type)
    
    consents = query.order_by(ConsentLog.created_at.desc()).all()
    return consents


@router.get("/consents/latest", response_model=dict)
async def get_latest_consents(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the latest consent status for each consent type.
    Returns a dictionary of consent_type -> consented (bool).
    """
    from sqlalchemy import func
    
    # Subquery to get the latest consent for each type
    subquery = db.query(
        ConsentLog.consent_type,
        func.max(ConsentLog.created_at).label("latest")
    ).filter(
        ConsentLog.user_id == current_user.id
    ).group_by(ConsentLog.consent_type).subquery()
    
    # Get the actual consent records
    latest_consents = db.query(ConsentLog).join(
        subquery,
        (ConsentLog.consent_type == subquery.c.consent_type) &
        (ConsentLog.created_at == subquery.c.latest)
    ).filter(ConsentLog.user_id == current_user.id).all()
    
    return {
        consent.consent_type: consent.consented
        for consent in latest_consents
    }
