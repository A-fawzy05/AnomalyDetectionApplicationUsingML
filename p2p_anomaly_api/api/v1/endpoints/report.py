"""
Report endpoint: publishes a completed run's full analysis to the Kafka topic
`p2p.reports` so that n8n can consume it, call DeepSeek, generate a PDF, and
send it to the user's Telegram account.

POST /runs/{run_id}/report
"""

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories import run_repository, case_repository, phase_repository
from db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

KAFKA_REPORT_TOPIC = "p2p.reports"


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    telegram_phone: str          # user's phone, e.g. "+201234567890"
    user_name: str               # displayed in the PDF / Telegram message
    # Optional filtering — only anomalies above this threshold go into the report
    min_severity: str = "Low"    # "Low" | "Medium" | "High" | "Critical"


class ReportResponse(BaseModel):
    run_id: UUID
    kafka_topic: str
    message: str
    telegram_phone: str


# ---------------------------------------------------------------------------
# Kafka producer (lazy-init, aiokafka)
# ---------------------------------------------------------------------------

_producer = None


async def _get_producer():
    """Lazily initialise the aiokafka AIOKafkaProducer singleton."""
    global _producer
    if _producer is None:
        try:
            from aiokafka import AIOKafkaProducer
            from core.config import settings
            broker = settings.KAFKA_BOOTSTRAP_SERVERS
            _producer = AIOKafkaProducer(
                bootstrap_servers=broker,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            )
            await _producer.start()
            logger.info({"event": "kafka_producer_started", "broker": broker})
        except Exception as exc:
            logger.error({"event": "kafka_producer_init_failed", "error": str(exc)})
            _producer = None
            raise RuntimeError(f"Kafka producer unavailable: {exc}")
    return _producer


async def _publish(topic: str, payload: dict) -> None:
    producer = await _get_producer()
    await producer.send_and_wait(topic, payload)
    logger.info({"event": "kafka_message_sent", "topic": topic, "run_id": str(payload.get("run_id"))})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


def _filter_by_severity(cases: list[dict], min_severity: str) -> list[dict]:
    min_rank = SEVERITY_ORDER.get(min_severity, 0)
    return [c for c in cases if SEVERITY_ORDER.get(c.get("severity_label", "Low"), 0) >= min_rank]


