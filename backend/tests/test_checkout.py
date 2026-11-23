import re
import threading
import uuid

from fastapi.testclient import TestClient

from app.main import app
from helpers import TRACKING_PATTERN, error_code, get_me, item, place_order


def test_successful_order(client, auth_headers, make_product):
    product = make_product(price="1234.50")

    response = place_order(client, auth_headers, [item(product, 2)])

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["total_price"] == 2469.0
    assert body["new_balance"] == 100000.0 - 2469.0
    assert body["status"] == "CREATED"
    assert re.fullmatch(TRACKING_PATTERN, body["tracking_number"])

    me = get_me(client, auth_headers)
    assert me["virtual_balance"] == 97531.0
    assert me["total_saved_amount"] == 2469.0


def test_repeat_with_same_idempotency_key_returns_same_order(
    client, auth_headers, make_product
):
    product = make_product(price="500.00")
    key = uuid.uuid4().hex

    first = place_order(client, auth_headers, [item(product)], idempotency_key=key)
    second = place_order(client, auth_headers, [item(product)], idempotency_key=key)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["order_id"] == first.json()["order_id"]
    assert second.json()["tracking_number"] == first.json()["tracking_number"]

    me = get_me(client, auth_headers)
    assert me["virtual_balance"] == 99500.0
    assert me["total_saved_amount"] == 500.0

    orders = client.get("/api/orders", headers=auth_headers).json()
    assert orders["total"] == 1


def test_insufficient_funds_changes_nothing(client, auth_headers, make_product):
    product = make_product(price="60000.00")

    response = place_order(client, auth_headers, [item(product, 2)])

    assert response.status_code == 400
    assert error_code(response) == "INSUFFICIENT_FUNDS"
    me = get_me(client, auth_headers)
    assert me["virtual_balance"] == 100000.0
    assert me["total_saved_amount"] == 0.0
    assert client.get("/api/orders", headers=auth_headers).json()["total"] == 0


def test_unknown_product_returns_409(client, auth_headers):
    response = place_order(
        client, auth_headers, [{"product_id": str(uuid.uuid4()), "quantity": 1}]
    )
    assert response.status_code == 409
    assert error_code(response) == "PRODUCT_UNAVAILABLE"
    assert get_me(client, auth_headers)["virtual_balance"] == 100000.0


def test_inactive_product_returns_409(client, auth_headers, make_product):
    product = make_product(price="10.00", is_active=False)

    response = place_order(client, auth_headers, [item(product)])

    assert response.status_code == 409
    assert error_code(response) == "PRODUCT_UNAVAILABLE"
    assert get_me(client, auth_headers)["virtual_balance"] == 100000.0


def test_price_is_computed_on_server(client, auth_headers, make_product):
    product = make_product(price="750.00")

    # Client-side price fields must not influence the total
    response = place_order(
        client,
        auth_headers,
        [{"product_id": str(product.id), "quantity": 2, "price": 0.01}],
        total_price=0.01,
        total=0.01,
    )

    if response.status_code == 422:
        # Rejecting unknown fields is also acceptable
        assert get_me(client, auth_headers)["virtual_balance"] == 100000.0
        return
    assert response.status_code == 201, response.text
    assert response.json()["total_price"] == 1500.0
    assert get_me(client, auth_headers)["virtual_balance"] == 98500.0


def test_concurrent_orders_allow_only_one(register_and_login, make_product):
    account = register_and_login()
    headers = account["headers"]
    # Each order takes 60 000 of the 100 000 balance: only one can succeed
    product = make_product(price="60000.00")
    barrier = threading.Barrier(2)
    results: list = [None, None]

    def buy(index: int) -> None:
        # A separate client per thread, so the requests really run in parallel
        with TestClient(app) as thread_client:
            barrier.wait()
            results[index] = place_order(thread_client, headers, [item(product)])

    threads = [threading.Thread(target=buy, args=(i,)) for i in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    statuses = sorted(r.status_code for r in results)
    assert statuses == [201, 400], [r.text for r in results]
    failed = next(r for r in results if r.status_code == 400)
    assert error_code(failed) == "INSUFFICIENT_FUNDS"

    with TestClient(app) as check_client:
        me = get_me(check_client, headers)
        assert me["virtual_balance"] == 40000.0
        assert me["virtual_balance"] >= 0
        assert check_client.get("/api/orders", headers=headers).json()["total"] == 1
