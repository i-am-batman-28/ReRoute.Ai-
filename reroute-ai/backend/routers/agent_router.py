"""Agent proposal + confirm endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import get_current_user
from model.user_model import User
from schema.agent_schemas import (
    AgentConfirmRequest,
    AgentConfirmResponse,
    AgentProposeRequest,
    AgentProposeResponse,
)
from service import agent_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post(
    "/propose",
    response_model=AgentProposeResponse,
    status_code=status.HTTP_200_OK,
)
async def propose(
    body: AgentProposeRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> AgentProposeResponse:
    return await agent_service.propose_for_trip(
        session=session,
        user_id=current.id,
        trip_id=body.trip_id,
        simulate_disruption=body.simulate_disruption,
    )


@router.post(
    "/confirm",
    response_model=AgentConfirmResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm(
    body: AgentConfirmRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> AgentConfirmResponse:
    return await agent_service.confirm_and_apply(session=session, user_id=current.id, body=body)
