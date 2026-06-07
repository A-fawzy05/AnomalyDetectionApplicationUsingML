

import asyncio
import os
import sys

import pytest

_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_SERVICE_ROOT = os.path.dirname(_TESTS_DIR)
for _p in (_TESTS_DIR, _SERVICE_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

CSV_FIXTURE = os.path.join(_SERVICE_ROOT, "p2p-anomaly-test.csv")
OCEL2_FIXTURE = os.path.join(_SERVICE_ROOT, "ocel2-p2p-anomaly-test.json")
SAMPLE_OCEL2_FIXTURE = os.path.join(_SERVICE_ROOT, "sample_ocel2.json")
                                                           
DETECTION_OUT_DIR = os.path.join(_TESTS_DIR, "detection")

@pytest.fixture(scope="session")
def csv_fixture() -> str:
    if not os.path.exists(CSV_FIXTURE):
        pytest.skip(f"Missing fixture {CSV_FIXTURE}; run generate_test_data.py")
    return CSV_FIXTURE

@pytest.fixture(scope="session")
def ocel2_fixture() -> str:
    if not os.path.exists(OCEL2_FIXTURE):
        pytest.skip(f"Missing fixture {OCEL2_FIXTURE}; run generate_test_data.py")
    return OCEL2_FIXTURE

def _probe_db() -> bool:
                                                                                   
    from core.config import settings
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    async def _check() -> bool:
        engine = create_async_engine(settings.DATABASE_URL, connect_args={"timeout": 3})
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False
        finally:
            await engine.dispose()

    try:
        return asyncio.run(asyncio.wait_for(_check(), timeout=6))
    except Exception:
        return False

@pytest.fixture(scope="session")
def db_available() -> bool:
    return _probe_db()

@pytest.fixture(scope="session")
async def client(db_available):

       
    if not db_available:
        pytest.skip("Postgres not reachable at DATABASE_URL — skipping integration tests.")

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import text

    from main import app                                                            
    from db.models import Base
    from db.session import engine

    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA IF NOT EXISTS p2p"))
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pass

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    await engine.dispose()

@pytest.fixture
async def cleanup_runs(client):

       
    created: list = []
    yield created
    for run_id in created:
        try:
            await client.delete(f"/api/v1/runs/{run_id}")
        except Exception:
            pass
