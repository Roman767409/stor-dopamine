import uuid
from decimal import Decimal

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Order, OrderItem, Product, User

# NOTE: no db.commit() here — the transaction is controlled by the service layer.


# Load the user and lock its row until the transaction ends
def get_user_for_update(db: Session, user_id: uuid.UUID) -> User:
    # Row lock protects from concurrent checkouts
    return db.scalars(
        select(User)
        .where(User.id == user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one()


# Find an existing order by the (user_id, idempotency_key) pair
def get_by_idempotency_key(db: Session, user_id: uuid.UUID, key: str) -> Order | None:
    return db.scalars(
        select(Order).where(Order.user_id == user_id, Order.idempotency_key == key)
    ).one_or_none()


# All products with the given ids, regardless of is_active
def get_products_by_ids(db: Session, product_ids: list[uuid.UUID]) -> list[Product]:
    return list(db.scalars(select(Product).where(Product.id.in_(product_ids))).all())


# Check whether a tracking number is already taken
def tracking_number_exists(db: Session, tracking_number: str) -> bool:
    return bool(
        db.scalar(select(exists().where(Order.tracking_number == tracking_number)))
    )


# Insert an order and its items (flush only, no commit); status uses the DB default
def create_order(
    db: Session,
    *,
    user_id: uuid.UUID,
    idempotency_key: str,
    tracking_number: str,
    total_price: Decimal,
    shipping_address: dict,
    items: list[tuple[uuid.UUID, int, Decimal]],
) -> Order:
    order = Order(
        user_id=user_id,
        idempotency_key=idempotency_key,
        tracking_number=tracking_number,
        total_price=total_price,
        shipping_address=shipping_address,
    )
    db.add(order)
    db.flush()

    for product_id, quantity, price in items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product_id,
                quantity=quantity,
                price_at_purchase=price,
            )
        )
    db.flush()

    return order


# Number of orders that belong to the user
def count_user_orders(db: Session, user_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count()).select_from(Order).where(Order.user_id == user_id)
    ) or 0


# One page of the user's orders (newest first) with the summed item quantity.
# items_count comes from a single aggregate subquery, so there is no N+1.
def list_user_orders(
    db: Session, user_id: uuid.UUID, offset: int, limit: int
) -> list[tuple[Order, int]]:
    items_count = (
        select(
            OrderItem.order_id,
            func.sum(OrderItem.quantity).label("items_count"),
        )
        .group_by(OrderItem.order_id)
        .subquery()
    )
    rows = db.execute(
        select(Order, func.coalesce(items_count.c.items_count, 0))
        .outerjoin(items_count, items_count.c.order_id == Order.id)
        .where(Order.user_id == user_id)
        # id as a tie-breaker keeps pagination stable for equal timestamps
        .order_by(Order.created_at.desc(), Order.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [(order, int(count)) for order, count in rows]


# The user's order with items and their products loaded eagerly (no N+1).
# Returns None both for a missing order and for someone else's order.
def get_user_order_with_items(
    db: Session, user_id: uuid.UUID, order_id: uuid.UUID
) -> Order | None:
    return db.scalars(
        select(Order)
        .where(Order.id == order_id, Order.user_id == user_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
    ).one_or_none()
