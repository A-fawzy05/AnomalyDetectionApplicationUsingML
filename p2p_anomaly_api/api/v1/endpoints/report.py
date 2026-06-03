"""
Report endpoint: calls the n8n webhook synchronously, which runs DeepSeek and
returns the AI-generated Markdown report. No Kafka involved.

POST /runs/{run_id}/report
"""

import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import require_roles, Identity
from core.config import settings
from db.repositories import case_repository, phase_repository, run_repository
from db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class GenerateReportRequest(BaseModel):
    user_name: str
    min_severity: str = "Low"   # Low | Medium | High | Critical


class GenerateReportResponse(BaseModel):
    run_id: UUID
    report_markdown: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


def _filter_by_severity(cases: list[dict], min_severity: str) -> list[dict]:
    min_rank = SEVERITY_ORDER.get(min_severity, 0)
    return [c for c in cases if SEVERITY_ORDER.get(c.get("severity_label", "Low"), 0) >= min_rank]


def _build_payload(run, cases: list[dict], phases, request: GenerateReportRequest) -> dict:
    type_counts: dict[str, int] = {}
    sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for c in cases:
        t = c.get("anomaly_type")
        if t:
            type_counts[t] = type_counts.get(t, 0) + 1
        sev = c.get("severity_label", "Low")
        sev_counts[sev] = sev_counts.get(sev, 0) + 1

    anomalies_sorted = sorted(cases, key=lambda c: c.get("severity_score", 0), reverse=True)

    return {
        "run_id": str(run.run_id),
        "user_name": request.user_name,
        "generated_at": str(run.created_at),
        "file_name": run.file_name,
        "summary": {
            "total_cases": run.total_cases,
            "anomalous_cases": run.anomalous_cases,
            "anomaly_rate_pct": round(float(run.anomaly_rate or 0) * 100, 2),
            "avg_processing_time_days": round(float(run.avg_processing_time_days or 0), 2),
        },
        "severity_counts": {
            "Critical (90-100%)": sev_counts["Critical"],
            "High (60-90%)": sev_counts["High"],
            "Medium (40-59%)": sev_counts["Medium"],
            "Low (0-39%)": sev_counts["Low"],
        },
        "anomaly_type_counts": type_counts,
        "process_flow_map": [
            {
                "phase": p.phase,
                "total_cases": p.total_cases,
                "anomalies": p.anomalies,
                "anomaly_rate_pct": round(float(p.anomaly_rate or 0) * 100, 2),
            }
            for p in phases
        ],
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
    response_model=GenerateReportResponse,
    summary="Generate an AI-written P2P report via n8n → DeepSeek",
    tags=["Reports"],
)
async def generate_report(
    run_id: UUID,
    request: GenerateReportRequest,
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(require_roles("admin", "analyst")),
) -> GenerateReportResponse:

    run = await run_repository.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")
    if run.status != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Run {run_id} has status '{run.status}'. Only completed runs can be reported.",
        )

    logger.info({"event": "report_requested", "run_id": str(run_id), "user": request.user_name})

    raw_cases = await case_repository.get_cases(db, run_id, {}, page=1, page_size=5000)
    phases = await phase_repository.get_phases(db, run_id)

    cases_dicts = [
        {
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
        }
        for c in raw_cases
    ]

    payload = _build_payload(run, cases_dicts, phases, request)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            n8n_resp = await client.post(settings.N8N_REPORT_WEBHOOK_URL, json=payload)
            n8n_resp.raise_for_status()
            n8n_data = n8n_resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Report generation timed out. Try again.")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"n8n webhook error: {exc.response.status_code}")
    except Exception as exc:
        logger.error({"event": "n8n_webhook_failed", "error": str(exc)})
        raise HTTPException(status_code=502, detail="Report generation service unavailable.")

    report_markdown = n8n_data.get("report_markdown", "")
    if not report_markdown:
        raise HTTPException(status_code=502, detail="n8n returned an empty report.")

    logger.info({"event": "report_generated", "run_id": str(run_id), "chars": len(report_markdown)})
    return {"run_id": run_id, "report_markdown": report_markdown}
