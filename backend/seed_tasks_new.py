#!/usr/bin/env python3
"""
Seed the 12 medical behavioral tasks across four clinical pillars.

Usage: python seed_tasks.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app.models  # noqa: F401
from app.database import SessionLocal, create_tables
from app.models.task import Task
from app.utils.logging import get_logger

logger = get_logger(__name__)

TASKS = [
    # Pillar I: Executive Function Training
    {
        "name": "N-Back",
        "type": "executive_function",
        "pillar": "executive_function",
        "category": "n_back",
        "description": "Working memory task requiring comparison of current stimulus with one presented N positions earlier. Adaptive difficulty scales from 1-Back to 3-Back with varying inter-stimulus intervals."
    },
    {
        "name": "Go/No-Go",
        "type": "executive_function",
        "pillar": "executive_function",
        "category": "go_nogo",
        "description": "Inhibitory control task measuring ability to suppress prepotent responses. Go/No-Go ratio creates habitual response that must be consciously inhibited."
    },
    {
        "name": "DCCS",
        "type": "executive_function",
        "pillar": "executive_function",
        "category": "dccs",
        "description": "Dimensional Change Card Sort task assessing cognitive flexibility. Sort cards by changing rules (color/shape) to measure set-shifting ability and switch cost."
    },
    {
        "name": "Tower Task",
        "type": "executive_function",
        "pillar": "executive_function",
        "category": "tower_task",
        "description": "Planning and problem-solving task. Move disks to match target configuration in minimum moves, measuring first-choice accuracy and planning efficiency."
    },

    # Pillar II: Social Cognition
    {
        "name": "Facial Emotion Recognition",
        "type": "social_cognition",
        "pillar": "social_cognition",
        "category": "fer",
        "description": "Emotion recognition task with intensity scaling. Identify facial expressions at varying intensities (100%, 50%, 20%) to measure perceptual sensitivity threshold."
    },
    {
        "name": "False Belief Scenarios",
        "type": "social_cognition",
        "pillar": "social_cognition",
        "category": "false_belief",
        "description": "Theory of Mind assessment using gamified false belief scenarios. Predict character behavior based on their potentially incorrect beliefs about situations."
    },
    {
        "name": "Social Stories",
        "type": "social_cognition",
        "pillar": "social_cognition",
        "category": "social_stories",
        "description": "Social narrative comprehension featuring descriptive and perspective-taking sentences. Maintains Gray Sentence Ratio of 2-5 descriptive sentences per directive."
    },
    {
        "name": "Conversation Practice",
        "type": "social_cognition",
        "pillar": "social_cognition",
        "category": "conversation",
        "description": "Social pragmatics training covering turn-taking cues, greeting scripts, and conflict negotiation through interactive conversation scenarios."
    },

    # Pillar III: Joint Attention
    {
        "name": "Responding to Joint Attention",
        "type": "joint_attention",
        "pillar": "joint_attention",
        "category": "joint_attention_rja",
        "description": "RJA task using ABA Prompt Hierarchy with systematic prompt fading. Follow virtual character cues (voice, point, head turn, gaze) to find targets."
    },
    {
        "name": "Initiating Joint Attention",
        "type": "joint_attention",
        "pillar": "joint_attention",
        "category": "joint_attention_ija",
        "description": "IJA task with cause-and-effect anomaly detection. Spot unusual objects and share discoveries with virtual character to practice initiating shared attention."
    },

    # Pillar IV: Sensory-Perceptual
    {
        "name": "Visual Temporal Processing",
        "type": "sensory_perceptual",
        "pillar": "sensory_perceptual",
        "category": "visual_temporal",
        "description": "Psychophysical assessment using adaptive 3-down/1-up staircase method to measure visual temporal discrimination threshold for duration comparison."
    },
    {
        "name": "Auditory Processing",
        "type": "sensory_perceptual",
        "pillar": "sensory_perceptual",
        "category": "auditory_processing",
        "description": "Tone frequency discrimination using adaptive staircase method. Assesses auditory perceptual processing abilities converging to 79.4% detection threshold."
    },
]


def seed_tasks(force=False):
    create_tables()
    db = SessionLocal()

    try:
        existing = db.query(Task).count()
        if existing > 0 and not force:
            logger.warning(f"Tasks already seeded ({existing} found). Use force=True to reseed.")
            print(f"Tasks already exist ({existing}). Use --force to reseed.")
            return existing

        if force and existing > 0:
            db.query(Task).delete()
            db.commit()
            print(f"Deleted {existing} existing tasks.")

        for t in TASKS:
            task = Task(
                name=t["name"],
                type=t.get("type"),
                pillar=t.get("pillar"),
                category=t.get("category"),
                description=t.get("description")
            )
            db.add(task)

        db.commit()
        logger.info(f"Seeded {len(TASKS)} medical tasks")
        print(f"Successfully seeded {len(TASKS)} medical tasks across 4 pillars!")
        return len(TASKS)

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding tasks: {str(e)}")
        print(f"Error seeding tasks: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    print("Starting task seed...")
    seed_tasks(force=force)
    print("Done!")
