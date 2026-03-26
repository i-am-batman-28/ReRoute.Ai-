def test_signup_login_me(client):
    r = client.post(
        "/api/users/signup",
        json={
            "email": "alice@example.com",
            "password": "password12",
            "full_name": "Alice",
        },
    )
    assert r.status_code == 201
    assert r.json()["email"] == "alice@example.com"

    r = client.post(
        "/api/users/login",
        json={"email": "alice@example.com", "password": "password12"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "expires_in" in body and "refresh_expires_in" in body
    token = body["access_token"]

    r = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


def test_signup_duplicate(client):
    client.post(
        "/api/users/signup",
        json={"email": "bob@example.com", "password": "password12"},
    )
    r = client.post(
        "/api/users/signup",
        json={"email": "bob@example.com", "password": "password12"},
    )
    assert r.status_code == 409
