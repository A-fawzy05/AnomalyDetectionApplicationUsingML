"""
Case-level feature engineering for inference.
Must produce exactly 2117 columns matching train_columns.pkl.
Pipeline: raw events → aggregate → one-hot encode → reindex to train_columns.
"""
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from core.config import settings

logger = logging.getLogger(__name__)

NUMERIC_FEATURES = [
    "case_event_count", "unique_activities",
    "avg_time_since_last_event_hours", "max_time_since_last_event_hours",
    "off_hours_ratio", "off_hours_count",
    "avg_unit_price", "max_unit_price",
    "avg_price_deviation", "max_abs_price_deviation",
    "case_duration_hours", "events_per_hour",
    "start_hour", "start_dayofweek",
    "case_amount", "case_quantity", "unit_price_case",
    "is_over_threshold",
    "price_deviation_from_mean_case",
    "vendor_case_frequency", "user_case_frequency",
    "user_unique_vendors", "user_vendor_entropy",
    "group_workload",
]

CATEGORICAL_COLS = [
    "case:Document Type", "case:Spend area text",
    "case:Sub spend area text", "case:Spend classification text",
    "case:Source", "case:Company", "case:Item Type",
    "case:Item Category", "case:Name",
    "case:GR-Based Inv. Verif.", "case:Goods Receipt",
]

DROP_COLS = [
    "case:concept:name", "case_start_time", "case_end_time",
    "case_start_hour_bucket",
    "case:Vendor", "User", "org:resource",
    "case:Purchasing Document", "case:Item",
    "category_mean_unit_price_case",
]


def _load_artifacts():
    p = Path(settings.MODEL_DIR)
    train_columns   = joblib.load(p / "train_columns.pkl")
    category_means  = json.loads((p / "category_means.json").read_text())
    vendor_freq     = json.loads((p / "vendor_freq.json").read_text())
    user_freq       = json.loads((p / "user_freq.json").read_text())
    user_entropy    = json.loads((p / "user_entropy.json").read_text())
    user_vendor_map = json.loads((p / "user_vendor_map.json").read_text())
    group_workload  = json.loads((p / "group_workload.json").read_text())
    return (train_columns, category_means, vendor_freq,
            user_freq, user_entropy, user_vendor_map, group_workload)


