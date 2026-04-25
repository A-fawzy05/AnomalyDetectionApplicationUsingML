"""
Base class for event log ingesters.
"""

from abc import ABC, abstractmethod
from typing import Union, IO
import pandas as pd


class BaseIngester(ABC):
    @abstractmethod
    def ingest(self, source: Union[str, IO]) -> pd.DataFrame:
        """
        Ingests event log data and returns a canonical DataFrame.
        """
        pass

    def normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalizes column names to the canonical schema.
        """
        alias_map = {
            "ocel:resource": "resource",
            "resource": "resource",
            "amount": "amount",
            "Amount": "amount",
            "quantity": "quantity",
            "Quantity": "quantity",
            "ocel:activity": "activity",
            "ocel:timestamp": "timestamp",
            "activity": "activity",
            "timestamp": "timestamp"
        }
        return df.rename(columns=alias_map)
