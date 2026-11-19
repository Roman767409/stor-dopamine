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
