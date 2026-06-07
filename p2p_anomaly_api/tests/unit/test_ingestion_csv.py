

import io

import pandas as pd
import pytest

from ingestion.csv_ingester import CSVIngester, CANONICAL_COLUMNS

pytestmark = pytest.mark.unit

def _ingest(csv_text: str) -> pd.DataFrame:
    return CSVIngester().ingest(io.StringIO(csv_text))

def test_minimal_csv_fills_canonical_columns():
    df = _ingest(
        "case_id,activity,timestamp\n"
        "po1,Create Purchase Order,2024-01-01T10:00:00Z\n"
        "po1,Execute Payment,2024-01-03T10:00:00Z\n"
    )
                                                        
    for col in CANONICAL_COLUMNS:
        assert col in df.columns, f"missing canonical column {col}"
    assert len(df) == 2
    assert df["case_id"].nunique() == 1
                       
    assert (df["amount"] == 0.0).all()
    assert (df["case:Source"] == "CSV").all()

def test_alias_columns_are_renamed():
    df = _ingest(
        "Case ID,Activity,Timestamp,Amount,Supplier,Quantity\n"
        "c1,Create Purchase Order,2024-01-01T10:00:00Z,1500.5,Acme Ltd,3\n"
    )
    assert df.iloc[0]["case_id"] == "c1"
    assert df.iloc[0]["activity"] == "Create Purchase Order"
    assert df.iloc[0]["amount"] == 1500.5
    assert df.iloc[0]["quantity"] == 3
    assert df.iloc[0]["vendor"] == "Acme Ltd"

@pytest.mark.parametrize("missing", ["case_id", "activity", "timestamp"])
def test_missing_mandatory_column_raises(missing):
    cols = {"case_id": "c1", "activity": "A", "timestamp": "2024-01-01T10:00:00Z"}
    cols.pop(missing)
    header = ",".join(cols.keys())
    values = ",".join(str(v) for v in cols.values())
    with pytest.raises(ValueError, match="missing mandatory columns"):
        _ingest(f"{header}\n{values}\n")

def test_timestamp_parsed_to_utc_datetime():
    df = _ingest(
        "case_id,activity,timestamp\n"
        "c1,A,2024-06-01T09:30:00Z\n"
    )
    ts = df.iloc[0]["timestamp"]
    assert isinstance(ts, pd.Timestamp)
    assert str(ts.tz) == "UTC"

def test_non_numeric_amount_coerced_to_zero():
    df = _ingest(
        "case_id,activity,timestamp,amount\n"
        "c1,A,2024-01-01T10:00:00Z,not_a_number\n"
    )
    assert df.iloc[0]["amount"] == 0.0

def test_vendor_synced_from_case_vendor_when_vendor_absent():
    df = _ingest(
        "case_id,activity,timestamp,case:Vendor\n"
        "c1,A,2024-01-01T10:00:00Z,Globex\n"
    )
    assert df.iloc[0]["vendor"] == "Globex"

def test_rows_sorted_by_case_then_time():
    df = _ingest(
        "case_id,activity,timestamp\n"
        "c1,Second,2024-01-05T10:00:00Z\n"
        "c1,First,2024-01-01T10:00:00Z\n"
    )
    assert list(df["activity"]) == ["First", "Second"]
