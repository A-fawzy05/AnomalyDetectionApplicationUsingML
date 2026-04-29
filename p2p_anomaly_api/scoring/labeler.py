"""
Logic for labeling anomaly types and calculating severity.
"""

import json
import logging
import os

import numpy as np
import pandas as pd

from core.config import settings

logger = logging.getLogger(__name__)


def apply_labels(results_df: pd.DataFrame, raw_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    Applies deterministic rules to label anomalies and calculate severity.
    Uses thresholds from artifacts.
    """
    # 1. Load thresholds from artifacts
    p = os.path.join(settings.MODEL_DIR)
    
    if_thresh = 0.0
    if os.path.exists(os.path.join(p, "if_threshold.json")):
        with open(os.path.join(p, "if_threshold.json"), "r") as f:
            if_thresh = json.load(f)["threshold"]
            
    lstm_thresh = {"case": 0.5, "structural": 0.5, "temporal": 0.5}
    if os.path.exists(os.path.join(p, "lstm_thresholds.json")):
        with open(os.path.join(p, "lstm_thresholds.json"), "r") as f:
            lstm_thresh = json.load(f)

    # 2. Flagging based on model scores
    # Price Mismatch (Isolation Forest)
    results_df["price_mismatch"] = (results_df["if_score"] >= if_thresh)
    
    # Three-Way Match Failure (Hybrid Score)
    # The flag is already computed in merger.py using compute_hybrid_score
    # but we ensure it's mapped to the canonical flag name
    if "three_way_match_flag" in results_df.columns:
        results_df["three_way_match_failure"] = results_df["three_way_match_flag"].astype(bool)
    else:
        results_df["three_way_match_failure"] = False

    # Maverick Buying (LSTM Structural + Short Case)
    if "maverick_buying_flag" in results_df.columns:
        results_df["maverick_buying"] = results_df["maverick_buying_flag"].astype(bool)
    else:
        results_df["maverick_buying"] = (results_df["lstm_structural_score"] >= lstm_thresh["structural"] * 1.5)

    # Temporal Delay (LSTM Temporal)
    if "temporal_delay_flag" in results_df.columns:
        results_df["temporal_delay"] = results_df["temporal_delay_flag"].astype(bool)
    else:
        results_df["temporal_delay"] = (results_df["lstm_temporal_score"] >= lstm_thresh["temporal"])

    # Placeholder for other flags (simulated or rule-based)
    if "duplicate_invoice" not in results_df.columns:
        results_df["duplicate_invoice"] = False
    if "unauthorized_vendor" not in results_df.columns:
        results_df["unauthorized_vendor"] = False
    if "quantity_variance" not in results_df.columns:
        results_df["quantity_variance"] = False

    # 3. Primary Anomaly Type Priority
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

    # 4. Severity Score
    # severity_score = 0.4 * IF_z + 0.4 * LSTM_z + 0.2 * Flags
    # We use z-scores if available for better resolution
    if_part = np.clip(results_df.get("if_score_z", results_df["if_score"]), 0, 2) / 2.0 * 0.4
    
    # LSTM part
    lstm_score = results_df.get("hybrid_3way_score", results_df["lstm_case_score"])
    lstm_part = np.clip(lstm_score, 0, 1) * 0.4
    
    # Flag part
    n_flags = results_df[["price_mismatch", "three_way_match_failure", "maverick_buying", 
                          "temporal_delay", "duplicate_invoice", "unauthorized_vendor", 
                          "quantity_variance"]].sum(axis=1)
    flag_part = np.clip(n_flags / 3.0, 0, 1) * 0.2
    
    results_df["severity_score"] = if_part + lstm_part + flag_part
    
    # Labels
    results_df["severity_label"] = "Low"
    results_df.loc[results_df["severity_score"] >= 0.4, "severity_label"] = "Medium"
    results_df.loc[results_df["severity_score"] >= 0.6, "severity_label"] = "High"
    results_df.loc[results_df["severity_score"] >= 0.8, "severity_label"] = "Critical"
    
    return results_df
