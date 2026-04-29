"""
Endpoints for retrieving analysis run history.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from db.repositories import run_repository, case_repository, phase_repository
from api.v1.schemas.response import RunListItem, AnalysisResponse

router = APIRouter()


@router.get("/runs", response_model=List[RunListItem])
async def list_runs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    runs = await run_repository.list_runs(db, page, page_size)
    return runs


@router.get("/runs/{run_id}", response_model=AnalysisResponse)
async def get_run_details(run_id: UUID, db: AsyncSession = Depends(get_db)):
    run = await run_repository.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if run.status != "completed":
        raise HTTPException(status_code=400, detail=f"Run status is {run.status}")

    # Rebuild AnalysisResponse from DB
    summary = {
        "total_cases": run.total_cases,
        "anomalous_cases": run.anomalous_cases,
        "anomaly_rate": float(run.anomaly_rate) if run.anomaly_rate else 0.0,
        "avg_processing_time_days": float(run.avg_processing_time_days) if run.avg_processing_time_days else 0.0
    }
    
    # Get all anomalies for this run
    cases = await case_repository.get_cases(db, run_id, {"anomaly_type": None}, 1, 1000)
    
    anomaly_cases = []
    type_counts = {}
    sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    
    for c in cases:
        if c.anomaly_type:
            type_counts[c.anomaly_type] = type_counts.get(c.anomaly_type, 0) + 1
            
        sev_counts[c.severity_label] = sev_counts.get(c.severity_label, 0) + 1
        
        # Only include top 100 anomalies in the full response to keep it manageable
        if c.anomaly_type and len(anomaly_cases) < 100:
            anomaly_cases.append({
                "case_id": c.case_id,
                "supplier": c.supplier,
                "amount": float(c.amount),
                "anomaly_type": c.anomaly_type,
                "severity_score": float(c.severity_score),
                "severity_label": c.severity_label,
                "status": c.status,
                "detected_at": c.detected_at,
                "flags": {
                    "price_mismatch": c.flags.price_mismatch,
                    "three_way_match_failure": c.flags.three_way_match_failure,
                    "maverick_buying": c.flags.maverick_buying,
                    "temporal_delay": c.flags.temporal_delay,
                    "duplicate_invoice": c.flags.duplicate_invoice,
                    "unauthorized_vendor": c.flags.unauthorized_vendor,
                    "quantity_variance": c.flags.quantity_variance,
                }
            })

    phases = await phase_repository.get_phases(db, run_id)
    flow_map = [
        {
            "phase": p.phase,
            "total_cases": p.total_cases,
            "anomalies": p.anomalies,
            "anomaly_rate": float(p.anomaly_rate)
        } for p in phases
    ]

    return {
        "run_id": run.run_id,
        "summary": summary,
        "anomaly_cases": anomaly_cases,
        "anomaly_type_counts": type_counts,
        "severity_counts": {
            "Critical (80-100%)": sev_counts["Critical"],
            "High (60-79%)": sev_counts["High"],
            "Medium (40-59%)": sev_counts["Medium"],
            "Low (0-39%)": sev_counts["Low"],
        },
        "process_flow_map": flow_map,
        "real_time_feed": [item for item in anomaly_cases[:10]]
    }

