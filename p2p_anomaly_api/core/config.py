

from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
          
    PROJECT_NAME: str = "P2P Anomaly Detection API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/p2p_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    ALLOWED_ORIGINS: List[str] = ["*"]

    GATEWAY_SHARED_SECRET: str = ""

    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"

    N8N_REPORT_WEBHOOK_URL: str = "https://amrfawzy26.app.n8n.cloud/webhook/generate-p2p-report"

    LOG_LEVEL: str = "INFO"
    MAX_UPLOAD_SIZE_MB: int = 200

    MODEL_DIR: str = "artifacts/"
    LSTM_MAX_LEN: int = 10

    EVENT_LOG_BATCH_SIZE: int = 1000
    CASE_INSERT_BATCH_SIZE: int = 500

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )

settings = Settings()

