from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.analysis import UserAnalysisSnapshot
from app.repositories.base import BaseRepository


class AnalysisSnapshotRepository(BaseRepository[UserAnalysisSnapshot]):
    def __init__(self, db: Session):
        super().__init__(UserAnalysisSnapshot, db)

    def get_by_user_id(self, user_id: int) -> List[UserAnalysisSnapshot]:
        return self.db.query(UserAnalysisSnapshot).filter(
            UserAnalysisSnapshot.user_id == user_id
        ).order_by(UserAnalysisSnapshot.created_at.desc()).all()

    def get_latest_by_user(self, user_id: int) -> Optional[UserAnalysisSnapshot]:
        return self.db.query(UserAnalysisSnapshot).filter(
            UserAnalysisSnapshot.user_id == user_id
        ).order_by(UserAnalysisSnapshot.created_at.desc()).first()
