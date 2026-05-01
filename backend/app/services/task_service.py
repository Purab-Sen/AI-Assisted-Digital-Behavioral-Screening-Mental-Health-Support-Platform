"""
Task Service

Business logic for behavioral tasks, session management, and performance tracking.
Implements medically accurate neuropsychological paradigms across four intervention pillars.
"""
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.task import Task, TaskSession, TaskResult
from app.repositories.task_repository import (
    TaskRepository,
    TaskSessionRepository,
    TaskResultRepository
)
from app.utils.logging import get_logger

logger = get_logger(__name__)


# =============================================================================
# Task Configuration - Four Clinical Pillars
# =============================================================================

TASK_CONFIG = {
    # =========================================================================
    # PILLAR I: Executive Function Training and Cognitive Remediation
    # =========================================================================

    "n_back": {
        "pillar": "executive_function",
        "paradigm": "Working Memory",
        "instructions": """N-Back Working Memory Task

You will see a sequence of items appearing one at a time.
Your job is to decide if the CURRENT item matches the item shown N positions back.

Press the MATCH button (or Space) when you see a match.
Do nothing when there is no match.

Try to be both fast and accurate. The task adapts to your performance.""",
        "estimated_duration": 300,
        "difficulty_levels": {
            "1": {
                "label": "1-Back Easy",
                "n": 1,
                "total_trials": 20,
                "target_percentage": 0.30,
                "isi_ms": 3000,
                "stimulus_duration_ms": 2000,
                "practice_trials": 5,
                "description": "1-Back with letters, 3s between items"
            },
            "2": {
                "label": "2-Back Medium",
                "n": 2,
                "total_trials": 25,
                "target_percentage": 0.30,
                "isi_ms": 2000,
                "stimulus_duration_ms": 1500,
                "practice_trials": 5,
                "description": "2-Back with letters, 2s between items"
            },
            "3": {
                "label": "3-Back Hard",
                "n": 3,
                "total_trials": 30,
                "target_percentage": 0.30,
                "isi_ms": 1500,
                "stimulus_duration_ms": 1000,
                "practice_trials": 5,
                "description": "3-Back with letters, 1.5s between items"
            }
        },
        "metrics": ["hit_rate", "accuracy", "false_alarm_rate", "reaction_time_avg", "reaction_time_variability", "d_prime"],
        "ai_progress_metric": "hit_rate"
    },

    "go_nogo": {
        "pillar": "executive_function",
        "paradigm": "Inhibitory Control",
        "instructions": """Go/No-Go Inhibitory Control Task

You will see stimuli appearing on screen one at a time.
Press the button (or Space) as fast as you can for GO stimuli.
Do NOT press anything for NO-GO stimuli.

A strong habit to press will be created - you must actively inhibit your response on No-Go trials.

Watch for the instructions showing which stimuli are Go and which are No-Go.""",
        "estimated_duration": 240,
        "difficulty_levels": {
            "1": {
                "label": "Balanced (50:50)",
                "go_ratio": 0.50,
                "stimulus_duration_ms": 800,
                "isi_ms": 1500,
                "total_trials": 40,
                "go_stimulus": "🟢",
                "nogo_stimulus": "🔴",
                "description": "Equal Go/No-Go ratio with neutral icons"
            },
            "2": {
                "label": "High Go (70:30)",
                "go_ratio": 0.70,
                "stimulus_duration_ms": 600,
                "isi_ms": 1200,
                "total_trials": 50,
                "go_stimulus": "🟢",
                "nogo_stimulus": "🔴",
                "description": "70% Go trials creating response bias"
            },
            "3": {
                "label": "Very High Go (80:20)",
                "go_ratio": 0.80,
                "stimulus_duration_ms": 400,
                "isi_ms": 1000,
                "total_trials": 60,
                "go_stimulus": "🟢",
                "nogo_stimulus": "🔴",
                "description": "80% Go trials with fast pacing"
            }
        },
        "metrics": ["false_alarm_rate", "go_accuracy", "nogo_accuracy", "go_reaction_time_avg", "reaction_time_variability", "omission_errors", "commission_errors"],
        "ai_progress_metric": "false_alarm_rate"
    },

    "dccs": {
        "pillar": "executive_function",
        "paradigm": "Cognitive Flexibility",
        "instructions": """Dimensional Change Card Sort (DCCS) Task

You will see cards with colored shapes. Sort each card by matching it
to one of two target cards.

The sorting rule will change between COLOR and SHAPE.
Pay attention to the current rule displayed at the top.

When the rule switches, you must quickly adapt your sorting strategy.
Your speed difference between switch and non-switch trials measures cognitive flexibility.""",
        "estimated_duration": 240,
        "difficulty_levels": {
            "1": {
                "label": "Blocked (10+10)",
                "mode": "blocked",
                "trials_per_block": 10,
                "total_trials": 20,
                "response_timeout_ms": 5000,
                "shapes": ["star", "circle", "diamond"],
                "colors": ["#e74c3c", "#3498db", "#2ecc71"],
                "description": "10 shape trials then 10 color trials"
            },
            "2": {
                "label": "Alternating Blocks",
                "mode": "alternating",
                "trials_per_block": 5,
                "total_trials": 30,
                "response_timeout_ms": 4000,
                "shapes": ["star", "circle", "diamond", "square"],
                "colors": ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"],
                "description": "Alternating blocks of 5 trials"
            },
            "3": {
                "label": "Random Switch",
                "mode": "random_switch",
                "min_before_switch": 1,
                "max_before_switch": 3,
                "total_trials": 40,
                "response_timeout_ms": 3000,
                "shapes": ["star", "circle", "diamond", "square", "triangle"],
                "colors": ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"],
                "description": "Random rule switches after 1-3 trials"
            }
        },
        "metrics": ["accuracy", "switch_cost_rt", "non_switch_accuracy", "switch_accuracy", "avg_reaction_time", "perseverative_errors"],
        "ai_progress_metric": "switch_cost_rt"
    },

    "tower_task": {
        "pillar": "executive_function",
        "paradigm": "Planning",
        "instructions": """Tower Planning Task

Move disks from the starting configuration to match the target configuration.

Rules:
- Only move one disk at a time (drag from top of a peg to another peg)
- A larger disk cannot be placed on top of a smaller disk
- Try to solve each puzzle in the minimum number of moves

Your planning ability is measured by how often you solve puzzles on the first attempt.""",
        "estimated_duration": 360,
        "difficulty_levels": {
            "1": {
                "label": "Simple (2-3 moves)",
                "num_disks": 3,
                "num_puzzles": 5,
                "min_moves": 2,
                "max_moves": 3,
                "time_limit_per_puzzle": 60,
                "description": "3 disks, 2-3 moves to solve"
            },
            "2": {
                "label": "Medium (4-5 moves)",
                "num_disks": 4,
                "num_puzzles": 5,
                "min_moves": 4,
                "max_moves": 7,
                "time_limit_per_puzzle": 90,
                "description": "4 disks, 4-5 optimal moves"
            },
            "3": {
                "label": "Complex (6+ moves)",
                "num_disks": 5,
                "num_puzzles": 5,
                "min_moves": 6,
                "max_moves": 15,
                "time_limit_per_puzzle": 120,
                "description": "5 disks, 6+ optimal moves, time limit"
            }
        },
        "metrics": ["problems_solved_first_try", "total_solved", "avg_extra_moves", "avg_planning_time", "total_moves"],
        "ai_progress_metric": "problems_solved_first_try"
    },

    # =========================================================================
    # PILLAR II: Social Cognition and Affective Computing
    # =========================================================================

    "fer": {
        "pillar": "social_cognition",
        "paradigm": "Emotion Recognition",
        "instructions": """Facial Emotion Recognition (FER) Task

You will see faces showing different emotions at varying intensities.
Select the emotion that best matches what the person is feeling.

Emotions include: Happy, Sad, Angry, Fearful, Surprised, and Neutral.

The faces may show very subtle expressions - take your time and look carefully.
Your ability to detect subtle emotions is an important social skill.""",
        "estimated_duration": 300,
        "difficulty_levels": {
            "1": {
                "label": "Clear Emotions (100%)",
                "intensity": 1.0,
                "total_faces": 18,
                "emotions": ["happy", "sad", "angry", "fearful", "surprised", "neutral"],
                "use_context": False,
                "time_limit_per_face": 10,
                "description": "Static faces at full intensity"
            },
            "2": {
                "label": "Moderate (50%)",
                "intensity": 0.5,
                "total_faces": 24,
                "emotions": ["happy", "sad", "angry", "fearful", "surprised", "neutral"],
                "use_context": False,
                "time_limit_per_face": 10,
                "description": "Faces at 50% expression intensity"
            },
            "3": {
                "label": "Subtle (20%)",
                "intensity": 0.2,
                "total_faces": 24,
                "emotions": ["happy", "sad", "angry", "fearful", "surprised", "neutral"],
                "use_context": True,
                "time_limit_per_face": 15,
                "description": "Subtle 20% intensity with contextual backgrounds"
            }
        },
        "metrics": ["overall_accuracy", "accuracy_per_emotion", "avg_reaction_time", "intensity_threshold"],
        "ai_progress_metric": "overall_accuracy"
    },

    "false_belief": {
        "pillar": "social_cognition",
        "paradigm": "Theory of Mind",
        "instructions": """Theory of Mind: False Belief Scenarios

You will read short stories about characters in different situations.
Then answer questions about what the characters think, know, or want.

Remember: Characters may have beliefs that are DIFFERENT from what you know.
Think about what THEY believe, not what YOU know to be true.

This task measures your ability to understand other people's perspectives.""",
        "estimated_duration": 300,
        "difficulty_levels": {
            "1": {
                "label": "Diverse Desires",
                "scenario_type": "diverse_desires",
                "total_scenarios": 6,
                "time_limit_per_scenario": 60,
                "description": "Simple preference understanding"
            },
            "2": {
                "label": "Knowledge Access",
                "scenario_type": "knowledge_access",
                "total_scenarios": 6,
                "time_limit_per_scenario": 60,
                "description": "Understanding what others know/see"
            },
            "3": {
                "label": "Location Change (Sally-Anne)",
                "scenario_type": "location_change",
                "total_scenarios": 6,
                "time_limit_per_scenario": 90,
                "description": "Classic false belief with location changes"
            }
        },
        "metrics": ["logical_consistency_score", "accuracy", "avg_response_time", "mental_state_understanding"],
        "ai_progress_metric": "logical_consistency_score"
    },

    "social_stories": {
        "pillar": "social_cognition",
        "paradigm": "Behavioral Logic",
        "instructions": """Social Stories Comprehension

You will read social stories that describe everyday situations.
After each story, answer questions to show your understanding.

These stories help practice understanding social rules and expectations.
Pay attention to how characters feel and why they behave the way they do.""",
        "estimated_duration": 300,
        "difficulty_levels": {
            "1": {
                "label": "Concrete Routines",
                "story_length": "short",
                "num_stories": 4,
                "sentence_count_range": [5, 10],
                "question_type": "comprehension",
                "description": "5-10 sentence stories about concrete routines"
            },
            "2": {
                "label": "Perspective Focus",
                "story_length": "medium",
                "num_stories": 4,
                "sentence_count_range": [10, 15],
                "question_type": "perspective",
                "description": "10-15 sentence stories with perspective questions"
            },
            "3": {
                "label": "Interactive Resolution",
                "story_length": "long",
                "num_stories": 4,
                "sentence_count_range": [12, 18],
                "question_type": "interactive",
                "description": "Interactive stories with multiple-choice resolutions"
            }
        },
        "metrics": ["comprehension_score", "perspective_accuracy", "avg_response_time"],
        "ai_progress_metric": "comprehension_score"
    },

    "conversation": {
        "pillar": "social_cognition",
        "paradigm": "Social Pragmatics",
        "instructions": """Conversation Skills Practice

Practice different social conversation skills through interactive scenarios.
You will see conversation situations and need to identify or choose appropriate responses.

Skills include: turn-taking, greetings, and managing social interactions.
Pay attention to social cues and timing.""",
        "estimated_duration": 300,
        "difficulty_levels": {
            "1": {
                "label": "Turn-Taking Cues",
                "skill_focus": "turn_taking",
                "num_scenarios": 6,
                "description": "Identifying when it is your turn to speak"
            },
            "2": {
                "label": "Greeting Scripts",
                "skill_focus": "greetings",
                "num_scenarios": 6,
                "description": "Scripting appropriate greetings for situations"
            },
            "3": {
                "label": "Conflict Resolution",
                "skill_focus": "conflict",
                "num_scenarios": 6,
                "description": "Managing disagreements and negotiations"
            }
        },
        "metrics": ["cue_identification_accuracy", "response_appropriateness", "avg_latency_ms"],
        "ai_progress_metric": "cue_identification_accuracy"
    },

    # =========================================================================
    # PILLAR III: Joint Attention and Triadic Interaction
    # =========================================================================

    "joint_attention_rja": {
        "pillar": "joint_attention",
        "paradigm": "Responding to Joint Attention",
        "instructions": """Responding to Joint Attention (RJA)

A virtual character will direct your attention to objects on the screen
using different types of cues (voice, pointing, head turns, or gaze).

Follow the character's cues and tap the target object they are indicating.

As you improve, the cues will become more subtle, requiring you to
read increasingly nuanced social signals.""",
        "estimated_duration": 240,
        "difficulty_levels": {
            "1": {
                "label": "Full Cues (Voice+Point+Turn)",
                "prompt_type": "full",
                "cues": ["voice", "point", "head_turn"],
                "target_type": "enticing",
                "total_trials": 15,
                "response_timeout_ms": 8000,
                "description": "Voice + pointing + head turn toward sparkling target"
            },
            "2": {
                "label": "Partial Cues (Point+Turn)",
                "prompt_type": "partial",
                "cues": ["point", "head_turn"],
                "target_type": "familiar",
                "total_trials": 18,
                "response_timeout_ms": 6000,
                "description": "Pointing and head turn without voice"
            },
            "3": {
                "label": "Gaze Only",
                "prompt_type": "gaze_only",
                "cues": ["gaze_shift"],
                "target_type": "subtle",
                "num_distractors": 3,
                "total_trials": 20,
                "response_timeout_ms": 5000,
                "description": "Subtle gaze shift only, targets among distractors"
            }
        },
        "metrics": ["accuracy", "avg_response_latency", "spatial_accuracy", "prompt_independence_score"],
        "ai_progress_metric": "accuracy"
    },

    "joint_attention_ija": {
        "pillar": "joint_attention",
        "paradigm": "Initiating Joint Attention",
        "instructions": """Initiating Joint Attention (IJA)

Look for unusual or out-of-place objects that appear on the screen.
When you spot something interesting, tap it to select it,
then tap the character to share your discovery with them.

This practices the skill of initiating shared attention -
wanting to show others things you find interesting.""",
        "estimated_duration": 240,
        "difficulty_levels": {
            "1": {
                "label": "Obvious Anomalies",
                "anomaly_type": "obvious",
                "total_trials": 10,
                "scene_complexity": "simple",
                "time_limit": 15,
                "description": "Very obvious unusual objects in simple scenes"
            },
            "2": {
                "label": "Moderate Anomalies",
                "anomaly_type": "moderate",
                "total_trials": 12,
                "scene_complexity": "moderate",
                "time_limit": 12,
                "description": "Less obvious anomalies in busier scenes"
            },
            "3": {
                "label": "Subtle Anomalies",
                "anomaly_type": "subtle",
                "total_trials": 15,
                "scene_complexity": "complex",
                "time_limit": 10,
                "description": "Subtle out-of-place elements in complex scenes"
            }
        },
        "metrics": ["detection_accuracy", "sharing_rate", "avg_detection_time", "avg_sharing_time"],
        "ai_progress_metric": "sharing_rate"
    },

    # =========================================================================
    # PILLAR IV: Sensory-Perceptual Thresholding and Adaptation
    # =========================================================================

    "visual_temporal": {
        "pillar": "sensory_perceptual",
        "paradigm": "Visual Temporal Processing",
        "instructions": """Visual Temporal Processing Task

You will see two visual stimuli presented one after the other.
Decide which one lasted LONGER.

This uses an adaptive staircase method - the difference between
durations will get smaller as you answer correctly.

This helps build your sensory profile for visual processing.""",
        "estimated_duration": 240,
        "difficulty_levels": {
            "1": {
                "label": "Large Differences",
                "base_duration_ms": 500,
                "initial_difference_ms": 300,
                "min_difference_ms": 50,
                "step_down_ms": 30,
                "step_up_ms": 60,
                "total_trials": 30,
                "staircase_rule": "3down_1up",
                "description": "300ms initial difference, 3-down/1-up staircase"
            },
            "2": {
                "label": "Medium Differences",
                "base_duration_ms": 400,
                "initial_difference_ms": 200,
                "min_difference_ms": 30,
                "step_down_ms": 20,
                "step_up_ms": 40,
                "total_trials": 35,
                "staircase_rule": "3down_1up",
                "description": "200ms initial difference, finer steps"
            },
            "3": {
                "label": "Small Differences",
                "base_duration_ms": 350,
                "initial_difference_ms": 150,
                "min_difference_ms": 10,
                "step_down_ms": 10,
                "step_up_ms": 30,
                "total_trials": 40,
                "staircase_rule": "3down_1up",
                "description": "150ms initial difference, very fine discrimination"
            }
        },
        "metrics": ["threshold_ms", "accuracy", "reversals", "avg_reaction_time"],
        "ai_progress_metric": "threshold_ms"
    },

    "auditory_processing": {
        "pillar": "sensory_perceptual",
        "paradigm": "Auditory Perceptual Processing",
        "instructions": """Auditory Tone Detection Task

You will hear two tones played one after the other.
Decide which tone was HIGHER in pitch.

The difference between tones will adapt based on your performance.
This helps assess your auditory processing abilities.

Make sure your device volume is at a comfortable level before starting.""",
        "estimated_duration": 240,
        "difficulty_levels": {
            "1": {
                "label": "Large Pitch Differences",
                "base_frequency_hz": 440,
                "initial_difference_hz": 100,
                "min_difference_hz": 10,
                "step_down_hz": 10,
                "step_up_hz": 20,
                "tone_duration_ms": 500,
                "gap_ms": 500,
                "total_trials": 30,
                "staircase_rule": "3down_1up",
                "description": "100Hz initial difference, clear tonal contrast"
            },
            "2": {
                "label": "Medium Pitch Differences",
                "base_frequency_hz": 440,
                "initial_difference_hz": 60,
                "min_difference_hz": 5,
                "step_down_hz": 5,
                "step_up_hz": 15,
                "tone_duration_ms": 400,
                "gap_ms": 400,
                "total_trials": 35,
                "staircase_rule": "3down_1up",
                "description": "60Hz initial difference, moderate contrast"
            },
            "3": {
                "label": "Fine Pitch Discrimination",
                "base_frequency_hz": 440,
                "initial_difference_hz": 30,
                "min_difference_hz": 2,
                "step_down_hz": 3,
                "step_up_hz": 9,
                "tone_duration_ms": 300,
                "gap_ms": 300,
                "total_trials": 40,
                "staircase_rule": "3down_1up",
                "description": "30Hz initial difference, fine discrimination"
            }
        },
        "metrics": ["threshold_hz", "accuracy", "reversals", "avg_reaction_time"],
        "ai_progress_metric": "threshold_hz"
    },
}

