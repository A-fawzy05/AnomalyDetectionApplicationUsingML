"""
Logic for labeling anomaly types and calculating severity.
"""

import pandas as pd
import numpy as np
import json
import os
from p2p_anomaly_api.core.config import settings

def apply_labels(results_df: pd.DataFrame, raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies deterministic rules to label anomalies and calculate severity.
    """
    # Load thresholds from artifacts
    thresholds = {}
    thresh_path = os.path.join(settings.MODEL_DIR, "if_threshold.json")
    if os.path.exists(thresh_path):
        with open(thresh_path, 'r') as f:
            thresholds = json.load(f)
    
    if_threshold = thresholds.get("threshold", 0.0)
    # Mocking other thresholds
    struct_threshold = 0.5
    temp_threshold = 0.5
    
    # 1. Initialize flags
    results_df["price_mismatch"] = False
    results_df["three_way_match_failure"] = False
    results_df["maverick_buying"] = False
    results_df["temporal_delay"] = False
    results_df["duplicate_invoice"] = False
    results_df["unauthorized_vendor"] = False
    results_df["quantity_variance"] = False

    # Rule-based flagging (simulated)
    # Price Mismatch
    results_df.loc[results_df["if_score"] > if_threshold, "price_mismatch"] = True
    
    # Maverick Buying
    results_df.loc[results_df["lstm_structural_score"] > struct_threshold, "maverick_buying"] = True
    
    # Temporal Delay
    results_df.loc[results_df["lstm_temporal_score"] > temp_threshold, "temporal_delay"] = True

    # 2. Primary Anomaly Type Priority
    # Three-Way Match Failure > Price Mismatch > Duplicate Invoice > 
    # Unauthorized Vendor > Maverick Buying > Temporal Delay > Quantity Variance
    
    results_df["anomaly_type"] = None
    
    priority_list = [
        ("three_way_match_failure", "Three-Way Match Failure"),
        ("price_mismatch", "Price Mismatch"),
        ("duplicate_invoice", "Duplicate Invoice"),
        ("unauthorized_vendor", "Unauthorized Vendor"),
        ("maverick_buying", "Maverick Buying"),
        ("temporal_delay", "Temporal Delay"),
        ("quantity_variance", "Quantity Variance"),
    ]
    
    for flag_col, label in priority_list:
        results_df.loc[(results_df[flag_col] == True) & (results_df["anomaly_type"].isna()), "anomaly_type"] = label

    # 3. Severity Score
    # severity_score = 0.4 * IF + 0.4 * LSTM + 0.2 * Flags
    n_flags = results_df[["price_mismatch", "three_way_match_failure", "maverick_buying", 
                          "temporal_delay", "duplicate_invoice", "unauthorized_vendor", 
                          "quantity_variance"]].sum(axis=1)
    
    # Simple normalization for demonstration
    if_part = np.clip(results_df["if_score"], 0, 1) * 0.4
    lstm_part = np.clip(results_df["lstm_case_score"], 0, 1) * 0.4
    flag_part = np.clip(n_flags / 3.0, 0, 1) * 0.2
    
    results_df["severity_score"] = if_part + lstm_part + flag_part
    
    # Labels
    results_df["severity_label"] = "Low"
    results_df.loc[results_df["severity_score"] >= 0.4, "severity_label"] = "Medium"
    results_df.loc[results_df["severity_score"] >= 0.6, "severity_label"] = "High"
    results_df.loc[results_df["severity_score"] >= 0.8, "severity_label"] = "Critical"
    
    return results_df
