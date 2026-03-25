"""Agent tools: call integrations; return JSON for agent state (propose/confirm).

All tools are side-effect-free (except outbound API calls).
"""

from __future__ import annotations

import logging
from typing import Any

from integrations.flight_search import search_rebooking_offers_with_duffel
from integrations.flight_status import get_flight_status_aviationstack
from integrations.weather import fetch_openmeteo_hourly

logger = logging.getLogger(__name__)


async def fetch_flight_status(
    *,
    flight_number: str,
    date: str,
    simulate_disruption: str | None = None,
) -> dict[str, Any]:
    """Normalized flight disruption classification."""
    logger.info(
        "fetch_flight_status",
        extra={"flight_number": flight_number, "date": date, "simulate": simulate_disruption},
    )
    return await get_flight_status_aviationstack(
        flight_number=flight_number,
        date=date,
        simulate_disruption=simulate_disruption,
    )


async def fetch_weather_signals(*, latitude: float, longitude: float) -> dict[str, Any]:
    """Open-Meteo hourly weather signals used for radar risk."""
    payload = await fetch_openmeteo_hourly(latitude=latitude, longitude=longitude)
    return {
        "source": "open-meteo",
        # Keep it compact; we just need the latest hour values.
        "latest": {
            "time": payload.get("hourly", {}).get("time", [])[-1:] or [],
            "precipitation_probability": payload.get("hourly", {}).get("precipitation_probability", [])[-1:] or [],
            "weather_code": payload.get("hourly", {}).get("weather_code", [])[-1:] or [],
            "wind_speed_10m": payload.get("hourly", {}).get("wind_speed_10m", [])[-1:] or [],
        },
    }


async def search_alternatives(
    *,
    trip_context: dict[str, Any],
    simulate_disruption: str | None = None,
) -> dict[str, Any]:
    """Duffel offer search for flight alternatives."""
    result = await search_rebooking_offers_with_duffel(
        trip_context=trip_context,
        simulate_disruption=simulate_disruption,
    )
    return {
        "source": "duffel",
        "orq": result,
    }


TOOL_REGISTRY = {
    "fetch_flight_status": fetch_flight_status,
    "fetch_weather_signals": fetch_weather_signals,
    "search_alternatives": search_alternatives,
}
