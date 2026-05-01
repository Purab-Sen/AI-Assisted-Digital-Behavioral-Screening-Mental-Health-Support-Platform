"""
Comorbidity Screening Models

Supports: PHQ-9 (Depression), GAD-7 (Anxiety), ASRS (ADHD).
These are independent assessments that identify co-occurring conditions.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ComorbidityScreening(Base):
    __tablename__ = "comorbidity_screenings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Instrument: phq9 | gad7 | asrs
    instrument = Column(String(50), nullable=False, index=True)

    # Scoring
    total_score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    severity = Column(String(30), nullable=True)  # minimal / mild / moderate / moderately_severe / severe

    # Full response data
    responses = Column(JSON, nullable=True)  # [{question_id, answer, score}, ...]

    # Clinical flags (encrypted JSON string)
    # e.g. PHQ-9 Q9 (suicidal ideation), ASRS threshold items
    clinical_flags = Column(Text, nullable=True)

    # Clinical interpretation (encrypted)
    interpretation = Column(Text, nullable=True)

    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="comorbidity_screenings")
