"""
Integration tests for POST /analyze — the full upload → score → persist pipeline.

Covers the happy path (200 + response schema + persistence) and the two documented
error paths: 413 (file too large) and 422 (malformed/ingestion error).
"""

import io

import pytest

from core.config import settings

pytestmark = [pytest.mark.integration, pytest.mark.asyncio(loop_scope="session")]

API = "/api/v1"


async def test_analyze_returns_full_schema_and_persists(analyzed_run, client):
    body = analyzed_run
    # AnalysisResponse top-level shape.
    for key in (
        "run_id", "summary", "anomaly_cases", "anomaly_type_counts",
        "severity_counts", "process_flow_map", "real_time_feed",
    ):
        assert key in body, f"missing {key}"
    assert body["summary"]["total_cases"] == 45
    assert 0 <= body["summary"]["anomaly_rate"] <= 1

    # Each anomaly case carries the seven-flag object.
    if body["anomaly_cases"]:
        flags = body["anomaly_cases"][0]["flags"]
        assert set(flags).issuperset({
            "price_mismatch", "three_way_match_failure", "maverick_buying",
            "temporal_delay", "duplicate_invoice", "unauthorized_vendor",
            "quantity_variance",
        })

    # The run is retrievable afterwards (persistence).
    got = await client.get(f"{API}/runs/{body['run_id']}")
    assert got.status_code == 200
    assert got.json()["summary"]["total_cases"] == 45


async def test_analyze_rejects_oversize_file(client, monkeypatch):
    # Shrink the limit so any upload trips the 413 guard.
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
    tiny = io.BytesIO(b"case_id,activity,timestamp\nc1,A,2024-01-01T00:00:00Z\n")
    resp = await client.post(
        f"{API}/analyze",
        files={"file": ("x.csv", tiny, "text/csv")},
        data={"file_type": "csv"},
    )
    assert resp.status_code == 413


async def test_analyze_malformed_csv_returns_422(client, cleanup_runs):
    # Missing the mandatory 'timestamp' column → ingestion ValueError → 422.
    bad = io.BytesIO(b"case_id,activity\nc1,Create Purchase Order\n")
    resp = await client.post(
        f"{API}/analyze",
        files={"file": ("bad.csv", bad, "text/csv")},
        data={"file_type": "csv"},
    )
    assert resp.status_code == 422, resp.text
    assert "mandatory" in resp.json()["detail"].lower()

    # /analyze creates the run record before ingestion runs, so a 'failed' run
    # is left behind — delete it so the dev DB stays clean.
    runs = (await client.get(f"{API}/runs", params={"page_size": 50})).json()
    for r in runs:
        if r["file_name"] == "bad.csv":
            await client.delete(f"{API}/runs/{r['run_id']}")
