def test_agent_propose(client):
    r = client.post("/api/agent/propose", json={"trip_id": "demo-1"})
    assert r.status_code == 200
    body = r.json()
    assert "proposal_id" in body
    assert body["phase"] == "await_confirm"


def test_agent_confirm(client):
    r = client.post(
        "/api/agent/confirm",
        json={"proposal_id": "p1", "selected_option_id": "opt1"},
    )
    assert r.status_code == 200
    assert r.json()["applied"] is True
