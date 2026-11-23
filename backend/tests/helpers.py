"""Small helpers shared by the test modules (no fixtures here)."""

import uuid

DEFAULT_PASSWORD = "Secret123"

TRACKING_PATTERN = r"^DS-[A-Z0-9]{10}$"

SHIPPING_ADDRESS = {
    "full_name": "Test User",
    "line1": "1 Test Street",
    "city": "Kyiv",
    "postal_code": "01001",
    "country": "Ukraine",
}


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex}@example.com"


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def error_code(response) -> str:
    return response.json()["error"]["code"]


def place_order(client, headers, items, idempotency_key=None, **extra_body):
    body = {"items": items, "shipping_address": SHIPPING_ADDRESS, **extra_body}
    return client.post(
        "/api/orders",
        json=body,
        headers={**headers, "Idempotency-Key": idempotency_key or uuid.uuid4().hex},
    )


def item(product, quantity: int = 1) -> dict:
    return {"product_id": str(product.id), "quantity": quantity}


def get_me(client, headers) -> dict:
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()