def build_case_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build the 2117-column case feature matrix from a flat events DataFrame.
    df must have canonical column names (case_id, activity, timestamp,
    resource, amount, quantity, vendor, plus all case:* columns).
    """
    (train_columns, category_means, vendor_freq,
     user_freq, user_entropy, user_vendor_map, group_workload) = _load_artifacts()

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df["amount"]    = pd.to_numeric(df["amount"],   errors="coerce").fillna(0)
    df["quantity"]  = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["hour"]      = df["timestamp"].dt.hour.fillna(0)
    df["dayofweek"] = df["timestamp"].dt.dayofweek.fillna(0)

    def is_off_hours(ts):
        if pd.isna(ts): return 0
        return int((ts.dayofweek >= 5) or (ts.hour < 5) or (ts.hour >= 23))

    df["is_off_hours_flag"] = df["timestamp"].apply(is_off_hours).astype("int8")
    df["unit_price"] = np.where(
        df["quantity"] > 0,
        df["amount"] / df["quantity"],
        df["amount"]
    )
    df["time_since_last"] = (
        df.groupby("case_id")["timestamp"]
          .diff().dt.total_seconds().div(3600).fillna(0)
    )

    # ── Step 1: Aggregate to case level ──────────────────────────────────────
    grp = df.groupby("case_id")

    case_agg = grp.agg(
        case_start_time                 =("timestamp", "min"),
        case_end_time                   =("timestamp", "max"),
        case_event_count                =("activity",  "size"),
        unique_activities               =("activity",  "nunique"),
        avg_time_since_last_event_hours =("time_since_last", "mean"),
        max_time_since_last_event_hours =("time_since_last", "max"),
        off_hours_ratio                 =("is_off_hours_flag", "mean"),
        off_hours_count                 =("is_off_hours_flag", "sum"),
        avg_unit_price                  =("unit_price", "mean"),
        max_unit_price                  =("unit_price", "max"),
        avg_price_deviation             =("unit_price", "mean"),  # placeholder
        max_abs_price_deviation         =("unit_price", "max"),   # placeholder
    ) # Removed .reset_index() to keep case_id as index

    case_agg["case_duration_hours"] = (
        case_agg["case_end_time"] - case_agg["case_start_time"]
    ).dt.total_seconds().div(3600)
    case_agg["events_per_hour"] = (
        case_agg["case_event_count"]
        / case_agg["case_duration_hours"].replace(0, np.nan)
    )
    case_agg["start_hour"]      = case_agg["case_start_time"].dt.hour
    case_agg["start_dayofweek"] = case_agg["case_start_time"].dt.dayofweek
    case_agg["case_start_hour_bucket"] = (
        case_agg["case_start_time"].dt.floor("h")
    )

    # Static columns (first value per case)
    static_cols = [c for c in [
        "vendor", "resource",
        "case:Document Type", "case:Spend area text",
        "case:Sub spend area text", "case:Spend classification text",
        "case:Source", "case:Company", "case:Item Type",
        "case:Item Category", "case:Name",
        "case:GR-Based Inv. Verif.", "case:Goods Receipt",
    ] if c in df.columns]

    static_df = (
        df.groupby("case_id")[static_cols]
          .agg(lambda s: s.dropna().iloc[0] if len(s.dropna()) > 0 else np.nan)
    )
    case_agg = case_agg.join(static_df, how="left")
    case_agg = case_agg.join(
        grp["amount"].first().rename("case_amount"), how="left"
    )
    case_agg = case_agg.join(
        grp["quantity"].first().rename("case_quantity"), how="left"
    )
    case_agg["unit_price_case"] = np.where(
        case_agg["case_quantity"].fillna(0) > 0,
        case_agg["case_amount"] / case_agg["case_quantity"],
        case_agg["case_amount"]
    )
    case_agg["is_over_threshold"] = (case_agg["case_amount"] > 500).astype("int8")

    # ── Step 2: Apply train-only lookup maps ──────────────────────────────────
    item_cat_col = "case:Item Category"
    if item_cat_col in case_agg.columns:
        case_agg["category_mean_unit_price_case"] = (
            case_agg[item_cat_col]
            .astype(str)
            .map(category_means)
            .fillna(category_means.get("__global__", case_agg["unit_price_case"].mean()))
        )
    else:
        case_agg["category_mean_unit_price_case"] = (
            category_means.get("__global__", 0.0)
        )
    case_agg["price_deviation_from_mean_case"] = (
        case_agg["unit_price_case"] - case_agg["category_mean_unit_price_case"]
    )

    if "vendor" in case_agg.columns:
        case_agg["vendor_case_frequency"] = (
            case_agg["vendor"].astype(str).map(vendor_freq).fillna(0)
        )
        # vendor_batch_frequency: how many cases share the same vendor in THIS batch.
        # Must use .map() — groupby().size() returns a vendor-indexed Series which
        # mis-aligns against the case_id index and produces all-NaN.
        vendor_batch_count = case_agg["vendor"].astype(str).map(
            case_agg["vendor"].astype(str).value_counts()
        )
        case_agg["vendor_batch_frequency"] = vendor_batch_count.fillna(1)
    else:
        case_agg["vendor_case_frequency"] = 0
        case_agg["vendor_batch_frequency"] = 1

    if "resource" in case_agg.columns:
        case_agg["user_case_frequency"] = (
            case_agg["resource"].astype(str).map(user_freq).fillna(0)
        )
        case_agg["user_unique_vendors"] = (
            case_agg["resource"].astype(str).map(user_vendor_map).fillna(0)
        )
        case_agg["user_vendor_entropy"] = (
            case_agg["resource"].astype(str).map(user_entropy).fillna(0)
        )
    else:
        case_agg["user_case_frequency"]  = 0
        case_agg["user_unique_vendors"]  = 0
        case_agg["user_vendor_entropy"]  = 0

    if "case:Spend area text" in case_agg.columns:
        wl_key = (
            case_agg["case:Spend area text"].astype(str)
            + "__"
            + case_agg["case_start_hour_bucket"].astype(str)
        )
        case_agg["group_workload"] = wl_key.map(group_workload).fillna(0)
    else:
        case_agg["group_workload"] = 0

    # ── Step 3: Drop metadata columns ────────────────────────────────────────
    case_agg = case_agg.drop(
        columns=[c for c in DROP_COLS if c in case_agg.columns],
        errors="ignore"
    )

    # ── Step 4: One-hot encode categoricals ───────────────────────────────────
    # CRITICAL: cast to str first — prevents bool/float columns being
    # silently skipped by get_dummies
    existing_cats = [c for c in CATEGORICAL_COLS if c in case_agg.columns]
    case_agg[existing_cats] = case_agg[existing_cats].astype(str)
    case_agg = pd.get_dummies(case_agg, columns=existing_cats, dummy_na=True)
    case_agg = case_agg.replace([np.inf, -np.inf], np.nan).fillna(0)

    # ── Step 5: Preserve vendor/amount/flag data before reindex ─────────────────
    vendor_data             = None
    amount_data             = None
    vendor_case_freq_data   = None
    vendor_batch_freq_data  = None

    if "vendor" in case_agg.columns:
        vendor_data = case_agg["vendor"].copy()
    elif "case:Vendor" in case_agg.columns:
        vendor_data = case_agg["case:Vendor"].copy()

    if "amount" in case_agg.columns:
        amount_data = case_agg["amount"].copy()
    elif "case:Amount" in case_agg.columns:
        amount_data = case_agg["case:Amount"].copy()

    # Save vendor frequency columns — they are NOT in train_columns so reindex
    # would drop them; we re-inject them after reindex via DF attributes.
    if "vendor_case_frequency" in case_agg.columns:
        vendor_case_freq_data = case_agg["vendor_case_frequency"].copy()
    if "vendor_batch_frequency" in case_agg.columns:
        vendor_batch_freq_data = case_agg["vendor_batch_frequency"].copy()

    # Remove non-numeric/non-training columns before reindex
    columns_to_drop = [c for c in ("vendor", "amount") if c in case_agg.columns]
    if columns_to_drop:
        case_agg = case_agg.drop(columns=columns_to_drop)
    
    # Reindex to match training columns exactly ───────────────────────────────
    # This is line that fixes the 13 vs 2117 mismatch at inference time.
    # Missing columns (unseen categories) are filled with 0.
    # Extra columns (not in training) are dropped.
    before = case_agg.shape[1]
    
    # Only add vendor_batch_frequency if it was in original train_columns
    # Otherwise keep original count to avoid mismatch
    case_agg = case_agg.reindex(columns=train_columns, fill_value=0.0)
    after = case_agg.shape[1]
    
    # Store side-channel data as DF attributes so merger/labeler can access them.
    # (reindex drops any extra columns, so we must use attributes)
    if vendor_data is not None:
        case_agg._vendor_data = vendor_data
    if amount_data is not None:
        case_agg._amount_data = amount_data
    if vendor_case_freq_data is not None:
        case_agg._vendor_case_freq = vendor_case_freq_data
    if vendor_batch_freq_data is not None:
        case_agg._vendor_batch_freq = vendor_batch_freq_data

    logger.info(
        f"case_features: {before} cols before reindex → "
        f"{after} cols after reindex (must equal {len(train_columns)})"
    )
    assert after == len(train_columns), (
        f"Feature count mismatch: got {after}, expected {len(train_columns)}"
    )

    # Cast all float64 columns to float32 — halves memory usage
    # IsolationForest and StandardScaler both accept float32
    float_cols = case_agg.select_dtypes(include='float64').columns
    case_agg[float_cols] = case_agg[float_cols].astype(np.float32)

    return case_agg
