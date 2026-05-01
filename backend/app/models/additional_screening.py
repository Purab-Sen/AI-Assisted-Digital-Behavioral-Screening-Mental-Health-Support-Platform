"""
Additional ASD Screening Instruments

Supports: RAADS-R, CAST, SCQ-style, SRS-2-style assessments.
These are INDEPENDENT of the ML model and provide supplementary clinical evidence.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AdditionalScreening(Base):
    __tablename__ = "additional_screenings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Instrument identifier: raads_r | cast | scq | srs_2
    instrument = Column(String(50), nullable=False, index=True)
    age_group = Column(String(20), nullable=True)

    # Scoring
    total_score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    domain_scores = Column(JSON, nullable=True)  # e.g. {"social_relatedness": 12, ...}
    severity = Column(String(30), nullable=True)  # minimal / mild / moderate / severe / clinical

    # Full response data for audit
    responses = Column(JSON, nullable=True)  # [{question_id, answer, score}, ...]

    # Clinical interpretation (encrypted)
    interpretation = Column(Text, nullable=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="additional_screenings")
