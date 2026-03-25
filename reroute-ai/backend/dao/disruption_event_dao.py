"""Data access: disruption / agent audit events."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dao.base_dao import BaseDAO
from model.disruption_event_model import DisruptionEvent


class DisruptionEventDAO(BaseDAO):
    def __init__(self, session: AsyncSession):
        super().__init__(DisruptionEvent, session)

    async def create(
        self,
        *,
        trip_id: str,
        user_id: str,
        kind: str,
        disruption_type: str | None,
        proposal_id: str | None,
        payload: dict,
        event_id: str | None = None,
    ) -> DisruptionEvent:
        row = DisruptionEvent(
            id=event_id or str(uuid.uuid4()),
            trip_id=trip_id,
            user_id=user_id,
            kind=kind,
            disruption_type=disruption_type,
            proposal_id=proposal_id,
            payload=payload,
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def list_for_trip_user(
        self,
        *,
        trip_id: str,
        user_id: str,
        limit: int = 100,
    ) -> list[DisruptionEvent]:
        result = await self.session.execute(
            select(DisruptionEvent)
            .where(DisruptionEvent.trip_id == trip_id, DisruptionEvent.user_id == user_id)
            .order_by(DisruptionEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def latest_for_trip_user(self, *, trip_id: str, user_id: str) -> DisruptionEvent | None:
        result = await self.session.execute(
            select(DisruptionEvent)
            .where(DisruptionEvent.trip_id == trip_id, DisruptionEvent.user_id == user_id)
            .order_by(DisruptionEvent.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
