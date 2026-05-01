"""
Behavioral Observation Routes

Structured ABC recording with frequency, duration, and intensity tracking
for ASD-relevant behavioral categories.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.behavioral_observation import BehavioralObservation
from app.models.professional import ConsultationRequest, ConsultationStatus
from app.schemas.clinical import BehavioralObservationCreate, BehavioralObservationResponse
from app.utils.dependencies import get_current_active_user
from app.utils.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/behavioral-observations", tags=["Behavioral Observations"])

BEHAVIOR_CATEGORIES = {
    "social": {
        "label": "Social Interaction",
        "types": ["eye_contact_avoidance", "peer_interaction_difficulty", "social_withdrawal",
                  "inappropriate_social_approach", "lack_of_social_reciprocity", "difficulty_sharing",
                  "parallel_play_only", "other"],
    },
    "communication": {
        "label": "Communication",
        "types": ["echolalia", "pronoun_reversal", "limited_speech", "monotone_voice",
                  "difficulty_with_conversation", "literal_interpretation", "scripted_language", "other"],
    },
    "repetitive_behavior": {
        "label": "Repetitive Behavior",
        "types": ["hand_flapping", "rocking", "spinning", "lining_up_objects",
                  "insistence_on_sameness", "rigid_routines", "stereotyped_movements", "other"],
    },
    "sensory": {
        "label": "Sensory",
        "types": ["sound_sensitivity", "light_sensitivity", "texture_aversion", "smell_sensitivity",
                  "seeking_deep_pressure", "visual_stimming", "taste_selectivity", "other"],
    },
    "emotional_regulation": {
        "label": "Emotional Regulation",
        "types": ["meltdown", "shutdown", "emotional_outburst", "anxiety_episode",
                  "difficulty_transitioning", "frustration_intolerance", "other"],
    },
    "daily_living": {
        "label": "Daily Living",
        "types": ["feeding_difficulty", "dressing_difficulty", "hygiene_resistance",
                  "sleep_difficulty", "toileting_difficulty", "other"],
    },
    "meltdown": {
        "label": "Meltdown/Crisis",
        "types": ["sensory_overload_meltdown", "change_triggered_meltdown", "demand_triggered_meltdown",
                  "social_meltdown", "other"],
    },
    "sleep": {
        "label": "Sleep",
        "types": ["difficulty_falling_asleep", "night_waking", "early_waking",
                  "irregular_sleep_pattern", "sleep_anxiety", "other"],
    },
    "feeding": {
        "label": "Feeding/Eating",
        "types": ["food_selectivity", "texture_avoidance", "ritualistic_eating",
                  "limited_food_repertoire", "meal_refusal", "other"],
    },
}


@router.get("/categories")
async def get_categories(current_user: User = Depends(get_current_active_user)):
    """Get all behavior categories and their types for the observation form."""
    return BEHAVIOR_CATEGORIES


@router.post("/", response_model=BehavioralObservationResponse)
async def create_observation(
    data: BehavioralObservationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new behavioral observation (self-report)."""
    obs = BehavioralObservation(
        user_id=current_user.id,
        observer_id=None,  # self-report
        observation_date=data.observation_date or datetime.utcnow(),
        setting=data.setting,
        category=data.category,
        behavior_type=data.behavior_type,
        antecedent=encrypt_text(data.antecedent) if data.antecedent else None,
        behavior_description=encrypt_text(data.behavior_description) if data.behavior_description else None,
        consequence=encrypt_text(data.consequence) if data.consequence else None,
        frequency=data.frequency,
        duration_minutes=data.duration_minutes,
        intensity=data.intensity,
        notes=encrypt_text(data.notes) if data.notes else None,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return _format_observation(obs)


@router.post("/patient/{patient_id}", response_model=BehavioralObservationResponse)
async def create_observation_for_patient(
    patient_id: int,
    data: BehavioralObservationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a behavioral observation for a patient (professional only)."""
    if current_user.role not in (UserRole.PROFESSIONAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Professionals only")

    # Verify consultation relationship
    consultation = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == patient_id,
        ConsultationRequest.professional_id == current_user.id,
        ConsultationRequest.status == ConsultationStatus.ACCEPTED,
    ).first()
    if not consultation and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No active consultation with this patient")

    obs = BehavioralObservation(
        user_id=patient_id,
        observer_id=current_user.id,
        observation_date=data.observation_date or datetime.utcnow(),
        setting=data.setting,
        category=data.category,
        behavior_type=data.behavior_type,
        antecedent=encrypt_text(data.antecedent) if data.antecedent else None,
        behavior_description=encrypt_text(data.behavior_description) if data.behavior_description else None,
        consequence=encrypt_text(data.consequence) if data.consequence else None,
        frequency=data.frequency,
        duration_minutes=data.duration_minutes,
        intensity=data.intensity,
        notes=encrypt_text(data.notes) if data.notes else None,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return _format_observation(obs)


@router.get("/", response_model=list[BehavioralObservationResponse])
async def get_my_observations(
    category: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get current user's behavioral observations."""
    query = db.query(BehavioralObservation).filter(BehavioralObservation.user_id == current_user.id)
    if category:
        query = query.filter(BehavioralObservation.category == category)
    observations = query.order_by(desc(BehavioralObservation.observation_date)).limit(min(limit, 200)).all()
    return [_format_observation(o) for o in observations]


@router.get("/summary")
async def get_observation_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a clinical summary of behavioral observations."""
    observations = (
        db.query(BehavioralObservation)
        .filter(BehavioralObservation.user_id == current_user.id)
        .order_by(desc(BehavioralObservation.observation_date))
        .limit(100)
        .all()
    )

    if not observations:
        return {"total": 0, "categories": {}, "recent_patterns": []}

    # Category breakdown
    category_summary = {}
    for obs in observations:
        cat = obs.category
        if cat not in category_summary:
            category_summary[cat] = {
                "count": 0,
                "behaviors": {},
                "intensity_distribution": {"mild": 0, "moderate": 0, "severe": 0},
                "avg_frequency": None,
                "total_duration_minutes": 0,
            }
        cs = category_summary[cat]
        cs["count"] += 1
        bt = obs.behavior_type
        cs["behaviors"][bt] = cs["behaviors"].get(bt, 0) + 1
        if obs.intensity:
            cs["intensity_distribution"][obs.intensity] = cs["intensity_distribution"].get(obs.intensity, 0) + 1
        if obs.duration_minutes:
            cs["total_duration_minutes"] += obs.duration_minutes

    # Compute average frequency per category
    for cat, cs in category_summary.items():
        freq_values = [o.frequency for o in observations if o.category == cat and o.frequency is not None]
        cs["avg_frequency"] = round(sum(freq_values) / len(freq_values), 1) if freq_values else None

    # Identify patterns (most frequent behaviors)
    all_behaviors = {}
    for obs in observations:
        key = f"{obs.category}:{obs.behavior_type}"
        all_behaviors[key] = all_behaviors.get(key, 0) + 1

    top_patterns = sorted(all_behaviors.items(), key=lambda x: x[1], reverse=True)[:5]
    recent_patterns = [
        {"category": k.split(":")[0], "behavior": k.split(":")[1], "count": v}
        for k, v in top_patterns
    ]

    return {
        "total": len(observations),
        "categories": category_summary,
        "recent_patterns": recent_patterns,
    }


@router.get("/patient/{patient_id}", response_model=list[BehavioralObservationResponse])
async def get_patient_observations(
    patient_id: int,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get behavioral observations for a patient (professional only)."""
    if current_user.role not in (UserRole.PROFESSIONAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Professionals only")

    consultation = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == patient_id,
        ConsultationRequest.professional_id == current_user.id,
        ConsultationRequest.status == ConsultationStatus.ACCEPTED,
    ).first()
    if not consultation and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="No active consultation")

    query = db.query(BehavioralObservation).filter(BehavioralObservation.user_id == patient_id)
    if category:
        query = query.filter(BehavioralObservation.category == category)
    observations = query.order_by(desc(BehavioralObservation.observation_date)).limit(100).all()
    return [_format_observation(o) for o in observations]


@router.delete("/{observation_id}")
async def delete_observation(
    observation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a behavioral observation."""
    obs = db.query(BehavioralObservation).filter(
        BehavioralObservation.id == observation_id,
        BehavioralObservation.user_id == current_user.id,
    ).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    db.delete(obs)
    db.commit()
    return {"detail": "Observation deleted"}


def _format_observation(o: BehavioralObservation) -> dict:
    return {
        "id": o.id,
        "user_id": o.user_id,
        "observer_id": o.observer_id,
        "observation_date": o.observation_date,
        "setting": o.setting,
        "category": o.category,
        "behavior_type": o.behavior_type,
        "antecedent": decrypt_text(o.antecedent) if o.antecedent else None,
        "behavior_description": decrypt_text(o.behavior_description) if o.behavior_description else None,
        "consequence": decrypt_text(o.consequence) if o.consequence else None,
        "frequency": o.frequency,
        "duration_minutes": o.duration_minutes,
        "intensity": o.intensity,
        "notes": decrypt_text(o.notes) if o.notes else None,
        "created_at": o.created_at,
    }
