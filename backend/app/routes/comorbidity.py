"""
Comorbidity Screening Routes

Supports PHQ-9 (Depression), GAD-7 (Anxiety), ASRS (ADHD).
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
import json

from app.database import get_db
from app.models.user import User
from app.models.comorbidity_screening import ComorbidityScreening
from app.schemas.clinical import ComorbidityScreeningSubmit, ComorbidityScreeningResponse, ComorbidityScreeningDetail
from app.services.clinical_scoring_service import score_comorbidity_screening, get_instrument_questions
from app.services.recommendation_service import refresh_recommendations
from app.utils.dependencies import get_current_active_user
from app.utils.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/comorbidity", tags=["Comorbidity Screening"])

VALID_INSTRUMENTS = {"phq9", "gad7", "asrs"}


@router.get("/instruments")
async def list_instruments(current_user: User = Depends(get_current_active_user)):
    """List available comorbidity screening instruments."""
    return [
        {
            "key": "phq9",
            "label": "PHQ-9",
            "full_name": "Patient Health Questionnaire-9",
            "condition": "Depression",
            "description": "A validated 9-item depression screening tool. Assesses severity over the past 2 weeks.",
            "question_count": 9,
        },
        {
            "key": "gad7",
            "label": "GAD-7",
            "full_name": "Generalized Anxiety Disorder 7-item",
            "condition": "Anxiety",
            "description": "A validated 7-item anxiety screening tool. Assesses severity over the past 2 weeks.",
            "question_count": 7,
        },
        {
            "key": "asrs",
            "label": "ASRS",
            "full_name": "Adult ADHD Self-Report Scale",
            "condition": "ADHD",
            "description": "A 6-item WHO ADHD screening tool. Assesses symptoms over the past 6 months.",
            "question_count": 6,
        },
    ]


@router.get("/questions/{instrument}")
async def get_questions(
    instrument: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get questionnaire data for a specific comorbidity instrument."""
    if instrument not in VALID_INSTRUMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid instrument. Choose from: {', '.join(VALID_INSTRUMENTS)}")
    return get_instrument_questions(instrument)


@router.post("/submit", response_model=ComorbidityScreeningDetail)
async def submit_screening(
    data: ComorbidityScreeningSubmit,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submit responses for a comorbidity screening instrument."""
    if data.instrument not in VALID_INSTRUMENTS:
        raise HTTPException(status_code=400, detail="Invalid instrument")

    result = score_comorbidity_screening(data.instrument, data.responses)

    screening = ComorbidityScreening(
        user_id=current_user.id,
        instrument=data.instrument,
        total_score=result["total_score"],
        max_score=result["max_score"],
        severity=result["severity"],
        responses=result["responses"],
        clinical_flags=encrypt_text(json.dumps(result.get("clinical_flags", {}))) if result.get("clinical_flags") else None,
        interpretation=encrypt_text(result["interpretation"]),
        completed_at=datetime.utcnow(),
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)

    # Trigger recommendation refresh
    background_tasks.add_task(refresh_recommendations, current_user.id, db)

    return _format_screening(screening)


@router.get("/history", response_model=list[ComorbidityScreeningResponse])
async def get_history(
    instrument: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's comorbidity screening history."""
    query = (
        db.query(ComorbidityScreening)
        .filter(ComorbidityScreening.user_id == current_user.id, ComorbidityScreening.completed_at.isnot(None))
    )
    if instrument:
        query = query.filter(ComorbidityScreening.instrument == instrument)
    screenings = query.order_by(desc(ComorbidityScreening.completed_at)).all()
    return [_format_screening(s) for s in screenings]


@router.get("/{screening_id}", response_model=ComorbidityScreeningDetail)
async def get_screening_detail(
    screening_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get detailed results for a specific comorbidity screening."""
    screening = db.query(ComorbidityScreening).filter(
        ComorbidityScreening.id == screening_id,
        ComorbidityScreening.user_id == current_user.id,
    ).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return _format_screening(screening, include_responses=True)


def _format_screening(s: ComorbidityScreening, include_responses=False) -> dict:
    flags = None
    if s.clinical_flags:
        try:
            flags = json.loads(decrypt_text(s.clinical_flags) or "{}")
        except Exception:
            flags = {}

    result = {
        "id": s.id,
        "instrument": s.instrument,
        "total_score": s.total_score,
        "max_score": s.max_score,
        "severity": s.severity,
        "clinical_flags": flags,
        "interpretation": decrypt_text(s.interpretation) if s.interpretation else None,
        "completed_at": s.completed_at,
        "created_at": s.created_at,
    }
    if include_responses:
        result["responses"] = s.responses
    return result
