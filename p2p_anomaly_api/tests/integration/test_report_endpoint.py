

import uuid

import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio(loop_scope="session")]

API = "/api/v1"

class _FakeResponse:
    status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return {"report_markdown": "# P2P Report\nGenerated for testing."}

class _FakeAsyncClient:

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, **kwargs):
        return _FakeResponse()

async def test_report_returns_markdown_with_mocked_n8n(analyzed_run, client, monkeypatch):
    monkeypatch.setattr(
        "api.v1.endpoints.report.httpx.AsyncClient", _FakeAsyncClient
    )
    resp = await client.post(
        f"{API}/runs/{analyzed_run['run_id']}/report",
        json={"user_name": "Tester", "min_severity": "Low"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["run_id"] == analyzed_run["run_id"]
    assert body["report_markdown"].startswith("# P2P Report")

async def test_report_unknown_run_returns_404(client, monkeypatch):
    monkeypatch.setattr(
        "api.v1.endpoints.report.httpx.AsyncClient", _FakeAsyncClient
    )
    resp = await client.post(
        f"{API}/runs/{uuid.uuid4()}/report",
        json={"user_name": "Tester"},
    )
    assert resp.status_code == 404
