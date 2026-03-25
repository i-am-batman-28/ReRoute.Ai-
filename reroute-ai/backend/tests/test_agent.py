from unittest.mock import MagicMock, patch

from tests.helpers import create_demo_trip, signup_and_auth_headers
from utils.jwt_utils import decode_access_token


def _user_id_from_headers(h: dict[str, str]) -> str:
    token = h["Authorization"].split(" ", 1)[1]
    return str(decode_access_token(token)["sub"])


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


def test_agent_confirm_idempotent(client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h)
    propose = client.post("/api/agent/propose", json={"trip_id": tid}, headers=h)
    assert propose.status_code == 200
    proposal_body = propose.json()
    proposal_id = proposal_body["proposal_id"]
    selected_option_id = proposal_body["ranked_options"][0]["option_id"]
    body = {"proposal_id": proposal_id, "selected_option_id": selected_option_id}
    first_confirm = client.post("/api/agent/confirm", json=body, headers=h)
    assert first_confirm.status_code == 200
    assert first_confirm.json()["applied"] is True
    r2 = client.post("/api/agent/confirm", json=body, headers=h)
    assert r2.status_code == 200
    out = r2.json()
    assert out["applied"] is True
    assert "idempotent" in out["message"].lower()
    assert out["duffel_order_id"] is not None


def test_agent_requires_auth(client):
    r = client.post("/api/agent/propose", json={"trip_id": "any"})
    assert r.status_code == 401


@patch("utils.job_redis.register_propose_job")
@patch("worker.tasks.run_agent_propose_task.apply_async")
def test_propose_async_mode_returns_202(mock_apply, mock_reg, client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h)
    ar = MagicMock()
    ar.id = "celery-task-test-id"
    mock_apply.return_value = ar
    r = client.post("/api/agent/propose", json={"trip_id": tid, "async_mode": True}, headers=h)
    assert r.status_code == 202
    body = r.json()
    assert body["task_id"] == "celery-task-test-id"
    assert "/agent/propose/jobs/celery-task-test-id" in body["poll_path"]
    mock_reg.assert_called_once_with(task_id="celery-task-test-id", user_id=_user_id_from_headers(h))


@patch("utils.job_redis.register_propose_job")
@patch("worker.tasks.run_agent_propose_task.apply_async")
def test_propose_async_route_returns_202(mock_apply, mock_reg, client):
    h = signup_and_auth_headers(client)
    tid = create_demo_trip(client, h)
    ar = MagicMock()
    ar.id = "celery-async-route-id"
    mock_apply.return_value = ar
    r = client.post("/api/agent/propose/async", json={"trip_id": tid}, headers=h)
    assert r.status_code == 202
    assert r.json()["task_id"] == "celery-async-route-id"
    mock_reg.assert_called_once()


@patch("celery.result.AsyncResult")
@patch("utils.job_redis.get_propose_job_owner")
def test_propose_job_status_success(mock_owner, mock_ar_cls, client):
    h = signup_and_auth_headers(client)
    uid = _user_id_from_headers(h)
    mock_owner.return_value = uid
    inst = MagicMock()
    inst.state = "SUCCESS"
    inst.result = {
        "proposal_id": "p1",
        "phase": "await_confirm",
        "ranked_options": [],
        "tool_trace_summary": [],
        "cascade_preview": None,
        "compensation_draft": None,
        "notification_status": None,
    }
    mock_ar_cls.return_value = inst
    r = client.get("/api/agent/propose/jobs/any-task-id", headers=h)
    assert r.status_code == 200
    out = r.json()
    assert out["state"] == "SUCCESS"
    assert out["result"]["proposal_id"] == "p1"


@patch("celery.result.AsyncResult")
@patch("utils.job_redis.get_propose_job_owner")
def test_propose_job_status_failure_generic_error(mock_owner, mock_ar_cls, client):
    h = signup_and_auth_headers(client)
    mock_owner.return_value = _user_id_from_headers(h)
    inst = MagicMock()
    inst.state = "FAILURE"
    inst.info = RuntimeError("internal duffel stack trace secret")
    mock_ar_cls.return_value = inst
    r = client.get("/api/agent/propose/jobs/t2", headers=h)
    assert r.status_code == 200
    assert r.json()["error"] == "task_failed"
    assert "secret" not in r.text


@patch("utils.job_redis.get_propose_job_owner")
def test_propose_job_status_redis_unavailable_503(mock_owner, client):
    from utils.job_redis import JobRedisUnavailableError

    h = signup_and_auth_headers(client)
    mock_owner.side_effect = JobRedisUnavailableError("redis down")
    r = client.get("/api/agent/propose/jobs/t3", headers=h)
    assert r.status_code == 503
