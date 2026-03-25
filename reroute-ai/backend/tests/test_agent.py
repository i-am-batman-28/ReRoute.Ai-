from tests.helpers import create_demo_trip, signup_and_auth_headers


def test_agent_propose(client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h)
    r = client.post("/api/agent/propose", json={"trip_id": tid}, headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "proposal_id" in body
    assert body["phase"] == "await_confirm"
    assert "ranked_options" in body


def test_agent_confirm(client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h)
    propose = client.post("/api/agent/propose", json={"trip_id": tid}, headers=h)
    assert propose.status_code == 200
    proposal_body = propose.json()
    proposal_id = proposal_body["proposal_id"]
    selected_option_id = proposal_body["ranked_options"][0]["option_id"]

    r = client.post(
        "/api/agent/confirm",
        json={"proposal_id": proposal_id, "selected_option_id": selected_option_id},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["applied"] is True


def test_agent_requires_auth(client):
    r = client.post("/api/agent/propose", json={"trip_id": "any"})
    assert r.status_code == 401
