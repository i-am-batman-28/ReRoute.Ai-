from tests.helpers import create_demo_trip, signup_and_auth_headers


def test_disruption_events_after_propose(client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h)
    pr = client.post("/api/agent/propose", json={"trip_id": tid}, headers=h)
    assert pr.status_code == 200

    ev = client.get(f"/api/disruptions/trips/{tid}/events", headers=h)
    assert ev.status_code == 200
    rows = ev.json()
    assert len(rows) >= 1
    assert rows[0]["kind"] == "agent_propose"
    assert rows[0]["trip_id"] == tid
