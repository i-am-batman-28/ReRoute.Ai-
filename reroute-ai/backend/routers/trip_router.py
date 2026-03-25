"""HTTP: trips CRUD."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import get_current_user
from model.user_model import User
from schema.itinerary_schemas import TripDetailPublic
from schema.trip_schemas import TripCreateRequest, TripPublic, TripUpdateRequest
from service import trip_service

router = APIRouter(prefix="/trips", tags=["trips"])


@router.post("", response_model=TripPublic, status_code=status.HTTP_201_CREATED)
async def create_trip(
    body: TripCreateRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> TripPublic:
    return await trip_service.create_trip(user=current, payload=body, session=session)


@router.get("", response_model=list[TripPublic], status_code=status.HTTP_200_OK)
async def list_trips(
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> list[TripPublic]:
    return await trip_service.list_trips(user_id=current.id, session=session)


@router.get("/{trip_id}/detail", response_model=TripDetailPublic, status_code=status.HTTP_200_OK)
async def get_trip_detail(
    trip_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> TripDetailPublic:
    return await trip_service.get_trip_detail(user_id=current.id, trip_id=trip_id, session=session)


@router.get("/{trip_id}", response_model=TripPublic, status_code=status.HTTP_200_OK)
async def get_trip(
    trip_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> TripPublic:
    return await trip_service.get_trip(user_id=current.id, trip_id=trip_id, session=session)


@router.patch("/{trip_id}", response_model=TripPublic, status_code=status.HTTP_200_OK)
async def update_trip(
    trip_id: str,
    body: TripUpdateRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> TripPublic:
    return await trip_service.update_trip(
        user_id=current.id,
        trip_id=trip_id,
        payload=body,
        session=session,
    )


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> Response:
    await trip_service.delete_trip(user_id=current.id, trip_id=trip_id, session=session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
