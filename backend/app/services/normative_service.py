"""
Normative Score Mapping Service

Maps raw cognitive task metrics to clinically meaningful T-scores, percentiles,
and severity classifications using age-stratified reference norms.

T-score: mean=50, SD=10 (population-normed)
Classification: Within Normal Limits / Low Average / Borderline / Clinically Impaired
"""
import math
from typing import Optional, Dict, Any, Tuple

# ────────────────────────────────────────────────────────────────────────────
# Age-stratified normative reference data per task metric
# Format: {task_category: {metric_name: {age_group: (mean, sd, higher_is_better)}}}
#
# Based on published developmental norms from:
# - Luciana & Nelson (2002) for N-Back
# - Cragg & Nation (2008) for Go/No-Go
# - Zelazo (2006) for DCCS
# - Bull et al. (2004) for Tower tasks
# - Herba et al. (2006) for FER
# - Wellman et al. (2001) for False Belief
# ────────────────────────────────────────────────────────────────────────────

NORMATIVE_DATA: Dict[str, Dict[str, Dict[str, Tuple[float, float, bool]]]] = {
    # ── Executive Function ──────────────────────────────────────────────
    "nback": {
        "accuracy": {
            "child":       (0.62, 0.15, True),
            "adolescent":  (0.72, 0.12, True),
            "adult":       (0.78, 0.10, True),
        },
        "hit_rate": {
            "child":       (0.58, 0.18, True),
            "adolescent":  (0.70, 0.14, True),
            "adult":       (0.76, 0.11, True),
        },
        "false_alarm_rate": {
            "child":       (0.25, 0.12, False),
            "adolescent":  (0.18, 0.10, False),
            "adult":       (0.12, 0.08, False),
        },
        "d_prime": {
            "child":       (1.2, 0.6, True),
            "adolescent":  (1.8, 0.5, True),
            "adult":       (2.3, 0.5, True),
        },
        "avg_response_time": {
            "child":       (850, 200, False),
            "adolescent":  (650, 150, False),
            "adult":       (520, 120, False),
        },
    },
    "go_nogo": {
        "accuracy": {
            "child":       (0.70, 0.12, True),
            "adolescent":  (0.80, 0.10, True),
            "adult":       (0.88, 0.08, True),
        },
        "false_alarm_rate": {
            "child":       (0.32, 0.14, False),
            "adolescent":  (0.22, 0.11, False),
            "adult":       (0.14, 0.08, False),
        },
        "avg_response_time": {
            "child":       (480, 100, False),
            "adolescent":  (420, 80, False),
            "adult":       (370, 70, False),
        },
        "response_time_variability": {
            "child":       (150, 50, False),
            "adolescent":  (110, 40, False),
            "adult":       (80, 30, False),
        },
    },
    "dccs": {
        "accuracy": {
            "child":       (0.68, 0.18, True),
            "adolescent":  (0.82, 0.10, True),
            "adult":       (0.90, 0.08, True),
        },
        "switch_cost_ms": {
            "child":       (350, 120, False),
            "adolescent":  (220, 80, False),
            "adult":       (150, 60, False),
        },
        "perseverative_errors": {
            "child":       (4.5, 2.5, False),
            "adolescent":  (2.5, 1.5, False),
            "adult":       (1.2, 0.8, False),
        },
    },
    "tower": {
        "problems_solved_first_choice": {
            "child":       (0.45, 0.20, True),
            "adolescent":  (0.60, 0.18, True),
            "adult":       (0.72, 0.15, True),
        },
        "avg_moves_ratio": {
            "child":       (1.8, 0.5, False),
            "adolescent":  (1.4, 0.3, False),
            "adult":       (1.2, 0.2, False),
        },
    },
    # ── Social Cognition ────────────────────────────────────────────────
    "fer": {
        "accuracy": {
            "child":       (0.60, 0.15, True),
            "adolescent":  (0.72, 0.12, True),
            "adult":       (0.82, 0.10, True),
        },
        "avg_response_time": {
            "child":       (3200, 800, False),
            "adolescent":  (2400, 600, False),
            "adult":       (1800, 400, False),
        },
    },
    "false_belief": {
        "accuracy": {
            "child":       (0.55, 0.22, True),
            "adolescent":  (0.75, 0.15, True),
            "adult":       (0.88, 0.10, True),
        },
        "logical_consistency": {
            "child":       (0.50, 0.20, True),
            "adolescent":  (0.70, 0.15, True),
            "adult":       (0.85, 0.10, True),
        },
    },
    "social_stories": {
        "comprehension_score": {
            "child":       (0.55, 0.18, True),
            "adolescent":  (0.68, 0.14, True),
            "adult":       (0.80, 0.10, True),
        },
    },
    "conversation": {
        "accuracy": {
            "child":       (0.50, 0.18, True),
            "adolescent":  (0.65, 0.14, True),
            "adult":       (0.78, 0.10, True),
        },
        "cue_detection_latency": {
            "child":       (4500, 1200, False),
            "adolescent":  (3200, 800, False),
            "adult":       (2400, 600, False),
        },
    },
    # ── Joint Attention ─────────────────────────────────────────────────
    "rja": {
        "accuracy": {
            "child":       (0.65, 0.18, True),
            "adolescent":  (0.78, 0.12, True),
            "adult":       (0.88, 0.08, True),
        },
        "avg_response_time": {
            "child":       (1200, 350, False),
            "adolescent":  (900, 250, False),
            "adult":       (700, 180, False),
        },
    },
    "ija": {
        "detection_accuracy": {
            "child":       (0.55, 0.20, True),
            "adolescent":  (0.70, 0.15, True),
            "adult":       (0.82, 0.10, True),
        },
    },
    # ── Sensory-Perceptual ──────────────────────────────────────────────
    "visual_temporal": {
        "accuracy": {
            "child":       (0.58, 0.18, True),
            "adolescent":  (0.70, 0.14, True),
            "adult":       (0.80, 0.10, True),
        },
    },
    "auditory_processing": {
        "accuracy": {
            "child":       (0.60, 0.16, True),
            "adolescent":  (0.72, 0.12, True),
            "adult":       (0.82, 0.10, True),
        },
    },
}


