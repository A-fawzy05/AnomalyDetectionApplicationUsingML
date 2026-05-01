"""
Conformance checking service.
Uses pm4py token-based replay against the reference P2P process model.
Results are persisted to ProcessVariant.conformance_score (0–100).
Subsequent GET requests serve precomputed scores — no recomputation on read.
"""
import logging
from typing import Optional

from apps.event_logs.models import EventLog
from apps.variants.models import ProcessVariant

logger = logging.getLogger(__name__)

# Reference P2P process flow (linear BPMN-like sequence)
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


def _compute_token_fitness(activity_sequence: list[str]) -> float:
    """
    Token-based replay fitness against the reference P2P sequence.
    Formula: fitness = (matched_activities / len(reference)) * 100
    This is a lightweight approximation; pm4py full replay is used when available.
    """
    reference_set = set(REFERENCE_P2P_SEQUENCE)
    variant_set = set(activity_sequence)
    matched = len(reference_set & variant_set)
    # Order conformance bonus: penalise if activities appear out of order
    order_score = 0
    last_ref_idx = -1
    for act in activity_sequence:
        if act in REFERENCE_P2P_SEQUENCE:
            ref_idx = REFERENCE_P2P_SEQUENCE.index(act)
            if ref_idx >= last_ref_idx:
                order_score += 1
                last_ref_idx = ref_idx
    order_ratio = order_score / len(activity_sequence) if activity_sequence else 1.0
    fitness = (matched / len(REFERENCE_P2P_SEQUENCE)) * 100.0 * order_ratio
    return round(min(100.0, max(0.0, fitness)), 2)


def _pm4py_conformance(
    event_log: EventLog, variant: ProcessVariant
) -> Optional[float]:
    """
    Attempt pm4py token-based replay conformance for a single variant.
    Returns fitness 0–100 or None on failure.
    """
    try:
        import pm4py
        import pandas as pd
        from apps.event_logs.models import P2PEvent, P2PCase

        # Fetch cases belonging to this variant
        case_ids = list(
            P2PCase.objects.filter(
                event_log=event_log, variant_id=variant.variant_id
            ).values_list("case_id", flat=True)
        )
        if not case_ids:
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

        # Discover a Petri net from the reference sequence
        ref_df = pd.DataFrame(
            [
                {"case:concept:name": "ref", "concept:name": act, "time:timestamp": pd.Timestamp("2020-01-01") + pd.Timedelta(days=i)}
                for i, act in enumerate(REFERENCE_P2P_SEQUENCE)
            ]
        )
        ref_df["time:timestamp"] = pd.to_datetime(ref_df["time:timestamp"], utc=True)
        ref_log = pm4py.convert_to_event_log(ref_df)
        net, im, fm = pm4py.discover_petri_net_inductive(ref_log)

        result = pm4py.conformance_diagnostics_token_based_replay(pm4py_log, net, im, fm)
        fitness_values = [r.get("trace_fitness", 0) for r in result]
        avg_fitness = (sum(fitness_values) / len(fitness_values)) * 100.0 if fitness_values else 0.0
        return round(avg_fitness, 2)

    except Exception as exc:  # pylint: disable=broad-except
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
    """
    Compute and persist conformance_score for each ProcessVariant.
    Tries pm4py token-based replay; falls back to lightweight order-fitness.
    """
    logger.info(
        {
            "event": "conformance_computation_started",
            "event_log_id": str(event_log.id),
            "variants": len(variants),
        }
    )

    for variant in variants:
        score = _pm4py_conformance(event_log, variant)
        if score is None:
            score = _compute_token_fitness(variant.activity_sequence)

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
