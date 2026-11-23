import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.services.tracking_service import compute_status
from helpers import error_code, item, place_order


@pytest.fixture
def placed_order(client, register_and_login, make_product):
    account = register_and_login()
    product = make_product(price="200.00")
    response = place_order(client, account["headers"], [item(product, 3)])
    assert response.status_code == 201, response.text
    return account, response.json(), product


def _shift_created_at(db_session, order_id: str, seconds_ago: int) -> None:
    db_session.execute(
        text(
            "UPDATE orders SET created_at = now() - make_interval(secs => :secs) "
            "WHERE id = :id"
        ),
        {"secs": seconds_ago, "id": order_id},
    )
    db_session.commit()


# --- Order list and details ---


def test_list_contains_only_own_orders(client, placed_order, register_and_login):
    owner, order, _ = placed_order
    stranger = register_and_login()

    own = client.get("/api/orders", headers=owner["headers"]).json()
    assert own["total"] == 1
    assert own["items"][0]["order_id"] == order["order_id"]
    assert own["items"][0]["items_count"] == 3

    other = client.get("/api/orders", headers=stranger["headers"]).json()
    assert other["total"] == 0
    assert other["items"] == []


def test_order_details_for_owner(client, placed_order):
    owner, order, product = placed_order
    response = client.get(f"/api/orders/{order['order_id']}", headers=owner["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["tracking_number"] == order["tracking_number"]
    assert body["total_price"] == 600.0
    assert body["items"] == [
        {
            "product_id": str(product.id),
            "title": product.title,
            "quantity": 3,
            "price_at_purchase": 200.0,
            "line_total": 600.0,
        }
    ]


def test_foreign_order_returns_404(client, placed_order, register_and_login):
    _, order, _ = placed_order
    stranger = register_and_login()
    response = client.get(
        f"/api/orders/{order['order_id']}", headers=stranger["headers"]
    )
    assert response.status_code == 404
    assert error_code(response) == "ORDER_NOT_FOUND"


def test_missing_order_returns_404(client, auth_headers):
    response = client.get(f"/api/orders/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code == 404
    assert error_code(response) == "ORDER_NOT_FOUND"


# --- compute_status unit tests ---

BASE = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    ("elapsed_seconds", "expected"),
    [
        (0, "CREATED"),
        (29, "CREATED"),
        (30, "PROCESSING"),
        (599, "PROCESSING"),
        (600, "IN_TRANSIT"),
        (7199, "IN_TRANSIT"),
        (7200, "DELIVERED"),
        (100_000, "DELIVERED"),
    ],
)
def test_compute_status_boundaries(elapsed_seconds, expected):
    assert compute_status(BASE, BASE + timedelta(seconds=elapsed_seconds)) == expected


def test_compute_status_treats_naive_datetimes_as_utc():
    naive = BASE.replace(tzinfo=None)
    assert compute_status(naive, BASE + timedelta(seconds=30)) == "PROCESSING"


# --- Tracking endpoint ---


def _track(client, headers, tracking_number):
    return client.get(f"/api/orders/track/{tracking_number}", headers=headers)


def test_tracking_follows_created_at_and_never_goes_back(
    client, placed_order, db_session
):
    owner, order, _ = placed_order
    tracking_number = order["tracking_number"]
    headers = owner["headers"]

    fresh = _track(client, headers, tracking_number)
    assert fresh.status_code == 200
    assert fresh.json()["status"] == "CREATED"

    for seconds_ago, expected in [
        (45, "PROCESSING"),
        (700, "IN_TRANSIT"),
        (7300, "DELIVERED"),
    ]:
        _shift_created_at(db_session, order["order_id"], seconds_ago)
        response = _track(client, headers, tracking_number)
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == expected
        reached = [step["status"] for step in body["timeline"] if step["is_reached"]]
        assert reached[-1] == expected

    # The reached status is persisted
    stored = db_session.execute(
        text("SELECT status FROM orders WHERE id = :id"), {"id": order["order_id"]}
    ).scalar_one()
    assert stored == "DELIVERED"

    # Moving created_at back to "now" must not roll the status back
    _shift_created_at(db_session, order["order_id"], 0)
    after = _track(client, headers, tracking_number)
    assert after.json()["status"] == "DELIVERED"
    details = client.get(f"/api/orders/{order['order_id']}", headers=headers)
    assert details.json()["status"] == "DELIVERED"


def test_foreign_tracking_number_returns_404(client, placed_order, register_and_login):
    _, order, _ = placed_order
    stranger = register_and_login()
    response = _track(client, stranger["headers"], order["tracking_number"])
    assert response.status_code == 404
    assert error_code(response) == "TRACKING_NOT_FOUND"


def test_unknown_tracking_number_returns_404(client, auth_headers):
    response = _track(client, auth_headers, "DS-ZZZZZZZZZZ")
    assert response.status_code == 404
    assert error_code(response) == "TRACKING_NOT_FOUND"
