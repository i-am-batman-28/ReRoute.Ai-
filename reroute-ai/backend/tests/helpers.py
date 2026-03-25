"""Shared test utilities (unique users per run to avoid SQLite state clashes)."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from agent.demo_trip_store import demo_snapshot_for_api


def unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


def signup_and_auth_headers(client: TestClient) -> dict[str, str]:
    email = unique_email()
    r = client.post(
        "/api/users/signup",
        json={"email": email, "password": "secret123", "full_name": "Test User"},
    )
    assert r.status_code == 201, r.text
    r = client.post("/api/users/login", json={"email": email, "password": "secret123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def create_demo_trip(client: TestClient, headers: dict[str, str], *, title: str = "Trip") -> str:
    r = client.post(
        "/api/trips",
        json={"title": title, "snapshot": demo_snapshot_for_api()},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]
