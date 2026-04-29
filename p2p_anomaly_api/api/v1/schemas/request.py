"""
Pydantic schemas for API requests.
"""

from typing import Optional
from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    file_type: Optional[str] = None

