

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

    p = Path(settings.MODEL_DIR)
    category_means = json.loads((p / "category_means.json").read_text())
    vendor_freq = json.loads((p / "vendor_freq.json").read_text())

    vendor_frequencies = list(vendor_freq.values())
    vendor_5th_percentile = np.percentile(vendor_frequencies, 5) if vendor_frequencies else 0

    price_deviation = results_df["max_abs_price_deviation"].fillna(0)

    price_condition = price_deviation > 0.50
    
    if "if_score" in results_df.columns:
                                                                                  
        price_if_gate = results_df["if_score"] >= if_thresh

        dev_mean = price_deviation.mean()
        dev_std  = price_deviation.std() or 1.0
        price_z_gate = ((price_deviation - dev_mean) / dev_std) > 2.0
    else:
        price_if_gate = pd.Series(True, index=results_df.index)
        price_z_gate = pd.Series(False, index=results_df.index)
    
    results_df["price_mismatch"] = (
        (price_condition & (price_if_gate | price_z_gate))
    ).astype("int8")

    if "three_way_match_flag" in results_df.columns:
        three_way_match_condition = results_df["three_way_match_flag"] == 1
    else:
        three_way_match_condition = False
    
    if all(col in results_df.columns for col in ["has_po", "has_gr", "has_inv"]):
        document_completeness = (results_df["has_po"] + results_df["has_gr"] + results_df["has_inv"]) < 3
    else:
        document_completeness = pd.Series(False, index=results_df.index)

    if "lstm_structural_score" in results_df.columns:
        structural_condition = results_df["lstm_structural_score"] > lstm_thresh["structural"]
    else:
        structural_condition = pd.Series(False, index=results_df.index)

    if "if_score" in results_df.columns:
        three_way_if_gate = results_df["if_score"] >= if_thresh
    else:
        three_way_if_gate = pd.Series(True, index=results_df.index)

    batch_has_invoice = (results_df.get("has_inv", pd.Series(0)) == 1).any()

    results_df["three_way_match_failure"] = (
        three_way_match_condition & 
        document_completeness &
        (results_df["missing_3way_steps"] >= 1) &
        batch_has_invoice
    ).astype("int8")

    APPROVAL_ACTIVITIES = {"Approve Purchase Order", "Approve Purchase Requisition",
                           "Delegate Purchase Requisition Approval"}

    if raw_df is not None and "activity" in raw_df.columns and "case_id" in raw_df.columns:
        cases_with_approval = set(
            raw_df.loc[raw_df["activity"].isin(APPROVAL_ACTIVITIES), "case_id"].unique()
        )
        no_approval = ~results_df["case_id"].isin(cases_with_approval)
    else:
        no_approval = pd.Series(False, index=results_df.index)

    if "if_score" in results_df.columns:
        maverick_if_gate = results_df["if_score"] >= if_thresh
    else:
        maverick_if_gate = pd.Series(True, index=results_df.index)

    if "case_event_count" in results_df.columns:
        p40 = np.percentile(results_df["case_event_count"].fillna(8), 40)
        short_case = results_df["case_event_count"] <= p40
        very_short = results_df["case_event_count"] <= 3
    else:
        short_case = pd.Series(False, index=results_df.index)
        very_short = pd.Series(False, index=results_df.index)

    results_df["maverick_buying"] = (
        (maverick_if_gate & (no_approval | structural_condition) & short_case) |
        (no_approval & very_short)
    ).astype("int8")

    if "lstm_temporal_score" in results_df.columns:
        temporal_model_flag = results_df["lstm_temporal_score"] > lstm_thresh["temporal"]
    else:
        temporal_model_flag = pd.Series(False, index=results_df.index)

    if "if_score" in results_df.columns:
        temporal_if_gate = results_df["if_score"] >= if_thresh
    else:
        temporal_if_gate = pd.Series(True, index=results_df.index)

    time_rule = pd.Series(False, index=results_df.index)
    extreme_time = pd.Series(False, index=results_df.index)
    if "max_time_since_last_event_hours" in results_df.columns:
        time_rule = time_rule | (results_df["max_time_since_last_event_hours"] > 10 * 24)
        extreme_time = extreme_time | (results_df["max_time_since_last_event_hours"] > 90 * 24)
    if "case_duration_hours" in results_df.columns:
        time_rule = time_rule | (results_df["case_duration_hours"] > 45 * 24)
        extreme_time = extreme_time | (results_df["case_duration_hours"] > 180 * 24)

    results_df["temporal_delay"] = (
        ((temporal_model_flag | temporal_if_gate) & time_rule) | extreme_time
    ).astype("int8")

    INVOICE_RECEIPT_ACTIVITIES = {"Create Invoice Receipt", "Record Invoice",
                                  "Book Invoice", "Vendor Creates Invoice"}

    if raw_df is not None and "activity" in raw_df.columns and "case_id" in raw_df.columns:
        invoice_counts = (
            raw_df[raw_df["activity"].isin(INVOICE_RECEIPT_ACTIVITIES)]
            .groupby("case_id")["activity"]
            .count()
        )
        has_duplicate_invoice = results_df["case_id"].isin(set(invoice_counts[invoice_counts >= 2].index))
        is_high_count = results_df["case_id"].map(invoice_counts).fillna(0) >= 3
        is_extreme_duplicate = results_df["case_id"].map(invoice_counts).fillna(0) >= 6
    else:
        has_duplicate_invoice = pd.Series(False, index=results_df.index)
        is_high_count = pd.Series(False, index=results_df.index)
        is_extreme_duplicate = pd.Series(False, index=results_df.index)

    if "if_score" in results_df.columns:
        dup_thresh = np.quantile(results_df["if_score"], 0.98)
        duplicate_if_gate = results_df["if_score"] >= dup_thresh
    else:
        duplicate_if_gate = pd.Series(True, index=results_df.index)

    results_df["duplicate_invoice"] = (
        (has_duplicate_invoice & duplicate_if_gate & is_high_count) | is_extreme_duplicate
    ).astype("int8")

    if "if_score" in results_df.columns:
        unauthorized_condition = results_df["if_score"] >= if_thresh
    else:
        unauthorized_condition = False
    
    if "vendor_case_frequency" in results_df.columns:
        vendor_frequency_condition = results_df["vendor_case_frequency"] < vendor_5th_percentile
    else:
        vendor_frequency_condition = False
    
    extreme_unauthorized = (results_df["vendor_case_frequency"] == 0) & (results_df.get("vendor_batch_frequency", 1) == 1)

    results_df["unauthorized_vendor"] = (
        (unauthorized_condition & vendor_frequency_condition) |
        extreme_unauthorized
    ).astype("int8")

    if "case_quantity" in results_df.columns:
        qty = results_df["case_quantity"].fillna(0)
        qty_mean = qty.mean()
        qty_std  = qty.std() or 1.0
        qty_zscore = (qty - qty_mean) / qty_std
        quantity_variance_rule = (qty_zscore.abs() > 2.0)
    else:
        quantity_variance_rule = pd.Series(False, index=results_df.index)

    results_df["quantity_variance"] = quantity_variance_rule.astype("int8").values

    priority_list = [
        ("unauthorized_vendor",     "Unauthorized Vendor"),
        ("price_mismatch",          "Price Mismatch"),
        ("quantity_variance",       "Quantity Variance"),
        ("maverick_buying",         "Maverick Buying"),
        ("duplicate_invoice",       "Duplicate Invoice"),
        ("temporal_delay",           "Temporal Delay"),
        ("three_way_match_failure", "Three-Way Match Failure"),
    ]
    
    results_df["anomaly_type"] = None
    for flag_col, label in priority_list:
        mask = results_df[flag_col] == 1
        results_df.loc[mask, "anomaly_type"] = label

    results_df["n_flags"] = results_df[["price_mismatch", "three_way_match_failure", "maverick_buying",
                                        "temporal_delay", "duplicate_invoice", "unauthorized_vendor",
                                        "quantity_variance"]].fillna(0).sum(axis=1)

    is_flagged = results_df["n_flags"] > 0
    results_df["if_rank"]   = results_df["if_score"].rank(pct=True)
    results_df["lstm_rank"] = results_df["lstm_case_score"].rank(pct=True)
    results_df["flag_bonus"]= (results_df["n_flags"] / 3.0).clip(upper=1.0)

    raw_score = (0.4 * results_df["if_rank"] + 0.4 * results_df["lstm_rank"] + 0.2 * results_df["flag_bonus"]).clip(0.0, 1.0)
    results_df["severity_score"] = raw_score.copy()

    if is_flagged.sum() > 1:
        flagged_idx = results_df.index[is_flagged]
        inner_rank  = raw_score[flagged_idx].rank(pct=True)
        results_df.loc[flagged_idx, "severity_score"] = (0.55 + inner_rank * 0.45).clip(0.55, 1.0)

    results_df.loc[~is_flagged, "severity_score"] = raw_score[~is_flagged].clip(0.0, 0.54)

    results_df["severity_label"] = "Low"
    results_df.loc[results_df["severity_score"] >= 0.4, "severity_label"] = "Medium"
    results_df.loc[results_df["severity_score"] >= 0.7, "severity_label"] = "High"
    results_df.loc[results_df["severity_score"] >= 0.9, "severity_label"] = "Critical"

    return results_df
