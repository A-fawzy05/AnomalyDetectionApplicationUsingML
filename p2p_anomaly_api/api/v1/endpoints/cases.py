"""
Endpoints for retrieving case results.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from db.repositories import case_repository
from api.v1.schemas.response import CaseListResponse, AnomalyCase
from api.deps import require_membership, Identity

router = APIRouter()


@router.get("/cases", response_model=CaseListResponse)
async def get_cases(
    run_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    anomaly_type: Optional[str] = None,
    severity_label: Optional[str] = None,
    status: Optional[str] = None,
    supplier: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(require_membership),
):
    filters = {
        "anomaly_type": anomaly_type,
        "severity_label": severity_label,
        "status": status,
        "supplier": supplier
    }
    
    cases = await case_repository.get_cases(db, run_id, filters, page, page_size)
    total = await case_repository.count_cases(db, run_id, filters)
    
    items = []
    for c in cases:
        items.append({
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
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

