"""
Main FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from api.router import api_router
from core.config import settings
from db.session import verify_db_connection, engine
from db.models import Base
# Import models here to ensure they are registered with Base.metadata
from db.models.analysis_run import AnalysisRun
from db.models.case_result import CaseResult
from db.models.case_flag import CaseFlag
from db.models.phase_summary import PhaseSummary
from db.models.event_log import EventLog

from models.isolation_forest import IsolationForestModel
from models.lstm_autoencoder import LSTMAutoencoderModel
from core.exceptions import P2PError

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting P2P Anomaly Detection API...")
    
    # 1. Verify DB connection and Create Tables
    db_ok = await verify_db_connection()
    if db_ok:
        try:
            async with engine.begin() as conn:
                # Create schema if it doesn't exist
                await conn.execute(text("CREATE SCHEMA IF NOT EXISTS p2p"))
                # Enable pgcrypto for UUIDs
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
                # Create all tables
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schema and tables initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database tables: {e}")
    
    # 2. Load ML Models
    try:
        if_model = IsolationForestModel()
        if_model.load(settings.MODEL_DIR)
        logger.info("Isolation Forest model loaded successfully.")
        
        lstm_model = LSTMAutoencoderModel()
        lstm_model.load(settings.MODEL_DIR)
        logger.info("LSTM Autoencoder model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load ML models: {e}")
        # We don't exit here to allow health check to report failure
        
    yield
    
    # Shutdown
    logger.info("Shutting down P2P Anomaly Detection API...")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handler
@app.exception_handler(P2PError)
async def p2p_exception_handler(request: Request, exc: P2PError):
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)},
    )

# Include Router
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

