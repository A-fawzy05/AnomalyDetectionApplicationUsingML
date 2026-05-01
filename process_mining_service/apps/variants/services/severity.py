"""
Anomaly rate computation per variant.
Queries CaseAnomalySeverity rows (populated by FastAPI) to compute anomaly_rate_pct.
"""
import logging

from apps.event_logs.models import EventLog, P2PCase
from apps.variants.models import ProcessVariant, CaseAnomalySeverity

logger = logging.getLogger(__name__)


def compute_anomaly_rates(
    event_log: EventLog, variants: list[ProcessVariant]
) -> None:
    """
    For each variant, count cases where anomaly severity != 'none'
    and compute anomaly_rate_pct = (anomalous / total_in_variant) * 100.
    Persists results to ProcessVariant.anomaly_rate_pct.
    """
    logger.info(
        {
            "event": "anomaly_rate_computation_started",
            "event_log_id": str(event_log.id),
        }
    )

    for variant in variants:
        variant_cases = P2PCase.objects.filter(
            event_log=event_log, variant_id=variant.variant_id
        )
        total = variant_cases.count()
        if total == 0:
            variant.anomaly_rate_pct = 0.0
            variant.save(update_fields=["anomaly_rate_pct"])
            continue

        case_pks = variant_cases.values_list("id", flat=True)
        anomalous = CaseAnomalySeverity.objects.filter(
            case_id__in=case_pks
        ).exclude(severity=CaseAnomalySeverity.Severity.NONE).count()

        rate = (anomalous / total) * 100.0
        variant.anomaly_rate_pct = round(rate, 2)
        variant.save(update_fields=["anomaly_rate_pct"])

        logger.debug(
            {
                "event": "anomaly_rate_saved",
                "variant_id": variant.variant_id,
                "rate": rate,
                "anomalous": anomalous,
                "total": total,
            }
        )

    logger.info(
        {
            "event": "anomaly_rate_computation_complete",
            "event_log_id": str(event_log.id),
        }
    )


def get_severity_distribution(
    event_log: EventLog, variant: ProcessVariant | None = None
) -> dict:
    """
    Compute severity distribution counts and percentages.
    If variant is provided, scope to cases in that variant only.
    Returns a dict ready for the API response.
    """
    severity_colors = {
        "critical": "#ef4444",
        "high": "#f97316",
        "medium": "#eab308",
        "low": "#22c55e",
        "none": "#6b7280",
    }

    case_qs = P2PCase.objects.filter(event_log=event_log)
    if variant is not None:
        case_qs = case_qs.filter(variant_id=variant.variant_id)

    case_pks = case_qs.values_list("id", flat=True)
    severity_qs = CaseAnomalySeverity.objects.filter(case_id__in=case_pks)

    total = severity_qs.count()
    anomalous = severity_qs.exclude(severity=CaseAnomalySeverity.Severity.NONE).count()

    distribution = []
    for level in ["critical", "high", "medium", "low"]:
        count = severity_qs.filter(severity=level).count()
        pct = round((count / total) * 100, 1) if total > 0 else 0.0
        distribution.append(
            {
                "level": level,
                "count": count,
                "pct": pct,
                "color": severity_colors.get(level, "#6b7280"),
            }
        )

    return {
        "total_cases": total,
        "anomalous_cases": anomalous,
        "severity_distribution": distribution,
    }
