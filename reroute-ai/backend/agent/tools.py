"""Agent tools: call integrations; return JSON for LangGraph state — no DB mutations here."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def fetch_flight_status_stub(flight_number: str, flight_date: str) -> dict[str, Any]:
    """Placeholder: wire to integrations.flight_status (AviationStack / mock)."""
    logger.info("fetch_flight_status_stub", extra={"flight_number": flight_number})
    return {
        "flight_number": flight_number,
        "date": flight_date,
        "status": "unknown",
        "source": "stub",
    }


async def fetch_weather_stub(airport_iata: str) -> dict[str, Any]:
    """Placeholder: wire to integrations.weather (Open-Meteo / mock)."""
    return {"airport": airport_iata, "conditions": "unknown", "source": "stub"}


async def search_alternatives_stub(trip_id: str) -> dict[str, Any]:
    """Placeholder: wire to integrations.flight_search (Amadeus sandbox / mock)."""
    return {"trip_id": trip_id, "offers": [], "source": "stub"}


TOOL_REGISTRY = {
    "fetch_flight_status": fetch_flight_status_stub,
    "fetch_weather": fetch_weather_stub,
    "search_alternatives": search_alternatives_stub,
}
