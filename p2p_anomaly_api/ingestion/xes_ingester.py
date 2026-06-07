

import pm4py
from typing import Union, IO
import pandas as pd
import tempfile
import os
from ingestion.base import BaseIngester

class XESIngester(BaseIngester):
    def ingest(self, source: Union[str, IO]) -> pd.DataFrame:
        if hasattr(source, 'read'):
                                                              
            with tempfile.NamedTemporaryFile(delete=False, suffix=".xes") as tmp:
                tmp.write(source.read())
                tmp_path = tmp.name
            try:
                df = pm4py.read_xes(tmp_path)
            finally:
                os.unlink(tmp_path)
        else:
            df = pm4py.read_xes(source)
            
        df = pm4py.convert_to_dataframe(df)
        df = self.normalize_columns(df)
        
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
            
        return df

