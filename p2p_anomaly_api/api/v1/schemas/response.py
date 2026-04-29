"""
Pydantic schemas for API responses.
"""

from typing import List, Dict, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class AnomalyFlags(BaseModel):
    price_mismatch: bool
    three_way_match_failure: bool
    maverick_buying: bool
    temporal_delay: bool
    duplicate_invoice: bool
    unauthorized_vendor: bool
    quantity_variance: bool


class AnomalyCase(BaseModel):
    case_id: str
    supplier: Optional[str]
    amount: float
    anomaly_type: Optional[str]
    severity_score: float
    severity_label: str
    status: str
    detected_at: datetime
    flags: AnomalyFlags


class Summary(BaseModel):
    total_cases: int
    anomalous_cases: int
    anomaly_rate: float
    avg_processing_time_days: float
    delta_total_cases_pct: float = 0.0
    delta_anomalous_cases_pct: float = 0.0
    delta_anomaly_rate_pct: float = 0.0
    delta_avg_processing_time_pct: float = 0.0


class PhaseFlow(BaseModel):
    phase: str
    total_cases: int
    anomalies: int
    anomaly_rate: float


class RealTimeFeedItem(BaseModel):
    case_id: str
    supplier: Optional[str]
    anomaly_type: Optional[str]
    amount: float
    severity_label: str
    detected_at: datetime


class AnalysisResponse(BaseModel):
    run_id: UUID
    summary: Summary
    anomaly_cases: List[AnomalyCase]
    anomaly_type_counts: Dict[str, int]
    severity_counts: Dict[str, int]
    process_flow_map: List[PhaseFlow]
    real_time_feed: List[RealTimeFeedItem]


class RunListItem(BaseModel):
    run_id: UUID
    created_at: datetime
    file_name: str
    file_type: str
    total_cases: Optional[int]
    anomalous_cases: Optional[int]
    status: str
    duration_ms: Optional[int]


class CaseListResponse(BaseModel):
    items: List[AnomalyCase]
    total: int
    page: int
    page_size: int


class HealthResponse(BaseModel):
    status: str
    db_connected: bool
    models_loaded: bool
    version: str

