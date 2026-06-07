

import numpy as np
import pandas as pd
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from db.models.event_log import EventLog
from core.config import settings

async def bulk_insert_events(session: AsyncSession, run_id: UUID, df: pd.DataFrame) -> None:

       
    batch_size = settings.EVENT_LOG_BATCH_SIZE

    df_clean = df.where(pd.notnull(df), None)
    records = df_clean.to_dict(orient='records')
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        for record in batch:
                                                                           
            cleaned_record = {
                'run_id': run_id,
                'case_id': str(record.get('case_id')),
                'activity': str(record.get('activity')),
                'timestamp': record.get('timestamp'),
                'resource': record.get('resource'),
                'amount': record.get('amount') if record.get('amount') is not None else 0.0,
                'quantity': int(record.get('quantity')) if record.get('quantity') is not None else 0,
                'vendor': str(record.get('vendor')) if record.get('vendor') is not None else None,
                'document_type': record.get('document_type'),
                'spend_area': record.get('spend_area'),
                'item_category': record.get('item_category'),
            }
            session.add(EventLog(**cleaned_record))
        await session.flush()                    
    
    await session.commit()

