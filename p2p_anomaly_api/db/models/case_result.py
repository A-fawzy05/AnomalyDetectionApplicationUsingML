"""
ORM model for case results.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.models import Base


class CaseResult(Base):
    __tablename__ = "case_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("p2p.analysis_runs.run_id", ondelete="CASCADE"), nullable=False)
    case_id = Column(String, nullable=False)
    supplier = Column(String)
    amount = Column(Numeric(18, 4))
    currency = Column(String, default="EUR")
    anomaly_type = Column(String)  # primary label
    severity_score = Column(Numeric(5, 4))
    severity_label = Column(String)
    status = Column(String, nullable=False, default="Open")
    # 'Open' | 'Investigating' | 'Resolved' | 'False Positive'
    if_score = Column(Numeric(10, 6))
    lstm_case_score = Column(Numeric(10, 6))
    hybrid_score = Column(Numeric(10, 6))
    case_duration_hours = Column(Numeric(12, 4))
    off_hours_ratio = Column(Numeric(5, 4))
    price_deviation_pct = Column(Numeric(10, 4))
    vendor_case_frequency = Column(Integer)
    detected_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("run_id", "case_id", name="uq_run_case"),
    )

    flags = relationship("CaseFlag", back_populates="case_result", uselist=False, cascade="all, delete-orphan")

