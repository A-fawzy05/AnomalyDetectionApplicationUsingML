
   
import logging

from django.conf import settings

from apps.event_logs.models import EventLog, P2PCase

logger = logging.getLogger(__name__)

def compute_sla_metrics(event_log: EventLog) -> None:

       
    sla_threshold = event_log.sla_threshold_days or getattr(
        settings, "SLA_DEFAULT_DAYS", 21
    )

    logger.info(
        {
            "event": "sla_computation_started",
            "event_log_id": str(event_log.id),
            "threshold_days": sla_threshold,
        }
    )

    cases = event_log.cases.filter(cycle_time_days__isnull=False)
    updated = 0
    for case in cases:
        breached = case.cycle_time_days > sla_threshold
        if case.sla_breached != breached:
            case.sla_breached = breached
            case.save(update_fields=["sla_breached"])
            updated += 1

    logger.info(
        {
            "event": "sla_computation_complete",
            "event_log_id": str(event_log.id),
            "cases_updated": updated,
        }
    )

def get_sla_compliance_rate(event_log: EventLog) -> float:

       
    cases = event_log.cases.filter(cycle_time_days__isnull=False)
    total = cases.count()
    if total == 0:
        return 0.0
    within_sla = cases.filter(sla_breached=False).count()
    rate = (within_sla / total) * 100.0
    logger.debug(
        {
            "event": "sla_rate_computed",
            "event_log_id": str(event_log.id),
            "rate": rate,
            "total": total,
            "within_sla": within_sla,
        }
    )
    return rate
