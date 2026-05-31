"""
Integration tests for the real-time append endpoints:
  POST /runs/{run_id}/append        (JSON events)
  POST /runs/{run_id}/append/file   (file upload)

Each test uses its own ``fresh_run`` because appending mutates the run.
"""

import uuid

import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio(loop_scope="session")]

API = "/api/v1"


async def test_append_json_adds_new_case(fresh_run, client):
    payload = {
        "events": [
            {
                "case_id": "purchase_order:stream_new_1",
                "activity": "Create Purchase Order",
                "timestamp": "2026-05-28T14:00:00Z",
                "resource": "Buyer",
                "amount": 950000.0,
                "quantity": 1.0,
                "vendor": "ShadyNewVendor LLC",
            },
            {
                "case_id": "purchase_order:stream_new_1",
                "activity": "Execute Payment",
                "timestamp": "2026-05-28T16:00:00Z",
                "resource": "Finance",
                "amount": 950000.0,
                "quantity": 1.0,
                "vendor": "ShadyNewVendor LLC",
            },
        ]
    }
    resp = await client.post(f"{API}/runs/{fresh_run}/append", json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # AppendResponse shape.
    for key in ("appended_cases", "new_cases", "updated_cases", "new_anomalies",
                "updated_summary", "process_flow_map", "real_time_feed"):
        assert key in body
    assert body["appended_cases"] == 1
    assert body["new_cases"] == 1
    # Summary recomputed over all cases: original 45 + 1 new.
    assert body["updated_summary"]["total_cases"] == 46


async def test_append_empty_events_returns_422(fresh_run, client):
    resp = await client.post(f"{API}/runs/{fresh_run}/append", json={"events": []})
    assert resp.status_code == 422


async def test_append_unknown_run_returns_404(client):
    payload = {"events": [{
        "case_id": "x", "activity": "A", "timestamp": "2026-01-01T00:00:00Z",
    }]}
    resp = await client.post(f"{API}/runs/{uuid.uuid4()}/append", json=payload)
    assert resp.status_code == 404


async def test_append_file_upserts_existing_cases(fresh_run, client, csv_fixture):
    # Re-uploading the same 45 cases should update in place, not add new ones.
    with open(csv_fixture, "rb") as f:
        resp = await client.post(
            f"{API}/runs/{fresh_run}/append/file",
            files={"file": ("p2p-anomaly-test.csv", f, "text/csv")},
            data={"file_type": "csv"},
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["appended_cases"] == 45
    assert body["new_cases"] == 0
    assert body["updated_cases"] == 45
    assert body["updated_summary"]["total_cases"] == 45
