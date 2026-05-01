"""
Schemas for Additional ASD Screening Instruments and Comorbidity Screenings.
"""
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator


# ─── Additional Screening (RAADS-R, CAST, SCQ, SRS-2) ─────────────────────

class AdditionalScreeningSubmit(BaseModel):
    instrument: str = Field(..., pattern="^(raads_r|cast|scq|srs_2)$")
    responses: List[Dict[str, Any]] = Field(..., description="List of {question_id, answer}")


class AdditionalScreeningResponse(BaseModel):
    id: int
    instrument: str
    age_group: Optional[str] = None
    total_score: Optional[int] = None
    max_score: Optional[int] = None
    domain_scores: Optional[Dict[str, Any]] = None
    severity: Optional[str] = None
    interpretation: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdditionalScreeningDetail(AdditionalScreeningResponse):
    responses: Optional[List[Dict[str, Any]]] = None


# ─── Comorbidity Screening (PHQ-9, GAD-7, ASRS) ───────────────────────────

class ComorbidityScreeningSubmit(BaseModel):
    instrument: str = Field(..., pattern="^(phq9|gad7|asrs)$")
    responses: List[Dict[str, Any]] = Field(..., description="List of {question_id, answer}")


class ComorbidityScreeningResponse(BaseModel):
    id: int
    instrument: str
    total_score: Optional[int] = None
    max_score: Optional[int] = None
    severity: Optional[str] = None
    clinical_flags: Optional[Dict[str, Any]] = None
    interpretation: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ComorbidityScreeningDetail(ComorbidityScreeningResponse):
    responses: Optional[List[Dict[str, Any]]] = None


# ─── Behavioral Observation ────────────────────────────────────────────────

_FREQUENCY_MAP = {
    "never": 0,
    "rarely": 1,
    "sometimes": 2,
    "often": 3,
    "very_often": 4,
}


class BehavioralObservationCreate(BaseModel):
    observation_date: Optional[datetime] = None
    setting: Optional[str] = Field(None, pattern="^(home|school|clinic|community|work|other)$")
    category: str = Field(..., pattern="^(social|communication|repetitive_behavior|sensory|emotional_regulation|daily_living|meltdown|sleep|feeding)$")
    behavior_type: str = Field(..., max_length=100)
    antecedent: Optional[str] = None
    behavior_description: Optional[str] = None
    consequence: Optional[str] = None
    frequency: Optional[int] = Field(None, ge=0)
    duration_minutes: Optional[int] = Field(None, ge=0)
    intensity: Optional[str] = Field(None, pattern="^(mild|moderate|severe)$")
    notes: Optional[str] = None

    @field_validator('observation_date', mode='before')
    @classmethod
    def parse_observation_date(cls, v):
        """Accept date-only strings (e.g. '2026-05-01') by appending midnight time."""
        if isinstance(v, str) and v and 'T' not in v and ' ' not in v and '_' not in v:
            v = v + 'T00:00:00'
        return v

    @field_validator('frequency', mode='before')
    @classmethod
    def parse_frequency(cls, v):
        """Accept string frequency labels (e.g. 'very_often') or plain integers."""
        if isinstance(v, str):
            if v in _FREQUENCY_MAP:
                return _FREQUENCY_MAP[v]
            try:
                return int(v)
            except ValueError:
                return None
        return v


class BehavioralObservationResponse(BaseModel):
    id: int
    user_id: int
    observer_id: Optional[int] = None
    observation_date: datetime
    setting: Optional[str] = None
    category: str
    behavior_type: str
    antecedent: Optional[str] = None
    behavior_description: Optional[str] = None
    consequence: Optional[str] = None
    frequency: Optional[int] = None
    duration_minutes: Optional[int] = None
    intensity: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Referral ──────────────────────────────────────────────────────────────

class ReferralCreate(BaseModel):
    referral_type: str = Field(..., pattern="^(diagnostic_evaluation|speech_therapy|occupational_therapy|aba_therapy|psychiatry|psychology|developmental_pediatrics|behavioral_therapy|psychoeducation|support_group)$")
    urgency: str = Field("routine", pattern="^(routine|soon|urgent)$")
    reason: Optional[str] = None
    provider_name: Optional[str] = Field(None, max_length=200)
    provider_specialty: Optional[str] = Field(None, max_length=100)
    provider_contact: Optional[str] = Field(None, max_length=200)
    provider_location: Optional[str] = Field(None, max_length=300)
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReferralUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(recommended|acknowledged|scheduled|completed|declined)$")
    provider_name: Optional[str] = None
    provider_contact: Optional[str] = None
    provider_location: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReferralResponse(BaseModel):
    id: int
    user_id: int
    professional_id: Optional[int] = None
    referral_type: str
    urgency: str
    reason: Optional[str] = None
    status: str
    provider_name: Optional[str] = None
    provider_specialty: Optional[str] = None
    provider_contact: Optional[str] = None
    provider_location: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
