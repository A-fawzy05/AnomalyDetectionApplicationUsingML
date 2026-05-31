"""
Integration tests for the read endpoints: GET /runs, GET /runs/{id},
GET /cases (filtering + pagination), and DELETE /runs/{id}.

All read tests share the session-scoped ``analyzed_run`` fixture.
"""

import uuid

import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio(loop_scope="session")]

API = "/api/v1"


async def test_list_runs_includes_our_run(analyzed_run, client):
    resp = await client.get(f"{API}/runs", params={"page_size": 50})
    assert resp.status_code == 200
    run_ids = {r["run_id"] for r in resp.json()}
    assert analyzed_run["run_id"] in run_ids


async def test_get_run_details(analyzed_run, client):
    resp = await client.get(f"{API}/runs/{analyzed_run['run_id']}")
    assert resp.status_code == 200
    assert resp.json()["summary"]["total_cases"] == 45


async def test_get_unknown_run_returns_404(client):
    resp = await client.get(f"{API}/runs/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_get_cases_returns_items_with_flags(analyzed_run, client):
    resp = await client.get(f"{API}/cases", params={"run_id": analyzed_run["run_id"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert {"items", "total", "page", "page_size"}.issubset(body)
    assert "flags" in body["items"][0]


async def test_get_cases_severity_filter(analyzed_run, client):
    resp = await client.get(
        f"{API}/cases",
        params={"run_id": analyzed_run["run_id"], "severity_label": "Critical"},
    )
    assert resp.status_code == 200
    assert all(item["severity_label"] == "Critical" for item in resp.json()["items"])


async def test_get_cases_pagination_respects_page_size(analyzed_run, client):
    resp = await client.get(
        f"{API}/cases",
        params={"run_id": analyzed_run["run_id"], "page_size": 5, "page": 1},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["page_size"] == 5
    assert len(body["items"]) <= 5


async def test_delete_run_removes_it(client, csv_fixture):
    # Create a throwaway run, delete it, confirm it is gone.
    with open(csv_fixture, "rb") as f:
        resp = await client.post(
            f"{API}/analyze",
            files={"file": ("p2p-anomaly-test.csv", f, "text/csv")},
            data={"file_type": "csv"},
        )
    assert resp.status_code == 200
    run_id = resp.json()["run_id"]

    deleted = await client.delete(f"{API}/runs/{run_id}")
    assert deleted.status_code == 200

    gone = await client.get(f"{API}/runs/{run_id}")
    assert gone.status_code == 404
