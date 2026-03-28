"""
Resources Routes

Endpoints for viewing/managing resources.
- Users can read global resources and resources assigned to them.
- Professionals can upload patient-specific resources.
- Admin manages global resources (in admin routes).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.models.recommendation import Resource
from app.models.professional import ConsultationRequest
from app.utils.dependencies import get_current_active_user, get_professional_user

router = APIRouter(prefix="/resources", tags=["Resources"])


class ResourceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    type: str
    content_or_url: Optional[str] = None
    target_risk_level: Optional[str] = None
    uploaded_by: Optional[int] = None
    patient_id: Optional[int] = None

    class Config:
        from_attributes = True


class PatientResourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: str = Field(..., pattern="^(article|video|exercise|guide|tool|ARTICLE|VIDEO|EXERCISE|GUIDE|TOOL)$")
    content_or_url: Optional[str] = None
    target_risk_level: Optional[str] = None
    patient_id: int


# =============================================================================
# User: view accessible resources
# =============================================================================

@router.get("", response_model=List[ResourceResponse])
async def get_resources(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get resources accessible to the current user:
    - Global resources (patient_id = null)
    - Resources specifically assigned to this user
    """
    resources = db.query(Resource).filter(
        or_(Resource.patient_id == None, Resource.patient_id == current_user.id)
    ).order_by(Resource.id.desc()).all()
    return resources


# =============================================================================
# Professional: upload resource for a patient
# =============================================================================

@router.post("/patient", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_patient_resource(
    data: PatientResourceCreate,
    professional: User = Depends(get_professional_user),
    db: Session = Depends(get_db)
):
    """
    Professional uploads a resource for a specific patient.
    Professional must have an accepted consultation with this patient.
    """
    accepted = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == data.patient_id,
        ConsultationRequest.professional_id == professional.id,
        ConsultationRequest.status == "accepted"
    ).first()
    if not accepted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient has not shared data with you")

    resource = Resource(
        title=data.title,
        description=data.description,
        type=data.type.lower(),
        content_or_url=data.content_or_url,
        target_risk_level=data.target_risk_level,
        uploaded_by=professional.id,
        patient_id=data.patient_id
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.get("/patient/{patient_id}", response_model=List[ResourceResponse])
async def get_patient_resources(
    patient_id: int,
    professional: User = Depends(get_professional_user),
    db: Session = Depends(get_db)
):
    """Get resources uploaded for a specific patient by this professional."""
    accepted = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == patient_id,
        ConsultationRequest.professional_id == professional.id,
        ConsultationRequest.status == "accepted"
    ).first()
    if not accepted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient has not shared data with you")

    resources = db.query(Resource).filter(
        Resource.patient_id == patient_id,
        Resource.uploaded_by == professional.id
    ).order_by(Resource.id.desc()).all()
    return resources


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient_resource(
    resource_id: int,
    professional: User = Depends(get_professional_user),
    db: Session = Depends(get_db)
):
    """Professional can delete a resource they uploaded."""
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.uploaded_by == professional.id
    ).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    db.delete(resource)
    db.commit()
    return None
