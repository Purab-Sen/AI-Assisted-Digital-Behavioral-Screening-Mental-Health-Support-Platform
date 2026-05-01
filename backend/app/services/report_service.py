"""
Clinical Report Generation Service

Generates comprehensive PDF clinical reports compiling ALL assessment data:
- Demographics & profile
- AQ-10 screening results with ML prediction
- Additional ASD screening results (RAADS-R, CAST, SCQ, SRS-2)
- Comorbidity screening results (PHQ-9, GAD-7, ASRS)
- Task performance with normative scores
- Journal analysis trends
- Behavioral observations summary
- AI recommendations
- Referral suggestions
"""
import io
import logging
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.screening import ScreeningSession
from app.models.additional_screening import AdditionalScreening
from app.models.comorbidity_screening import ComorbidityScreening
from app.models.task import Task, TaskSession, TaskResult
from app.models.journal import JournalEntry, JournalAnalysis
from app.models.behavioral_observation import BehavioralObservation
from app.models.referral import Referral
from app.models.recommendation import Recommendation, RecommendationStatus
from app.services.normative_service import compute_all_normative_scores
from app.utils.crypto import decrypt_text

logger = logging.getLogger(__name__)

# ─── Styles ────────────────────────────────────────────────────────────────

def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='ReportTitle', parent=styles['Title'],
        fontSize=18, spaceAfter=4 * mm, textColor=colors.HexColor("#1a365d"),
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader', parent=styles['Heading2'],
        fontSize=13, spaceBefore=6 * mm, spaceAfter=3 * mm,
        textColor=colors.HexColor("#2b6cb0"), borderWidth=0,
        borderPadding=2 * mm,
    ))
    styles.add(ParagraphStyle(
        name='SubHeader', parent=styles['Heading3'],
        fontSize=11, spaceBefore=3 * mm, spaceAfter=2 * mm,
        textColor=colors.HexColor("#2c5282"),
    ))
    styles.add(ParagraphStyle(
        name='BodySmall', parent=styles['Normal'],
        fontSize=9, leading=12,
    ))
    styles.add(ParagraphStyle(
        name='Disclaimer', parent=styles['Normal'],
        fontSize=8, textColor=colors.grey, italic=True,
    ))
    styles.add(ParagraphStyle(
        name='FooterStyle', parent=styles['Normal'],
        fontSize=7, textColor=colors.grey, alignment=TA_CENTER,
    ))
    return styles


def _severity_color(severity: str) -> colors.Color:
    mapping = {
        "low": colors.HexColor("#38a169"),
        "minimal": colors.HexColor("#38a169"),
        "non_clinical": colors.HexColor("#38a169"),
        "within_normal": colors.HexColor("#38a169"),
        "mild": colors.HexColor("#d69e2e"),
        "moderate": colors.HexColor("#dd6b20"),
        "moderately_severe": colors.HexColor("#e53e3e"),
        "severe": colors.HexColor("#c53030"),
        "high": colors.HexColor("#e53e3e"),
        "clinical": colors.HexColor("#c53030"),
        "very_high": colors.HexColor("#9b2c2c"),
    }
    return mapping.get(severity, colors.black)


