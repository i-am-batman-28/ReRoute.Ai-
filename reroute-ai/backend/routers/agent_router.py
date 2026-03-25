"""Agent proposal + confirm endpoints."""

from __future__ import annotations

from typing import Annotated

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from deps import get_current_user
from model.user_model import User
from schema.agent_schemas import (
    AgentConfirmRequest,
    AgentConfirmResponse,
    AgentProposeJobAccepted,
    AgentProposeJobStatus,
    AgentProposeRequest,
    AgentProposeResponse,
)
from service import agent_service
from utils.job_redis import register_propose_job, verify_propose_job_user
from worker.celery_app import celery_app
from worker.tasks import run_agent_propose_task

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post(
    "/propose",
    response_model=None,
    responses={
        200: {"model": AgentProposeResponse, "description": "Synchronous propose result"},
        202: {"model": AgentProposeJobAccepted, "description": "Background job enqueued"},
    },
)
async def propose(
    body: AgentProposeRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
):
    if body.async_mode:
        settings = get_settings()
        try:
            ar = run_agent_propose_task.apply_async(
                args=[current.id, body.trip_id, body.simulate_disruption],
            )
            register_propose_job(task_id=ar.id, user_id=current.id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Async propose unavailable (Redis/Celery must be reachable).",
            )
        poll_path = f"{settings.api_prefix}/agent/propose/jobs/{ar.id}"
        out = AgentProposeJobAccepted(task_id=ar.id, poll_path=poll_path)
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=out.model_dump())

    return await agent_service.propose_for_trip(
        session=session,
        user_id=current.id,
        trip_id=body.trip_id,
        simulate_disruption=body.simulate_disruption,
    )


@router.get(
    "/propose/jobs/{task_id}",
    response_model=AgentProposeJobStatus,
    status_code=status.HTTP_200_OK,
)
async def propose_job_status(
    task_id: str,
    current: Annotated[User, Depends(get_current_user)],
) -> AgentProposeJobStatus:
    if not verify_propose_job_user(task_id=task_id, user_id=current.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    ar = AsyncResult(task_id, app=celery_app)
    st = ar.state
    if st == "SUCCESS":
        raw = ar.result
        if isinstance(raw, dict):
            return AgentProposeJobStatus(
                task_id=task_id,
                state=st,
                result=AgentProposeResponse.model_validate(raw),
                error=None,
            )
        return AgentProposeJobStatus(task_id=task_id, state=st, result=None, error=None)
    if st == "FAILURE":
        err = str(ar.info) if ar.info is not None else "task_failed"
        return AgentProposeJobStatus(task_id=task_id, state=st, result=None, error=err)
    return AgentProposeJobStatus(task_id=task_id, state=st, result=None, error=None)


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
