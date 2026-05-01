"""
Analysis Routes

Provides aggregated behavioral analysis data for the dashboard.
"""
from typing import Optional
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.user import User
from app.models.journal import JournalEntry, JournalAnalysis
from app.models.screening import ScreeningSession, RiskLevel
from app.models.task import Task, TaskSession, TaskResult
from app.models.additional_screening import AdditionalScreening
from app.models.comorbidity_screening import ComorbidityScreening
from app.models.behavioral_observation import BehavioralObservation
from app.models.referral import Referral
from app.services.normative_service import compute_all_normative_scores, compute_composite_pillar_score
from app.utils.dependencies import get_current_active_user
from app.utils.crypto import decrypt_text

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("/summary")
async def get_analysis_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Return an aggregated behavioral snapshot for the current user.

    Includes:
    - Journal mood & stress trends (last 30 days)
    - Screening history summary (last 5 completed)
    - Combined risk insight
    """
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # ── Journal stats ───────────────────────────────────────────────────────
    journal_entries = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.user_id == current_user.id,
            JournalEntry.created_at >= thirty_days_ago,
        )
        .order_by(JournalEntry.created_at.asc())
        .all()
    )

    mood_scores = [e.mood_rating for e in journal_entries if e.mood_rating is not None]
    stress_scores = [e.stress_rating for e in journal_entries if e.stress_rating is not None]

    avg_mood = round(sum(mood_scores) / len(mood_scores), 1) if mood_scores else None
    avg_stress = round(sum(stress_scores) / len(stress_scores), 1) if stress_scores else None

    # Weekly mood/stress aggregates (4 weeks)
    weekly_mood: dict = {}
    weekly_stress: dict = {}
    for entry in journal_entries:
        week_label = entry.created_at.strftime("W%U")
        if entry.mood_rating is not None:
            weekly_mood.setdefault(week_label, []).append(entry.mood_rating)
        if entry.stress_rating is not None:
            weekly_stress.setdefault(week_label, []).append(entry.stress_rating)

    mood_trend = [
        {"week": w, "avg": round(sum(v) / len(v), 1)}
        for w, v in sorted(weekly_mood.items())
    ]
    stress_trend = [
        {"week": w, "avg": round(sum(v) / len(v), 1)}
        for w, v in sorted(weekly_stress.items())
    ]

    # Mood category label
    def mood_label(score: Optional[float]) -> str:
        if score is None:
            return "No data"
        if score >= 8:
            return "Excellent"
        if score >= 6:
            return "Good"
        if score >= 4:
            return "Neutral"
        if score >= 2:
            return "Low"
        return "Very Low"

    def stress_label(score: Optional[float]) -> str:
        if score is None:
            return "No data"
        if score >= 8:
            return "High"
        if score >= 5:
            return "Moderate"
        return "Low"

    # ── Journal ASD attribute analysis ────────────────────────────────────
    journal_asd_analyses = (
        db.query(JournalAnalysis)
        .join(JournalEntry, JournalAnalysis.journal_id == JournalEntry.id)
        .filter(
            JournalEntry.user_id == current_user.id,
            JournalEntry.created_at >= thirty_days_ago,
        )
        .order_by(JournalEntry.created_at.asc())
        .all()
    )

    asd_attrs = ["mood_valence", "anxiety_level", "social_engagement",
                 "sensory_sensitivity", "emotional_regulation", "repetitive_behavior"]
    asd_averages = {}
    for attr in asd_attrs:
        vals = [getattr(ja, attr) for ja in journal_asd_analyses if getattr(ja, attr) is not None]
        asd_averages[attr] = round(sum(vals) / len(vals), 3) if vals else None

    # Weekly ASD attribute trends
    weekly_asd: dict = defaultdict(lambda: defaultdict(list))
    for ja in journal_asd_analyses:
        week_label = ja.journal_entry.created_at.strftime("W%U") if ja.journal_entry else None
        if not week_label:
            continue
        for attr in asd_attrs:
            val = getattr(ja, attr)
            if val is not None:
                weekly_asd[attr][week_label].append(val)

    asd_trends = {}
    for attr in asd_attrs:
        asd_trends[attr] = [
            {"week": w, "avg": round(sum(v) / len(v), 3)}
            for w, v in sorted(weekly_asd[attr].items())
        ]

    # ── Screening stats ─────────────────────────────────────────────────────
    screenings = (
        db.query(ScreeningSession)
        .filter(
            ScreeningSession.user_id == current_user.id,
            ScreeningSession.completed_at.isnot(None),
        )
        .order_by(ScreeningSession.completed_at.desc())
        .limit(5)
        .all()
    )

    screening_history = [
        {
            "id": s.id,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "raw_score": s.raw_score,
            "risk_level": s.risk_level.value if s.risk_level else None,
            "ml_prediction": s.ml_prediction,
            "ml_probability_label": s.ml_probability_label,
        }
        for s in screenings
    ]

    latest_screening = screenings[0] if screenings else None
    latest_risk = latest_screening.risk_level.value if latest_screening and latest_screening.risk_level else None
    latest_ml_label = latest_screening.ml_probability_label if latest_screening else None

    # ── Combined insight ────────────────────────────────────────────────────
    def combined_insight(risk: Optional[str], mood: Optional[float], stress: Optional[float]) -> str:
        parts = []
        if risk in ("high", "very_high"):
            parts.append("Your latest screening indicates elevated ASD traits.")
        elif risk == "moderate":
            parts.append("Your latest screening suggests some ASD-related traits to watch.")
        elif risk == "low":
            parts.append("Your latest screening shows a low likelihood of ASD traits.")

        if stress is not None and stress >= 7:
            parts.append("Your stress levels have been notably high recently.")
        elif stress is not None and stress >= 5:
            parts.append("Moderate stress levels detected in your recent journals.")

        if mood is not None and mood < 4:
            parts.append("Your mood scores are below average — consider reaching out for support.")
        elif mood is not None and mood >= 7:
            parts.append("Your mood has been positive — keep up the great work!")

        if not parts:
            parts.append("Keep tracking your mood and screening regularly for personalised insights.")
        return " ".join(parts)

    insight = combined_insight(latest_ml_label or latest_risk, avg_mood, avg_stress)

    # ── Task Performance Analytics ──────────────────────────────────────────
    # Clinical metrics per pillar with progression tracking
    task_sessions = (
        db.query(TaskSession)
        .join(Task)
        .filter(
            TaskSession.user_id == current_user.id,
            TaskSession.completed_at.isnot(None),
        )
        .order_by(TaskSession.completed_at.asc())
        .all()
    )

    # Build pillar-level clinical summaries
    pillar_map = {
        "executive_function": "Executive Function",
        "social_cognition": "Social Cognition",
        "joint_attention": "Joint Attention",
        "sensory_processing": "Sensory Processing",
    }

    # Key clinical metrics per task category
    primary_metrics = {
        "nback": "accuracy",
        "go_nogo": "false_alarm_rate",
        "dccs": "switch_cost_ms",
        "tower": "problems_solved_first_choice",
        "fer": "accuracy",
        "false_belief": "logical_consistency",
        "social_stories": "comprehension_score",
        "conversation": "cue_detection_latency",
        "rja": "accuracy",
        "ija": "detection_accuracy",
        "visual_temporal": "accuracy",
        "auditory_processing": "accuracy",
    }

    # Organize sessions by pillar and task
    pillar_sessions = defaultdict(lambda: defaultdict(list))
    for ts in task_sessions:
        pillar = ts.task.pillar or "unknown"
        category = ts.task.category or "unknown"
        results = {r.metric_name: r.metric_value for r in ts.results}
        pillar_sessions[pillar][category].append({
            "session_id": ts.id,
            "task_name": ts.task.name,
            "difficulty_level": ts.difficulty_level,
            "completed_at": ts.completed_at.isoformat() if ts.completed_at else None,
            "duration_sec": (ts.completed_at - ts.started_at).total_seconds() if ts.completed_at and ts.started_at else None,
            "metrics": results,
        })

    # Compute clinical progression per pillar
    pillar_analytics = {}
    for pillar_key, pillar_label in pillar_map.items():
        tasks_in_pillar = pillar_sessions.get(pillar_key, {})
        if not tasks_in_pillar:
            continue

        total_sessions_pillar = sum(len(v) for v in tasks_in_pillar.values())
        task_summaries = []

        for category, sessions in tasks_in_pillar.items():
            primary_metric = primary_metrics.get(category, "accuracy")
            metric_values = []
            for s in sessions:
                val = s["metrics"].get(primary_metric)
                if val is not None:
                    metric_values.append(val)

            if not metric_values:
                continue

            # Compute clinical indicators
            latest_val = metric_values[-1]
            first_val = metric_values[0]

            # For false_alarm_rate & switch_cost, lower is better
            invert = category in ("go_nogo", "dccs", "conversation")

            if len(metric_values) >= 2:
                if invert:
                    improvement = first_val - latest_val
                else:
                    improvement = latest_val - first_val
                improvement_pct = (improvement / max(abs(first_val), 1)) * 100
            else:
                improvement_pct = 0.0

            # Compute Response Time Variability (RTCV) if available
            rtcv = None
            rt_values = [s["metrics"].get("avg_response_time") or s["metrics"].get("avg_response_latency") or s["metrics"].get("avg_detection_time") for s in sessions]
            rt_values = [v for v in rt_values if v is not None]
            if len(rt_values) >= 3:
                import statistics
                mean_rt = statistics.mean(rt_values)
                sd_rt = statistics.stdev(rt_values)
                rtcv = round((sd_rt / mean_rt) * 100, 1) if mean_rt > 0 else None

            # Clinical trend classification
            if improvement_pct > 15:
                trend = "significant_improvement"
            elif improvement_pct > 5:
                trend = "moderate_improvement"
            elif improvement_pct > -5:
                trend = "stable"
            elif improvement_pct > -15:
                trend = "moderate_decline"
            else:
                trend = "significant_decline"

            # Weekly progression for charting
            weekly_data = defaultdict(list)
            for s in sessions:
                if s["completed_at"]:
                    week_label = datetime.fromisoformat(s["completed_at"]).strftime("W%U")
                    val = s["metrics"].get(primary_metric)
                    if val is not None:
                        weekly_data[week_label].append(val)

            weekly_progression = [
                {"week": w, "avg": round(sum(v) / len(v), 2), "count": len(v)}
                for w, v in sorted(weekly_data.items())
            ]

            task_summaries.append({
                "category": category,
                "task_name": sessions[-1]["task_name"],
                "total_sessions": len(sessions),
                "primary_metric": primary_metric,
                "latest_value": round(latest_val, 2),
                "first_value": round(first_val, 2),
                "improvement_pct": round(improvement_pct, 1),
                "trend": trend,
                "rtcv": rtcv,
                "max_difficulty_reached": max(s["difficulty_level"] for s in sessions),
                "weekly_progression": weekly_progression,
            })

        if task_summaries:
            # Composite pillar score: average of normalized improvements
            avg_improvement = sum(t["improvement_pct"] for t in task_summaries) / len(task_summaries)
            pillar_analytics[pillar_key] = {
                "label": pillar_label,
                "total_sessions": total_sessions_pillar,
                "avg_improvement_pct": round(avg_improvement, 1),
                "tasks": task_summaries,
            }

    # Clinical interpretation
    def task_clinical_insight(pillar_data):
        parts = []
        for pk, pv in pillar_data.items():
            imp = pv["avg_improvement_pct"]
            label = pv["label"]
            if imp > 15:
                parts.append(f"Strong progress in {label} tasks ({imp:+.0f}%).")
            elif imp > 5:
                parts.append(f"Moderate improvement in {label} tasks.")
            elif imp > -5:
                parts.append(f"{label} performance is stable.")
            else:
                parts.append(f"{label} scores show some decline — consider adjusting difficulty.")
        if not parts:
            parts.append("Complete more tasks to see clinical progression insights.")
        return " ".join(parts)

    task_insight = task_clinical_insight(pillar_analytics)

    # ── Normative Score Mapping for Tasks ──────────────────────────────────
    age_years = None
    if current_user.date_of_birth:
        from datetime import date as date_cls
        today = date_cls.today()
        age_years = today.year - current_user.date_of_birth.year - (
            (today.month, today.day) < (current_user.date_of_birth.month, current_user.date_of_birth.day)
        )

    normative_results = {}
    pillar_composites = {}
    if task_sessions:
        # Latest session per category
        latest_by_cat = {}
        for ts in reversed(task_sessions):
            cat = ts.task.category or "unknown"
            latest_by_cat[cat] = ts

        pillar_metrics_map = defaultdict(dict)
        for cat, ts in latest_by_cat.items():
            metrics = {r.metric_name: r.metric_value for r in ts.results}
            normed = compute_all_normative_scores(cat, metrics, age_years)
            if normed:
                normative_results[cat] = {
                    "task_name": ts.task.name,
                    "pillar": ts.task.pillar,
                    "difficulty_level": ts.difficulty_level,
                    "metrics": normed,
                }
                pillar = ts.task.pillar or "unknown"
                pillar_metrics_map[pillar][cat] = metrics

        for pillar_key, task_metrics in pillar_metrics_map.items():
            composite = compute_composite_pillar_score(task_metrics, age_years)
            if composite:
                pillar_composites[pillar_key] = composite

    # ── Additional ASD Screenings ──────────────────────────────────────────
    additional_screenings = (
        db.query(AdditionalScreening)
        .filter(AdditionalScreening.user_id == current_user.id, AdditionalScreening.completed_at.isnot(None))
        .order_by(desc(AdditionalScreening.completed_at))
        .all()
    )
    additional_screening_data = [
        {
            "id": a.id,
            "instrument": a.instrument,
            "total_score": a.total_score,
            "max_score": a.max_score,
            "domain_scores": a.domain_scores,
            "severity": a.severity,
            "interpretation": decrypt_text(a.interpretation) if a.interpretation else None,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        }
        for a in additional_screenings
    ]

    # ── Comorbidity Screenings ─────────────────────────────────────────────
    comorbidity_screenings = (
        db.query(ComorbidityScreening)
        .filter(ComorbidityScreening.user_id == current_user.id, ComorbidityScreening.completed_at.isnot(None))
        .order_by(desc(ComorbidityScreening.completed_at))
        .all()
    )
    import json as _json
    comorbidity_data = []
    for c in comorbidity_screenings:
        flags = None
        if c.clinical_flags:
            try:
                flags = _json.loads(decrypt_text(c.clinical_flags) or "{}")
            except Exception:
                flags = {}
        comorbidity_data.append({
            "id": c.id,
            "instrument": c.instrument,
            "total_score": c.total_score,
            "max_score": c.max_score,
            "severity": c.severity,
            "clinical_flags": flags,
            "interpretation": decrypt_text(c.interpretation) if c.interpretation else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        })

    # ── Behavioral Observations Summary ────────────────────────────────────
    observations = (
        db.query(BehavioralObservation)
        .filter(BehavioralObservation.user_id == current_user.id)
        .order_by(desc(BehavioralObservation.created_at))
        .limit(50)
        .all()
    )
    obs_summary = {}
    if observations:
        cat_counts = {}
        for o in observations:
            cat_counts[o.category] = cat_counts.get(o.category, 0) + 1
        top_behaviors = {}
        for o in observations:
            key = f"{o.category}:{o.behavior_type}"
            top_behaviors[key] = top_behaviors.get(key, 0) + 1
        top_5 = sorted(top_behaviors.items(), key=lambda x: x[1], reverse=True)[:5]
        obs_summary = {
            "total": len(observations),
            "category_counts": cat_counts,
            "top_patterns": [{"category": k.split(":")[0], "behavior": k.split(":")[1], "count": v} for k, v in top_5],
        }

    # ── Active Referrals ───────────────────────────────────────────────────
    referrals = (
        db.query(Referral)
        .filter(Referral.user_id == current_user.id)
        .filter(Referral.status.in_(["recommended", "acknowledged", "scheduled"]))
        .order_by(desc(Referral.created_at))
        .all()
    )
    referral_data = [
        {
            "id": r.id,
            "referral_type": r.referral_type,
            "urgency": r.urgency,
            "status": r.status,
            "reason": decrypt_text(r.reason) if r.reason else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in referrals
    ]

    return {
        "journal": {
            "entry_count_30d": len(journal_entries),
            "avg_mood": avg_mood,
            "avg_stress": avg_stress,
            "mood_label": mood_label(avg_mood),
            "stress_label": stress_label(avg_stress),
            "mood_trend": mood_trend,
            "stress_trend": stress_trend,
            "asd_analysis": {
                "analyzed_count": len(journal_asd_analyses),
                "averages": asd_averages,
                "trends": asd_trends,
            },
        },
        "screening": {
            "total_completed": len(screenings),
            "latest_risk_level": latest_risk,
            "latest_ml_prediction": latest_screening.ml_prediction if latest_screening else None,
            "latest_ml_label": latest_ml_label,
            "latest_raw_score": latest_screening.raw_score if latest_screening else None,
            "history": screening_history,
        },
        "tasks": {
            "total_completed": len(task_sessions),
            "pillar_analytics": pillar_analytics,
            "task_insight": task_insight,
            "normative_scores": normative_results,
            "pillar_composites": pillar_composites,
        },
        "additional_screenings": additional_screening_data,
        "comorbidity": comorbidity_data,
        "behavioral_observations": obs_summary,
        "referrals": referral_data,
        "insight": insight,
    }
