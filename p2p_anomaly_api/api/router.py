"""
Main router for the API.
"""

from fastapi import APIRouter
from api.v1.endpoints import analyze, cases, runs, health, stream, report

api_router = APIRouter()

api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(cases.router, tags=["cases"])
api_router.include_router(runs.router, tags=["runs"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(stream.router, tags=["Real-Time Analysis"])
api_router.include_router(report.router, tags=["Reports"])

