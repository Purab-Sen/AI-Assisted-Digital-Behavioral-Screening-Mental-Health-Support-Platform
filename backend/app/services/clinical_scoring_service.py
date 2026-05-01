"""
Additional Screening Scoring Service

Scores RAADS-R, CAST, SCQ, SRS-2 questionnaires and generates interpretations.
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_instrument(instrument: str) -> Dict[str, Any]:
    path = DATA_DIR / f"{instrument}.json"
    with open(path, "r") as f:
        return json.load(f)


def score_additional_screening(instrument: str, responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Score an additional ASD screening instrument.
    Returns: {total_score, max_score, domain_scores, severity, interpretation}
    """
    data = _load_instrument(instrument)
    scoring = data["scoring"]
    questions_by_id = {q["id"]: q for q in data["questions"]}

    if instrument == "raads_r":
        return _score_raads_r(data, scoring, questions_by_id, responses)
    elif instrument == "cast":
        return _score_cast(data, scoring, questions_by_id, responses)
    elif instrument == "scq":
        return _score_scq(data, scoring, questions_by_id, responses)
    elif instrument == "srs_2":
        return _score_srs_2(data, scoring, questions_by_id, responses)
    else:
        raise ValueError(f"Unknown instrument: {instrument}")


def _score_raads_r(data, scoring, questions_by_id, responses):
    total = 0
    domain_totals = {d: 0 for d in scoring["domains"]}
    scored_responses = []

    for resp in responses:
        qid = resp["question_id"]
        answer = resp["answer"]  # 0-3
        q = questions_by_id.get(qid)
        if not q:
            continue
        score = int(answer)
        total += score
        domain = q.get("domain", "")
        if domain in domain_totals:
            domain_totals[domain] += score
        scored_responses.append({"question_id": qid, "answer": answer, "score": score})

    severity = _classify_severity(total, scoring["severity_levels"])
    interpretation = _raads_interpretation(total, domain_totals, severity)

    return {
        "total_score": total,
        "max_score": scoring["max_score"],
        "domain_scores": domain_totals,
        "severity": severity,
        "interpretation": interpretation,
        "responses": scored_responses,
    }


def _score_cast(data, scoring, questions_by_id, responses):
    total = 0
    non_scored = set(scoring.get("non_scored_items", []))
    scored_responses = []

    for resp in responses:
        qid = resp["question_id"]
        answer = str(resp["answer"]).lower()
        q = questions_by_id.get(qid)
        if not q or qid in non_scored or q.get("scored") is False:
            scored_responses.append({"question_id": qid, "answer": answer, "score": 0})
            continue
        score_if = q.get("score_if", "").lower()
        score = 1 if answer == score_if else 0
        total += score
        scored_responses.append({"question_id": qid, "answer": answer, "score": score})

    severity = _classify_severity(total, scoring["severity_levels"])
    interpretation = _cast_interpretation(total, severity)

    return {
        "total_score": total,
        "max_score": scoring["max_score"],
        "domain_scores": None,
        "severity": severity,
        "interpretation": interpretation,
        "responses": scored_responses,
    }


def _score_scq(data, scoring, questions_by_id, responses):
    total = 0
    domain_totals = {d: 0 for d in scoring.get("domains", {})}
    scored_responses = []

    for resp in responses:
        qid = resp["question_id"]
        answer = str(resp["answer"]).lower()
        q = questions_by_id.get(qid)
        if not q:
            continue
        score_if = q.get("score_if", "").lower()
        score = 1 if answer == score_if else 0
        total += score
        domain = q.get("domain", "")
        if domain in domain_totals:
            domain_totals[domain] += score
        scored_responses.append({"question_id": qid, "answer": answer, "score": score})

    severity = _classify_severity(total, scoring["severity_levels"])
    interpretation = _scq_interpretation(total, domain_totals, severity)

    return {
        "total_score": total,
        "max_score": scoring["max_score"],
        "domain_scores": domain_totals,
        "severity": severity,
        "interpretation": interpretation,
        "responses": scored_responses,
    }