def _build_kafka_payload(run, cases, phases, request: ReportRequest) -> dict:
    """
    Construct the message that n8n will receive and pass to DeepSeek.
    Contains every field needed to generate a comprehensive P2P report.
    """
    # Count anomalies per type
    type_counts: dict[str, int] = {}
    sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for c in cases:
        t = c.get("anomaly_type")
        if t:
            type_counts[t] = type_counts.get(t, 0) + 1
        sev = c.get("severity_label", "Low")
        sev_counts[sev] = sev_counts.get(sev, 0) + 1

    # Top 10 most critical anomalies for the executive summary
    anomalies_sorted = sorted(cases, key=lambda c: c.get("severity_score", 0), reverse=True)

    return {
        "run_id": str(run.run_id),
        "telegram_phone": request.telegram_phone,
        "user_name": request.user_name,
        "generated_at": str(run.created_at),
        "file_name": run.file_name,

        # KPI summary
        "summary": {
            "total_cases": run.total_cases,
            "anomalous_cases": run.anomalous_cases,
            "anomaly_rate_pct": round(float(run.anomaly_rate or 0) * 100, 2),
            "avg_processing_time_days": round(float(run.avg_processing_time_days or 0), 2),
        },

        # Severity breakdown
        "severity_counts": {
            "Critical (90-100%)": sev_counts["Critical"],
            "High (60-90%)": sev_counts["High"],
            "Medium (40-59%)": sev_counts["Medium"],
            "Low (0-39%)": sev_counts["Low"],
        },

        # Anomaly type breakdown
        "anomaly_type_counts": type_counts,

        # Process flow funnel (per phase)
        "process_flow_map": [
            {
                "phase": p.phase,
                "total_cases": p.total_cases,
                "anomalies": p.anomalies,
                "anomaly_rate_pct": round(float(p.anomaly_rate or 0) * 100, 2),
            }
            for p in phases
        ],

        # Top anomalies for the report body
        "top_anomalies": [
            {
                "case_id": c.get("case_id"),
                "supplier": c.get("supplier"),
                "amount": c.get("amount"),
                "anomaly_type": c.get("anomaly_type"),
                "severity_label": c.get("severity_label"),
                "severity_score": round(c.get("severity_score", 0), 4),
                "flags": c.get("flags", {}),
            }
            for c in anomalies_sorted[:20]
        ],

        # All anomaly cases (filtered by min_severity) for the full report table
        "all_anomaly_cases": [
            {
                "case_id": c.get("case_id"),
                "supplier": c.get("supplier"),
                "amount": c.get("amount"),
                "anomaly_type": c.get("anomaly_type"),
                "severity_label": c.get("severity_label"),
                "flags": c.get("flags", {}),
            }
            for c in _filter_by_severity(cases, request.min_severity)
            if c.get("anomaly_type")
        ],
    }


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/runs/{run_id}/report",
    response_model=ReportResponse,
    summary="Generate and publish a P2P analysis report to Kafka → n8n → DeepSeek → Telegram PDF",
    description=(
        "Fetches the completed run's full analysis from the database, builds a structured "
        "report payload, and publishes it to the Kafka topic `p2p.reports`. "
        "n8n consumes the message, calls the DeepSeek API to generate AI-powered insights "
        "for each procurement phase, compiles a PDF, and sends it to the user's Telegram. "
        "The run must be in 'completed' status."
    ),
    tags=["Reports"],
)
async def generate_report(
    run_id: UUID,
    request: ReportRequest,
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:

    # 1. Validate run
    run = await run_repository.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    if run.status != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Run {run_id} is in status '{run.status}'. Only completed runs can be reported.",
        )

    logger.info({
        "event": "report_requested",
        "run_id": str(run_id),
        "telegram_phone": request.telegram_phone,
        "user": request.user_name,
    })

    # 2. Load all cases and phase summaries from DB
    raw_cases = await case_repository.get_cases(db, run_id, {}, page=1, page_size=5000)
    phases = await phase_repository.get_phases(db, run_id)

    # Serialise ORM objects to plain dicts for Kafka
    cases_dicts = []
    for c in raw_cases:
        cases_dicts.append({
            "case_id": c.case_id,
            "supplier": c.supplier,
            "amount": float(c.amount) if c.amount else 0.0,
            "anomaly_type": c.anomaly_type,
            "severity_label": c.severity_label,
            "severity_score": float(c.severity_score) if c.severity_score else 0.0,
            "flags": {
                "price_mismatch": c.flags.price_mismatch if c.flags else False,
                "three_way_match_failure": c.flags.three_way_match_failure if c.flags else False,
                "maverick_buying": c.flags.maverick_buying if c.flags else False,
                "temporal_delay": c.flags.temporal_delay if c.flags else False,
                "duplicate_invoice": c.flags.duplicate_invoice if c.flags else False,
                "unauthorized_vendor": c.flags.unauthorized_vendor if c.flags else False,
                "quantity_variance": c.flags.quantity_variance if c.flags else False,
            },
        })

    # 3. Build Kafka payload
    payload = _build_kafka_payload(run, cases_dicts, phases, request)

    # 4. Publish to Kafka
    try:
        await _publish(KAFKA_REPORT_TOPIC, payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {
        "run_id": run_id,
        "kafka_topic": KAFKA_REPORT_TOPIC,
        "message": (
            f"Report queued successfully. "
            f"You will receive a PDF on Telegram ({request.telegram_phone}) shortly."
        ),
        "telegram_phone": request.telegram_phone,
    }
