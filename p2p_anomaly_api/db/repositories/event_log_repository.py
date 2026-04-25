"""
Repository for EventLog database operations.
"""

import pandas as pd
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from p2p_anomaly_api.db.models.event_log import EventLog
from p2p_anomaly_api.core.config import settings


async def bulk_insert_events(session: AsyncSession, run_id: UUID, df: pd.DataFrame) -> None:
    """
    Chunk inserts into batches of 1000 rows.
    """
    batch_size = settings.EVENT_LOG_BATCH_SIZE
    
    # Convert DataFrame to list of dicts
    # Ensure columns match EventLog model
    records = df.to_dict(orient='records')
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        for record in batch:
            record['run_id'] = run_id
            # Clean record to only include EventLog fields
            cleaned_record = {
                'run_id': run_id,
                'case_id': str(record.get('case_id')),
                'activity': str(record.get('activity')),
                'timestamp': record.get('timestamp'),
                'resource': record.get('resource'),
                'amount': record.get('amount'),
                'quantity': record.get('quantity'),
                'vendor': record.get('vendor'),
                'document_type': record.get('document_type'),
                'spend_area': record.get('spend_area'),
                'item_category': record.get('item_category'),
            }
            session.add(EventLog(**cleaned_record))
        await session.flush() # Flush batch to DB
    
    await session.commit()