def _score_srs_2(data, scoring, questions_by_id, responses):
    total = 0
    domain_totals = {d: 0 for d in scoring.get("domains", {})}
    scored_responses = []

    for resp in responses:
        qid = resp["question_id"]
        answer = int(resp["answer"])  # 1-4
        q = questions_by_id.get(qid)
        if not q:
            continue
        total += answer
        domain = q.get("domain", "")
        if domain in domain_totals:
            domain_totals[domain] += answer
        scored_responses.append({"question_id": qid, "answer": answer, "score": answer})

    severity = _classify_severity(total, scoring["severity_levels"])
    interpretation = _srs2_interpretation(total, domain_totals, severity)

    return {
        "total_score": total,
        "max_score": scoring["max_score"],
        "domain_scores": domain_totals,
        "severity": severity,
        "interpretation": interpretation,
        "responses": scored_responses,
    }


# ─── Comorbidity Scoring ──────────────────────────────────────────────────

def score_comorbidity_screening(instrument: str, responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Score PHQ-9, GAD-7, or ASRS.
    Returns: {total_score, max_score, severity, clinical_flags, interpretation, responses}
    """
    data = _load_instrument(instrument)
    scoring = data["scoring"]
    questions_by_id = {q["id"]: q for q in data["questions"]}

    total = 0
    clinical_flags = {}
    scored_responses = []

    for resp in responses:
        qid = resp["question_id"]
        answer = int(resp["answer"])
        q = questions_by_id.get(qid)
        if not q:
            continue
        total += answer
        scored_responses.append({"question_id": qid, "answer": answer, "score": answer})

        # Check clinical flags (e.g., PHQ-9 Q9 suicidal ideation)
        flag = q.get("clinical_flag")
        threshold = q.get("flag_threshold", 1)
        if flag and answer >= threshold:
            clinical_flags[flag] = True

    # ASRS threshold items check
    if instrument == "asrs":
        threshold_items = scoring.get("threshold_items", [])
        threshold_value = scoring.get("threshold_value", 3)
        flagged_count = 0
        for resp in scored_responses:
            if resp["question_id"] in threshold_items and resp["answer"] >= threshold_value:
                flagged_count += 1
        if flagged_count >= 4:
            clinical_flags["asrs_threshold_met"] = True

    severity = _classify_severity(total, scoring["severity_levels"])
    interpretation = _comorbidity_interpretation(instrument, total, severity, clinical_flags)

    return {
        "total_score": total,
        "max_score": scoring["max_score"],
        "severity": severity,
        "clinical_flags": clinical_flags,
        "interpretation": interpretation,
        "responses": scored_responses,
    }


# ─── Helpers ───────────────────────────────────────────────────────────────

def _classify_severity(score: int, levels: list) -> str:
    for level in levels:
        low, high = level["range"]
        if low <= score <= high:
            return level["label"]
    return levels[-1]["label"]


def _raads_interpretation(total, domains, severity):
    parts = [f"RAADS-R Total Score: {total}/240 — {severity.replace('_', ' ').title()}."]
    if severity == "clinical":
        parts.append("This score strongly suggests the presence of autism spectrum traits. A comprehensive diagnostic evaluation is recommended.")
    elif severity == "moderate":
        parts.append("Significant autism spectrum traits detected. Clinical evaluation is recommended.")
    elif severity == "mild":
        parts.append("Some autism spectrum traits present. Continued monitoring and further assessment may be beneficial.")
    else:
        parts.append("Score falls within the non-clinical range.")

    # Domain breakdown
    domain_labels = {
        "social_relatedness": "Social Relatedness",
        "circumscribed_interests": "Circumscribed Interests",
        "language": "Language",
        "sensory_motor": "Sensory-Motor",
    }
    domain_parts = []
    for dk, dl in domain_labels.items():
        if dk in domains:
            domain_parts.append(f"{dl}: {domains[dk]}")
    if domain_parts:
        parts.append("Domain scores: " + ", ".join(domain_parts) + ".")
    return " ".join(parts)


def _cast_interpretation(total, severity):
    parts = [f"CAST Total Score: {total}/31 — {severity.replace('_', ' ').title()}."]
    if severity == "clinical":
        parts.append("Score is above the clinical threshold (≥15). A comprehensive ASD evaluation is strongly recommended.")
    elif severity == "mild":
        parts.append("Score is in the borderline range (12-14). Monitoring and potential follow-up assessment recommended.")
    else:
        parts.append("Score falls within the normal range. No immediate concern, but continue monitoring development.")
    return " ".join(parts)


def _scq_interpretation(total, domains, severity):
    parts = [f"SCQ Total Score: {total}/39 — {severity.replace('_', ' ').title()}."]
    if severity == "clinical":
        parts.append("Score exceeds clinical threshold (≥15). Comprehensive ASD diagnostic evaluation recommended.")
    elif severity == "mild":
        parts.append("Score is in the borderline range. Monitoring and follow-up recommended.")
    else:
        parts.append("Score falls within the non-clinical range.")

    domain_labels = {
        "reciprocal_social_interaction": "Social Interaction",
        "communication": "Communication",
        "restricted_repetitive": "Restricted/Repetitive",
    }
    domain_parts = []
    for dk, dl in domain_labels.items():
        if dk in domains:
            domain_parts.append(f"{dl}: {domains[dk]}")
    if domain_parts:
        parts.append("Domain scores: " + ", ".join(domain_parts) + ".")
    return " ".join(parts)


def _srs2_interpretation(total, domains, severity):
    parts = [f"SRS-2 Total Score: {total}/260 — {severity.replace('_', ' ').title()}."]
    if severity == "severe":
        parts.append("Severe social responsiveness difficulties detected. Comprehensive assessment strongly recommended.")
    elif severity == "moderate":
        parts.append("Moderate social responsiveness difficulties. Clinical evaluation recommended.")
    elif severity == "mild":
        parts.append("Mild social responsiveness difficulties. Monitoring may be beneficial.")
    else:
        parts.append("Score within normal limits for social responsiveness.")

    domain_labels = {
        "social_awareness": "Social Awareness",
        "social_cognition": "Social Cognition",
        "social_communication": "Social Communication",
        "social_motivation": "Social Motivation",
        "restricted_interests_repetitive": "Restricted Interests & Repetitive Behavior",
    }
    domain_parts = []
    for dk, dl in domain_labels.items():
        if dk in domains:
            domain_parts.append(f"{dl}: {domains[dk]}")
    if domain_parts:
        parts.append("Domain scores: " + ", ".join(domain_parts) + ".")
    return " ".join(parts)


def _comorbidity_interpretation(instrument, total, severity, flags):
    if instrument == "phq9":
        parts = [f"PHQ-9 Score: {total}/27 — {severity.replace('_', ' ').title()}."]
        if severity in ("severe", "moderately_severe"):
            parts.append("Active treatment with medication and/or psychotherapy is strongly recommended.")
        elif severity == "moderate":
            parts.append("Treatment planning should be considered — watchful waiting or treatment.")
        elif severity == "mild":
            parts.append("Watchful waiting; repeat PHQ-9 at follow-up.")
        else:
            parts.append("Minimal depressive symptoms.")

        if flags.get("suicidal_ideation"):
            parts.append("ALERT: Positive response on suicidal ideation item (Q9). Immediate safety assessment recommended.")

    elif instrument == "gad7":
        parts = [f"GAD-7 Score: {total}/21 — {severity.replace('_', ' ').title()}."]
        if severity == "severe":
            parts.append("Severe anxiety. Active intervention recommended — consider both medication and therapy.")
        elif severity == "moderate":
            parts.append("Moderate anxiety. Consider referral for counseling or treatment.")
        elif severity == "mild":
            parts.append("Mild anxiety. Monitor and reassess; psychoeducation may be helpful.")
        else:
            parts.append("Minimal anxiety symptoms.")

    elif instrument == "asrs":
        parts = [f"ASRS Score: {total}/24 — {severity.replace('_', ' ').title()}."]
        if flags.get("asrs_threshold_met"):
            parts.append("ADHD screening threshold met on key items. Comprehensive ADHD evaluation recommended.")
        if severity == "likely":
            parts.append("Score pattern is highly consistent with ADHD. Clinical evaluation strongly recommended.")
        elif severity == "possible":
            parts.append("Some ADHD indicators present. Further evaluation may be warranted.")
        else:
            parts.append("ADHD unlikely based on this screening.")
    else:
        parts = [f"Score: {total} — {severity}"]

    return " ".join(parts)


def get_instrument_questions(instrument: str) -> Dict[str, Any]:
    """Load and return questionnaire data for frontend display."""
    data = _load_instrument(instrument)
    return {
        "instrument": data["instrument"],
        "title": data["title"],
        "description": data["description"],
        "questions": data["questions"],
        "response_options": data.get("response_options"),
        "scoring": {
            "max_score": data["scoring"]["max_score"],
            "clinical_threshold": data["scoring"].get("clinical_threshold"),
        },
    }
