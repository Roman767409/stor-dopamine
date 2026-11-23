from helpers import DEFAULT_PASSWORD, bearer, error_code, unique_email


def test_register_returns_201(client):
    email = unique_email()
    response = client.post(
        "/api/auth/register", json={"email": email, "password": DEFAULT_PASSWORD}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == email
    assert body["role"] == "client"
    assert body["id"]


def test_register_duplicate_email_case_insensitive_returns_409(client, register_and_login):
    account = register_and_login()
    response = client.post(
        "/api/auth/register",
        json={"email": account["email"].upper(), "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 409
    assert error_code(response) == "EMAIL_ALREADY_EXISTS"


def test_login_returns_tokens(client, register_and_login):
    account = register_and_login()
    response = client.post(
        "/api/auth/login",
        json={"email": account["email"], "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"
    assert body["role"] == "client"


def test_login_wrong_password_returns_401(client, register_and_login):
    account = register_and_login()
    response = client.post(
        "/api/auth/login", json={"email": account["email"], "password": "Wrong12345"}
    )
    assert response.status_code == 401
    assert error_code(response) == "INVALID_CREDENTIALS"


def test_refresh_rotates_tokens_and_old_refresh_is_rejected(client, register_and_login):
    account = register_and_login()
    old_refresh = account["refresh_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
    assert response.status_code == 200
    new_tokens = response.json()
    assert new_tokens["access_token"]
    assert new_tokens["refresh_token"] != old_refresh

    # The new access token works
    me = client.get("/api/auth/me", headers=bearer(new_tokens["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == account["email"]

    # The rotated refresh token can no longer be used
    reused = client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401

    # The new refresh token still works
    again = client.post(
        "/api/auth/refresh", json={"refresh_token": new_tokens["refresh_token"]}
    )
    assert again.status_code == 200


def test_logout_revokes_refresh_token(client, register_and_login):
    account = register_and_login()
    response = client.post(
        "/api/auth/logout", json={"refresh_token": account["refresh_token"]}
    )
    assert response.status_code == 204

    after = client.post(
        "/api/auth/refresh", json={"refresh_token": account["refresh_token"]}
    )
    assert after.status_code == 401


def test_me_without_token_returns_401(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_token_returns_user(client, register_and_login):
    account = register_and_login()
    response = client.get("/api/auth/me", headers=account["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == account["email"]
    assert body["virtual_balance"] == 100000.0
    assert body["total_saved_amount"] == 0.0
