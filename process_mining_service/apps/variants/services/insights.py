
   
import logging

from apps.variants.models import ProcessVariant

logger = logging.getLogger(__name__)

ANOMALY_THRESHOLD_PCT = 15.0
CONFORMANCE_TARGET_PCT = 85.0
CYCLE_TIME_BENCHMARK_DAYS = 10.0

def generate_variant_insights(
    variant: ProcessVariant,
    threshold_pct: float = ANOMALY_THRESHOLD_PCT,
) -> list[dict]:

       
    insights: list[dict] = []

    logger.debug(
        {
            "event": "generating_insights",
            "variant_id": variant.variant_id,
            "anomaly_rate": variant.anomaly_rate_pct,
            "conformance": variant.conformance_score,
            "avg_duration": variant.avg_duration_days,
        }
    )

    if variant.anomaly_rate_pct > threshold_pct:
        insights.append(
            {
                "type": "warning",
                "title": "High Anomaly Concentration",
                "description": (
                    f"This variant has a {variant.anomaly_rate_pct:.1f}% anomaly rate, "
                    f"exceeding the {threshold_pct:.0f}% threshold."
                ),
            }
        )

    if variant.conformance_score < CONFORMANCE_TARGET_PCT:
        insights.append(
            {
                "type": "warning",
                "title": "Low Conformance Score",
                "description": (
                    f"Conformance is {variant.conformance_score:.1f}%, below the "
                    f"{CONFORMANCE_TARGET_PCT:.0f}% target. Review process deviations."
                ),
            }
        )

    if variant.avg_duration_days > CYCLE_TIME_BENCHMARK_DAYS:
        insights.append(
            {
                "type": "info",
                "title": "Above-Average Cycle Time",
                "description": (
                    f"Average duration of {variant.avg_duration_days:.1f} days is above "
                    f"the {CYCLE_TIME_BENCHMARK_DAYS:.0f}-day benchmark."
                ),
            }
        )

    if (
        variant.anomaly_rate_pct <= threshold_pct
        and variant.conformance_score >= CONFORMANCE_TARGET_PCT
    ):
        insights.append(
            {
                "type": "info",
                "title": "Process Optimization Opportunity",
                "description": (
                    "Consider reviewing this variant for further efficiency improvements."
                ),
            }
        )

    return insights
