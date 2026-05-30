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

# Reference P2P process flow (linear BPMN-like sequence) — used only as final fallback
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
    """
    Token-based replay fitness against a reference sequence.
    If no reference_sequence is provided, falls back to REFERENCE_P2P_SEQUENCE.
    Formula: fitness = (matched_activities / len(reference)) * order_ratio * 100
    """
    ref = reference_sequence if reference_sequence else REFERENCE_P2P_SEQUENCE
    if not ref or not activity_sequence:
        return 0.0

    reference_set = set(ref)

    # Activities in the variant that are also in the reference
    matched = len(reference_set & set(activity_sequence))

    # Order conformance: reward activities that appear in the same relative order
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
    """
    Build a pm4py Petri net from ALL cases in the event log using the Inductive Miner.
    Returns (net, im, fm) or (None, None, None) on failure.
    """
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

    except Exception as exc:  # pylint: disable=broad-except
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
    """
    Attempt pm4py token-based replay conformance for a single variant.
    Uses a pre-built Petri net (net/im/fm) discovered from all event log cases.
    Returns fitness 0–100 or None on failure.
    """
    if net is None:
        return None

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

    Strategy:
    1. Build a Petri net from ALL cases in the event log (using pm4py Inductive Miner).
       This ensures the reference model uses the same activity names as the data.
    2. For each variant, run token-based replay against this Petri net.
    3. If pm4py fails for a variant, fall back to lightweight token fitness using
       the most frequent variant's activity sequence as the reference.
    """
    logger.info(
        {
            "event": "conformance_computation_started",
            "event_log_id": str(event_log.id),
            "variants": len(variants),
        }
    )

    # Step 1: build reference Petri net from all cases
    net, im, fm = _build_reference_model(event_log)

    # Step 2: determine fallback reference sequence from the most frequent variant
    # variants are assumed sorted by frequency_pct descending (as inserted by discovery)
    fallback_reference: list[str] | None = None
    if variants:
        most_frequent = max(variants, key=lambda v: v.frequency_pct)
        fallback_reference = most_frequent.activity_sequence

    for variant in variants:
        # Try pm4py conformance first
        score = _pm4py_conformance(event_log, variant, net, im, fm)

        if score is None:
            # Fallback: lightweight token fitness using most frequent variant as reference
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
