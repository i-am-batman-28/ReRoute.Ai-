"""API-facing schemas for agent proposals and confirmations."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentProposeRequest(BaseModel):
    trip_id: str = Field(..., description="Trip to analyze")
    simulate_disruption: str | None = Field(
        None,
        description="Optional demo flag e.g. cancel|delay to drive mock integrations",
    )
    async_mode: bool = Field(
        False,
        description="If true, enqueue Celery job and poll GET .../propose/jobs/{task_id} (requires Redis). Prefer POST .../propose/async to avoid opening a DB session.",
    )


class AgentProposeAsyncRequest(BaseModel):
    """Same as sync propose body; used by POST /agent/propose/async (no DB session dependency)."""

    trip_id: str = Field(..., description="Trip to analyze")
    simulate_disruption: str | None = Field(
        None,
        description="Optional demo flag e.g. cancel|delay to drive mock integrations",
    )


class RankedOptionDTO(BaseModel):
    option_id: str
    score: float
    summary: str
    legs: list[dict[str, Any]] = Field(default_factory=list)
    modality: str = "flight"


class AgentProposeResponse(BaseModel):
    proposal_id: str
    phase: str
    requires_user_review: bool = False
    disruption_summary: str | None = None
    ranked_options: list[RankedOptionDTO] = Field(default_factory=list)
    tool_trace_summary: list[str] = Field(default_factory=list)
    cascade_preview: dict[str, Any] | None = None
    compensation_draft: dict[str, Any] | None = None
    notification_status: dict[str, Any] | None = None
    search_meta: dict[str, Any] | None = None


class AgentConfirmRequest(BaseModel):
    proposal_id: str
    selected_option_id: str
    acknowledge_disruption_uncertainty: bool = False


class AgentConfirmResponse(BaseModel):
    applied: bool
    itinerary_revision: int | None = None
    message: str
    duffel_order_id: str | None = None
    email_sent: bool | None = None
    email_queued: bool | None = Field(
        None,
        description="True when delivery was handed off to Celery (email_via_celery).",
    )


class AgentProposeJobAccepted(BaseModel):
    task_id: str
    state: Literal["queued"] = "queued"
    poll_path: str


class AgentProposeJobStatus(BaseModel):
    task_id: str
    state: str
    result: AgentProposeResponse | None = None
    error: str | None = None
