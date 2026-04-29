"""
ORM model for phase summaries.
"""

import uuid
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from db.models import Base


class PhaseSummary(Base):
    __tablename__ = "phase_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("p2p.analysis_runs.run_id", ondelete="CASCADE"), nullable=False)
    phase = Column(String, nullable=False)
    total_cases = Column(Integer, nullable=False)
    anomalies = Column(Integer, nullable=False)
    anomaly_rate = Column(Numeric(6, 4))

