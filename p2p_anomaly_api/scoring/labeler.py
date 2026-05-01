"""
Logic for labeling anomaly types and calculating severity.
"""

import json
import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd

from core.config import settings

logger = logging.getLogger(__name__)


def apply_labels(
    results_df: pd.DataFrame, 
    raw_df: pd.DataFrame = None,
    if_threshold: float | None = None,
    lstm_threshold: float | None = None,
) -> pd.DataFrame:
    """
    Apply anomaly type flags and severity scores.
    If if_threshold / lstm_threshold are provided, use them instead of
    stored artifact thresholds. This enables per-batch calibration.
    """
    # 1. Load thresholds from artifacts or use provided overrides
    p = os.path.join(settings.MODEL_DIR)
    
    if if_threshold is not None:
        if_thresh = if_threshold
    else:
        if_thresh = 0.0
        if os.path.exists(os.path.join(p, "if_threshold.json")):
            with open(os.path.join(p, "if_threshold.json"), "r") as f:
                if_thresh = json.load(f)["threshold"]
            
    if lstm_threshold is not None:
        lstm_thresh = {"case": lstm_threshold, "structural": 0.5, "temporal": 0.5}
    else:
        lstm_thresh = {"case": 0.5, "structural": 0.5, "temporal": 0.5}
        if os.path.exists(os.path.join(p, "lstm_thresholds.json")):
            with open(os.path.join(p, "lstm_thresholds.json"), "r") as f:
                lstm_thresh = json.load(f)

    # 2. Flagging based on business rules
    
    # Load training statistics for business rule calculations
    p = Path(settings.MODEL_DIR)
    category_means = json.loads((p / "category_means.json").read_text())
    vendor_freq = json.loads((p / "vendor_freq.json").read_text())
    
    # Calculate training statistics
    unit_prices = list(category_means.values())
    unit_price_std = np.std(unit_prices)
    vendor_frequencies = list(vendor_freq.values())
    vendor_5th_percentile = np.percentile(vendor_frequencies, 5)
    
    # FLAG 1 — Price Mismatch
    # if_score > if_threshold AND |price_deviation_from_mean_case| > 2 * std(training unit prices)
    price_deviation_threshold = 2 * unit_price_std
    results_df["price_mismatch"] = (
        (results_df["if_score"] >= if_thresh) & 
        (abs(results_df["price_deviation_from_mean_case"]) > price_deviation_threshold)
    )
    
    # FLAG 2 — Three-Way Match Failure (UPDATED)
    # Requires BOTH model signal AND actual missing steps
    # If missing_3way_steps == 0 for a case, it means dataset does not
    # include invoice steps — not that every case has a compliance failure.
    if "three_way_match_flag" in results_df.columns:
        three_way_match_condition = results_df["three_way_match_flag"] == 1
    else:
        three_way_match_condition = False
    
    # Document completeness check
    if all(col in results_df.columns for col in ["has_po", "has_gr", "has_inv"]):
        document_completeness = (results_df["has_po"] + results_df["has_gr"] + results_df["has_inv"]) < 3
    else:
        document_completeness = False
    
    # Only apply three-way match flag if Invoice Verification exists
    # somewhere in the dataset. If the entire dataset has no invoice
    # events linked to PO cases, the flag should never fire.
    batch_has_invoice = (results_df.get("has_inv", pd.Series(0)) == 1).any()

    results_df["three_way_match_failure"] = (
        three_way_match_condition & 
        document_completeness &
        (results_df["missing_3way_steps"] >= 1) &
        batch_has_invoice   # never fire if dataset has no invoice phase
    ).astype("int8")

    # FLAG 3 — Maverick Buying
    # lstm_structural_score > struct_threshold AND case_length <= 40th percentile of training case lengths
    if "lstm_structural_score" in results_df.columns:
        structural_condition = results_df["lstm_structural_score"] > lstm_thresh["structural"]
    else:
        structural_condition = False
    
    # Calculate 40th percentile of case lengths from current data
    if "case_event_count" in results_df.columns:
        case_length_40th_percentile = np.percentile(results_df["case_event_count"], 40)
        case_length_condition = results_df["case_event_count"] <= case_length_40th_percentile
    else:
        case_length_condition = False
    
    results_df["maverick_buying"] = structural_condition & case_length_condition

    # FLAG 4 — Temporal Delay
    # lstm_temporal_score > temp_threshold AND (max_time_since_last_event_hours > 7*24 OR case_duration_hours > 90*24)
    if "lstm_temporal_score" in results_df.columns:
        temporal_condition = results_df["lstm_temporal_score"] > lstm_thresh["temporal"]
    else:
        temporal_condition = False
    
    # Time-based conditions
    time_conditions = False
    if "max_time_since_last_event_hours" in results_df.columns:
        time_conditions = time_conditions | (results_df["max_time_since_last_event_hours"] > 7 * 24)
    if "case_duration_hours" in results_df.columns:
        time_conditions = time_conditions | (results_df["case_duration_hours"] > 90 * 24)
    
    results_df["temporal_delay"] = temporal_condition & time_conditions

    # FLAG 5 — Duplicate Invoice
    # if_score > if_threshold AND vendor_amount_pair_count_30d >= 2
    # Note: vendor_amount_pair_count_30d not available in current features, using simplified logic
    if "if_score" in results_df.columns:
        duplicate_condition = results_df["if_score"] >= if_thresh
        # Simplified: Check if same vendor appears multiple times with similar amounts
        if "vendor" in results_df.columns and "case_amount" in results_df.columns:
            # For now, flag as False since we don't have the 30-day window data
            vendor_amount_condition = False
        else:
            vendor_amount_condition = False
    else:
        duplicate_condition = False
        vendor_amount_condition = False
    
    results_df["duplicate_invoice"] = duplicate_condition & vendor_amount_condition

    # FLAG 6 — Unauthorized Vendor (UPDATED — uses vendor_batch_frequency)
    # if_score > if_threshold AND vendor_case_frequency < 5th percentile of training vendor frequencies
    # AND vendor_batch_frequency <= 3 (rare in this batch too)
    if "if_score" in results_df.columns:
        unauthorized_condition = results_df["if_score"] >= if_thresh
    else:
        unauthorized_condition = False
    
    if "vendor_case_frequency" in results_df.columns:
        vendor_frequency_condition = results_df["vendor_case_frequency"] < vendor_5th_percentile
    else:
        vendor_frequency_condition = False
    
    # Add vendor_batch_frequency condition to prevent flagging all unknown vendors
    if "vendor_batch_frequency" in results_df.columns:
        batch_frequency_condition = results_df["vendor_batch_frequency"] <= 3
    else:
        batch_frequency_condition = True  # Fallback to original behavior if column missing
    
    results_df["unauthorized_vendor"] = (
        unauthorized_condition & 
        vendor_frequency_condition & 
        batch_frequency_condition
    )

    # FLAG 7 — Quantity Variance
    # if_score > if_threshold AND |quantity - mean_quantity_for_category| > 2 * std_quantity_for_category
    # Note: Need category-based quantity statistics, using simplified logic for now
    if "if_score" in results_df.columns:
        quantity_condition = results_df["if_score"] >= if_thresh
    else:
        quantity_condition = False
    
    # Simplified quantity variance check
    if "case_quantity" in results_df.columns and "category_mean_unit_price_case" in results_df.columns:
        # Using price deviation as proxy for quantity variance since category quantity stats not available
        quantity_variance_condition = abs(results_df["price_deviation_from_mean_case"]) > price_deviation_threshold
    else:
        quantity_variance_condition = False
    
    results_df["quantity_variance"] = quantity_condition & quantity_variance_condition

    # 3. Primary Anomaly Type Priority
    # Allow multiple anomaly types per case - don't override existing types
    # Three-Way Match Failure > Price Mismatch > Duplicate Invoice > 
    # Unauthorized Vendor > Maverick Buying > Temporal Delay > Quantity Variance
    
    # Initialize anomaly_type as list to support multiple types
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
    
    # Assign anomaly types - allow multiple types per case
    for flag_col, label in priority_list:
        mask = results_df[flag_col] == True
        # Add anomaly type to existing list for cases with multiple flags
        for idx in results_df[mask].index:
            current_types = results_df.at[idx, "anomaly_type"]
            try:
                if pd.isna(current_types) or current_types is None:
                    results_df.at[idx, "anomaly_type"] = [label]
                else:
                    if isinstance(current_types, list):
                        if label not in current_types:
                            current_types.append(label)
                            results_df.at[idx, "anomaly_type"] = current_types
                    else:
                        results_df.at[idx, "anomaly_type"] = [label]
            except (ValueError, TypeError):
                # Handle array comparison issues
                if isinstance(current_types, (list, tuple)):
                    if label not in current_types:
                        current_list = list(current_types)
                        current_list.append(label)
                        results_df.at[idx, "anomaly_type"] = current_list
                else:
                    results_df.at[idx, "anomaly_type"] = [label]

    # 4. Severity Score (UPDATED - guarantees Critical cases appear when anomalies exist)
    results_df["n_flags"] = (
        results_df[["price_mismatch", "three_way_match_failure", "maverick_buying",
            "temporal_delay", "duplicate_invoice", "unauthorized_vendor",
            "quantity_variance"]]
        .fillna(0).sum(axis=1)
    )

    is_flagged = results_df["n_flags"] > 0

    # Global percentile ranks
    results_df["if_rank"]   = results_df["if_score"].rank(pct=True)
    results_df["lstm_rank"] = results_df["lstm_case_score"].rank(pct=True)
    results_df["flag_bonus"]= (results_df["n_flags"] / 3.0).clip(upper=1.0)

    raw_score = (
        0.4 * results_df["if_rank"] +
        0.4 * results_df["lstm_rank"] +
        0.2 * results_df["flag_bonus"]
    ).clip(0.0, 1.0)

    results_df["severity_score"] = raw_score.copy()

    # Flagged cases: re-rank within flagged subset → always 0.55–1.0
    # This guarantees Critical cases appear (top 25% of flagged)
    if is_flagged.sum() > 1:
        flagged_idx = results_df.index[is_flagged]
        inner_rank  = raw_score[flagged_idx].rank(pct=True)
        # Map inner rank 0–1 → severity 0.55–1.0
        results_df.loc[flagged_idx, "severity_score"] = (
            0.55 + inner_rank * 0.45
        ).clip(0.55, 1.0)

    # Non-flagged cases capped at 0.54 (always Low or Medium)
    results_df.loc[~is_flagged, "severity_score"] = (
        raw_score[~is_flagged].clip(0.0, 0.54)
    )

    # Bands — guarantees distribution across all four levels
    # Critical: top 25% of flagged (inner_rank > 0.75 → score > 0.89)
    # High:     next 25% (inner_rank 0.50–0.75 → score 0.77–0.89)
    # Medium:   bottom 50% of flagged + high non-flagged
    # Low:      normal cases
    results_df["severity_label"] = pd.cut(
        results_df["severity_score"],
        bins=[-0.001, 0.40, 0.70, 0.89, 1.001],
        labels=["Low", "Medium", "High", "Critical"]
    )

    return results_df
