"""
Weekly throughput computation service.
Aggregates cases by ISO week and persists WeeklyMetric rows.
"""
import logging
from datetime import date, timedelta
from collections import defaultdict

from apps.event_logs.models import EventLog, P2PCase
from apps.performance.models import WeeklyMetric

logger = logging.getLogger(__name__)

# Industry benchmark: 19 days for a full P2P cycle (configurable)
INDUSTRY_BENCHMARK_DAYS = 19.0


def compute_weekly_throughput(event_log: EventLog) -> None:
    """
    Compute per-week throughput and avg cycle time.
    Groups cases by the ISO week of their start_date and saves WeeklyMetric rows.
    """
    logger.info(
        {"event": "weekly_throughput_started", "event_log_id": str(event_log.id)}
    )

    cases = event_log.cases.filter(start_date__isnull=False)
    if not cases.exists():
        logger.warning(
            {"event": "no_cases_for_throughput", "event_log_id": str(event_log.id)}
        )
        return

    # Group cases by (year, week)
    week_data: dict[tuple, dict] = defaultdict(lambda: {"cycle_times": [], "count": 0, "week_start": None})
    for case in cases.values("start_date", "cycle_time_days"):
        start = case["start_date"]
        if start is None:
            continue
        if hasattr(start, "date"):
            d = start.date()
        else:
            d = start
        iso_year, iso_week, _ = d.isocalendar()
        key = (iso_year, iso_week)
        # Compute week start (Monday)
        week_start = d - timedelta(days=d.weekday())
        if week_data[key]["week_start"] is None:
            week_data[key]["week_start"] = week_start
        week_data[key]["count"] += 1
        if case["cycle_time_days"] is not None:
            week_data[key]["cycle_times"].append(case["cycle_time_days"])

    # Delete existing weekly metrics for this log
    WeeklyMetric.objects.filter(event_log=event_log).delete()

    sorted_weeks = sorted(week_data.keys())
    metrics_to_create = []
    for i, key in enumerate(sorted_weeks, start=1):
        data = week_data[key]
        cycle_times = data["cycle_times"]
        avg_ct = sum(cycle_times) / len(cycle_times) if cycle_times else 0.0
        metrics_to_create.append(
            WeeklyMetric(
                event_log=event_log,
                week_label=f"Week {i}",
                week_start=data["week_start"] or date.today(),
                throughput_cases=data["count"],
                avg_cycle_time_days=avg_ct,
                industry_benchmark_days=INDUSTRY_BENCHMARK_DAYS,
            )
        )

    WeeklyMetric.objects.bulk_create(metrics_to_create)

    logger.info(
        {
            "event": "weekly_throughput_complete",
            "event_log_id": str(event_log.id),
            "weeks": len(metrics_to_create),
        }
    )
