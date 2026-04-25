"""
Main FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from p2p_anomaly_api.api.router import api_router
from p2p_anomaly_api.core.config import settings
from p2p_anomaly_api.db.session import verify_db_connection, engine
from p2p_anomaly_api.models.isolation_forest import IsolationForestModel
from p2p_anomaly_api.models.lstm_autoencoder import LSTMAutoencoderModel
from p2p_anomaly_api.core.exceptions import P2PError

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
    
    # 1. Verify DB connection
    await verify_db_connection()
    
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
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
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
    uvicorn.run("p2p_anomaly_api.main:app", host="0.0.0.0", port=8000, reload=True)
