"""
Feature engineering at the case level.
"""

import pandas as pd
import numpy as np
import joblib
import os
from p2p_anomaly_api.core.config import settings

def build_case_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms event-level DataFrame into case-level features.
    """
    # 1. Group by case_id
    grouped = df.sort_values("timestamp").groupby("case_id")
    
    # 2. Timing Features
    case_duration = grouped["timestamp"].agg(lambda x: (x.max() - x.min()).total_seconds() / 3600)
    
    def off_hours_ratio(ts_series):
        # Off hours: 6 PM to 8 AM and weekends
        hours = ts_series.dt.hour
        days = ts_series.dt.dayofweek
        is_off = ((hours >= 18) | (hours < 8) | (days >= 5))
        return is_off.mean()

    off_hours = grouped["timestamp"].apply(off_hours_ratio)
    
    # 3. Financial Features
    case_amount = grouped["amount"].max()
    
    # 4. Categorical / Frequency (Placeholders - normally joined with training stats)
    # vendor_case_frequency, etc.
    
    # Combine
    case_df = pd.DataFrame({
        "case_duration_hours": case_duration,
        "off_hours_ratio": off_hours,
        "amount": case_amount,
        # Add more features as per spec
    })
    
    # For categorical columns, we should take the first occurrence from the PO object
    static_cols = [
        "vendor", "document_type", "spend_area", "sub_spend_area",
        "spend_classification", "source", "company", "item_type",
        "item_category", "gr_based_inv_verif", "goods_receipt"
    ]
    for col in static_cols:
        if col in df.columns:
            case_df[col] = grouped[col].first()
        else:
            case_df[col] = "Unknown"

    # One-hot encoding and aligning with training columns
    case_df_encoded = pd.get_dummies(case_df)
    
    # Load training columns
    train_cols_path = os.path.join(settings.MODEL_DIR, "train_columns.pkl")
    if os.path.exists(train_cols_path):
        train_cols = joblib.load(train_cols_path)
        # Reindex to match training columns
        case_df_encoded = case_df_encoded.reindex(columns=train_cols, fill_value=0)
    
    # Apply scaling
    scaler_path = os.path.join(settings.MODEL_DIR, "scaler.pkl")
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)
        # Handle cases where feature count might differ if train_columns wasn't used correctly
        # But here we reindexed, so it should match
        scaled_data = scaler.transform(case_df_encoded)
        case_df_scaled = pd.DataFrame(scaled_data, columns=case_df_encoded.columns, index=case_df_encoded.index)
        return case_df_scaled
        
    return case_df_encoded
