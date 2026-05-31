"""
Fixtures shared by the integration tier.

These build on the session-scoped ``client`` and ``db_available`` fixtures from the
top-level tests/conftest.py. They upload the committed CSV fixture through the real
``POST /analyze`` pipeline against the dev Postgres and clean up afterwards.
"""

import pytest

API = "/api/v1"


async def _upload_csv(client, csv_path):
    with open(csv_path, "rb") as f:
        return await client.post(
            f"{API}/analyze",
            files={"file": ("p2p-anomaly-test.csv", f, "text/csv")},
            data={"file_type": "csv"},
        )


@pytest.fixture(scope="session")
async def analyzed_run(client, csv_fixture):
    """
    A single completed run shared by the read-only endpoint tests
    (runs/cases/report). Deleted at the end of the session.
    """
    resp = await _upload_csv(client, csv_fixture)
    assert resp.status_code == 200, f"/analyze failed: {resp.status_code} {resp.text}"
    body = resp.json()
    yield body
    try:
        await client.delete(f"{API}/runs/{body['run_id']}")
    except Exception:
        pass


@pytest.fixture
async def fresh_run(client, csv_fixture, cleanup_runs):
    """A dedicated completed run for tests that mutate it (append). Auto-deleted."""
    resp = await _upload_csv(client, csv_fixture)
    assert resp.status_code == 200, f"/analyze failed: {resp.status_code} {resp.text}"
    run_id = resp.json()["run_id"]
    cleanup_runs.append(run_id)
    return run_id
