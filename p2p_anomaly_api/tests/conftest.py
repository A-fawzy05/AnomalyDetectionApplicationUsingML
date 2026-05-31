"""
Pytest configuration and shared fixtures for the P2P Anomaly Detection API tests.

Three test tiers (see markers in pytest.ini):
  * unit       — pure-Python, no DB, no network. Always runnable.
  * detection  — runs the real ML pipeline on the labeled fixture. Needs the artifacts
                 in ``artifacts/`` (they are committed) but no DB.
  * integration— exercises the FastAPI app end-to-end against the dev Postgres at
                 the configured DATABASE_URL (localhost:2000). Auto-skips when the DB
                 is unreachable, and deletes every run it creates afterwards.
"""

import asyncio
import os
import sys

import pytest

# Make `import _ground_truth` work from any test, and ensure the service root
# (the parent of tests/) is importable for `core`, `ingestion`, `features`, ...
_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_SERVICE_ROOT = os.path.dirname(_TESTS_DIR)
for _p in (_TESTS_DIR, _SERVICE_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── Fixture data files (produced by generate_test_data.py, committed) ──────────
CSV_FIXTURE = os.path.join(_SERVICE_ROOT, "p2p-anomaly-test.csv")
OCEL2_FIXTURE = os.path.join(_SERVICE_ROOT, "ocel2-p2p-anomaly-test.json")
SAMPLE_OCEL2_FIXTURE = os.path.join(_SERVICE_ROOT, "sample_ocel2.json")
# Where the detection test writes its evaluation artifacts.
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


# ── Database availability probe (session scope, synchronous) ───────────────────
def _probe_db() -> bool:
    """Open a short-lived connection to DATABASE_URL; return True iff reachable."""
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


# ── App client for integration tests (session-scoped → single event loop) ──────
@pytest.fixture(scope="session")
async def client(db_available):
    """
    Async HTTP client bound to the FastAPI app. Skips the whole integration tier
    when Postgres is unreachable.

    We talk to the app via httpx's ASGITransport and initialise the DB schema
    directly (mirroring main.lifespan). ML models load lazily on first use, so
    no lifespan manager is required.
    """
    if not db_available:
        pytest.skip("Postgres not reachable at DATABASE_URL — skipping integration tests.")

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import text

    from main import app  # importing main registers all ORM models on Base.metadata
    from db.models import Base
    from db.session import engine

    # Best-effort schema/table creation, same as the app's startup lifespan.
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
    """
    Yields a list; append any run_id created during a test and it will be
    deleted (cascade) on teardown so the dev DB stays clean.
    """
    created: list = []
    yield created
    for run_id in created:
        try:
            await client.delete(f"/api/v1/runs/{run_id}")
        except Exception:
            pass
