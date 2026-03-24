"""HTTP: disruption events and history."""

from fastapi import APIRouter

router = APIRouter(prefix="/disruptions", tags=["disruptions"])

# TODO: GET /trips/{trip_id}/events, ...
