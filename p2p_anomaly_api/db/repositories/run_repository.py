"""
Repository for AnalysisRun database operations.
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from db.models.analysis_run import AnalysisRun


async def create_run(
    session: AsyncSession, 
    file_name: str, 
    file_type: str, 
    file_size: Optional[int] = None
) -> AnalysisRun:
    run = AnalysisRun(
        file_name=file_name,
        file_type=file_type,
        file_size_bytes=file_size,
        status="pending"
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return run


async def update_run_status(
    session: AsyncSession, 
    run_id: UUID, 
    status: str, 
    error_message: Optional[str] = None
) -> None:
    stmt = (
        update(AnalysisRun)
        .where(AnalysisRun.run_id == run_id)
        .values(status=status, error_message=error_message)
    )
    await session.execute(stmt)
    await session.commit()


async def update_run_results(
    session: AsyncSession, 
    run_id: UUID, 
    summary_dict: dict, 
    duration_ms: int
) -> None:
    stmt = (
        update(AnalysisRun)
        .where(AnalysisRun.run_id == run_id)
        .values(
            total_cases=summary_dict.get("total_cases"),
            anomalous_cases=summary_dict.get("anomalous_cases"),
            anomaly_rate=summary_dict.get("anomaly_rate"),
            avg_processing_time_days=summary_dict.get("avg_processing_time_days"),
            duration_ms=duration_ms,
            status="completed"
        )
    )
    await session.execute(stmt)
    await session.commit()


async def get_run(session: AsyncSession, run_id: UUID) -> Optional[AnalysisRun]:
    result = await session.execute(select(AnalysisRun).where(AnalysisRun.run_id == run_id))
    return result.scalar_one_or_none()


async def list_runs(session: AsyncSession, page: int = 1, page_size: int = 10) -> List[AnalysisRun]:
    stmt = (
        select(AnalysisRun)
        .order_by(AnalysisRun.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def delete_run(session: AsyncSession, run_id: UUID) -> bool:
    run = await get_run(session, run_id)
    if not run:
        return False
    await session.delete(run)
    await session.commit()
    return True


async def get_latest_completed_run(session: AsyncSession) -> Optional[AnalysisRun]:
    """Get the most recent completed run for delta calculations."""
    stmt = (
        select(AnalysisRun)
        .where(AnalysisRun.status == "completed")
        .order_by(AnalysisRun.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def delete_all_runs(session: AsyncSession) -> int:
    from sqlalchemy import delete
    stmt = delete(AnalysisRun)
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount

