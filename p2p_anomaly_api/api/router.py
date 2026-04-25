"""
Main router for the API.
"""

from fastapi import APIRouter
from p2p_anomaly_api.api.v1.endpoints import analyze, cases, runs, health

api_router = APIRouter()

api_router.include_router(analyze.router, tags=["analyze"], prefix="/v1")
api_router.include_router(cases.router, tags=["cases"], prefix="/v1")
api_router.include_router(runs.router, tags=["runs"], prefix="/v1")
api_router.include_router(health.router, tags=["health"], prefix="/v1")
