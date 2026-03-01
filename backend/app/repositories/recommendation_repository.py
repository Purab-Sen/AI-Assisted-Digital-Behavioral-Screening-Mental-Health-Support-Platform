from sqlalchemy.orm import Session
from typing import List
from app.models.recommendation import Resource, Recommendation, RecommendationStatus
from app.repositories.base import BaseRepository


class ResourceRepository(BaseRepository[Resource]):
    def __init__(self, db: Session):
        super().__init__(Resource, db)

    def get_by_risk_level(self, risk_level: str) -> List[Resource]:
        return self.db.query(Resource).filter(
            Resource.target_risk_level == risk_level
        ).all()


class RecommendationRepository(BaseRepository[Recommendation]):
    def __init__(self, db: Session):
        super().__init__(Recommendation, db)

    def get_by_user_id(self, user_id: int) -> List[Recommendation]:
        return self.db.query(Recommendation).filter(
            Recommendation.user_id == user_id
        ).order_by(Recommendation.created_at.desc()).all()

    def get_pending_by_user(self, user_id: int) -> List[Recommendation]:
        return self.db.query(Recommendation).filter(
            Recommendation.user_id == user_id,
            Recommendation.status == RecommendationStatus.PENDING
        ).all()
