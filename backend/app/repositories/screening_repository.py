from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.screening import ScreeningSession, ScreeningResponse, Question, Option
from app.repositories.base import BaseRepository


class ScreeningSessionRepository(BaseRepository[ScreeningSession]):
    def __init__(self, db: Session):
        super().__init__(ScreeningSession, db)

    def get_by_user_id(self, user_id: int) -> List[ScreeningSession]:
        return self.db.query(ScreeningSession).filter(
            ScreeningSession.user_id == user_id
        ).order_by(ScreeningSession.started_at.desc()).all()

    def get_latest_by_user(self, user_id: int) -> Optional[ScreeningSession]:
        return self.db.query(ScreeningSession).filter(
            ScreeningSession.user_id == user_id,
            ScreeningSession.completed_at.isnot(None)
        ).order_by(ScreeningSession.completed_at.desc()).first()


class ScreeningResponseRepository(BaseRepository[ScreeningResponse]):
    def __init__(self, db: Session):
        super().__init__(ScreeningResponse, db)

    def get_by_screening_id(self, screening_id: int) -> List[ScreeningResponse]:
        return self.db.query(ScreeningResponse).filter(
            ScreeningResponse.screening_id == screening_id
        ).all()


class QuestionRepository(BaseRepository[Question]):
    def __init__(self, db: Session):
        super().__init__(Question, db)

    def get_all_with_options(self) -> List[Question]:
        return self.db.query(Question).all()

    def get_by_category(self, category: str) -> List[Question]:
        return self.db.query(Question).filter(Question.category == category).all()


class OptionRepository(BaseRepository[Option]):
    def __init__(self, db: Session):
        super().__init__(Option, db)

    def get_by_question_id(self, question_id: int) -> List[Option]:
        return self.db.query(Option).filter(Option.question_id == question_id).all()
