import secrets
import string
import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Order, User
from app.repositories import order_repository
from app.schemas.orders import CreateOrderRequest
from app.services import audit_service, tracking_service

TRACKING_PREFIX = "DS-"
TRACKING_LENGTH = 10
TRACKING_ALPHABET = string.ascii_uppercase + string.digits
TRACKING_MAX_ATTEMPTS = 5


# Build the API response for an order, with the user's current balance from the DB
def order_result(db: Session, order: Order) -> dict:
    user = db.get(User, order.user_id)
    return {
        "order_id": str(order.id),
        "tracking_number": order.tracking_number,
        "status": order.status,
        "total_price": float(order.total_price),
        "new_balance": float(user.virtual_balance),
        "created_at": order.created_at.isoformat(),
    }


# Generate a random tracking number like DS-AB12CD34EF
def _random_tracking_number() -> str:
    return TRACKING_PREFIX + "".join(
        secrets.choice(TRACKING_ALPHABET) for _ in range(TRACKING_LENGTH)
    )


# Generate a tracking number that is not used yet (up to 5 attempts)
def _generate_tracking_number(db: Session) -> str:
    for _ in range(TRACKING_MAX_ATTEMPTS):
        tracking_number = _random_tracking_number()
        if not order_repository.tracking_number_exists(db, tracking_number):
            return tracking_number
    raise HTTPException(
        status_code=500,
        detail={
            "code": "TRACKING_GENERATION_FAILED",
            "message": "Could not generate tracking number",
        },
    )


# Checkout in a single ACID transaction; returns (result, created)
def place_order(
    db: Session,
    user_id: uuid.UUID,
    idempotency_key: str,
    request: CreateOrderRequest,
) -> tuple[dict, bool]:
    # Idempotency: fast path for an already processed request
    existing = order_repository.get_by_idempotency_key(db, user_id, idempotency_key)
    if existing is not None:
        return order_result(db, existing), False

    try:
        # Lock: row lock on the user serializes concurrent checkouts
        user = order_repository.get_user_for_update(db, user_id)

        # Re-check idempotency under the lock (race protection)
        existing = order_repository.get_by_idempotency_key(db, user_id, idempotency_key)
        if existing is not None:
            db.rollback()
            return order_result(db, existing), False

        # Load products; all must exist and be active
        product_ids = [item.product_id for item in request.items]
        products = {
            p.id: p for p in order_repository.get_products_by_ids(db, product_ids)
        }
        for product_id in product_ids:
            product = products.get(product_id)
            if product is None or not product.is_active:
                db.rollback()
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "PRODUCT_UNAVAILABLE",
                        "message": "One or more products are unavailable",
                    },
                )

        # Recompute total: prices come only from the database
        order_items = [
            (item.product_id, item.quantity, products[item.product_id].price)
            for item in request.items
        ]
        total = sum(
            (price * quantity for _, quantity, price in order_items), Decimal("0")
        ).quantize(Decimal("0.01"))

        # Balance check
        if user.virtual_balance < total:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INSUFFICIENT_FUNDS",
                    "message": "Not enough DP to complete the order",
                },
            )

        tracking_number = _generate_tracking_number(db)

        # Atomic write: order, items and balance change in one transaction
        order = order_repository.create_order(
            db,
            user_id=user_id,
            idempotency_key=idempotency_key,
            tracking_number=tracking_number,
            total_price=total,
            shipping_address=request.shipping_address.model_dump(),
            items=order_items,
        )
        user.virtual_balance -= total
        user.total_saved_amount += total

        # Audit entry in the same transaction: saved only together with the order
        audit_service.record(
            db,
            actor=user,
            action="ORDER_CREATED",
            entity_type="order",
            entity_id=order.id,
            details={
                "tracking_number": tracking_number,
                "total_price": float(total),
                "items_count": sum(quantity for _, quantity, _ in order_items),
            },
        )

        db.commit()
        db.refresh(order)
        db.refresh(user)
        return order_result(db, order), True

    except IntegrityError:
        # Concurrent duplicate on unique (user_id, idempotency_key)
        db.rollback()
        existing = order_repository.get_by_idempotency_key(db, user_id, idempotency_key)
        if existing is not None:
            return order_result(db, existing), False
        raise
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


# Paginated history of the current user's orders, newest first
def list_orders(db: Session, user_id: uuid.UUID, page: int, page_size: int) -> dict:
    total = order_repository.count_user_orders(db, user_id)
    rows = order_repository.list_user_orders(
        db, user_id, offset=(page - 1) * page_size, limit=page_size
    )
    # Status is computed for display only; the list never writes to the DB
    now = tracking_service.utc_now()
    return {
        "items": [
            {
                "order_id": str(order.id),
                "tracking_number": order.tracking_number,
                "status": tracking_service.effective_status(
                    order.status, order.created_at, now
                ),
                "total_price": float(order.total_price),
                "created_at": order.created_at.isoformat(),
                "items_count": items_count,
            }
            for order, items_count in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# Details of one order; 404 for missing and foreign orders alike
def get_order(db: Session, user_id: uuid.UUID, order_id: uuid.UUID) -> dict:
    order = order_repository.get_user_order_with_items(db, user_id, order_id)
    if order is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "ORDER_NOT_FOUND", "message": "Order not found"},
        )

    status = tracking_service.effective_status(
        order.status, order.created_at, tracking_service.utc_now()
    )

    # Sort lines by title so the response order is deterministic
    lines = sorted(order.items, key=lambda item: item.product.title)
    result = {
        "order_id": str(order.id),
        "tracking_number": order.tracking_number,
        "status": status,
        "total_price": float(order.total_price),
        "created_at": order.created_at.isoformat(),
        "shipping_address": order.shipping_address,
        "items": [
            {
                "product_id": str(item.product_id),
                "title": item.product.title,
                "quantity": item.quantity,
                "price_at_purchase": float(item.price_at_purchase),
                "line_total": float(
                    (item.price_at_purchase * item.quantity).quantize(Decimal("0.01"))
                ),
            }
            for item in lines
        ],
    }
    # Commit after the response is built: commit expires the loaded objects
    _commit_if_changed(db, order, status)
    return result


# Lazily persist the status if it moved forward; the only write on the read paths
def _commit_if_changed(db: Session, order: Order, status: str) -> None:
    if status == order.status:
        return
    try:
        order_repository.advance_status(
            db, order.id, status, tracking_service.statuses_before(status)
        )
        db.commit()
    except Exception:
        db.rollback()
        raise


# Tracking info for the user's parcel; 404 for missing and foreign parcels alike
def track_order(db: Session, user_id: uuid.UUID, tracking_number: str) -> dict:
    order = order_repository.get_user_order_by_tracking(db, user_id, tracking_number)
    if order is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "TRACKING_NOT_FOUND", "message": "Parcel not found"},
        )

    now = tracking_service.utc_now()
    status = tracking_service.effective_status(order.status, order.created_at, now)
    result = {
        "tracking_number": order.tracking_number,
        "order_id": str(order.id),
        "status": status,
        "created_at": order.created_at.isoformat(),
        "estimated_delivery_at": tracking_service.estimated_delivery_at(
            order.created_at
        ).isoformat(),
        "timeline": tracking_service.build_timeline(order.created_at, status, now),
    }
    _commit_if_changed(db, order, status)
    return result
