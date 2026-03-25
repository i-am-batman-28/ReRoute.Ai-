"""Flight search client — Duffel-based offer requests (test-mode compatible)."""

from __future__ import annotations

from typing import Any

from integrations.duffel_client import search_flight_offers_with_polling


def _build_duffel_offer_request_data(*, slices: list[dict[str, Any]], passengers: list[dict[str, Any]], cabin_class: str) -> dict:
    return {
        "slices": slices,
        "passengers": passengers,
        "cabin_class": cabin_class,
    }


async def search_rebooking_offers_with_duffel(
    *,
    trip_context: dict[str, Any],
    simulate_disruption: str | None = None,
) -> dict[str, Any]:
    """
    Uses Duffel offer_requests and returns the ORQ results JSON including:
      - data.offers (list)
      - data.passengers (list with Duffel passenger IDs)
    """
    primary = trip_context["legs"]["primary_flight"]
    cabin_class = trip_context.get("preferences", {}).get("cabin_class", "economy")

    # Duffel slices accept origin/destination IATA or city codes and departure_date.
    slices = [
        {
            "origin": primary["origin"],
            "destination": primary["destination"],
            "departure_date": primary["date"],
        }
    ]

    # Duffel passengers: type + age (for minors). For demo, we only use adults.
    passengers = [{"type": "adult"} for _ in trip_context.get("passengers", [])]

    offer_request_data = _build_duffel_offer_request_data(
        slices=slices,
        passengers=passengers,
        cabin_class=cabin_class,
    )
    # NOTE: simulate_disruption is unused for search; it influences ranking.
    return await search_flight_offers_with_polling(offer_request_data=offer_request_data)

