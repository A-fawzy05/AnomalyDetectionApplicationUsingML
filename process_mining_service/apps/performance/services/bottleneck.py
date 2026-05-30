"""
Bottleneck detection service.
An activity is a bottleneck if its avg duration is > 2 standard deviations
above the mean of all activities in the event log.
"""
import logging
import statistics
from typing import Optional

from apps.event_logs.models import EventLog, P2PEvent
from apps.performance.models import ActivityMetric

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rule-based recommendation lookup table — no LLM / external API calls.
# ---------------------------------------------------------------------------
RECOMMENDATIONS: dict[tuple[str, str], str] = {
    ("Invoice Processing", "high"): (
        "Implement automated invoice validation to reduce manual review time by 40%."
    ),
    ("Invoice Processing", "medium"): (
        "Review invoice approval queue for unassigned items."
    ),
    ("Manager Approval", "high"): (
        "Set up approval delegation rules and automated escalation for pending requests."
    ),
    ("Manager Approval", "medium"): (
        "Enable email reminders for approvals pending more than 3 days."
    ),
    ("Goods Receipt Verification", "high"): (
        "Investigate warehouse staffing or receiving dock capacity."
    ),
    ("Goods Receipt Verification", "medium"): (
        "Review goods receipt scheduling with logistics team."
    ),
    ("Budget Approval", "high"): (
        "Automate budget checks against pre-approved thresholds."
    ),
    ("Budget Approval", "medium"): (
        "Streamline budget approval workflow with tiered approval limits."
    ),
    ("Three-Way Matching", "high"): (
        "Flag mismatches automatically and route to AP team immediately."
    ),
    ("Three-Way Matching", "medium"): (
        "Implement document pre-validation to catch discrepancies earlier."
    ),
    ("Purchase Requisition Creation", "high"): (
        "Standardise PR templates and pre-populate vendor/item master data."
    ),
    ("Purchase Order Creation", "high"): (
        "Automate PO generation from approved PRs using ERP workflow rules."
    ),
    ("Payment Authorization", "high"): (
        "Implement tiered payment authority to reduce authorization bottlenecks."
    ),
    # Default fallbacks
    ("__default__", "high"): (
        "This activity is a critical bottleneck. Review resource allocation and automation opportunities."
    ),
    ("__default__", "medium"): (
        "Monitor this activity closely and consider process redesign."
    ),
    ("__default__", "low"): (
        "Minor delay detected. No immediate action required."
    ),
}


def _get_recommendation(activity_name: str, severity: str) -> str:
    """Look up recommendation string from the rule table; fall back to default."""
    key = (activity_name, severity)
    return RECOMMENDATIONS.get(key) or RECOMMENDATIONS.get(("__default__", severity), "")


def _severity_from_duration(avg_days: float) -> str:
    """Classify severity based on avg duration thresholds."""
    if avg_days > 10:
        return "high"
    if avg_days >= 5:
        return "medium"
    return "low"


def compute_bottleneck_metrics(event_log: EventLog) -> None:
    """
    Compute and persist ActivityMetric rows for every unique activity in the log.
    A bottleneck is flagged when avg_duration > mean + 2*stdev across all activities.
    """
    from django.db.models import Avg, Min, Max, StdDev, Count
    from apps.event_logs.models import P2PEvent

    logger.info(
        {"event": "bottleneck_computation_started", "event_log_id": str(event_log.id)}
    )

    # Aggregate per-activity stats from P2PEvent rows linked to this log's cases
    events_qs = P2PEvent.objects.filter(
        case__event_log=event_log,
        duration_days__isnull=False,
    )

    activity_stats: dict[str, dict] = {}
    for evt in events_qs.values("activity", "duration_days"):
        act = evt["activity"]
        dur = evt["duration_days"]
        if act not in activity_stats:
            activity_stats[act] = {"durations": []}
        activity_stats[act]["durations"].append(dur)

    if not activity_stats:
        logger.warning(
            {"event": "no_activity_stats", "event_log_id": str(event_log.id)}
        )
        return

    # Compute per-activity averages
    act_avgs = {}
    for act, data in activity_stats.items():
        durations = data["durations"]
        avg = sum(durations) / len(durations)
        act_avgs[act] = avg

    all_avgs = list(act_avgs.values())
    global_mean = statistics.mean(all_avgs)
    global_stdev = statistics.pstdev(all_avgs) if len(all_avgs) > 1 else 0.0
    bottleneck_threshold = global_mean + 2 * global_stdev

    logger.debug(
        {
            "event": "bottleneck_thresholds",
            "global_mean": global_mean,
            "global_stdev": global_stdev,
            "threshold": bottleneck_threshold,
        }
    )

    # Delete existing records for this log before re-inserting
    ActivityMetric.objects.filter(event_log=event_log).delete()

    metrics_to_create = []
    for act, data in activity_stats.items():
        durations = data["durations"]
        avg = sum(durations) / len(durations)
        min_d = min(durations)
        max_d = max(durations)
        if len(durations) > 1:
            std = statistics.pstdev(durations)
            variance_pct = (std / avg * 100) if avg > 0 else 0.0
        else:
            variance_pct = 0.0

        is_bottleneck = avg > bottleneck_threshold
        severity = _severity_from_duration(avg)
        recommendation = _get_recommendation(act, severity)

        metrics_to_create.append(
            ActivityMetric(
                event_log=event_log,
                activity_name=act,
                avg_duration_days=avg,
                min_duration_days=min_d,
                max_duration_days=max_d,
                variance_pct=variance_pct,
                is_bottleneck=is_bottleneck,
                bottleneck_severity=severity,
                recommendation=recommendation,
            )
        )

    ActivityMetric.objects.bulk_create(metrics_to_create, ignore_conflicts=True)

    logger.info(
        {
            "event": "bottleneck_computation_complete",
            "event_log_id": str(event_log.id),
            "activities": len(metrics_to_create),
            "bottlenecks": sum(1 for m in metrics_to_create if m.is_bottleneck),
        }
    )
