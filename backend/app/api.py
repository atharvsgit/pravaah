from fastapi import APIRouter

from app.api.endpoints import reports, auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])

