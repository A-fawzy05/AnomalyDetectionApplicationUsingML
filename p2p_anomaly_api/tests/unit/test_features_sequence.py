

import numpy as np
import pandas as pd
import pytest

from features.sequence_features import prep_event_features

pytestmark = pytest.mark.unit

def _df():
                                                                                 
    return pd.DataFrame(
        {
            "case_id": ["c1", "c1"],
            "activity": ["Create Purchase Order", "Execute Payment"],
            "timestamp": ["2024-01-01T10:00:00Z", "2024-01-06T23:00:00Z"],
            "amount": [0.0, 999.0],
        }
    )

def test_adds_expected_columns():
    out = prep_event_features(_df())
    for col in [
        "time_since_last_event_hours", "event_index_norm", "is_off_hours",
        "log_amount", "hour_sin", "hour_cos", "dow_sin", "dow_cos",
    ]:
        assert col in out.columns

def test_first_event_has_zero_time_since_last():
    out = prep_event_features(_df()).sort_values(["case_id", "timestamp"])
    first = out.groupby("case_id").first()
    assert first["time_since_last_event_hours"].iloc[0] == 0.0

def test_off_hours_flag_business_vs_weekend_night():
    out = prep_event_features(_df()).reset_index(drop=True)
                                                                        
    assert out.loc[0, "is_off_hours"] == 0
    assert out.loc[1, "is_off_hours"] == 1
    assert set(out["is_off_hours"].unique()).issubset({0, 1})

def test_log_amount_is_log1p():
    out = prep_event_features(_df()).reset_index(drop=True)
    assert out.loc[1, "log_amount"] == pytest.approx(np.log1p(999.0))

def test_cyclical_features_in_unit_range():
    out = prep_event_features(_df())
    for col in ["hour_sin", "hour_cos", "dow_sin", "dow_cos"]:
        assert out[col].between(-1.0, 1.0).all()
