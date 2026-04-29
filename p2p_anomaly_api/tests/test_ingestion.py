"""
Tests for event log ingestion.
"""

import pytest
import pandas as pd
import json
import io
from ingestion.ocel2_ingester import OCEL2Ingester
from core.exceptions import IngestionError

def test_ocel2_ingester_valid():
    ingester = OCEL2Ingester()
    valid_data = {
        "ocel:global-log": {"ocel:version": "2.0"},
        "ocel:events": {
            "e1": {
                "ocel:activity": "Act 1",
                "ocel:timestamp": "2024-01-01T10:00:00Z",
                "ocel:omap": ["po1"],
                "ocel:vmap": {"amount": 100}
            }
        },
        "ocel:objects": {
            "po1": {
                "ocel:type": "Purchase Order",
                "ocel:ovmap": {"vendor": "V1"}
            }
        }
    }
    json_str = json.dumps(valid_data)
    df = ingester.ingest(io.StringIO(json_str))
    
    assert len(df) == 1
    assert df.iloc[0]["activity"] == "Act 1"
    assert df.iloc[0]["case_id"] == "po1"
    assert df.iloc[0]["vendor"] == "V1"

def test_ocel2_ingester_invalid_version():
    ingester = OCEL2Ingester()
    invalid_data = {
        "ocel:global-log": {"ocel:version": "1.0"},
        "ocel:events": {},
        "ocel:objects": {}
    }
    with pytest.raises(IngestionError, match="ocel:global-log.ocel:version must equal '2.0'"):
        ingester.ingest(io.StringIO(json.dumps(invalid_data)))

