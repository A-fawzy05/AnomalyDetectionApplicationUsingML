

from pathlib import Path

import joblib
import numpy as np
import pytest

from core.config import settings
from features.case_features import build_case_features
from ingestion.csv_ingester import CSVIngester

pytestmark = pytest.mark.unit

@pytest.fixture(scope="module")
def case_matrix(csv_fixture):
    df = CSVIngester().ingest(csv_fixture)
    return df, build_case_features(df)

def test_matches_training_column_count(case_matrix):
    _, X = case_matrix
    train_columns = joblib.load(Path(settings.MODEL_DIR) / "train_columns.pkl")
    assert X.shape[1] == len(train_columns)
    assert X.shape[1] == 2117                       

def test_one_row_per_case(case_matrix):
    df, X = case_matrix
    assert len(X) == df["case_id"].nunique() == 45
    assert X.index.name == "case_id"

def test_no_nan_or_inf(case_matrix):
    _, X = case_matrix
    arr = X.to_numpy(dtype=np.float64)
    assert not np.isnan(arr).any()
    assert not np.isinf(arr).any()

def test_no_float64_columns_remain(case_matrix):
                                                                       
    _, X = case_matrix
    assert list(X.select_dtypes(include="float64").columns) == []

def test_vendor_and_frequency_sidechannels_preserved(case_matrix):
    _, X = case_matrix

    assert getattr(X, "_vendor_data", None) is not None
    assert getattr(X, "_vendor_case_freq", None) is not None
    assert len(X._vendor_data) == len(X)
                                                                         
    assert "case_amount" in X.columns
