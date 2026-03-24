from fastapi import APIRouter

from routers import health_router

api_router = APIRouter()
api_router.include_router(health_router.router, tags=["health"])
