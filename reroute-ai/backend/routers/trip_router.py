"""HTTP: trips CRUD and import."""

from fastapi import APIRouter

router = APIRouter(prefix="/trips", tags=["trips"])

# TODO: POST / import, GET /, GET /{trip_id}, PATCH /{trip_id}
