"""Agent proposal + confirm endpoints."""

from fastapi import APIRouter, status

from schema.agent_schemas import AgentConfirmRequest, AgentConfirmResponse, AgentProposeRequest, AgentProposeResponse
from service import agent_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post(
    "/propose",
    response_model=AgentProposeResponse,
    status_code=status.HTTP_200_OK,
)
async def propose(body: AgentProposeRequest) -> AgentProposeResponse:
    return await agent_service.propose_for_trip(body.trip_id, body.simulate_disruption)


@router.post(
    "/confirm",
    response_model=AgentConfirmResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm(body: AgentConfirmRequest) -> AgentConfirmResponse:
    return await agent_service.confirm_and_apply(body)
