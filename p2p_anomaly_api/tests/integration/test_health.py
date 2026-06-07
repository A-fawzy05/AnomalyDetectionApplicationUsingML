                                                                            

import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio(loop_scope="session")]

async def test_health_reports_ok_db_and_models(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["db_connected"] is True
    assert body["models_loaded"] is True
    assert body["version"]
