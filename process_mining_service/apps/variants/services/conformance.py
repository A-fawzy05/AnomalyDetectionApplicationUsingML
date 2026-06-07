
   
import logging
from typing import Optional

from apps.event_logs.models import EventLog
from apps.variants.models import ProcessVariant

logger = logging.getLogger(__name__)

REFERENCE_P2P_SEQUENCE = [
    "Purchase Requisition Creation",
    "Budget Approval",
    "Manager Approval",
    "Purchase Order Creation",
    "Goods Receipt Verification",
    "Invoice Processing",
    "Three-Way Matching",
    "Payment Authorization",
]

def _compute_token_fitness(
    activity_sequence: list[str], reference_sequence: list[str] | None = None
) -> float:

       
    ref = reference_sequence if reference_sequence else REFERENCE_P2P_SEQUENCE
    if not ref or not activity_sequence:
        return 0.0

    reference_set = set(ref)

    matched = len(reference_set & set(activity_sequence))

    in_ref = [a for a in activity_sequence if a in reference_set]
    order_score = 0
    last_ref_idx = -1
    for act in in_ref:
        ref_idx = ref.index(act)
        if ref_idx >= last_ref_idx:
            order_score += 1
            last_ref_idx = ref_idx

    order_ratio = order_score / len(in_ref) if in_ref else 1.0

    fitness = (matched / len(ref)) * 100.0 * order_ratio
    return round(min(100.0, max(0.0, fitness)), 2)

def _build_reference_model(event_log: EventLog):

       
    try:
        import pm4py
        import pandas as pd
        from apps.event_logs.models import P2PEvent

        events = list(
            P2PEvent.objects.filter(case__event_log=event_log)
            .values("case__case_id", "activity", "timestamp")
            .order_by("case__case_id", "timestamp")
        )
        if not events:
            return None, None, None

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
        pm4py_log = pm4py.convert_to_event_log(df)
        net, im, fm = pm4py.discover_petri_net_inductive(pm4py_log)
        logger.info({"event": "reference_model_built", "event_log_id": str(event_log.id)})
        return net, im, fm

    except Exception as exc:                                
        logger.warning(
            {
                "event": "reference_model_build_failed",
                "event_log_id": str(event_log.id),
                "error": str(exc),
            }
        )
        return None, None, None

def _pm4py_conformance(
    event_log: EventLog,
    variant: ProcessVariant,
    net=None,
    im=None,
    fm=None,
) -> Optional[float]:

       
    if net is None:
        return None

    try:
        import pm4py
        import pandas as pd
        from apps.event_logs.models import P2PEvent, P2PCase

        case_ids = list(
            P2PCase.objects.filter(
                event_log=event_log, variant_id=variant.variant_id
            ).values_list("case_id", flat=True)
        )
        if not case_ids:
            logger.debug(
                {
                    "event": "pm4py_conformance_no_cases",
                    "variant_id": variant.variant_id,
                }
            )
            return None

        events = list(
            P2PEvent.objects.filter(
                case__case_id__in=case_ids, case__event_log=event_log
            )
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
        pm4py_log = pm4py.convert_to_event_log(df)

        result = pm4py.conformance_diagnostics_token_based_replay(pm4py_log, net, im, fm)
        fitness_values = [r.get("trace_fitness", 0) for r in result]
        avg_fitness = (
            (sum(fitness_values) / len(fitness_values)) * 100.0
            if fitness_values
            else 0.0
        )
        return round(avg_fitness, 2)

    except Exception as exc:                                
        logger.warning(
            {
                "event": "pm4py_conformance_failed",
                "variant_id": variant.variant_id,
                "error": str(exc),
            }
        )
        return None

def compute_conformance(
    event_log: EventLog, variants: list[ProcessVariant]
) -> None:

       
    logger.info(
        {
            "event": "conformance_computation_started",
            "event_log_id": str(event_log.id),
            "variants": len(variants),
        }
    )

    net, im, fm = _build_reference_model(event_log)

    fallback_reference: list[str] | None = None
    if variants:
        most_frequent = max(variants, key=lambda v: v.frequency_pct)
        fallback_reference = most_frequent.activity_sequence

    for variant in variants:
                                     
        score = _pm4py_conformance(event_log, variant, net, im, fm)

        if score is None:
                                                                                          
            score = _compute_token_fitness(variant.activity_sequence, fallback_reference)

        variant.conformance_score = score
        variant.save(update_fields=["conformance_score"])
        logger.debug(
            {
                "event": "conformance_score_saved",
                "variant_id": variant.variant_id,
                "score": score,
            }
        )

    logger.info(
        {
            "event": "conformance_computation_complete",
            "event_log_id": str(event_log.id),
        }
    )
