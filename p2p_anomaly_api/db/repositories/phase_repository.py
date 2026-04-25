"""
Repository for PhaseSummary database operations.
"""

from typing import List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from p2p_anomaly_api.db.models.phase_summary import PhaseSummary


async def bulk_insert_phases(session: AsyncSession, run_id: UUID, phase_rows: List[dict]) -> None:
    if not phase_rows:
        return
    
    for row in phase_rows:
        row["run_id"] = run_id
        obj = PhaseSummary(**row)
        session.add(obj)
    
    await session.commit()


async def get_phases(session: AsyncSession, run_id: UUID) -> List[PhaseSummary]:
    stmt = select(PhaseSummary).where(PhaseSummary.run_id == run_id)
    result = await session.execute(stmt)
    return result.scalars().all()
