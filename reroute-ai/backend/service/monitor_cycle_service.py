"""Periodic monitor: flight + weather checks per trip; disruption events on change."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from agent.tools import fetch_flight_status, fetch_weather_signals
from config import get_settings
from dao.disruption_event_dao import DisruptionEventDAO
from dao.trip_dao import TripDAO

logger = logging.getLogger(__name__)


def _weather_codes_latest(weather: dict[str, Any]) -> str:
    latest = weather.get("latest") or {}
    if isinstance(latest, dict):
        codes = latest.get("weather_code")
        if isinstance(codes, list):
            return json.dumps(codes[-3:], separators=(",", ":"))
    return ""


def _scan_signature(flight_status: dict[str, Any], weather: dict[str, Any]) -> str:
    return "|".join(
        [
            str(flight_status.get("status") or ""),
            str(flight_status.get("delay_minutes")),
            str(flight_status.get("source") or ""),
            _weather_codes_latest(weather),
        ]
    )


def _naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


async def run_monitor_cycle(*, session: AsyncSession) -> dict[str, int]:
    """
    Scan trips with primary_flight in snapshot; throttle per trip; record monitor_scan;
    emit monitor_alert when observation signature changes vs previous scan.
    """
    s = get_settings()
    min_gap = timedelta(minutes=max(1, s.monitor_min_trip_interval_minutes))
    batch = max(1, min(s.monitor_batch_size, 200))
    cap = max(1, min(s.monitor_max_trips_per_cycle, 2000))

    trip_dao = TripDAO(session)
    ev_dao = DisruptionEventDAO(session)

    scanned = 0
    skipped_throttle = 0
    skipped_no_flight = 0
    alerts = 0
    errors = 0
    offset = 0
    processed = 0

    while processed < cap:
        trips = await trip_dao.list_all(offset=offset, limit=batch)
        if not trips:
            break
        offset += len(trips)

        trip_ids = [t.id for t in trips]
        latest_scans = await ev_dao.latest_by_kind_for_trip_ids(trip_ids=trip_ids, kind="monitor_scan")

        for trip in trips:
            if processed >= cap:
                break
            processed += 1

            snap = trip.snapshot if isinstance(trip.snapshot, dict) else {}
            legs = snap.get("legs") if isinstance(snap.get("legs"), dict) else {}
            pf = legs.get("primary_flight")
            if not isinstance(pf, dict) or not pf.get("flight_number") or not pf.get("date"):
                skipped_no_flight += 1
                continue

            last_scan = latest_scans.get(trip.id)
            if last_scan and last_scan.created_at:
                age = datetime.now(UTC) - _naive_utc(last_scan.created_at)
                if age < min_gap:
                    skipped_throttle += 1
                    continue

            try:
                flight_status = await fetch_flight_status(
                    flight_number=str(pf["flight_number"]),
                    date=str(pf["date"]),
                    simulate_disruption=None,
                )
            except Exception:
                logger.exception("monitor_cycle_flight_status", extra={"trip_id": trip.id})
                errors += 1
                continue

            wx = legs.get("weather") if isinstance(legs.get("weather"), dict) else {}
            dest_lat, dest_lon = wx.get("destination_lat"), wx.get("destination_lon")
            weather: dict[str, Any]
            if dest_lat is not None and dest_lon is not None:
                try:
                    weather = await fetch_weather_signals(
                        latitude=float(dest_lat), longitude=float(dest_lon)
                    )
                except Exception:
                    weather = {"source": "error", "latest": {}}
            else:
                weather = {"source": "skipped_missing_coords", "latest": {}}

            signature = _scan_signature(flight_status, weather)
            prev_sig: str | None = None
            if last_scan and isinstance(last_scan.payload, dict):
                prev_sig = last_scan.payload.get("signature")

            disruption_type = str(flight_status.get("status") or "unknown")

            await ev_dao.create(
                trip_id=trip.id,
                user_id=trip.user_id,
                kind="monitor_scan",
                disruption_type=disruption_type,
                proposal_id=None,
                payload={
                    "signature": signature,
                    "flight_status": flight_status,
                    "weather": weather,
                    "source": "monitor_cycle",
                },
            )
            scanned += 1

            if prev_sig is not None and prev_sig != signature:
                await ev_dao.create(
                    trip_id=trip.id,
                    user_id=trip.user_id,
                    kind="monitor_alert",
                    disruption_type=disruption_type,
                    proposal_id=None,
                    payload={
                        "previous_signature": prev_sig,
                        "current_signature": signature,
                        "flight_status": flight_status,
                        "weather": weather,
                        "source": "monitor_cycle",
                    },
                )
                alerts += 1

        await session.commit()

    logger.info(
        "monitor_cycle_done",
        extra={
            "scanned": scanned,
            "alerts": alerts,
            "skipped_throttle": skipped_throttle,
            "skipped_no_flight": skipped_no_flight,
            "errors": errors,
            "processed": processed,
        },
    )
    return {
        "scanned": scanned,
        "alerts": alerts,
        "skipped_throttle": skipped_throttle,
        "skipped_no_flight": skipped_no_flight,
        "errors": errors,
        "processed": processed,
    }
