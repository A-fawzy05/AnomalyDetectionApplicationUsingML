"""
Configuration module for the P2P Anomaly Detection API.
Uses pydantic-settings to manage environment variables.
"""

from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base
    PROJECT_NAME: str = "P2P Anomaly Detection API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/p2p_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Security
    ALLOWED_ORIGINS: List[str] = ["*"]

    # Trusted-gateway authorization.
    # The Node.js API gateway authenticates end users (JWT) and forwards the
    # caller's identity claims (role + team membership) on each request, signed
    # with this shared secret. When set, the anomaly service ENFORCES those
    # claims (see api/deps.py): a non-member is refused on every data endpoint,
    # and analyze/report additionally require an admin/analyst role.
    # When left empty the service runs "open" (no enforcement) — convenient for
    # local, direct-to-service testing and backwards compatibility.
    GATEWAY_SHARED_SECRET: str = ""

    # Kafka (kept for stream endpoints; not used by report)
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"

    # n8n report webhook (called synchronously by POST /runs/{id}/report)
    N8N_REPORT_WEBHOOK_URL: str = "https://amrfawzy26.app.n8n.cloud/webhook/generate-p2p-report"

    # App Settings
    LOG_LEVEL: str = "INFO"
    MAX_UPLOAD_SIZE_MB: int = 200
    
    # Model Artifacts
    MODEL_DIR: str = "artifacts/"
    LSTM_MAX_LEN: int = 10
    
    # Processing
    EVENT_LOG_BATCH_SIZE: int = 1000
    CASE_INSERT_BATCH_SIZE: int = 500

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )


settings = Settings()

