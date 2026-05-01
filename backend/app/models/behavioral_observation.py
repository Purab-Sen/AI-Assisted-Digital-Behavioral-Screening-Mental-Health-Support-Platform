"""
Structured Behavioral Observation Log

ABC recording (Antecedent → Behavior → Consequence) with frequency,
duration, and intensity tracking for ASD-relevant behavior categories.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class BehavioralObservation(Base):
    __tablename__ = "behavioral_observations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Observer: null = self-report, else professional user_id
    observer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    observation_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Setting: home | school | clinic | community | work | other
    setting = Column(String(50), nullable=True)

    # Category: social | communication | repetitive_behavior | sensory |
    #           emotional_regulation | daily_living | meltdown | sleep | feeding
    category = Column(String(50), nullable=False)

    # Specific behavior type within category
    behavior_type = Column(String(100), nullable=False)

    # ABC Recording (encrypted)
    antecedent = Column(Text, nullable=True)
    behavior_description = Column(Text, nullable=True)
    consequence = Column(Text, nullable=True)

    # Quantifiable metrics
    frequency = Column(Integer, nullable=True)         # occurrences in observation period
    duration_minutes = Column(Integer, nullable=True)   # how long the behavior lasted
    intensity = Column(String(20), nullable=True)       # mild | moderate | severe

    # Additional notes (encrypted)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id], back_populates="behavioral_observations")
    observer = relationship("User", foreign_keys=[observer_id])
