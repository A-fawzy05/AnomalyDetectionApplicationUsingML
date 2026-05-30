"""
Pydantic schemas for API requests.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    file_type: Optional[str] = None


class StreamEvent(BaseModel):
    """A single P2P event for real-time streaming ingestion."""
    case_id: str
    activity: str
    timestamp: datetime
    resource: Optional[str] = None
    amount: float = 0.0
    quantity: float = 1.0
    vendor: Optional[str] = None
    document_type: Optional[str] = None
    spend_area: Optional[str] = None
    company: Optional[str] = None
    item_category: Optional[str] = None


class StreamRequest(BaseModel):
    """
    Request body for POST /runs/{run_id}/append.
    Accepts a list of new P2P events to score and append to an existing run.
    Events for the same case_id are grouped into a trace automatically.
    """
    events: List[StreamEvent]

