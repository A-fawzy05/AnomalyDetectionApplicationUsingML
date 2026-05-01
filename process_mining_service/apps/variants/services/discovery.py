"""
Variant discovery service.
Uses pm4py to discover process variants and assigns human-readable names.
"""
import logging
from collections import defaultdict
from typing import Optional

from apps.event_logs.models import EventLog, P2PCase, P2PEvent
from apps.variants.models import ProcessVariant

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Human-readable variant name rules (deterministic, no LLM)
# ---------------------------------------------------------------------------
VARIANT_NAME_RULES = [
    # (must_contain, must_not_contain, name)
    (["Manager Approval"], ["Budget Approval"], "Manual Approval"),
    (["Budget Approval", "Manager Approval"], [], "Dual Approval"),
    (["Budget Approval"], ["Manager Approval"], "Budget-Only Approval"),
    (["Three-Way Matching", "Invoice Processing", "Goods Receipt Verification"], [], "Standard Flow"),
    (["Invoice Processing"], ["Goods Receipt Verification"], "Invoice-Direct"),
    (["Payment Authorization"], ["Three-Way Matching"], "Direct Payment"),
    (["Goods Receipt Verification"], ["Invoice Processing"], "Goods-Only"),
]


def _name_variant(activity_sequence: list[str]) -> str:
    """Apply the naming rule table to assign a human-readable variant name."""
    seq_set = set(activity_sequence)
    for must_have, must_not_have, name in VARIANT_NAME_RULES:
        if all(a in seq_set for a in must_have) and not any(a in seq_set for a in must_not_have):
            return name
    # Fallback: use first and last activity
    if activity_sequence:
        return f"{activity_sequence[0]} → {activity_sequence[-1]}"
    return "Unknown Variant"


def _try_pm4py_discovery(event_log: EventLog) -> Optional[list[ProcessVariant]]:
    """
    Attempt pm4py-based variant discovery.
    Returns list of ProcessVariant objects (unsaved) or None on failure.
    """
    try:
        import pm4py
        import pandas as pd

        # Build a pandas DataFrame from stored events
        events = list(
            P2PEvent.objects.filter(case__event_log=event_log)
            .values("case__case_id", "activity", "timestamp")
            .order_by("case__case_id", "timestamp")
        )
        if not events:
            return None

        df = pd.DataFrame(events)
        df.rename(
            columns={
                "case__case_id": "case:concept:name",
                "activity": "concept:name",
                "timestamp": "time:timestamp",
            },
            inplace=True,
        )
        df["time:timestamp"] = pd.to_datetime(df["time:timestamp"], utc=True)

        event_log_pm4py = pm4py.convert_to_event_log(df)
        variants_dict = pm4py.get_variants(event_log_pm4py)

        total_cases = event_log.cases.count() or 1
        variants_list = []

        for idx, (variant_tuple, cases_in_variant) in enumerate(
            sorted(variants_dict.items(), key=lambda x: -len(x[1]))
        ):
            if isinstance(variant_tuple, tuple):
                activity_seq = list(variant_tuple)
            else:
                activity_seq = list(variant_tuple)

            case_count = len(cases_in_variant)
            freq_pct = (case_count / total_cases) * 100.0

            # Average duration for this variant's cases
            case_ids_in_variant = [
                c.attributes.get("concept:name", "") if hasattr(c, "attributes") else ""
                for c in cases_in_variant
            ]
            # Duration from P2PCase
            durations = list(
                P2PCase.objects.filter(
                    event_log=event_log,
                    cycle_time_days__isnull=False,
                ).values_list("cycle_time_days", flat=True)[:case_count]
            )
            avg_dur = sum(durations) / len(durations) if durations else 0.0

            name = _name_variant(activity_seq)

            variants_list.append(
                ProcessVariant(
                    event_log=event_log,
                    variant_id=idx,
                    name=name,
                    activity_sequence=activity_seq,
                    frequency_pct=round(freq_pct, 2),
                    case_count=case_count,
                    avg_duration_days=round(avg_dur, 2),
                    conformance_score=100.0,  # updated by conformance service
                    anomaly_rate_pct=0.0,  # updated by severity service
                )
            )

        return variants_list

    except Exception as exc:  # pylint: disable=broad-except
        logger.warning(
            {"event": "pm4py_discovery_failed", "error": str(exc),
             "event_log_id": str(event_log.id)}
        )
        return None


def _fallback_discovery(event_log: EventLog) -> list[ProcessVariant]:
    """
    Pure-Python variant discovery: groups cases by their ordered activity sequence.
    Used when pm4py is unavailable or fails.
    """
    from collections import Counter

    total_cases = event_log.cases.count() or 1

    # Build a sequence per case
    case_sequences: dict[str, list[str]] = defaultdict(list)
    for evt in (
        P2PEvent.objects.filter(case__event_log=event_log)
        .order_by("case__case_id", "timestamp")
        .values("case__case_id", "activity")
    ):
        case_sequences[evt["case__case_id"]].append(evt["activity"])

    # Group by sequence tuple
    seq_groups: dict[tuple, list[str]] = defaultdict(list)
    for case_id, seq in case_sequences.items():
        seq_groups[tuple(seq)].append(case_id)

    variants_list = []
    for idx, (seq_tuple, case_ids) in enumerate(
        sorted(seq_groups.items(), key=lambda x: -len(x[1]))
    ):
        activity_seq = list(seq_tuple)
        case_count = len(case_ids)
        freq_pct = (case_count / total_cases) * 100.0

        durations = list(
            P2PCase.objects.filter(
                case_id__in=case_ids, event_log=event_log, cycle_time_days__isnull=False
            ).values_list("cycle_time_days", flat=True)
        )
        avg_dur = sum(durations) / len(durations) if durations else 0.0

        # Update P2PCase.variant_id
        P2PCase.objects.filter(case_id__in=case_ids, event_log=event_log).update(
            variant_id=idx
        )

        name = _name_variant(activity_seq)
        variants_list.append(
            ProcessVariant(
                event_log=event_log,
                variant_id=idx,
                name=name,
                activity_sequence=activity_seq,
                frequency_pct=round(freq_pct, 2),
                case_count=case_count,
                avg_duration_days=round(avg_dur, 2),
                conformance_score=100.0,
                anomaly_rate_pct=0.0,
            )
        )

    return variants_list


def discover_variants(event_log: EventLog) -> list[ProcessVariant]:
    """
    Discover process variants and persist them as ProcessVariant rows.
    First tries pm4py; falls back to pure-Python grouping.
    Returns the list of saved ProcessVariant objects.
    """
    logger.info(
        {"event": "variant_discovery_started", "event_log_id": str(event_log.id)}
    )

    # Clear old variants for this log
    ProcessVariant.objects.filter(event_log=event_log).delete()

    variants = _try_pm4py_discovery(event_log) or _fallback_discovery(event_log)

    if variants:
        ProcessVariant.objects.bulk_create(variants, ignore_conflicts=True)
        # Re-fetch to get IDs
        variants = list(ProcessVariant.objects.filter(event_log=event_log))

    logger.info(
        {
            "event": "variant_discovery_complete",
            "event_log_id": str(event_log.id),
            "variant_count": len(variants),
        }
    )
    return variants
