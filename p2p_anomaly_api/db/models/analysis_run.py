"""
ORM model for analysis runs.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from db.models import Base


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    run_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'csv' | 'xes' | 'ocel2_json'
    file_size_bytes = Column(BigInteger)
    total_cases = Column(Integer)
    anomalous_cases = Column(Integer)
    anomaly_rate = Column(Numeric(6, 4))
    avg_processing_time_days = Column(Numeric(10, 4))
    status = Column(String, nullable=False, default="pending")
    # 'pending' | 'processing' | 'completed' | 'failed'
    error_message = Column(Text)
    duration_ms = Column(Integer)