def _make_table(data, col_widths=None):
    t = Table(data, colWidths=col_widths, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#ebf4ff")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#2b6cb0")),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ]))
    return t


# ─── Main Report Generation ───────────────────────────────────────────────

def generate_clinical_report(
    user_id: int,
    db: Session,
    generated_by: Optional[str] = None,
) -> bytes:
    """
    Generate a comprehensive clinical report PDF.
    Returns the PDF as bytes.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    styles = _get_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )
    elements = []

    # ─── Title Page ────────────────────────────────────────────────────
    elements.append(Paragraph("Clinical Assessment Report", styles['ReportTitle']))
    elements.append(Paragraph("AI-Assisted Digital Behavioral Screening Platform", styles['BodySmall']))
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2b6cb0")))
    elements.append(Spacer(1, 4 * mm))

    # Patient demographics
    age_str = ""
    if user.date_of_birth:
        today = date.today()
        age = today.year - user.date_of_birth.year - (
            (today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day)
        )
        age_str = f"{age} years"

    demo_data = [
        ["Field", "Value"],
        ["Name", f"{user.first_name} {user.last_name}"],
        ["Date of Birth", str(user.date_of_birth) if user.date_of_birth else "Not provided"],
        ["Age", age_str or "Not available"],
        ["Gender", user.gender or "Not provided"],
        ["Ethnicity", user.ethnicity or "Not provided"],
        ["Report Generated", datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%B %d, %Y at %H:%M IST")],
        ["Generated By", generated_by or "System"],
    ]
    elements.append(Paragraph("Patient Information", styles['SectionHeader']))
    elements.append(_make_table(demo_data, col_widths=[50 * mm, 120 * mm]))
    elements.append(Spacer(1, 3 * mm))

    # Disclaimer
    elements.append(Paragraph(
        "<b>IMPORTANT DISCLAIMER:</b> This report is generated by an AI-assisted screening platform "
        "and is NOT a clinical diagnosis. It is intended to support — not replace — professional "
        "clinical judgment. All findings should be interpreted by a qualified healthcare professional "
        "in the context of a comprehensive clinical evaluation.",
        styles['Disclaimer']
    ))

    # ─── AQ-10 Screening ──────────────────────────────────────────────
    screenings = (
        db.query(ScreeningSession)
        .filter(ScreeningSession.user_id == user_id, ScreeningSession.completed_at.isnot(None))
        .order_by(desc(ScreeningSession.completed_at))
        .limit(5)
        .all()
    )

    elements.append(Paragraph("AQ-10 Screening Results", styles['SectionHeader']))
    if screenings:
        scr_data = [["Date", "Raw Score", "Risk Level", "ML Probability", "ML Label", "Age Group"]]
        for s in screenings:
            scr_data.append([
                s.completed_at.strftime("%Y-%m-%d") if s.completed_at else "-",
                f"{s.raw_score}/10" if s.raw_score is not None else "-",
                (s.risk_level.value if s.risk_level else "-").title(),
                f"{s.ml_risk_score:.1%}" if s.ml_risk_score is not None else "-",
                (s.ml_probability_label or "-").replace("_", " ").title(),
                (s.age_group_used or "-").title(),
            ])
        elements.append(_make_table(scr_data, col_widths=[28 * mm, 22 * mm, 25 * mm, 28 * mm, 28 * mm, 25 * mm]))

        latest = screenings[0]
        elements.append(Spacer(1, 2 * mm))
        pre_info = []
        if latest.family_asd:
            pre_info.append(f"Family ASD History: {latest.family_asd}")
        if latest.jaundice:
            pre_info.append(f"Jaundice at Birth: {latest.jaundice}")
        if latest.completed_by:
            pre_info.append(f"Completed By: {latest.completed_by}")
        if pre_info:
            elements.append(Paragraph("Pre-screening: " + " | ".join(pre_info), styles['BodySmall']))
    else:
        elements.append(Paragraph("No AQ-10 screening completed.", styles['BodySmall']))

    # ─── Additional ASD Screenings ─────────────────────────────────────
    add_screenings = (
        db.query(AdditionalScreening)
        .filter(AdditionalScreening.user_id == user_id, AdditionalScreening.completed_at.isnot(None))
        .order_by(desc(AdditionalScreening.completed_at))
        .all()
    )

    elements.append(Paragraph("Additional ASD Screening Instruments", styles['SectionHeader']))
    if add_screenings:
        instrument_labels = {
            "raads_r": "RAADS-R", "cast": "CAST", "scq": "SCQ", "srs_2": "SRS-2"
        }
        for a_s in add_screenings:
            label = instrument_labels.get(a_s.instrument, a_s.instrument.upper())
            elements.append(Paragraph(f"{label} — {a_s.completed_at.strftime('%Y-%m-%d') if a_s.completed_at else ''}", styles['SubHeader']))

            as_data = [["Metric", "Value"]]
            as_data.append(["Total Score", f"{a_s.total_score}/{a_s.max_score}" if a_s.total_score is not None else "-"])
            as_data.append(["Severity", (a_s.severity or "-").replace("_", " ").title()])

            if a_s.domain_scores:
                for dk, dv in a_s.domain_scores.items():
                    as_data.append([dk.replace("_", " ").title(), str(dv)])

            elements.append(_make_table(as_data, col_widths=[60 * mm, 100 * mm]))

            if a_s.interpretation:
                interp = decrypt_text(a_s.interpretation) or a_s.interpretation
                elements.append(Spacer(1, 1 * mm))
                elements.append(Paragraph(f"<i>{interp}</i>", styles['BodySmall']))
    else:
        elements.append(Paragraph("No additional ASD screenings completed.", styles['BodySmall']))

    # ─── Comorbidity Screenings ────────────────────────────────────────
    comorbidity = (
        db.query(ComorbidityScreening)
        .filter(ComorbidityScreening.user_id == user_id, ComorbidityScreening.completed_at.isnot(None))
        .order_by(desc(ComorbidityScreening.completed_at))
        .all()
    )

    elements.append(Paragraph("Comorbidity Screening Results", styles['SectionHeader']))
    if comorbidity:
        instrument_labels = {"phq9": "PHQ-9 (Depression)", "gad7": "GAD-7 (Anxiety)", "asrs": "ASRS (ADHD)"}
        co_data = [["Instrument", "Score", "Severity", "Date", "Flags"]]
        for c in comorbidity:
            flags_str = ""
            if c.clinical_flags:
                try:
                    import json
                    flags = json.loads(decrypt_text(c.clinical_flags) or "{}")
                    if flags.get("suicidal_ideation"):
                        flags_str = "⚠ SI"
                    elif flags.get("asrs_threshold_met"):
                        flags_str = "⚠ Threshold"
                except Exception:
                    flags_str = ""

            co_data.append([
                instrument_labels.get(c.instrument, c.instrument.upper()),
                f"{c.total_score}/{c.max_score}" if c.total_score is not None else "-",
                (c.severity or "-").replace("_", " ").title(),
                c.completed_at.strftime("%Y-%m-%d") if c.completed_at else "-",
                flags_str,
            ])
        elements.append(_make_table(co_data, col_widths=[40 * mm, 22 * mm, 35 * mm, 28 * mm, 28 * mm]))

        # Interpretations
        for c in comorbidity:
            if c.interpretation:
                interp = decrypt_text(c.interpretation) or c.interpretation
                elements.append(Paragraph(f"<i>{interp}</i>", styles['BodySmall']))
    else:
        elements.append(Paragraph("No comorbidity screenings completed.", styles['BodySmall']))

    # ─── Page Break before Tasks ───────────────────────────────────────
    elements.append(PageBreak())

    # ─── Task Performance with Normative Scores ────────────────────────
    age_years = None
    if user.date_of_birth:
        today = date.today()
        age_years = today.year - user.date_of_birth.year - (
            (today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day)
        )

    task_sessions = (
        db.query(TaskSession)
        .join(Task)
        .filter(TaskSession.user_id == user_id, TaskSession.completed_at.isnot(None))
        .order_by(desc(TaskSession.completed_at))
        .all()
    )

    elements.append(Paragraph("Cognitive Task Performance (Normative Scores)", styles['SectionHeader']))
    if task_sessions:
        # Group by task category, take latest
        latest_by_category = {}
        for ts in task_sessions:
            cat = ts.task.category or "unknown"
            if cat not in latest_by_category:
                latest_by_category[cat] = ts

        pillar_groups = {}
        for cat, ts in latest_by_category.items():
            pillar = ts.task.pillar or "Other"
            pillar_groups.setdefault(pillar, []).append((cat, ts))

        pillar_labels = {
            "executive_function": "Executive Function",
            "social_cognition": "Social Cognition",
            "joint_attention": "Joint Attention",
            "sensory_processing": "Sensory-Perceptual",
        }

        for pillar_key, tasks_in_pillar in pillar_groups.items():
            elements.append(Paragraph(pillar_labels.get(pillar_key, pillar_key.title()), styles['SubHeader']))

            for cat, ts in tasks_in_pillar:
                metrics = {r.metric_name: r.metric_value for r in ts.results}
                normed = compute_all_normative_scores(cat, metrics, age_years)

                task_table = [["Metric", "Raw Value", "T-Score", "Percentile", "Classification"]]
                for metric_name, raw_val in metrics.items():
                    norm = normed.get(metric_name)
                    if norm:
                        task_table.append([
                            metric_name.replace("_", " ").title(),
                            f"{raw_val:.3f}" if isinstance(raw_val, float) else str(raw_val),
                            f"{norm['t_score']:.1f}",
                            f"{norm['percentile']:.1f}%",
                            norm['classification_label'],
                        ])
                    else:
                        task_table.append([
                            metric_name.replace("_", " ").title(),
                            f"{raw_val:.3f}" if isinstance(raw_val, float) else str(raw_val),
                            "-", "-", "-",
                        ])

                elements.append(Paragraph(f"{ts.task.name} (Level {ts.difficulty_level})", styles['BodySmall']))
                if len(task_table) > 1:
                    elements.append(_make_table(task_table, col_widths=[35 * mm, 25 * mm, 22 * mm, 22 * mm, 40 * mm]))
                elements.append(Spacer(1, 2 * mm))
    else:
        elements.append(Paragraph("No cognitive tasks completed.", styles['BodySmall']))

    # ─── Journal Analysis Summary ──────────────────────────────────────
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    journal_analyses = (
        db.query(JournalAnalysis)
        .join(JournalEntry, JournalAnalysis.journal_id == JournalEntry.id)
        .filter(JournalEntry.user_id == user_id)
        .order_by(desc(JournalAnalysis.analyzed_at))
        .limit(10)
        .all()
    )

    elements.append(Paragraph("Journal Analysis Summary (AI-Analyzed Behavioral Indicators)", styles['SectionHeader']))
    if journal_analyses:
        attrs = ["mood_valence", "anxiety_level", "social_engagement",
                 "sensory_sensitivity", "emotional_regulation", "repetitive_behavior"]
        attr_labels = {
            "mood_valence": "Mood Valence (0=distressed → 1=content)",
            "anxiety_level": "Anxiety Level (0=calm → 1=overwhelming)",
            "social_engagement": "Social Engagement (0=withdrawn → 1=active)",
            "sensory_sensitivity": "Sensory Sensitivity (0=none → 1=severe)",
            "emotional_regulation": "Emotional Regulation (0=dysregulated → 1=regulated)",
            "repetitive_behavior": "Repetitive Behavior (0=none → 1=pervasive)",
        }

        ja_data = [["Attribute", "Average (Last 10 Entries)", "Clinical Significance"]]
        for attr in attrs:
            vals = [getattr(ja, attr) for ja in journal_analyses if getattr(ja, attr) is not None]
            if vals:
                avg = sum(vals) / len(vals)
                sig = _journal_significance(attr, avg)
                ja_data.append([attr_labels.get(attr, attr), f"{avg:.2f}", sig])

        if len(ja_data) > 1:
            elements.append(_make_table(ja_data, col_widths=[60 * mm, 40 * mm, 55 * mm]))
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(f"Based on {len(journal_analyses)} analyzed journal entries.", styles['BodySmall']))
    else:
        elements.append(Paragraph("No journal entries analyzed.", styles['BodySmall']))

    # ─── Behavioral Observations ───────────────────────────────────────
    observations = (
        db.query(BehavioralObservation)
        .filter(BehavioralObservation.user_id == user_id)
        .order_by(desc(BehavioralObservation.created_at))
        .limit(50)
        .all()
    )

    elements.append(Paragraph("Behavioral Observations Summary", styles['SectionHeader']))
    if observations:
        # Category summary
        cat_counts = {}
        cat_intensity = {}
        for o in observations:
            cat_counts[o.category] = cat_counts.get(o.category, 0) + 1
            if o.intensity:
                cat_intensity.setdefault(o.category, []).append(o.intensity)

        obs_data = [["Category", "Observations", "Predominant Intensity"]]
        for cat in sorted(cat_counts.keys()):
            intensities = cat_intensity.get(cat, [])
            if intensities:
                from collections import Counter
                predominant = Counter(intensities).most_common(1)[0][0]
            else:
                predominant = "-"
            obs_data.append([
                cat.replace("_", " ").title(),
                str(cat_counts[cat]),
                predominant.title(),
            ])

        elements.append(_make_table(obs_data, col_widths=[50 * mm, 30 * mm, 50 * mm]))
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(f"Total observations: {len(observations)}", styles['BodySmall']))
    else:
        elements.append(Paragraph("No behavioral observations logged.", styles['BodySmall']))

    # ─── Active Referrals ──────────────────────────────────────────────
    referrals = (
        db.query(Referral)
        .filter(Referral.user_id == user_id)
        .order_by(desc(Referral.created_at))
        .limit(10)
        .all()
    )

    elements.append(Paragraph("Referral Recommendations", styles['SectionHeader']))
    if referrals:
        ref_data = [["Type", "Urgency", "Status", "Date"]]
        for r in referrals:
            ref_data.append([
                r.referral_type.replace("_", " ").title(),
                r.urgency.title(),
                r.status.replace("_", " ").title(),
                r.created_at.strftime("%Y-%m-%d"),
            ])
        elements.append(_make_table(ref_data, col_widths=[50 * mm, 28 * mm, 30 * mm, 28 * mm]))
    else:
        elements.append(Paragraph("No referrals generated.", styles['BodySmall']))

    # ─── AI Recommendations ────────────────────────────────────────────
    recommendations = (
        db.query(Recommendation)
        .filter(
            Recommendation.user_id == user_id,
            Recommendation.status.in_([RecommendationStatus.PENDING, RecommendationStatus.VIEWED]),
        )
        .order_by(desc(Recommendation.created_at))
        .limit(10)
        .all()
    )

    elements.append(Paragraph("Current AI Recommendations", styles['SectionHeader']))
    if recommendations:
        for rec in recommendations:
            reason = decrypt_text(rec.reason) if rec.reason else ""
            if reason.startswith("[SUMMARY]"):
                elements.append(Paragraph(f"<b>Summary:</b> {reason.replace('[SUMMARY] ', '')}", styles['BodySmall']))
            elif reason:
                elements.append(Paragraph(f"• {reason}", styles['BodySmall']))
    else:
        elements.append(Paragraph("No active AI recommendations.", styles['BodySmall']))

    # ─── Footer ────────────────────────────────────────────────────────
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(
        "This report was generated by the AI-Assisted Digital Behavioral Screening Platform. "
        "It is intended for clinical support purposes only and does not constitute a medical diagnosis. "
        f"Report generated on {datetime.now(ZoneInfo('Asia/Kolkata')).strftime('%B %d, %Y at %H:%M IST')}.",
        styles['Disclaimer']
    ))

    doc.build(elements)
    return buffer.getvalue()


def _journal_significance(attr: str, avg: float) -> str:
    """Provide clinical significance interpretation for journal analysis attributes."""
    if attr == "mood_valence":
        if avg < 0.3:
            return "Significant distress indicated"
        elif avg < 0.5:
            return "Below average mood — monitor"
        return "Within expected range"
    elif attr == "anxiety_level":
        if avg > 0.7:
            return "Elevated anxiety — intervention warranted"
        elif avg > 0.4:
            return "Moderate anxiety indicators"
        return "Low anxiety"
    elif attr == "social_engagement":
        if avg < 0.3:
            return "Significant social withdrawal"
        elif avg < 0.5:
            return "Below average engagement"
        return "Adequate social engagement"
    elif attr == "sensory_sensitivity":
        if avg > 0.7:
            return "Severe sensory sensitivities"
        elif avg > 0.4:
            return "Notable sensory concerns"
        return "Minimal sensory concerns"
    elif attr == "emotional_regulation":
        if avg < 0.3:
            return "Significant dysregulation"
        elif avg < 0.5:
            return "Some regulation difficulties"
        return "Adequate regulation"
    elif attr == "repetitive_behavior":
        if avg > 0.7:
            return "Pervasive repetitive patterns"
        elif avg > 0.4:
            return "Notable repetitive behaviors"
        return "Minimal repetitive behaviors"
    return "-"
