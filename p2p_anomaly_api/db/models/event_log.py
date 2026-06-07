

import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from db.models import Base

class EventLog(Base):
    __tablename__ = "event_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("p2p.analysis_runs.run_id", ondelete="CASCADE"), nullable=False)
    case_id = Column(String, nullable=False)
    activity = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    resource = Column(String)
    amount = Column(Numeric(18, 4))
    quantity = Column(Integer)
    vendor = Column(String)
    document_type = Column(String)
    spend_area = Column(String)
    item_category = Column(String)

    __table_args__ = (
        Index("idx_event_log_run_case", "run_id", "case_id"),
    )

