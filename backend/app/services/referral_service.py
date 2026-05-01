"""
Referral Pathway Service

Generates tiered referral recommendations based on composite risk assessment
from all available data: AQ-10, additional screenings, comorbidity screenings,
task performance, journal analysis, and behavioral observations.
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.screening import ScreeningSession
from app.models.additional_screening import AdditionalScreening
from app.models.comorbidity_screening import ComorbidityScreening
from app.models.behavioral_observation import BehavioralObservation
from app.models.referral import Referral
from app.models.notification import Notification
from app.utils.crypto import encrypt_text

logger = logging.getLogger(__name__)

# ─── Referral Type Definitions ────────────────────────────────────────────

REFERRAL_TYPES = {
    "diagnostic_evaluation": {
        "label": "Comprehensive ASD Diagnostic Evaluation",
        "description": "Full diagnostic assessment by a multidisciplinary team",
        "specialists": ["Developmental Pediatrician", "Clinical Psychologist", "Neuropsychologist"],
    },
    "speech_therapy": {
        "label": "Speech-Language Therapy",
        "description": "Assessment and intervention for communication difficulties",
        "specialists": ["Speech-Language Pathologist"],
    },
    "occupational_therapy": {
        "label": "Occupational Therapy",
        "description": "Sensory integration and daily living skills support",
        "specialists": ["Occupational Therapist"],
    },
    "aba_therapy": {
        "label": "Applied Behavior Analysis (ABA)",
        "description": "Evidence-based behavioral intervention for ASD",
        "specialists": ["Board Certified Behavior Analyst (BCBA)"],
    },
    "psychiatry": {
        "label": "Psychiatric Consultation",
        "description": "Medication management for co-occurring conditions",
        "specialists": ["Psychiatrist", "Child/Adolescent Psychiatrist"],
    },
    "psychology": {
        "label": "Psychological Counseling",
        "description": "Therapy for anxiety, depression, and behavioral support",
        "specialists": ["Clinical Psychologist", "Licensed Therapist"],
    },
    "developmental_pediatrics": {
        "label": "Developmental Pediatrics",
        "description": "Developmental assessment and monitoring",
        "specialists": ["Developmental Pediatrician"],
    },
    "behavioral_therapy": {
        "label": "Behavioral Therapy",
        "description": "Cognitive-behavioral or behavioral modification therapy",
        "specialists": ["CBT Therapist", "Behavioral Psychologist"],
    },
    "psychoeducation": {
        "label": "Psychoeducation & Support",
        "description": "Educational resources and support for individual/family",
        "specialists": ["Psychoeducation Specialist", "Family Counselor"],
    },
    "support_group": {
        "label": "Support Group",
        "description": "Peer support and community connection",
        "specialists": ["Support Group Facilitator"],
    },
}


def generate_referrals(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """
    Analyze all user data and generate appropriate referral recommendations.
    Does NOT create DB records — returns suggestions for review.
    """
    # Gather latest data
    latest_screening = (
        db.query(ScreeningSession)
        .filter(ScreeningSession.user_id == user_id, ScreeningSession.completed_at.isnot(None))
        .order_by(desc(ScreeningSession.completed_at))
        .first()
    )

    additional_screenings = (
        db.query(AdditionalScreening)
        .filter(AdditionalScreening.user_id == user_id, AdditionalScreening.completed_at.isnot(None))
        .order_by(desc(AdditionalScreening.completed_at))
        .all()
    )

    comorbidity_screenings = (
        db.query(ComorbidityScreening)
        .filter(ComorbidityScreening.user_id == user_id, ComorbidityScreening.completed_at.isnot(None))
        .order_by(desc(ComorbidityScreening.completed_at))
        .all()
    )

    # Exclude referral types that already have an active/completed record
    existing_referral_types = set(
        rt for (rt,) in db.query(Referral.referral_type)
        .filter(
            Referral.user_id == user_id,
            Referral.status.in_(["recommended", "accepted", "in_progress", "completed"]),
        )
        .all()
    )

    # Determine composite risk
    risk_level = _assess_composite_risk(latest_screening, additional_screenings, comorbidity_screenings)
    referrals = []

    # ─── Tiered Referral Logic ─────────────────────────────────────────

    if risk_level == "high":
        referrals.append({
            "referral_type": "diagnostic_evaluation",
            "urgency": "urgent",
            "reason": "Multiple screening instruments indicate elevated ASD traits. Comprehensive diagnostic evaluation is strongly recommended.",
        })
        referrals.append({
            "referral_type": "psychology",
            "urgency": "soon",
            "reason": "Psychological support recommended to address behavioral and emotional needs identified through screening.",
        })

    elif risk_level == "moderate":
        referrals.append({
            "referral_type": "developmental_pediatrics",
            "urgency": "soon",
            "reason": "Moderate ASD indicators detected. Developmental pediatric assessment recommended for monitoring and guidance.",
        })
        referrals.append({
            "referral_type": "psychoeducation",
            "urgency": "routine",
            "reason": "Psychoeducation resources recommended to support understanding of identified traits and develop coping strategies.",
        })

    elif risk_level == "low":
        referrals.append({
            "referral_type": "psychoeducation",
            "urgency": "routine",
            "reason": "Low-risk screening results. Psychoeducation and monitoring recommended as a preventive measure.",
        })

    # ─── Comorbidity-specific referrals ────────────────────────────────

    for cs in comorbidity_screenings:
        if cs.instrument == "phq9" and cs.severity in ("moderate", "moderately_severe", "severe"):
            referrals.append({
                "referral_type": "psychology",
                "urgency": "soon" if cs.severity == "severe" else "routine",
                "reason": f"PHQ-9 indicates {cs.severity.replace('_', ' ')} depression. Psychological/psychiatric evaluation recommended.",
            })
            if cs.severity in ("moderately_severe", "severe"):
                referrals.append({
                    "referral_type": "psychiatry",
                    "urgency": "urgent" if cs.severity == "severe" else "soon",
                    "reason": f"Severe depressive symptoms detected (PHQ-9: {cs.total_score}/27). Psychiatric consultation for medication management recommended.",
                })

        elif cs.instrument == "gad7" and cs.severity in ("moderate", "severe"):
            referrals.append({
                "referral_type": "psychology",
                "urgency": "soon" if cs.severity == "severe" else "routine",
                "reason": f"GAD-7 indicates {cs.severity} anxiety. Therapeutic intervention recommended.",
            })

        elif cs.instrument == "asrs" and cs.severity in ("possible", "likely"):
            referrals.append({
                "referral_type": "psychiatry",
                "urgency": "routine",
                "reason": f"ASRS screening suggests {cs.severity} ADHD. Comprehensive ADHD evaluation recommended.",
            })

    # ─── Behavioral observation-based referrals ────────────────────────

    recent_observations = (
        db.query(BehavioralObservation)
        .filter(BehavioralObservation.user_id == user_id)
        .order_by(desc(BehavioralObservation.created_at))
        .limit(30)
        .all()
    )

    sensory_count = sum(1 for o in recent_observations if o.category == "sensory")
    comm_count = sum(1 for o in recent_observations if o.category == "communication")
    meltdown_count = sum(1 for o in recent_observations if o.category == "meltdown")

    if sensory_count >= 5:
        referrals.append({
            "referral_type": "occupational_therapy",
            "urgency": "routine",
            "reason": f"Frequent sensory-related observations ({sensory_count} logged). Occupational therapy for sensory integration recommended.",
        })

    if comm_count >= 5:
        referrals.append({
            "referral_type": "speech_therapy",
            "urgency": "routine",
            "reason": f"Multiple communication-related observations ({comm_count} logged). Speech-language assessment recommended.",
        })

    if meltdown_count >= 3:
        referrals.append({
            "referral_type": "behavioral_therapy",
            "urgency": "soon",
            "reason": f"Frequent meltdowns/emotional crises ({meltdown_count} logged). Behavioral intervention recommended.",
        })

    # Deduplicate by referral_type (keep highest urgency)
    urgency_rank = {"urgent": 3, "soon": 2, "routine": 1}
    seen = {}
    for r in referrals:
        rt = r["referral_type"]
        if rt not in seen or urgency_rank.get(r["urgency"], 0) > urgency_rank.get(seen[rt]["urgency"], 0):
            seen[rt] = r
    referrals = list(seen.values())

    # Exclude referral types that the user already has (accepted/completed/in-progress)
    referrals = [r for r in referrals if r["referral_type"] not in existing_referral_types]

    # Sort by urgency
    referrals.sort(key=lambda x: urgency_rank.get(x["urgency"], 0), reverse=True)

    return referrals


def _assess_composite_risk(screening, additional_screenings, comorbidity_screenings) -> str:
    """Determine composite risk level from all available screening data."""
    signals = []

    if screening:
        risk = screening.risk_level.value if screening.risk_level else None
        ml_label = screening.ml_probability_label
        if risk == "high" or ml_label in ("high", "very_high"):
            signals.append("high")
        elif risk == "moderate" or ml_label == "moderate":
            signals.append("moderate")
        else:
            signals.append("low")

    for a in additional_screenings:
        if a.severity in ("clinical", "severe"):
            signals.append("high")
        elif a.severity in ("moderate",):
            signals.append("moderate")
        elif a.severity in ("mild", "borderline"):
            signals.append("moderate")

    # Composite: if any high → high; if any moderate → moderate; else low
    if "high" in signals:
        return "high"
    if "moderate" in signals:
        return "moderate"
    return "low"


def create_referral_from_suggestion(
    user_id: int,
    suggestion: Dict[str, Any],
    db: Session,
    professional_id: Optional[int] = None,
) -> Referral:
    """Create a Referral record from a generated suggestion."""
    referral = Referral(
        user_id=user_id,
        professional_id=professional_id,
        referral_type=suggestion["referral_type"],
        urgency=suggestion["urgency"],
        reason=encrypt_text(suggestion["reason"]),
        status="recommended",
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)

    # Notification
    type_info = REFERRAL_TYPES.get(suggestion["referral_type"], {})
    try:
        notif = Notification(
            user_id=user_id,
            type="referral",
            title=encrypt_text(f"New Referral: {type_info.get('label', suggestion['referral_type'])}"),
            message=encrypt_text(suggestion["reason"]),
            link="/referrals",
        )
        db.add(notif)
        db.commit()
    except Exception:
        logger.exception("Failed to create referral notification")
        db.rollback()

    return referral


def get_referral_types() -> Dict[str, Any]:
    """Return all referral type definitions for frontend display."""
    return REFERRAL_TYPES
