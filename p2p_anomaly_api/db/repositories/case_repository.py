

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, func, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from db.models.case_result import CaseResult
from db.models.case_flag import CaseFlag

async def bulk_insert_cases(session: AsyncSession, run_id: UUID, case_rows: List[dict]) -> None:

       
    if not case_rows:
        return

    for row in case_rows:
                              
        case_data = {k: v for k, v in row.items() if k not in ["flags"]}
        case_data["run_id"] = run_id
        
        case_obj = CaseResult(**case_data)
        session.add(case_obj)
        await session.flush()             

        if "flags" in row:
            flag_data = row["flags"]
            flag_data["case_result_id"] = case_obj.id
            flag_obj = CaseFlag(**flag_data)
            session.add(flag_obj)
            
    await session.commit()

async def upsert_cases(
    session: AsyncSession,
    run_id: UUID,
    case_rows: List[dict],
) -> tuple[int, int]:

       
    new_count = 0
    updated_count = 0

    for row in case_rows:
                                                                     
        existing_result = await session.execute(
            select(CaseResult)
            .options(joinedload(CaseResult.flags))
            .where(CaseResult.run_id == run_id, CaseResult.case_id == row["case_id"])
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
                                                              
            for key, value in row.items():
                if key != "flags" and hasattr(existing, key):
                    setattr(existing, key, value)
                                   
            if "flags" in row and existing.flags:
                for key, value in row["flags"].items():
                    if hasattr(existing.flags, key):
                        setattr(existing.flags, key, value)
            updated_count += 1
        else:
                                                
            case_data = {k: v for k, v in row.items() if k != "flags"}
            case_data["run_id"] = run_id
            case_obj = CaseResult(**case_data)
            session.add(case_obj)
            await session.flush()
            if "flags" in row:
                flag_data = dict(row["flags"])
                flag_data["case_result_id"] = case_obj.id
                session.add(CaseFlag(**flag_data))
            new_count += 1

    await session.commit()
    return new_count, updated_count

async def get_total_counts(session: AsyncSession, run_id: UUID) -> tuple[int, int]:
                                                                      
    total_stmt = select(func.count()).select_from(CaseResult).where(CaseResult.run_id == run_id)
    anomalous_stmt = (
        select(func.count())
        .select_from(CaseResult)
        .where(CaseResult.run_id == run_id, CaseResult.anomaly_type.isnot(None))
    )
    total = (await session.execute(total_stmt)).scalar()
    anomalous = (await session.execute(anomalous_stmt)).scalar()
    return total, anomalous

async def get_cases(
    session: AsyncSession, 
    run_id: UUID, 
    filters: dict, 
    page: int = 1, 
    page_size: int = 50
) -> List[CaseResult]:
    stmt = (
        select(CaseResult)
        .options(joinedload(CaseResult.flags))
        .where(CaseResult.run_id == run_id)
    )
    
    if filters.get("anomaly_type"):
        stmt = stmt.where(CaseResult.anomaly_type == filters["anomaly_type"])
    if filters.get("severity_label"):
        stmt = stmt.where(CaseResult.severity_label == filters["severity_label"])
    if filters.get("status"):
        stmt = stmt.where(CaseResult.status == filters["status"])
    if filters.get("supplier"):
        stmt = stmt.where(CaseResult.supplier == filters["supplier"])
        
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    result = await session.execute(stmt)
    return result.scalars().unique().all()

async def count_cases(session: AsyncSession, run_id: UUID, filters: dict) -> int:
    stmt = select(func.count()).select_from(CaseResult).where(CaseResult.run_id == run_id)
    
    if filters.get("anomaly_type"):
        stmt = stmt.where(CaseResult.anomaly_type == filters["anomaly_type"])
    if filters.get("severity_label"):
        stmt = stmt.where(CaseResult.severity_label == filters["severity_label"])
    if filters.get("status"):
        stmt = stmt.where(CaseResult.status == filters["status"])
    if filters.get("supplier"):
        stmt = stmt.where(CaseResult.supplier == filters["supplier"])
        
    result = await session.execute(stmt)
    return result.scalar()

