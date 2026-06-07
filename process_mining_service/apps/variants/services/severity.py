
   
import logging

from apps.event_logs.models import EventLog, P2PCase
from apps.variants.models import ProcessVariant, CaseAnomalySeverity

logger = logging.getLogger(__name__)

def _ensure_case_variant_ids(
    event_log: EventLog, variants: list[ProcessVariant]
) -> None:

       
    from collections import defaultdict
    from apps.event_logs.models import P2PEvent

    if not P2PCase.objects.filter(event_log=event_log, variant_id__isnull=True).exists():
        return

    logger.info({"event": "rebuilding_case_variant_ids", "event_log_id": str(event_log.id)})

    case_sequences: dict = defaultdict(list)
    for evt in (
        P2PEvent.objects.filter(case__event_log=event_log)
        .order_by("case__case_id", "timestamp")
        .values("case_id", "activity")
    ):
        case_sequences[evt["case_id"]].append(evt["activity"])

    seq_to_variant_id = {
        tuple(v.activity_sequence): v.variant_id for v in variants
    }

    for case_pk, seq in case_sequences.items():
        vid = seq_to_variant_id.get(tuple(seq))
        if vid is not None:
            P2PCase.objects.filter(pk=case_pk, event_log=event_log).update(variant_id=vid)

    logger.info({"event": "case_variant_ids_rebuilt", "event_log_id": str(event_log.id)})

def compute_anomaly_rates(
    event_log: EventLog, variants: list[ProcessVariant]
) -> None:

       
    logger.info(
        {
            "event": "anomaly_rate_computation_started",
            "event_log_id": str(event_log.id),
        }
    )

    _ensure_case_variant_ids(event_log, variants)

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
