"""
ORM model for case flags.
"""

import uuid
from sqlalchemy import Column, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from p2p_anomaly_api.db.models import Base


class CaseFlag(Base):
    __tablename__ = "case_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_result_id = Column(UUID(as_uuid=True), ForeignKey("p2p.case_results.id", ondelete="CASCADE"), nullable=False)
    price_mismatch = Column(Boolean, nullable=False, default=False)
    three_way_match_failure = Column(Boolean, nullable=False, default=False)
    maverick_buying = Column(Boolean, nullable=False, default=False)
    temporal_delay = Column(Boolean, nullable=False, default=False)
    duplicate_invoice = Column(Boolean, nullable=False, default=False)
    unauthorized_vendor = Column(Boolean, nullable=False, default=False)
    quantity_variance = Column(Boolean, nullable=False, default=False)

    case_result = relationship("CaseResult", back_populates="flags")
