"""HTTP: monitor tick / health of background jobs."""

from fastapi import APIRouter

router = APIRouter(prefix="/monitor", tags=["monitor"])

# TODO: POST /tick (internal), GET /status
