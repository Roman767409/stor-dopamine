from sqlalchemy import select

from app.models import AuditLog
from helpers import error_code, get_me, item, place_order

RESET_URL = "/api/users/me/balance/reset"


def test_reset_restores_balance_and_keeps_savings(
    client, register_and_login, make_product, db_session
):
    account = register_and_login()
    headers = account["headers"]
    product = make_product(price="2500.00")
    assert place_order(client, headers, [item(product, 2)]).status_code == 201
    assert get_me(client, headers)["virtual_balance"] == 95000.0

    response = client.post(RESET_URL, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"virtual_balance": 100000.0, "total_saved_amount": 5000.0}

    me = get_me(client, headers)
    assert me["virtual_balance"] == 100000.0
    assert me["total_saved_amount"] == 5000.0

    again = client.post(RESET_URL, headers=headers)
    assert again.status_code == 409
    assert error_code(again) == "NOTHING_TO_RESET"

    entries = list(
        db_session.scalars(
            select(AuditLog).where(
                AuditLog.action == "BALANCE_RESET",
                AuditLog.entity_id == account["user"]["id"],
            )
        )
    )
    assert len(entries) == 1
    assert entries[0].actor_email == account["email"]
    assert entries[0].details == {"old_balance": 95000.0, "new_balance": 100000.0}


def test_reset_on_untouched_balance_returns_409(client, auth_headers):
    response = client.post(RESET_URL, headers=auth_headers)
    assert response.status_code == 409
    assert error_code(response) == "NOTHING_TO_RESET"


def test_reset_requires_auth(client):
    assert client.post(RESET_URL).status_code == 401
