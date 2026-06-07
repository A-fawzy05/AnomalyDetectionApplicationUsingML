
   
import logging
from collections import defaultdict
from typing import Optional

from apps.event_logs.models import EventLog, P2PCase, P2PEvent
from apps.variants.models import ProcessVariant

logger = logging.getLogger(__name__)

VARIANT_NAME_RULES = [
                                            
    (["Manager Approval"], ["Budget Approval"], "Manual Approval"),
    (["Budget Approval", "Manager Approval"], [], "Dual Approval"),
    (["Budget Approval"], ["Manager Approval"], "Budget-Only Approval"),
    (["Three-Way Matching", "Invoice Processing", "Goods Receipt Verification"], [], "Standard Flow"),
    (["Invoice Processing"], ["Goods Receipt Verification"], "Invoice-Direct"),
    (["Payment Authorization"], ["Three-Way Matching"], "Direct Payment"),
    (["Goods Receipt Verification"], ["Invoice Processing"], "Goods-Only"),
]

def _name_variant(activity_sequence: list[str]) -> str:
                                                                              
    seq_set = set(activity_sequence)
    for must_have, must_not_have, name in VARIANT_NAME_RULES:
        if all(a in seq_set for a in must_have) and not any(a in seq_set for a in must_not_have):
            return name
                                           
    if activity_sequence:
        return f"{activity_sequence[0]} → {activity_sequence[-1]}"
    return "Unknown Variant"

def _try_pm4py_discovery(event_log: EventLog) -> Optional[list[ProcessVariant]]:

       
    try:
        import pm4py
        import pandas as pd

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

            case_ids_in_variant = []
            for c in cases_in_variant:
                if hasattr(c, "attributes"):
                    cid = c.attributes.get("concept:name", "")
                else:
                    cid = str(c)
                if cid:
                    case_ids_in_variant.append(cid)

            if case_ids_in_variant:
                P2PCase.objects.filter(
                    case_id__in=case_ids_in_variant, event_log=event_log
                ).update(variant_id=idx)

            if case_ids_in_variant:
                durations = list(
                    P2PCase.objects.filter(
                        case_id__in=case_ids_in_variant,
                        event_log=event_log,
                        cycle_time_days__isnull=False,
                    ).values_list("cycle_time_days", flat=True)
                )
            else:
                durations = []
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
                    conformance_score=100.0,                                  
                    anomaly_rate_pct=0.0,                               
                )
            )

        return variants_list

    except Exception as exc:                                
        logger.warning(
            {"event": "pm4py_discovery_failed", "error": str(exc),
             "event_log_id": str(event_log.id)}
        )
        return None

def _fallback_discovery(event_log: EventLog) -> list[ProcessVariant]:

       
    from collections import Counter

    total_cases = event_log.cases.count() or 1

    case_sequences: dict[str, list[str]] = defaultdict(list)
    for evt in (
        P2PEvent.objects.filter(case__event_log=event_log)
        .order_by("case__case_id", "timestamp")
        .values("case__case_id", "activity")
    ):
        case_sequences[evt["case__case_id"]].append(evt["activity"])

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

       
    logger.info(
        {"event": "variant_discovery_started", "event_log_id": str(event_log.id)}
    )

    ProcessVariant.objects.filter(event_log=event_log).delete()

    variants = _try_pm4py_discovery(event_log) or _fallback_discovery(event_log)

    if variants:
        ProcessVariant.objects.bulk_create(variants, ignore_conflicts=True)
                             
        variants = list(ProcessVariant.objects.filter(event_log=event_log))

    logger.info(
        {
            "event": "variant_discovery_complete",
            "event_log_id": str(event_log.id),
            "variant_count": len(variants),
        }
    )
    return variants
