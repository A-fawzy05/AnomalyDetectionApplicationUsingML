

import logging
from typing import Union, IO

import pandas as pd

from ingestion.base import BaseIngester

logger = logging.getLogger(__name__)

CANONICAL_COLUMNS = {
    "case_id":                          None,
    "activity":                         None,
    "timestamp":                        None,
    "resource":                         "",
    "amount":                           0.0,
    "quantity":                         0.0,
    "vendor":                           None,
    "case:Document Type":               "",
    "case:Spend area text":             "",
    "case:Sub spend area text":         "",
    "case:Spend classification text":   "",
    "case:Source":                      "CSV",
    "case:Company":                     "",
    "case:Item Type":                   "",
    "case:Item Category":               "",
    "case:Name":                        None,
    "case:GR-Based Inv. Verif.":        False,
    "case:Goods Receipt":               False,
    "case:Vendor":                      None,
    "case:Purchasing Document":         None,
    "case:Item":                        "",
}

ALIAS_MAP = {
              
    "ocel:resource":            "resource",
    "Resource":                 "resource",
              
    "ocel:activity":            "activity",
    "Activity":                 "activity",
    "event_type":               "activity",
               
    "ocel:timestamp":           "timestamp",
    "Timestamp":                "timestamp",
    "time":                     "timestamp",
    "date":                     "timestamp",
                       
    "Amount":                   "amount",
    "AMOUNT":                   "amount",
    "net_amount":               "amount",
    "Quantity":                 "quantity",
    "QUANTITY":                 "quantity",
    "qty":                      "quantity",
            
    "Vendor":                   "vendor",
    "supplier":                 "vendor",
    "Supplier":                 "vendor",
                     
    "case:concept:name":        "case_id",
    "CaseID":                   "case_id",
    "case id":                  "case_id",
    "Case ID":                  "case_id",
                       
    "case:Document Type":       "case:Document Type",
    "case:Spend area text":     "case:Spend area text",
    "case:Company":             "case:Company",
    "case:Vendor":              "case:Vendor",
    "case:Purchasing Document": "case:Purchasing Document",
    "case:Item":                "case:Item",
    "case:GR-Based Inv. Verif.": "case:GR-Based Inv. Verif.",
    "case:Goods Receipt":       "case:Goods Receipt",
}

class CSVIngester(BaseIngester):


    def ingest(self, source: Union[str, IO]) -> pd.DataFrame:
        df = pd.read_csv(source)

        df = df.rename(columns={k: v for k, v in ALIAS_MAP.items() if k in df.columns})

        missing = [c for c in ("case_id", "activity", "timestamp") if c not in df.columns]
        if missing:
            raise ValueError(
                f"CSV is missing mandatory columns: {missing}. "
                f"Available: {list(df.columns)}"
            )

        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")

        for col, default in CANONICAL_COLUMNS.items():
            if col not in df.columns:
                df[col] = default

        df["amount"]   = pd.to_numeric(df["amount"],   errors="coerce").fillna(0.0)
        df["quantity"] = pd.to_numeric(df["quantity"],  errors="coerce").fillna(0.0)

        if df["vendor"].isna().all() and not df["case:Vendor"].isna().all():
            df["vendor"] = df["case:Vendor"]
        elif not df["vendor"].isna().all() and df["case:Vendor"].isna().all():
            df["case:Vendor"] = df["vendor"]

        mask = df["case:Name"].isna() | (df["case:Name"] == "")
        df.loc[mask, "case:Name"] = df.loc[mask, "case_id"]

        df = df.sort_values(["case_id", "timestamp"]).reset_index(drop=True)

        n_cases = df["case_id"].nunique()
        logger.info(
            f"CSV ingested: {len(df)} events, {n_cases} unique cases"
        )

        return df
