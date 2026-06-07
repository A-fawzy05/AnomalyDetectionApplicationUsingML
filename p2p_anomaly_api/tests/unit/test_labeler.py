

import numpy as np
import pandas as pd
import pytest

from scoring.labeler import apply_labels

pytestmark = pytest.mark.unit

IF_T = 0.5
LSTM_T = 0.5

FLAG_COLS = [
    "price_mismatch", "three_way_match_failure", "maverick_buying",
    "temporal_delay", "duplicate_invoice", "unauthorized_vendor",
    "quantity_variance",
]

def _base_row(case_id):
                                                                          
    return {
        "case_id": case_id,
        "max_abs_price_deviation": 0.0,
        "missing_3way_steps": 0,
        "vendor_case_frequency": 100.0,
        "vendor_batch_frequency": 5,
        "if_score": 0.0,                             
        "lstm_case_score": 0.0,
        "lstm_structural_score": 0.0,
        "lstm_temporal_score": 0.0,
        "case_quantity": 1.0,
        "case_event_count": 8,
        "max_time_since_last_event_hours": 24.0,
        "case_duration_hours": 100.0,
        "has_po": 1, "has_gr": 1, "has_inv": 1,
        "three_way_match_flag": 0,
    }

def _raw_df(case_ids, no_approval_cases=()):
                                                                                 
    rows = []
    for cid in case_ids:
        rows.append({"case_id": cid, "activity": "Create Purchase Order"})
        if cid not in no_approval_cases:
            rows.append({"case_id": cid, "activity": "Approve Purchase Order"})
        rows.append({"case_id": cid, "activity": "Execute Payment"})
    return pd.DataFrame(rows)

@pytest.fixture
def labeled():
    rows = [_base_row(f"c{i}") for i in range(7)]

    rows[1].update(max_abs_price_deviation=5.0, if_score=0.9)
                                                                                
    rows[2].update(three_way_match_flag=1, has_gr=0, has_inv=0, missing_3way_steps=2)
                                                                      
    rows[3].update(case_event_count=2)
                                                  
    rows[4].update(max_time_since_last_event_hours=100 * 24)
                                                                       
    rows[5].update(vendor_case_frequency=0.0, vendor_batch_frequency=1)
                                                           
    rows[6].update(case_quantity=1000.0)

    results = pd.DataFrame(rows)
    raw = _raw_df([f"c{i}" for i in range(7)], no_approval_cases={"c3"})
    return apply_labels(results, raw, if_threshold=IF_T, lstm_threshold=LSTM_T)

@pytest.mark.parametrize(
    "idx,flag",
    [
        (1, "price_mismatch"),
        (2, "three_way_match_failure"),
        (3, "maverick_buying"),
        (4, "temporal_delay"),
        (5, "unauthorized_vendor"),
        (6, "quantity_variance"),
    ],
)
def test_each_case_raises_its_intended_flag(labeled, idx, flag):
    row = labeled.iloc[idx]
    assert row[flag] == 1, f"expected {flag} on row {idx}"

def test_clean_case_raises_no_flags(labeled):
    row = labeled.iloc[0]
    assert int(sum(row[c] for c in FLAG_COLS)) == 0
    assert pd.isna(row["anomaly_type"]) or row["anomaly_type"] is None

def test_flagged_cases_get_an_anomaly_type(labeled):
    for idx in range(1, 7):
        assert labeled.iloc[idx]["anomaly_type"] is not None

def test_severity_score_partitions_flagged_vs_clean(labeled):
    flagged = labeled[labeled[FLAG_COLS].sum(axis=1) > 0]
    clean = labeled[labeled[FLAG_COLS].sum(axis=1) == 0]
                                                                                
    assert (flagged["severity_score"] >= 0.55).all()
    assert (clean["severity_score"] <= 0.54).all()

def test_severity_label_boundaries_consistent(labeled):
    for _, row in labeled.iterrows():
        s = row["severity_score"]
        expected = (
            "Critical" if s >= 0.9 else
            "High" if s >= 0.7 else
            "Medium" if s >= 0.4 else
            "Low"
        )
        assert row["severity_label"] == expected

def test_anomaly_type_priority_prefers_three_way():

    r0 = _base_row("x0")
    r0.update(vendor_case_frequency=0.0, vendor_batch_frequency=1,                 
              three_way_match_flag=1, has_gr=0, has_inv=0, missing_3way_steps=2)             
    r1 = _base_row("x1")                                                      
    results = pd.DataFrame([r0, r1])
    raw = _raw_df(["x0", "x1"])
    out = apply_labels(results, raw, if_threshold=IF_T, lstm_threshold=LSTM_T)
    row = out[out["case_id"] == "x0"].iloc[0]
    assert row["unauthorized_vendor"] == 1
    assert row["three_way_match_failure"] == 1
    assert row["anomaly_type"] == "Three-Way Match Failure"
