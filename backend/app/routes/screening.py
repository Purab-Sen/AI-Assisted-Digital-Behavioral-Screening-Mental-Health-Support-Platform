"""
Screening Routes

API endpoints for AQ-10 screening questionnaire.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.screening import (
    QuestionnaireResponse,
    QuestionResponse,
    OptionResponse,
    ScreeningStart,
    AnswerSubmit,
    BulkAnswerSubmit,
    ScreeningResultResponse,
    ScreeningSessionSummary,
    ScreeningHistoryResponse,
    ScreeningResponseItem,
    RiskLevelInfo,
    RiskLevelsResponse
)
from app.services.screening_service import (
    ScreeningService,
    get_risk_description,
    get_risk_recommendations,
    get_risk_levels_info,
    AQ10_MAX_SCORE
)
from app.utils.dependencies import get_current_active_user

router = APIRouter(prefix="/screening", tags=["Screening"])


# =============================================================================
# Questionnaire Endpoints
# =============================================================================

@router.get("/questions", response_model=QuestionnaireResponse)
async def get_questions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all AQ-10 screening questions with their options.
    Does not start a screening session.
    """
    service = ScreeningService(db)
    questions = service.get_all_questions()
    
    return QuestionnaireResponse(
        questions=[
            QuestionResponse(
                id=q.id,
                text=q.text,
                category=q.category,
                options=[OptionResponse(id=o.id, text=o.text) for o in q.options]
            )
            for q in questions
        ],
        total_questions=len(questions)
    )


