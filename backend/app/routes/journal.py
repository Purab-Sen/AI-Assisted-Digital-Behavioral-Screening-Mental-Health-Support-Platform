"""
Journal Routes

CRUD endpoints for user journal entries.
Users can create/read their own entries.
Professionals can read journal entries of shared patients (only shared ones).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.journal import JournalEntry
from app.models.professional import ConsultationRequest
from app.utils.dependencies import get_current_active_user, get_professional_user
from app.utils.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/journal", tags=["Journal"])


# =============================================================================
# Schemas (inline for simplicity)
# =============================================================================

class JournalEntryCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    stress_score: Optional[int] = Field(None, ge=1, le=10)
    is_shared: bool = False


class JournalEntryUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    stress_score: Optional[int] = Field(None, ge=1, le=10)
    is_shared: Optional[bool] = None


class JournalEntryResponse(BaseModel):
    id: int
    user_id: int
    content: str
    mood_score: Optional[int] = None
    stress_score: Optional[int] = None
    is_shared: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_model(cls, entry: JournalEntry):
        return cls(
            id=entry.id,
            user_id=entry.user_id,
            content=decrypt_text(entry.content),
            mood_score=entry.mood_rating,
            stress_score=entry.stress_rating,
            is_shared=entry.is_shared if entry.is_shared is not None else False,
            created_at=entry.created_at
        )


# =============================================================================
# User Journal CRUD
# =============================================================================

@router.get("/entries", response_model=List[JournalEntryResponse])
async def get_my_journal_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the current user's journal entries, newest first."""
    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [JournalEntryResponse.from_model(e) for e in entries]


@router.post("/entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    data: JournalEntryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new journal entry."""
    entry = JournalEntry(
        user_id=current_user.id,
        content=encrypt_text(data.content),
        mood_rating=data.mood_score,
        stress_rating=data.stress_score,
        is_shared=data.is_shared
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return JournalEntryResponse.from_model(entry)


@router.get("/entries/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific journal entry (own only)."""
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return JournalEntryResponse.from_model(entry)


@router.patch("/entries/{entry_id}", response_model=JournalEntryResponse)
async def update_journal_entry(
    entry_id: int,
    data: JournalEntryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a journal entry (own only)."""
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    if data.content is not None:
        entry.content = encrypt_text(data.content)
    if data.mood_score is not None:
        entry.mood_rating = data.mood_score
    if data.stress_score is not None:
        entry.stress_rating = data.stress_score
    if data.is_shared is not None:
        entry.is_shared = data.is_shared
    db.commit()
    db.refresh(entry)
    return JournalEntryResponse.from_model(entry)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_entry(
    entry_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a journal entry (own only)."""
    entry = db.query(JournalEntry).filter(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return None


# =============================================================================
# Professional: read shared patient journals
# =============================================================================

@router.get("/patient/{patient_id}/entries", response_model=List[JournalEntryResponse])
async def get_patient_journal_entries(
    patient_id: int,
    professional: User = Depends(get_professional_user),
    db: Session = Depends(get_db)
):
    """
    Get shared journal entries for a patient.
    Professional must have an accepted consultation with this patient.
    Only returns entries the patient has marked as shared.
    """
    accepted = db.query(ConsultationRequest).filter(
        ConsultationRequest.user_id == patient_id,
        ConsultationRequest.professional_id == professional.id,
        ConsultationRequest.status == "accepted"
    ).first()
    if not accepted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient has not shared data with you")

    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == patient_id, JournalEntry.is_shared == True)
        .order_by(JournalEntry.created_at.desc())
        .all()
    )
    return [JournalEntryResponse.from_model(e) for e in entries]
