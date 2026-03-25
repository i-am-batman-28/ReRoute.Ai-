import asyncio
from unittest.mock import MagicMock, patch

from integrations.maps_routes import fetch_directions_summary


def test_maps_routes_disabled_without_key():
    with patch("integrations.maps_routes.get_settings", return_value=MagicMock(OPENROUTESERVICE_API_KEY=None)):
        out = asyncio.run(
            fetch_directions_summary(
                origin_lon=-74.0,
                origin_lat=40.7,
                dest_lon=-84.4,
                dest_lat=33.7,
            )
        )
    assert out["source"] == "openrouteservice_disabled"
    assert out["distance_m"] is None
