from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.journal import JournalEntry, JournalAnalysis
from app.repositories.base import BaseRepository


class JournalEntryRepository(BaseRepository[JournalEntry]):
    def __init__(self, db: Session):
        super().__init__(JournalEntry, db)

    def get_by_user_id(self, user_id: int, skip: int = 0, limit: int = 50) -> List[JournalEntry]:
        return self.db.query(JournalEntry).filter(
            JournalEntry.user_id == user_id
        ).order_by(JournalEntry.created_at.desc()).offset(skip).limit(limit).all()

    def get_recent_by_user(self, user_id: int, days: int = 7) -> List[JournalEntry]:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        return self.db.query(JournalEntry).filter(
            JournalEntry.user_id == user_id,
            JournalEntry.created_at >= cutoff_date
        ).order_by(JournalEntry.created_at.desc()).all()


class JournalAnalysisRepository(BaseRepository[JournalAnalysis]):
    def __init__(self, db: Session):
        super().__init__(JournalAnalysis, db)

    def get_by_journal_id(self, journal_id: int) -> Optional[JournalAnalysis]:
        return self.db.query(JournalAnalysis).filter(
            JournalAnalysis.journal_id == journal_id
        ).first()
