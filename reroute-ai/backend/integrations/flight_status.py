"""Flight status client (AviationStack) with demo fallbacks."""

from __future__ import annotations

import httpx

from config import get_settings
from integrations.http_timeout import integration_timeout

AVIATIONSTACK_URL = "https://api.aviationstack.com/v1/flights"


def _simulate(simulate_disruption: str | None) -> dict:
    """
    Returns a normalized classification.
    simulate_disruption examples: delay|cancel|divert
    """
    if simulate_disruption == "cancel":
        return {
            "status": "cancelled",
            "delay_minutes": 0,
            "source": "simulation",
        }
    if simulate_disruption == "divert":
        return {
            "status": "diverted",
            "delay_minutes": 60,
            "source": "simulation",
        }
    # Default: delay
    if simulate_disruption in (None, "delay"):
        return {
            "status": "delayed",
            "delay_minutes": 180,
            "source": "simulation",
        }
    return {"status": "unknown", "delay_minutes": None, "source": "simulation"}


async def get_flight_status_aviationstack(
    *,
    flight_number: str,
    date: str,
    simulate_disruption: str | None = None,
) -> dict:
    """
    Normalized output:
      - status: delayed|cancelled|diverted|unknown
      - delay_minutes: number or None
      - source: aviationstack|simulation|error
    """
    if simulate_disruption:
        return _simulate(simulate_disruption)

    settings = get_settings()
    if not settings.AVIATION_STACK_API_KEY:
        return {"status": "unknown", "delay_minutes": None, "source": "missing_api_key"}

    params = {
        "access_key": settings.AVIATION_STACK_API_KEY,
        "flight_number": flight_number,
        "date": date,
    }

    try:
        async with httpx.AsyncClient(timeout=integration_timeout()) as client:
            r = await client.get(AVIATIONSTACK_URL, params=params)
            r.raise_for_status()
            payload = r.json()
    except Exception:
        return {"status": "unknown", "delay_minutes": None, "source": "error"}

    # Aviationstack responses contain `data` list under v1.
    data = payload.get("data") or []
    if not data:
        return {"status": "unknown", "delay_minutes": None, "source": "aviationstack_no_data"}

    # Heuristic: try common fields used for status.
    item = data[0]
    status_text = (
        str(item.get("flight_status") or item.get("status") or "").lower().strip()
    )
    # delay_minutes is not guaranteed; delay can be derived if actual/estimated times exist.
    delay_minutes = item.get("delay") or item.get("delay_minutes")

    if "cancel" in status_text:
        return {"status": "cancelled", "delay_minutes": 0, "source": "aviationstack"}
    if "divert" in status_text:
        return {"status": "diverted", "delay_minutes": delay_minutes, "source": "aviationstack"}
    if delay_minutes is not None:
        return {"status": "delayed", "delay_minutes": int(delay_minutes), "source": "aviationstack"}

    return {"status": "unknown", "delay_minutes": None, "source": "aviationstack"}