# Classification thresholds (T-score based)
CLASSIFICATIONS = [
    (40, 100, "within_normal", "Within Normal Limits"),
    (35, 40, "low_average", "Low Average"),
    (30, 35, "borderline", "Borderline"),
    (0, 30, "clinically_impaired", "Clinically Impaired"),
]


def _determine_age_group(age_years: Optional[int]) -> str:
    if age_years is None:
        return "adult"
    if age_years <= 11:
        return "child"
    if age_years <= 17:
        return "adolescent"
    return "adult"


def _raw_to_z_score(raw: float, mean: float, sd: float, higher_is_better: bool) -> float:
    if sd == 0:
        return 0.0
    z = (raw - mean) / sd
    if not higher_is_better:
        z = -z  # Invert so positive Z always means "better"
    return z


def _z_to_t_score(z: float) -> float:
    return 50 + (10 * z)


def _z_to_percentile(z: float) -> float:
    return round(_norm_cdf(z) * 100, 1)


def _norm_cdf(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def _classify(t_score: float) -> Dict[str, str]:
    for low, high, key, label in CLASSIFICATIONS:
        if low <= t_score < high:
            return {"classification_key": key, "classification_label": label}
    if t_score >= 100:
        return {"classification_key": "within_normal", "classification_label": "Within Normal Limits"}
    return {"classification_key": "clinically_impaired", "classification_label": "Clinically Impaired"}


def compute_normative_score(
    task_category: str,
    metric_name: str,
    raw_value: float,
    age_years: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Convert a raw task metric to normative scores.

    Returns:
        {
            "raw_value": float,
            "z_score": float,
            "t_score": float,
            "percentile": float,
            "classification_key": str,
            "classification_label": str,
            "age_group_used": str,
            "reference_mean": float,
            "reference_sd": float,
        }
    or None if no norms exist for this task/metric.
    """
    task_norms = NORMATIVE_DATA.get(task_category)
    if not task_norms:
        return None

    metric_norms = task_norms.get(metric_name)
    if not metric_norms:
        return None

    age_group = _determine_age_group(age_years)
    if age_group not in metric_norms:
        return None

    mean, sd, higher_is_better = metric_norms[age_group]
    z = _raw_to_z_score(raw_value, mean, sd, higher_is_better)
    t = _z_to_t_score(z)
    p = _z_to_percentile(z)
    classification = _classify(t)

    return {
        "raw_value": round(raw_value, 3),
        "z_score": round(z, 2),
        "t_score": round(t, 1),
        "percentile": p,
        **classification,
        "age_group_used": age_group,
        "reference_mean": mean,
        "reference_sd": sd,
    }


def compute_all_normative_scores(
    task_category: str,
    metrics: Dict[str, float],
    age_years: Optional[int] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Compute normative scores for all metrics of a task session.
    Returns dict keyed by metric_name.
    """
    results = {}
    for metric_name, raw_value in metrics.items():
        normed = compute_normative_score(task_category, metric_name, raw_value, age_years)
        if normed:
            results[metric_name] = normed
    return results


def compute_composite_pillar_score(
    pillar_metrics: Dict[str, Dict[str, float]],
    age_years: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Compute a composite T-score for an entire pillar from its task metrics.
    pillar_metrics: {task_category: {metric_name: raw_value}}
    """
    t_scores = []
    for task_cat, metrics in pillar_metrics.items():
        for metric_name, raw_value in metrics.items():
            normed = compute_normative_score(task_cat, metric_name, raw_value, age_years)
            if normed:
                t_scores.append(normed["t_score"])

    if not t_scores:
        return None

    avg_t = sum(t_scores) / len(t_scores)
    classification = _classify(avg_t)
    return {
        "composite_t_score": round(avg_t, 1),
        "n_metrics": len(t_scores),
        **classification,
    }
