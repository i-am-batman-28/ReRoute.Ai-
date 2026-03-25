"""Trip CRUD (DB-backed snapshot)."""

from agent.demo_trip_store import demo_snapshot_for_api
from tests.helpers import create_demo_trip, signup_and_auth_headers


def test_trip_crud_flow(client):
    h = signup_and_auth_headers(client)
    snap = demo_snapshot_for_api()
    create = client.post("/api/trips", json={"title": "Hackathon", "snapshot": snap}, headers=h)
    assert create.status_code == 201
    trip_id = create.json()["id"]
    assert create.json()["snapshot"]["trip_id"] == trip_id

    listed = client.get("/api/trips", headers=h)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    one = client.get(f"/api/trips/{trip_id}", headers=h)
    assert one.status_code == 200
    assert one.json()["title"] == "Hackathon"

    detail = client.get(f"/api/trips/{trip_id}/detail", headers=h)
    assert detail.status_code == 200
    dbody = detail.json()
    assert dbody["trip"]["id"] == trip_id
    assert len(dbody["legs"]) == 1
    assert len(dbody["segments"]) == 4

    patched = client.patch(
        f"/api/trips/{trip_id}",
        json={"title": "Updated"},
        headers=h,
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Updated"

    deleted = client.delete(f"/api/trips/{trip_id}", headers=h)
    assert deleted.status_code == 204

    missing = client.get(f"/api/trips/{trip_id}", headers=h)
    assert missing.status_code == 404


def test_trip_demo_snapshot_derivatives(client):
    """Legs/segments rows match snapshot sync (via /detail)."""
    h = signup_and_auth_headers(client)
    trip_id = create_demo_trip(client, h, title="Deriv")
    detail = client.get(f"/api/trips/{trip_id}/detail", headers=h)
    assert detail.status_code == 200
    body = detail.json()
    assert len(body["legs"]) == 1
    assert len(body["segments"]) == 4
