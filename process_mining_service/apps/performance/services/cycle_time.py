"""
Cycle time computation and process efficiency score.
"""
import logging
from typing import Optional

from apps.event_logs.models import EventLog, P2PCase
from apps.performance.models import ActivityMetric

logger = logging.getLogger(__name__)


def compute_cycle_time_metrics(event_log: EventLog) -> None:
    """
    Compute average cycle time from persisted P2PCase rows.
    Called once at upload time — results are stored on the cases themselves.
    This function is a no-op if cases are already saved; cycle_time_days is
    computed during ingestion in event_logs/services.py.
    """
    logger.info(
        {"event": "cycle_time_metrics_computed", "event_log_id": str(event_log.id)}
    )


def get_average_cycle_time(event_log: EventLog) -> Optional[float]:
    """Return the mean cycle_time_days across all completed cases."""
    cases = event_log.cases.filter(cycle_time_days__isnull=False)
    if not cases.exists():
        return None
    values = list(cases.values_list("cycle_time_days", flat=True))
    return sum(values) / len(values)


def compute_process_efficiency_score(event_log: EventLog) -> float:
    """
    Process Efficiency Score = 100 - (weighted sum of bottleneck severity scores).
    Severity weights: high=10, medium=5, low=2.
    Score is clamped to [0, 100].
    """
    weights = {"high": 10, "medium": 5, "low": 2}
    bottlenecks = ActivityMetric.objects.filter(
        event_log=event_log, is_bottleneck=True
    )
    total_penalty = sum(
        weights.get(b.bottleneck_severity or "low", 2) for b in bottlenecks
    )
    score = max(0.0, min(100.0, 100.0 - total_penalty))
    logger.debug(
        {
            "event": "efficiency_score_computed",
            "event_log_id": str(event_log.id),
            "score": score,
            "total_penalty": total_penalty,
        }
    )
    return score
