"""
Additional ASD Screening Routes

Supports RAADS-R, CAST, SCQ, SRS-2 questionnaires.
These are independent of the ML model.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.additional_screening import AdditionalScreening
from app.schemas.clinical import AdditionalScreeningSubmit, AdditionalScreeningResponse, AdditionalScreeningDetail
from app.services.clinical_scoring_service import score_additional_screening, get_instrument_questions
from app.services.recommendation_service import refresh_recommendations
from app.utils.dependencies import get_current_active_user
from app.utils.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/additional-screening", tags=["Additional Screening"])

VALID_INSTRUMENTS = {"raads_r", "cast", "scq", "srs_2"}

INSTRUMENT_AGE_RANGES = {
    "raads_r": (18, 150, "Adults 18+"),
    "cast": (5, 11, "Children 5-11"),
    "scq": (4, 150, "Ages 4+"),
    "srs_2": (3, 150, "Ages 2.5+"),
}


@router.get("/instruments")
async def list_instruments(current_user: User = Depends(get_current_active_user)):
    """List available additional screening instruments with metadata, filtered by user age."""
    # Compute user age for filtering
    user_age = None
    if current_user.date_of_birth:
        from datetime import date
        today = date.today()
        user_age = today.year - current_user.date_of_birth.year - (
            (today.month, today.day) < (current_user.date_of_birth.month, current_user.date_of_birth.day)
        )

    instruments = []
    for key, (min_age, max_age, age_desc) in INSTRUMENT_AGE_RANGES.items():
        # Filter by age if known
        if user_age is not None and (user_age < min_age or user_age > max_age):
            continue

        label_map = {"raads_r": "RAADS-R", "cast": "CAST", "scq": "SCQ", "srs_2": "SRS-2"}
        desc_map = {
            "raads_r": "Ritvo Autism Asperger Diagnostic Scale-Revised — adult self-report for ASD traits",
            "cast": "Childhood Autism Spectrum Test — parent/caregiver report for children 5-11",
            "scq": "Social Communication Questionnaire — caregiver report assessing social communication (4+ years)",
            "srs_2": "Social Responsiveness Assessment — measures social communication patterns across the spectrum",
        }
        instruments.append({
            "key": key,
            "label": label_map[key],
            "description": desc_map[key],
            "age_range": age_desc,
            "min_age": min_age,
            "max_age": max_age,
            "appropriate_for_user": True,
        })
    return instruments


@router.get("/questions/{instrument}")
async def get_questions(
    instrument: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get questionnaire data for a specific instrument."""
    if instrument not in VALID_INSTRUMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid instrument. Choose from: {', '.join(VALID_INSTRUMENTS)}")
    return get_instrument_questions(instrument)


@router.post("/submit", response_model=AdditionalScreeningDetail)
async def submit_screening(
    data: AdditionalScreeningSubmit,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submit responses for an additional screening instrument."""
    if data.instrument not in VALID_INSTRUMENTS:
        raise HTTPException(status_code=400, detail="Invalid instrument")

    # Score responses
    result = score_additional_screening(data.instrument, data.responses)

    # Determine age group
    age_group = None
    if current_user.date_of_birth:
        from datetime import date
        today = date.today()
        age = today.year - current_user.date_of_birth.year - (
            (today.month, today.day) < (current_user.date_of_birth.month, current_user.date_of_birth.day)
        )
        if age <= 11:
            age_group = "child"
        elif age <= 17:
            age_group = "adolescent"
        else:
            age_group = "adult"

    screening = AdditionalScreening(
        user_id=current_user.id,
        instrument=data.instrument,
        age_group=age_group,
        total_score=result["total_score"],
        max_score=result["max_score"],
        domain_scores=result.get("domain_scores"),
        severity=result["severity"],
        responses=result["responses"],
        interpretation=encrypt_text(result["interpretation"]),
        completed_at=datetime.utcnow(),
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)

    # Trigger recommendation refresh in background
    background_tasks.add_task(refresh_recommendations, current_user.id, db)

    return _format_screening(screening)


@router.get("/history", response_model=list[AdditionalScreeningResponse])
async def get_history(
    instrument: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's additional screening history."""
    query = (
        db.query(AdditionalScreening)
        .filter(AdditionalScreening.user_id == current_user.id, AdditionalScreening.completed_at.isnot(None))
    )
    if instrument:
        query = query.filter(AdditionalScreening.instrument == instrument)
    screenings = query.order_by(desc(AdditionalScreening.completed_at)).all()
    return [_format_screening(s) for s in screenings]


@router.get("/{screening_id}", response_model=AdditionalScreeningDetail)
async def get_screening_detail(
    screening_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get detailed results for a specific screening."""
    screening = db.query(AdditionalScreening).filter(
        AdditionalScreening.id == screening_id,
        AdditionalScreening.user_id == current_user.id,
    ).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return _format_screening(screening, include_responses=True)


def _format_screening(s: AdditionalScreening, include_responses=False) -> dict:
    result = {
        "id": s.id,
        "instrument": s.instrument,
        "age_group": s.age_group,
        "total_score": s.total_score,
        "max_score": s.max_score,
        "domain_scores": s.domain_scores,
        "severity": s.severity,
        "interpretation": decrypt_text(s.interpretation) if s.interpretation else None,
        "completed_at": s.completed_at,
        "created_at": s.created_at,
    }
    if include_responses:
        result["responses"] = s.responses
    return result
