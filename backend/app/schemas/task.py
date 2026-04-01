"""
Task Schemas

Pydantic models for behavioral task requests and responses.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# =============================================================================
# Task Definition Schemas
# =============================================================================

class TaskResponse(BaseModel):
    """Task definition response."""
    id: int
    name: str
    type: Optional[str] = None
    pillar: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    estimated_duration: Optional[int] = None
    difficulty_levels: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """List of available tasks."""
    tasks: List[TaskResponse]
    total: int


class TaskDetailResponse(BaseModel):
    """Detailed task information with configuration."""
    id: int
    name: str
    type: Optional[str] = None
    pillar: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    instructions: str
    estimated_duration: int
    difficulty_levels: Dict[str, Any]
    config: Dict[str, Any]

    class Config:
        from_attributes = True


# =============================================================================
# Task Session Schemas
# =============================================================================

class TaskSessionStart(BaseModel):
    """Request to start a task session."""
    task_id: int
    difficulty_level: int = Field(default=1, ge=1, le=3)


class TaskSessionStartResponse(BaseModel):
    """Response when starting a task session."""
    session_id: int
    task_id: int
    task_name: str
    task_type: Optional[str] = None
    pillar: Optional[str] = None
    category: Optional[str] = None
    difficulty_level: int
    instructions: str
    config: Dict[str, Any]
    started_at: datetime


class TaskResultSubmit(BaseModel):
    """Submit a single metric result."""
    metric_name: str = Field(..., min_length=1, max_length=100)
    metric_value: float


class TaskSessionSubmit(BaseModel):
    """Submit all results for a task session."""
    results: List[TaskResultSubmit]
    metadata: Optional[Dict[str, Any]] = None


class TaskResultResponse(BaseModel):
    """Individual task result."""
    metric_name: str
    metric_value: float

    class Config:
        from_attributes = True


class TaskSessionResponse(BaseModel):
    """Completed task session response."""
    session_id: int
    task_id: int
    task_name: str
    task_type: Optional[str] = None
    pillar: Optional[str] = None
    category: Optional[str] = None
    difficulty_level: int = 1
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
    results: List[TaskResultResponse]
    performance_summary: Dict[str, Any]


class TaskSessionSummary(BaseModel):
    """Summary of a task session for history."""
    id: int
    task_id: int
    task_name: str
    task_type: Optional[str] = None
    pillar: Optional[str] = None
    category: Optional[str] = None
    difficulty_level: int = 1
    started_at: datetime
    completed_at: Optional[datetime] = None
    is_complete: bool
    primary_score: Optional[float] = None

    class Config:
        from_attributes = True


class TaskHistoryResponse(BaseModel):
    """User task history."""
    sessions: List[TaskSessionSummary]
    total: int
    completed_count: int


# =============================================================================
# Task Progress and Stats
# =============================================================================

class TaskProgressResponse(BaseModel):
    """User progress for a specific task."""
    task_id: int
    task_name: str
    total_attempts: int
    completed_attempts: int
    best_score: Optional[float] = None
    average_score: Optional[float] = None
    last_attempt: Optional[datetime] = None
    improvement_trend: Optional[str] = None


class UserTaskStatsResponse(BaseModel):
    """Overall task statistics for a user."""
    total_tasks_attempted: int
    total_sessions_completed: int
    total_time_spent_seconds: int
    favorite_task: Optional[str] = None
    task_progress: List[TaskProgressResponse]
