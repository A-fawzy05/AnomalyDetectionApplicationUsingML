"""
Ingester for CSV event logs.

Expected CSV columns (from OCEL2 canonical schema):
  Mandatory:
    case_id     – unique process instance ID
    activity    – event/activity name
    timestamp   – ISO 8601 timestamp

  Optional (auto-filled with defaults if absent):
    resource, vendor, amount, quantity,
    case:Document Type, case:Spend area text,
    case:Sub spend area text, case:Spend classification text,
    case:Source, case:Company, case:Item Type, case:Item Category,
    case:Name, case:GR-Based Inv. Verif., case:Goods Receipt,
    case:Vendor, case:Purchasing Document, case:Item

  Legacy / alias columns (auto-renamed):
    ocel:resource       → resource
    ocel:activity       → activity
    ocel:timestamp      → timestamp
    Amount / AMOUNT     → amount
    Quantity / QUANTITY → quantity
"""

import logging
from typing import Union, IO

import pandas as pd

from ingestion.base import BaseIngester

logger = logging.getLogger(__name__)

# Columns guaranteed to exist in the canonical DataFrame (same as OCEL2 ingester)
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

# All aliases → canonical name
ALIAS_MAP = {
    # Resource
    "ocel:resource":            "resource",
    "Resource":                 "resource",
    # Activity
    "ocel:activity":            "activity",
    "Activity":                 "activity",
    "event_type":               "activity",
    # Timestamp
    "ocel:timestamp":           "timestamp",
    "Timestamp":                "timestamp",
    "time":                     "timestamp",
    "date":                     "timestamp",
    # Amount / Quantity
    "Amount":                   "amount",
    "AMOUNT":                   "amount",
    "net_amount":               "amount",
    "Quantity":                 "quantity",
    "QUANTITY":                 "quantity",
    "qty":                      "quantity",
    # Vendor
    "Vendor":                   "vendor",
    "supplier":                 "vendor",
    "Supplier":                 "vendor",
    # Case ID aliases
    "case:concept:name":        "case_id",
    "CaseID":                   "case_id",
    "case id":                  "case_id",
    "Case ID":                  "case_id",
    # BPI-style columns
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
    """
    Ingests a flat CSV event log and returns the same canonical DataFrame
    produced by OCEL2Ingester — one row per event, grouped by case_id.
    """

    def ingest(self, source: Union[str, IO]) -> pd.DataFrame:
        df = pd.read_csv(source)

        # ── 1. Rename aliases to canonical names ──────────────────────────────
        df = df.rename(columns={k: v for k, v in ALIAS_MAP.items() if k in df.columns})

        # ── 2. Validate mandatory columns ────────────────────────────────────
        missing = [c for c in ("case_id", "activity", "timestamp") if c not in df.columns]
        if missing:
            raise ValueError(
                f"CSV is missing mandatory columns: {missing}. "
                f"Available: {list(df.columns)}"
            )

        # ── 3. Parse timestamp ────────────────────────────────────────────────
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")

        # ── 4. Ensure all canonical columns exist (fill defaults) ─────────────
        for col, default in CANONICAL_COLUMNS.items():
            if col not in df.columns:
                df[col] = default

        # ── 5. Type coercion ─────────────────────────────────────────────────
        df["amount"]   = pd.to_numeric(df["amount"],   errors="coerce").fillna(0.0)
        df["quantity"] = pd.to_numeric(df["quantity"],  errors="coerce").fillna(0.0)

        # Sync vendor ↔ case:Vendor (whichever is populated)
        if df["vendor"].isna().all() and not df["case:Vendor"].isna().all():
            df["vendor"] = df["case:Vendor"]
        elif not df["vendor"].isna().all() and df["case:Vendor"].isna().all():
            df["case:Vendor"] = df["vendor"]

        # Fill case:Name from case_id if absent
        mask = df["case:Name"].isna() | (df["case:Name"] == "")
        df.loc[mask, "case:Name"] = df.loc[mask, "case_id"]

        # ── 6. Sort by case + time ────────────────────────────────────────────
        df = df.sort_values(["case_id", "timestamp"]).reset_index(drop=True)

        n_cases = df["case_id"].nunique()
        logger.info(
            f"CSV ingested: {len(df)} events, {n_cases} unique cases"
        )

        return df
