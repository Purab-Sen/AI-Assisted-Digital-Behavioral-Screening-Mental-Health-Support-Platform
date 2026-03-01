from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.task import Task, TaskSession, TaskResult
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    def __init__(self, db: Session):
        super().__init__(Task, db)

    def get_by_type(self, task_type: str) -> List[Task]:
        return self.db.query(Task).filter(Task.type == task_type).all()


class TaskSessionRepository(BaseRepository[TaskSession]):
    def __init__(self, db: Session):
        super().__init__(TaskSession, db)

    def get_by_user_id(self, user_id: int) -> List[TaskSession]:
        return self.db.query(TaskSession).filter(
            TaskSession.user_id == user_id
        ).order_by(TaskSession.started_at.desc()).all()

    def get_completed_by_user(self, user_id: int) -> List[TaskSession]:
        return self.db.query(TaskSession).filter(
            TaskSession.user_id == user_id,
            TaskSession.completed_at.isnot(None)
        ).all()


class TaskResultRepository(BaseRepository[TaskResult]):
    def __init__(self, db: Session):
        super().__init__(TaskResult, db)

    def get_by_session_id(self, session_id: int) -> List[TaskResult]:
        return self.db.query(TaskResult).filter(
            TaskResult.task_session_id == session_id
        ).all()