DEFAULT_CONFIG = {
    "instructions": "Complete this behavioral task according to the on-screen prompts.",
    "estimated_duration": 180,
    "difficulty_levels": {
        "1": {"label": "Easy", "description": "Easy difficulty"},
        "2": {"label": "Medium", "description": "Medium difficulty"},
        "3": {"label": "Hard", "description": "Hard difficulty"},
    },
    "config": {},
    "metrics": ["score", "completion_time"]
}


# =============================================================================
# Task Service Class
# =============================================================================

class TaskService:
    """Service for managing behavioral tasks and sessions."""

    def __init__(self, db: Session):
        self.db = db
        self.task_repo = TaskRepository(db)
        self.session_repo = TaskSessionRepository(db)
        self.result_repo = TaskResultRepository(db)

    def get_all_tasks(self) -> List[Task]:
        return self.task_repo.get_all()

    def get_task_by_id(self, task_id: int) -> Optional[Task]:
        return self.task_repo.get_by_id(task_id)

    def get_tasks_by_type(self, task_type: str) -> List[Task]:
        return self.task_repo.get_by_type(task_type)

    def get_task_config(self, task: Task, difficulty_level: int = 1) -> Dict[str, Any]:
        """Get task configuration based on task category and difficulty."""
        category = task.category.lower() if task.category else "default"
        config = TASK_CONFIG.get(category, DEFAULT_CONFIG)
        dl = str(difficulty_level)
        level_config = config.get("difficulty_levels", {}).get(dl, {})
        return {
            "instructions": config.get("instructions", "").strip(),
            "estimated_duration": config.get("estimated_duration", 180),
            "difficulty_levels": config.get("difficulty_levels", {}),
            "config": level_config
        }

    def start_session(self, user_id: int, task_id: int, difficulty_level: int = 1) -> Tuple[TaskSession, Dict[str, Any]]:
        task = self.get_task_by_id(task_id)
        if not task:
            raise ValueError("Task not found")

        incomplete = self.db.query(TaskSession).filter(
            TaskSession.user_id == user_id,
            TaskSession.task_id == task_id,
            TaskSession.completed_at.is_(None)
        ).first()

        if incomplete:
            self.db.delete(incomplete)
            self.db.commit()

        session = TaskSession(
            user_id=user_id,
            task_id=task_id,
            difficulty_level=difficulty_level
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        config = self.get_task_config(task, difficulty_level)
        logger.info(f"Started task session {session.id} for user {user_id}, task {task_id}, difficulty {difficulty_level}")
        return session, config

    def submit_result(self, session_id: int, metric_name: str, metric_value: float) -> TaskResult:
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError("Task session not found")
        if session.completed_at:
            raise ValueError("Task session is already complete")

        existing = self.db.query(TaskResult).filter(
            TaskResult.task_session_id == session_id,
            TaskResult.metric_name == metric_name
        ).first()

        if existing:
            existing.metric_value = metric_value
            self.db.commit()
            self.db.refresh(existing)
            return existing

        result = TaskResult(
            task_session_id=session_id,
            metric_name=metric_name,
            metric_value=metric_value
        )
        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)
        return result

    def complete_session(self, session_id: int, results: List[Dict[str, Any]]) -> TaskSession:
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError("Task session not found")
        if session.completed_at:
            raise ValueError("Task session is already complete")

        for result_data in results:
            self.submit_result(
                session_id=session_id,
                metric_name=result_data["metric_name"],
                metric_value=result_data["metric_value"]
            )

        session.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(session)
        logger.info(f"Completed task session {session_id}")
        return session

    def get_session_with_results(self, session_id: int) -> Tuple[TaskSession, List[TaskResult]]:
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError("Task session not found")
        results = self.result_repo.get_by_session_id(session_id)
        return session, results

    def get_user_history(self, user_id: int, limit: int = 20) -> List[TaskSession]:
        return self.db.query(TaskSession).filter(
            TaskSession.user_id == user_id
        ).order_by(TaskSession.started_at.desc()).limit(limit).all()

    def get_user_task_progress(self, user_id: int, task_id: int) -> Dict[str, Any]:
        sessions = self.db.query(TaskSession).filter(
            TaskSession.user_id == user_id,
            TaskSession.task_id == task_id
        ).all()
        completed_sessions = [s for s in sessions if s.completed_at]

        if not completed_sessions:
            return {
                "total_attempts": len(sessions),
                "completed_attempts": 0,
                "best_score": None,
                "average_score": None,
                "last_attempt": sessions[0].started_at if sessions else None,
                "improvement_trend": None
            }

        scores = []
        for session in completed_sessions:
            results = self.result_repo.get_by_session_id(session.id)
            score_result = next(
                (r for r in results if r.metric_name in [
                    "accuracy", "score", "overall_accuracy", "hit_rate",
                    "comprehension_score", "detection_accuracy",
                    "logical_consistency_score", "cue_identification_accuracy"
                ]),
                results[0] if results else None
            )
            if score_result:
                scores.append(score_result.metric_value)

        trend = None
        if len(scores) >= 3:
            recent_avg = sum(scores[-3:]) / 3
            older_avg = sum(scores[:-3]) / max(len(scores) - 3, 1) if len(scores) > 3 else scores[0]
            if recent_avg > older_avg * 1.05:
                trend = "improving"
            elif recent_avg < older_avg * 0.95:
                trend = "declining"
            else:
                trend = "stable"

        return {
            "total_attempts": len(sessions),
            "completed_attempts": len(completed_sessions),
            "best_score": max(scores) if scores else None,
            "average_score": sum(scores) / len(scores) if scores else None,
            "last_attempt": completed_sessions[0].completed_at if completed_sessions else None,
            "improvement_trend": trend
        }

    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        sessions = self.db.query(TaskSession).filter(
            TaskSession.user_id == user_id
        ).all()
        completed = [s for s in sessions if s.completed_at]

        total_time = 0
        for session in completed:
            if session.started_at and session.completed_at:
                duration = (session.completed_at - session.started_at).total_seconds()
                total_time += duration

        task_counts = {}
        for session in completed:
            task_counts[session.task_id] = task_counts.get(session.task_id, 0) + 1

        favorite_task_id = max(task_counts, key=task_counts.get) if task_counts else None
        favorite_task = None
        if favorite_task_id:
            task = self.get_task_by_id(favorite_task_id)
            favorite_task = task.name if task else None

        unique_tasks = set(s.task_id for s in sessions)

        return {
            "total_tasks_attempted": len(unique_tasks),
            "total_sessions_completed": len(completed),
            "total_time_spent_seconds": int(total_time),
            "favorite_task": favorite_task
        }

    def calculate_performance_summary(self, task: Task, results: List[TaskResult]) -> Dict[str, Any]:
        results_dict = {r.metric_name: r.metric_value for r in results}
        category = task.category.lower() if task.category else "default"

        summary = {
            "metrics": results_dict,
            "interpretation": []
        }

        # Pillar I interpretations
        if category == "n_back":
            hit_rate = results_dict.get("hit_rate", 0)
            if hit_rate >= 90:
                summary["interpretation"].append("Excellent working memory performance")
            elif hit_rate >= 70:
                summary["interpretation"].append("Good working memory with room for improvement")
            else:
                summary["interpretation"].append("Working memory may benefit from continued practice")
            fa = results_dict.get("false_alarm_rate", 0)
            if fa > 30:
                summary["interpretation"].append("High false alarm rate suggests difficulty with interference resolution")

        elif category == "go_nogo":
            fa = results_dict.get("false_alarm_rate", 0)
            if fa <= 15:
                summary["interpretation"].append("Excellent inhibitory control")
            elif fa <= 30:
                summary["interpretation"].append("Moderate inhibitory control - some impulsive responses noted")
            else:
                summary["interpretation"].append("Inhibitory control difficulties - frequent false alarms")
            rtv = results_dict.get("reaction_time_variability", 0)
            if rtv > 200:
                summary["interpretation"].append("High response time variability indicates attention inconsistency")

        elif category == "dccs":
            switch_cost = results_dict.get("switch_cost_rt", 0)
            if switch_cost < 200:
                summary["interpretation"].append("Excellent cognitive flexibility - minimal switch cost")
            elif switch_cost < 500:
                summary["interpretation"].append("Moderate cognitive flexibility")
            else:
                summary["interpretation"].append("Significant switch cost - flexibility may benefit from practice")

        elif category == "tower_task":
            first_try = results_dict.get("problems_solved_first_try", 0)
            total = results_dict.get("total_solved", 0)
            if total > 0 and first_try / total >= 0.8:
                summary["interpretation"].append("Strong planning and problem-solving abilities")
            elif total > 0 and first_try / total >= 0.5:
                summary["interpretation"].append("Adequate planning with some trial-and-error")
            else:
                summary["interpretation"].append("Planning skills may benefit from continued practice")

        # Pillar II interpretations
        elif category == "fer":
            accuracy = results_dict.get("overall_accuracy", 0)
            if accuracy >= 85:
                summary["interpretation"].append("Strong emotion recognition abilities")
            elif accuracy >= 65:
                summary["interpretation"].append("Moderate emotion recognition - some expressions may be challenging")
            else:
                summary["interpretation"].append("Emotion recognition could benefit from targeted practice")

        elif category == "false_belief":
            score = results_dict.get("logical_consistency_score", 0)
            if score >= 85:
                summary["interpretation"].append("Strong Theory of Mind - good perspective-taking ability")
            elif score >= 60:
                summary["interpretation"].append("Developing Theory of Mind - shows understanding in some scenarios")
            else:
                summary["interpretation"].append("Theory of Mind is an area for growth with continued practice")

        elif category == "social_stories":
            comp = results_dict.get("comprehension_score", 0)
            if comp >= 85:
                summary["interpretation"].append("Excellent social story comprehension")
            elif comp >= 60:
                summary["interpretation"].append("Good understanding with some areas to develop")
            else:
                summary["interpretation"].append("Social comprehension may benefit from repeated exposure")

        # Pillar III interpretations
        elif category in ("joint_attention_rja", "joint_attention_ija"):
            accuracy = results_dict.get("accuracy", results_dict.get("detection_accuracy", 0))
            if accuracy >= 85:
                summary["interpretation"].append("Strong joint attention skills")
            elif accuracy >= 60:
                summary["interpretation"].append("Developing joint attention - progressing well")
            else:
                summary["interpretation"].append("Joint attention is an important area for continued practice")

        # Pillar IV interpretations
        elif category == "visual_temporal":
            threshold = results_dict.get("threshold_ms", 999)
            if threshold < 50:
                summary["interpretation"].append("Excellent visual temporal discrimination")
            elif threshold < 150:
                summary["interpretation"].append("Good visual temporal processing")
            else:
                summary["interpretation"].append("Visual temporal processing shows room for refinement")

        elif category == "auditory_processing":
            threshold = results_dict.get("threshold_hz", 999)
            if threshold < 15:
                summary["interpretation"].append("Excellent auditory pitch discrimination")
            elif threshold < 40:
                summary["interpretation"].append("Good auditory processing abilities")
            else:
                summary["interpretation"].append("Auditory processing may benefit from practice")

        return summary

    def delete_incomplete_session(self, session_id: int, user_id: int) -> bool:
        session = self.db.query(TaskSession).filter(
            TaskSession.id == session_id,
            TaskSession.user_id == user_id,
            TaskSession.completed_at.is_(None)
        ).first()
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
        return False
