import uuid

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError

from app.models import AuditLog
from helpers import item, place_order


def _order_created_entries(db_session, order_id: str) -> int:
    db_session.expire_all()
    return db_session.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(AuditLog.action == "ORDER_CREATED", AuditLog.entity_id == order_id)
    )


@pytest.fixture
def audit_entry_id(client, auth_headers, make_product, db_session) -> int:
    response = place_order(client, auth_headers, [item(make_product(price="5.00"))])
    assert response.status_code == 201
    return db_session.scalar(
        select(AuditLog.id).where(AuditLog.entity_id == response.json()["order_id"])
    )


def test_update_of_audit_log_is_rejected(db_session, audit_entry_id):
    with pytest.raises(DBAPIError, match="append-only"):
        db_session.execute(
            text("UPDATE audit_logs SET action = 'TAMPERED' WHERE id = :id"),
            {"id": audit_entry_id},
        )
    db_session.rollback()

    assert db_session.get(AuditLog, audit_entry_id).action == "ORDER_CREATED"


def test_delete_of_audit_log_is_rejected(db_session, audit_entry_id):
    with pytest.raises(DBAPIError, match="append-only"):
        db_session.execute(
            text("DELETE FROM audit_logs WHERE id = :id"), {"id": audit_entry_id}
        )
    db_session.rollback()

    assert db_session.get(AuditLog, audit_entry_id) is not None


def test_order_created_logged_once_per_idempotency_key(
    client, register_and_login, make_product, db_session
):
    account = register_and_login()
    product = make_product(price="42.00")
    key = uuid.uuid4().hex

    first = place_order(client, account["headers"], [item(product)], idempotency_key=key)
    assert first.status_code == 201
    order_id = first.json()["order_id"]

    entry = db_session.scalars(
        select(AuditLog).where(
            AuditLog.action == "ORDER_CREATED", AuditLog.entity_id == order_id
        )
    ).one()
    assert entry.actor_email == account["email"]
    assert entry.details["tracking_number"] == first.json()["tracking_number"]
    assert entry.details["total_price"] == 42.0

    repeat = place_order(client, account["headers"], [item(product)], idempotency_key=key)
    assert repeat.status_code == 200
    assert repeat.json()["order_id"] == order_id
    assert _order_created_entries(db_session, order_id) == 1
