"""
Clinical Report Routes

PDF report generation compiling all assessment data.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.database import get_db
from app.models.user import User, UserRole
from app.models.professional import ConsultationRequest, ConsultationStatus
from app.services.report_service import generate_clinical_report
from app.utils.dependencies import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Clinical Reports"])


@router.get("/my-report")
async def generate_my_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate a clinical report for the current user."""
    pdf_bytes = generate_clinical_report(
        user_id=current_user.id,
        db=db,
        generated_by=f"{current_user.first_name} {current_user.last_name} (Self)",
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=clinical_report_{current_user.id}.pdf"
        },
    )


@router.get("/patient/{patient_id}")
async def generate_patient_report(
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate a clinical report for a patient (professional only)."""
    if current_user.role not in (UserRole.PROFESSIONAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Professionals only")

    # Verify consultation
    if current_user.role != UserRole.ADMIN:
        consultation = db.query(ConsultationRequest).filter(
            ConsultationRequest.user_id == patient_id,
            ConsultationRequest.professional_id == current_user.id,
            ConsultationRequest.status == ConsultationStatus.ACCEPTED,
        ).first()
        if not consultation:
            raise HTTPException(status_code=403, detail="No active consultation with this patient")

    pdf_bytes = generate_clinical_report(
        user_id=patient_id,
        db=db,
        generated_by=f"{current_user.first_name} {current_user.last_name} ({current_user.role.value.title()})",
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=clinical_report_patient_{patient_id}.pdf"
        },
    )