@router.get("/risk-levels", response_model=RiskLevelsResponse)
async def get_risk_levels_info_endpoint(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get information about all risk levels and their meanings.
    """
    levels = get_risk_levels_info()
    return RiskLevelsResponse(
        levels=[RiskLevelInfo(**level) for level in levels]
    )


# =============================================================================
# Screening Session Endpoints
# =============================================================================

@router.post("/start", response_model=ScreeningStart, status_code=status.HTTP_201_CREATED)
async def start_screening(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Start a new AQ-10 screening session.
    
    If an incomplete session exists, it will be resumed.
    Returns the session ID and all questions.
    """
    service = ScreeningService(db)
    session, questions = service.start_screening(current_user.id)
    
    return ScreeningStart(
        session_id=session.id,
        started_at=session.started_at,
        questions=[
            QuestionResponse(
                id=q.id,
                text=q.text,
                category=q.category,
                options=[OptionResponse(id=o.id, text=o.text) for o in q.options]
            )
            for q in questions
        ]
    )


@router.post("/sessions/{session_id}/answer", status_code=status.HTTP_200_OK)
async def submit_answer(
    session_id: int,
    answer: AnswerSubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Submit a single answer to a question.
    
    Can be used for incremental saving as the user progresses through the questionnaire.
    """
    service = ScreeningService(db)
    
    # Verify session belongs to user
    session = service.session_repo.get_by_id(session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screening session not found"
        )
    
    try:
        service.submit_answer(
            session_id=session_id,
            question_id=answer.question_id,
            option_id=answer.selected_option_id,
            response_time_ms=answer.response_time_ms
        )
        return {"message": "Answer saved"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sessions/{session_id}/submit", response_model=ScreeningResultResponse)
async def submit_screening(
    session_id: int,
    submission: BulkAnswerSubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Submit all answers and complete the screening session.
    
    Calculates the score and risk level, and returns the complete results.
    """
    service = ScreeningService(db)
    
    # Verify session belongs to user
    session = service.session_repo.get_by_id(session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screening session not found"
        )
    
    try:
        # Submit all answers
        answers = [
            {
                "question_id": a.question_id,
                "selected_option_id": a.selected_option_id,
                "response_time_ms": a.response_time_ms
            }
            for a in submission.answers
        ]
        
        completed_session = service.submit_all_answers(session_id, answers)
        
        # Get detailed responses
        _, detailed_responses = service.get_session_with_responses(session_id)
        
        return ScreeningResultResponse(
            session_id=completed_session.id,
            user_id=completed_session.user_id,
            started_at=completed_session.started_at,
            completed_at=completed_session.completed_at,
            raw_score=completed_session.raw_score,
            max_score=AQ10_MAX_SCORE,
            risk_level=completed_session.risk_level.value,
            risk_description=get_risk_description(completed_session.risk_level),
            ml_risk_score=completed_session.ml_risk_score,
            responses=[ScreeningResponseItem(**r) for r in detailed_responses],
            recommendations=get_risk_recommendations(completed_session.risk_level)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sessions/{session_id}/complete", response_model=ScreeningResultResponse)
async def complete_screening(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Complete a screening session that has all answers already submitted.
    
    Use this after submitting answers incrementally with the /answer endpoint.
    """
    service = ScreeningService(db)
    
    # Verify session belongs to user
    session = service.session_repo.get_by_id(session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screening session not found"
        )
    
    try:
        completed_session = service.complete_screening(session_id)
        
        # Get detailed responses
        _, detailed_responses = service.get_session_with_responses(session_id)
        
        return ScreeningResultResponse(
            session_id=completed_session.id,
            user_id=completed_session.user_id,
            started_at=completed_session.started_at,
            completed_at=completed_session.completed_at,
            raw_score=completed_session.raw_score,
            max_score=AQ10_MAX_SCORE,
            risk_level=completed_session.risk_level.value,
            risk_description=get_risk_description(completed_session.risk_level),
            ml_risk_score=completed_session.ml_risk_score,
            responses=[ScreeningResponseItem(**r) for r in detailed_responses],
            recommendations=get_risk_recommendations(completed_session.risk_level)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# =============================================================================
# History & Results Endpoints
# =============================================================================

@router.get("/history", response_model=ScreeningHistoryResponse)
async def get_screening_history(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's screening history.
    """
    service = ScreeningService(db)
    sessions = service.get_user_history(current_user.id, limit=limit)
    
    return ScreeningHistoryResponse(
        screenings=[
            ScreeningSessionSummary(
                id=s.id,
                started_at=s.started_at,
                completed_at=s.completed_at,
                raw_score=s.raw_score,
                risk_level=s.risk_level.value if s.risk_level else None,
                is_complete=s.completed_at is not None
            )
            for s in sessions
        ],
        total=len(sessions)
    )


@router.get("/sessions/{session_id}", response_model=ScreeningResultResponse)
async def get_screening_result(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the detailed results of a completed screening session.
    """
    service = ScreeningService(db)
    
    try:
        session, detailed_responses = service.get_session_with_responses(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screening session not found"
        )
    
    # Verify ownership
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if not session.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screening session is not complete"
        )
    
    return ScreeningResultResponse(
        session_id=session.id,
        user_id=session.user_id,
        started_at=session.started_at,
        completed_at=session.completed_at,
        raw_score=session.raw_score,
        max_score=AQ10_MAX_SCORE,
        risk_level=session.risk_level.value,
        risk_description=get_risk_description(session.risk_level),
        ml_risk_score=session.ml_risk_score,
        responses=[ScreeningResponseItem(**r) for r in detailed_responses],
        recommendations=get_risk_recommendations(session.risk_level)
    )


@router.get("/latest", response_model=ScreeningResultResponse)
async def get_latest_screening(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the user's most recent completed screening result.
    """
    service = ScreeningService(db)
    session = service.get_latest_completed(current_user.id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed screenings found"
        )
    
    _, detailed_responses = service.get_session_with_responses(session.id)
    
    return ScreeningResultResponse(
        session_id=session.id,
        user_id=session.user_id,
        started_at=session.started_at,
        completed_at=session.completed_at,
        raw_score=session.raw_score,
        max_score=AQ10_MAX_SCORE,
        risk_level=session.risk_level.value,
        risk_description=get_risk_description(session.risk_level),
        ml_risk_score=session.ml_risk_score,
        responses=[ScreeningResponseItem(**r) for r in detailed_responses],
        recommendations=get_risk_recommendations(session.risk_level)
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incomplete_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete an incomplete screening session.
    
    Only incomplete sessions can be deleted.
    """
    service = ScreeningService(db)
    deleted = service.delete_incomplete_session(session_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incomplete screening session not found"
        )
    
    return None
