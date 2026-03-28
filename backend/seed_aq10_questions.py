#!/usr/bin/env python
"""
Seed AQ-10 screening questions and options into the database.

Reads from app/data/aq10_child.json, aq10_adolescent.json, aq10_adult.json.
Each JSON has this shape:
  {
    "age_group": "adult",
    "questions": [
      { "label": "AQ1", "text": "...", "options": [{"text":"...", "value": 0|1}, ...] }
    ]
  }

Usage:
  python seed_aq10_questions.py
  python seed_aq10_questions.py --force    # re-seed even if records exist
"""
import sys
import os
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Ensure all tables exist before seeding
import app.models  # noqa: F401 — registers all ORM models
from app.database import SessionLocal, create_tables
from app.models.screening import Question, Option, AgeGroup
from app.utils.logging import get_logger

logger = get_logger(__name__)

_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'data')

AGE_GROUP_FILES = [
    ('child',       'aq10_child.json'),
    ('adolescent',  'aq10_adolescent.json'),
    ('adult',       'aq10_adult.json'),
]


def load_all_questions():
    """
    Load questions from all three JSON files.
    Returns a list of dicts with keys: label, text, age_group, options[{text, value}]
    """
    all_questions = []
    for group_str, filename in AGE_GROUP_FILES:
        path = os.path.join(_DATA_DIR, filename)
        if not os.path.exists(path):
            print(f"  ⚠ {filename} not found — skipping {group_str}")
            continue
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        raw_questions = data.get('questions', [])
        for q in raw_questions:
            all_questions.append({
                'label':     q.get('label', ''),
                'text':      q['text'],
                'age_group': group_str,
                # JSON uses "value" for score
                'options': [
                    {'text': o['text'], 'value': o.get('value', o.get('score', 0))}
                    for o in q.get('options', [])
                ],
            })
        print(f"  ✓ Loaded {len(raw_questions)} questions from {filename} ({group_str})")
    return all_questions


def seed_questions(force: bool = False):
    """Insert AQ-10 questions and options into the database."""
    # Create tables if they don't exist yet
    create_tables()

    db = SessionLocal()
    try:
        existing_count = db.query(Question).count()
        if existing_count > 0 and not force:
            print(f"✓ Questions already exist ({existing_count} rows). Use --force to re-seed.")
            return existing_count

        if force and existing_count > 0:
            print(f"  Deleting {existing_count} existing question(s) for fresh seed…")
            db.query(Option).delete()
            db.query(Question).delete()
            db.commit()

        questions = load_all_questions()
        if not questions:
            print("✗ No questions loaded — check that app/data/*.json files exist.")
            return 0

        for q_data in questions:
            ag = q_data['age_group']
            try:
                age_group_enum = AgeGroup(ag)
            except ValueError:
                age_group_enum = AgeGroup.ADULT

            question = Question(
                label=q_data['label'],
                text=q_data['text'],
                age_group=age_group_enum,
            )
            db.add(question)
            db.flush()   # get question.id

            for opt in q_data['options']:
                db.add(Option(
                    question_id=question.id,
                    text=opt['text'],
                    score_value=opt['value'],
                ))

        db.commit()
        total = len(questions)
        logger.info(f"Seeded {total} AQ-10 questions")
        print(f"✓ Successfully seeded {total} AQ-10 questions across all age groups!")
        return total

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding questions: {e}")
        print(f"✗ Error seeding questions: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed AQ-10 questions")
    parser.add_argument('--force', action='store_true',
                        help='Delete existing questions and re-seed from JSON')
    args = parser.parse_args()

    print("Starting AQ-10 question seed…")
    seed_questions(force=args.force)
    print("Done!")
