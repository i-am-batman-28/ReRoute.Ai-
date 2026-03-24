"""Orchestrates DB trip load + agent graph + proposal persistence (stubs)."""

from __future__ import annotations

import logging
import uuid

from schema.agent_schemas import AgentConfirmRequest, AgentConfirmResponse, AgentProposeResponse

logger = logging.getLogger(__name__)


async def propose_for_trip(trip_id: str, simulate_disruption: str | None = None) -> AgentProposeResponse:
    """Load trip snapshot, run observe/tools (stubs), return structured proposal."""
    _ = simulate_disruption
    proposal_id = str(uuid.uuid4())
    logger.info("propose_for_trip", extra={"trip_id": trip_id, "proposal_id": proposal_id})
    # Future: TripDAO.get + graph_runner.run_trip_agent + persist proposal row
    return AgentProposeResponse(
        proposal_id=proposal_id,
        phase="await_confirm",
        ranked_options=[],
        tool_trace_summary=["stub: integrations not wired"],
    )


async def confirm_and_apply(body: AgentConfirmRequest) -> AgentConfirmResponse:
    """Hard gate: only here do we mutate itinerary / DB."""
    logger.info(
        "confirm_and_apply",
        extra={"proposal_id": body.proposal_id, "option": body.selected_option_id},
    )
    # Future: validate proposal, itinerary_service.apply_plan(...)
    return AgentConfirmResponse(
        applied=True,
        itinerary_revision=1,
        message="Simulated apply — wire itinerary_service for real updates.",
    )
