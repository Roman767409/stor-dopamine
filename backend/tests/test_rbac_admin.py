from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models import AuditLog, Category
from app.schemas.admin_analytics import AdminAnalyticsResponse
from helpers import error_code

ADMIN_GET_ENDPOINTS = [
    "/api/admin/products",
    "/api/admin/logs",
    "/api/admin/logs/actions",
    "/api/admin/analytics",
]


@pytest.mark.parametrize("path", ADMIN_GET_ENDPOINTS)
def test_admin_endpoint_without_token_returns_401(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", ADMIN_GET_ENDPOINTS)
def test_admin_endpoint_with_client_returns_403(client, auth_headers, path):
    response = client.get(path, headers=auth_headers)
    assert response.status_code == 403
    assert error_code(response) == "FORBIDDEN"


@pytest.mark.parametrize("path", ADMIN_GET_ENDPOINTS)
def test_admin_endpoint_with_admin_returns_200(client, admin_user, path):
    assert client.get(path, headers=admin_user["headers"]).status_code == 200


def test_client_cannot_create_product(client, auth_headers, db_session):
    category = db_session.scalars(select(Category).limit(1)).one()
    response = client.post(
        "/api/admin/products",
        json={"title": "Nope", "price": "10.00", "category_id": category.id},
        headers=auth_headers,
    )
    assert response.status_code == 403


def _audit_entries(db_session, product_id: str) -> list[AuditLog]:
    db_session.expire_all()
    return list(
        db_session.scalars(
            select(AuditLog)
            .where(AuditLog.entity_type == "product", AuditLog.entity_id == product_id)
            .order_by(AuditLog.id)
        )
    )


def test_product_lifecycle_is_audited_and_hidden_after_delete(
    client, admin_user, db_session
):
    headers = admin_user["headers"]
    category = db_session.scalars(select(Category).where(Category.slug == "home")).one()

    created = client.post(
        "/api/admin/products",
        json={
            "title": "Admin Lamp",
            "description": "Created by admin test",
            "price": "1500.00",
            "category_id": category.id,
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]
    assert client.get(f"/api/products/{product_id}").status_code == 200

    updated = client.patch(
        f"/api/admin/products/{product_id}", json={"price": "1750.00"}, headers=headers
    )
    assert updated.status_code == 200
    assert updated.json()["price"] == 1750.0

    deleted = client.delete(f"/api/admin/products/{product_id}", headers=headers)
    assert deleted.status_code == 204

    entries = _audit_entries(db_session, product_id)
    assert [e.action for e in entries] == [
        "PRODUCT_CREATED",
        "PRODUCT_UPDATED",
        "PRODUCT_DELETED",
    ]
    assert all(e.actor_email == admin_user["email"] for e in entries)
    assert all(str(e.actor_user_id) == admin_user["user"]["id"] for e in entries)
    assert entries[1].details["changes"]["price"] == {"old": 1500.0, "new": 1750.0}

    # The deactivated product disappears from the public catalog
    assert client.get(f"/api/products/{product_id}").status_code == 404
    catalog = client.get("/api/products", params={"q": "Admin Lamp", "page_size": 50})
    assert product_id not in {p["id"] for p in catalog.json()["items"]}

    # ...but admins still see it as inactive
    admin_list = client.get(
        "/api/admin/products", params={"is_active": "false", "page_size": 100},
        headers=headers,
    ).json()
    assert product_id in {p["id"] for p in admin_list["items"]}


def test_logs_filters(client, admin_user, db_session):
    headers = admin_user["headers"]
    category = db_session.scalars(select(Category).limit(1)).one()
    created = client.post(
        "/api/admin/products",
        json={"title": "Filter Probe", "price": "99.00", "category_id": category.id},
        headers=headers,
    )
    assert created.status_code == 201

    today = datetime.now(timezone.utc).date()
    response = client.get(
        "/api/admin/logs",
        params={
            "action": "PRODUCT_CREATED",
            "entity_type": "product",
            "actor": admin_user["email"].upper(),
            "date_from": today.isoformat(),
            "date_to": today.isoformat(),
        },
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    entry = body["items"][0]
    assert entry["action"] == "PRODUCT_CREATED"
    assert entry["actor_email"] == admin_user["email"]
    assert entry["entity_id"] == created.json()["id"]

    # Other action for the same actor: nothing
    none_found = client.get(
        "/api/admin/logs",
        params={"action": "PRODUCT_DELETED", "actor": admin_user["email"]},
        headers=headers,
    ).json()
    assert none_found["total"] == 0

    # Date range entirely in the past: nothing
    past = today - timedelta(days=10)
    old = client.get(
        "/api/admin/logs",
        params={
            "actor": admin_user["email"],
            "date_from": past.isoformat(),
            "date_to": past.isoformat(),
        },
        headers=headers,
    ).json()
    assert old["total"] == 0

    actions = client.get("/api/admin/logs/actions", headers=headers).json()["actions"]
    assert "PRODUCT_CREATED" in actions


def test_logs_invalid_date_range_returns_422(client, admin_user):
    response = client.get(
        "/api/admin/logs",
        params={"date_from": "2026-02-10", "date_to": "2026-02-01"},
        headers=admin_user["headers"],
    )
    assert response.status_code == 422
    assert error_code(response) == "INVALID_DATE_RANGE"


def test_analytics_returns_all_keys(client, admin_user):
    response = client.get(
        "/api/admin/analytics", params={"days": 7}, headers=admin_user["headers"]
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == set(AdminAnalyticsResponse.model_fields)
    assert set(body["orders_by_status"]) == {
        "CREATED",
        "PROCESSING",
        "IN_TRANSIT",
        "DELIVERED",
    }
    assert len(body["by_day"]) == 7
    assert body["active_products_count"] >= 1
    assert body["users_count"] >= 1
