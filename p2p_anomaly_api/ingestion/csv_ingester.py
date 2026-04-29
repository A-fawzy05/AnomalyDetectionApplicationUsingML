"""
Ingester for CSV event logs.
"""

from typing import Union, IO
import pandas as pd
from ingestion.base import BaseIngester


class CSVIngester(BaseIngester):
    def ingest(self, source: Union[str, IO]) -> pd.DataFrame:
        df = pd.read_csv(source)
        df = self.normalize_columns(df)
        
        # Ensure mandatory columns
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
            
        return df

