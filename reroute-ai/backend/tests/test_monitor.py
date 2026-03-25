from tests.helpers import create_demo_trip, signup_and_auth_headers


def test_monitor_status(client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h, title="T1")
    st = client.get("/api/monitor/status", headers=h)
    assert st.status_code == 200
    body = st.json()
    assert body["trip_count"] == 1
    assert body["trips_shown"] == 1
    assert body["trips"][0]["trip_id"] == tid
    assert body["trips"][0]["pending_proposal_count"] == 0

    client.post("/api/agent/propose", json={"trip_id": tid}, headers=h)
    st2 = client.get("/api/monitor/status", headers=h)
    assert st2.json()["total_pending_proposals"] >= 1


def test_monitor_tick(client):
    h = signup_and_auth_headers(client)
    create_demo_trip(client, h)
    r = client.post("/api/monitor/tick", headers=h)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert "status" in r.json()
