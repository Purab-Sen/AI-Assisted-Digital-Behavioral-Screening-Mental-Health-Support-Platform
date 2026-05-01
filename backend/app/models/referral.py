"""
Referral Pathway Model

Tiered referral system: screening results trigger appropriate referral
recommendations based on risk level and assessment findings.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Professional who created this referral (null = system-generated)
    professional_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Type: diagnostic_evaluation | speech_therapy | occupational_therapy |
    #       aba_therapy | psychiatry | psychology | developmental_pediatrics |
    #       behavioral_therapy | psychoeducation | support_group
    referral_type = Column(String(50), nullable=False)

    # Urgency: routine | soon | urgent
    urgency = Column(String(20), nullable=False, default="routine")

    # Reason (encrypted)
    reason = Column(Text, nullable=True)

    # Status: recommended | acknowledged | scheduled | completed | declined
    status = Column(String(30), nullable=False, default="recommended")

    # Provider details
    provider_name = Column(String(200), nullable=True)
    provider_specialty = Column(String(100), nullable=True)
    provider_contact = Column(String(200), nullable=True)
    provider_location = Column(String(300), nullable=True)

    # Follow-up
    follow_up_date = Column(DateTime(timezone=True), nullable=True)

    # Notes (encrypted)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id], back_populates="referrals")
    professional = relationship("User", foreign_keys=[professional_id])
