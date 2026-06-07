

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db, verify_db_connection
from api.v1.schemas.response import HealthResponse
from models.isolation_forest import IsolationForestModel
from models.lstm_autoencoder import LSTMAutoencoderModel
from core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok = await verify_db_connection()
    
    if_model = IsolationForestModel()
    lstm_model = LSTMAutoencoderModel()
    models_ok = if_model.model is not None and lstm_model.model is not None
    
    return {
        "status": "ok",
        "db_connected": db_ok,
        "models_loaded": models_ok,
        "version": settings.VERSION
    }

