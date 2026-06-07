

import io
import json

import pytest

import ingestion.ocel2_ingester as ocel2_mod
from ingestion.ocel2_ingester import OCEL2Ingester

pytestmark = pytest.mark.unit

def _doc(events, objects):
    return io.StringIO(json.dumps({"events": events, "objects": objects}))

def _ingest(events, objects):
    return OCEL2Ingester().ingest(_doc(events, objects))

def test_direct_po_link_resolves_one_case():
    objects = [{"id": "purchase_order:1", "type": "purchase_order",
                "attributes": [{"name": "Vendor (EKKO-LIFNR)", "value": "Acme", "time": "1970"}],
                "relationships": []}]
    events = [
        {"id": "e1", "type": "Create Purchase Order", "time": "2024-01-01T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
        {"id": "e2", "type": "Execute Payment", "time": "2024-01-03T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
    ]
    df = _ingest(events, objects)
    assert df["case_id"].nunique() == 1
    assert df.iloc[0]["case_id"] == "purchase_order:1"
    assert df.iloc[0]["vendor"] == "Acme"
    assert len(df) == 2

def test_transitive_link_via_quotation_resolved_by_bfs():
                                                                                    
    objects = [
        {"id": "purchase_order:1", "type": "purchase_order", "attributes": [], "relationships": []},
        {"id": "quotation:1", "type": "quotation", "attributes": [],
         "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
    ]
    events = [
        {"id": "e1", "type": "Create Request for Quotation", "time": "2024-01-01T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "quotation:1", "qualifier": "quotation"}]},
    ]
    df = _ingest(events, objects)
    assert df["case_id"].tolist() == ["purchase_order:1"]

def test_orphan_event_is_skipped_but_others_kept():
    objects = [{"id": "purchase_order:1", "type": "purchase_order", "attributes": [], "relationships": []}]
    events = [
        {"id": "e1", "type": "Linked", "time": "2024-01-01T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
        {"id": "e2", "type": "Orphan", "time": "2024-01-02T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "unknown:99", "qualifier": "misc"}]},
    ]
    df = _ingest(events, objects)
    assert len(df) == 1
    assert df.iloc[0]["activity"] == "Linked"

def test_all_orphan_events_raises_zero_rows():
    objects = [{"id": "material:1", "type": "material", "attributes": [], "relationships": []}]
    events = [
        {"id": "e1", "type": "X", "time": "2024-01-01T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "material:1", "qualifier": "material"}]},
    ]
    with pytest.raises(ValueError, match="0 rows"):
        _ingest(events, objects)

def test_missing_events_key_raises():
    with pytest.raises(ValueError, match="missing 'events'"):
        OCEL2Ingester().ingest(io.StringIO(json.dumps({"objects": []})))

def test_empty_events_raises():
    with pytest.raises(ValueError, match="empty"):
        _ingest([], [{"id": "purchase_order:1", "type": "purchase_order", "attributes": [], "relationships": []}])

def test_event_count_cap_enforced(monkeypatch):
    monkeypatch.setattr(ocel2_mod, "MAX_EVENTS", 1)
    objects = [{"id": "purchase_order:1", "type": "purchase_order", "attributes": [], "relationships": []}]
    events = [
        {"id": "e1", "type": "A", "time": "2024-01-01T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
        {"id": "e2", "type": "B", "time": "2024-01-02T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
    ]
    with pytest.raises(ValueError, match="Max supported"):
        _ingest(events, objects)

def test_amount_resolved_from_material_price_times_quantity():
    objects = [
        {"id": "purchase_order:1", "type": "purchase_order", "attributes": [],
         "relationships": [{"objectId": "material:1", "qualifier": "Materials of Purchase Order"}]},
        {"id": "material:1", "type": "material",
         "attributes": [
             {"name": "Net Price (EKPO-NETPR)", "value": 100.0, "time": "1970"},
             {"name": "Quantity (EKPO-MENGE)", "value": 4, "time": "1970"},
         ], "relationships": []},
    ]
    events = [
        {"id": "e1", "type": "Create Purchase Order", "time": "2024-01-01T10:00:00Z",
         "attributes": [], "relationships": [{"objectId": "purchase_order:1", "qualifier": "purchase_order"}]},
    ]
    df = _ingest(events, objects)
    assert df.iloc[0]["amount"] == 400.0
    assert df.iloc[0]["quantity"] == 4
