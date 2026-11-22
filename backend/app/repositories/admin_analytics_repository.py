from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.engine import Row
from sqlalchemy.orm import Session

from app.models import Category, Order, OrderItem, Product, User
from app.services.tracking_service import STATUS_STEPS

# NOTE: read-only store-wide aggregates for the admin dashboard; no db.commit() here.

CLIENT_ROLE = "client"
TOP_PRODUCTS_LIMIT = 5


# Calendar day of created_at in UTC (independent of the DB session time zone)
def _utc_day():
    return cast(func.timezone("UTC", Order.created_at), Date)


# SQL CASE with the order status as shown to users (tracking_service.effective_status):
# the status reached by the time elapsed since created_at, but never earlier than the
# stored one. Thresholds are computed in Python, so SQL only compares timestamps.
def _status_case(now: datetime):
    whens = []
    # Latest step first: the first matching branch wins
    for rank in range(len(STATUS_STEPS) - 1, 0, -1):
        status, offset = STATUS_STEPS[rank]
        later_or_same = [step for step, _ in STATUS_STEPS[rank:]]
        whens.append(
            (
                (Order.created_at <= now - offset) | Order.status.in_(later_or_same),
                status,
            )
        )
    return case(*whens, else_=STATUS_STEPS[0][0])


# Client count and clients registered since period_start
def get_user_counts(db: Session, period_start: datetime) -> Row:
    return db.execute(
        select(
            func.count(User.id).label("users_count"),
            func.count(User.id)
            .filter(User.created_at >= period_start)
            .label("new_users"),
        ).where(User.role == CLIENT_ROLE)
    ).one()


# Order totals over all time and since period_start, plus counts per status, in one pass
def get_order_summary(db: Session, period_start: datetime, now: datetime) -> Row:
    status = _status_case(now)
    per_status = [
        func.count(Order.id).filter(status == step).label(step)
        for step, _ in STATUS_STEPS
    ]
    return db.execute(
        select(
            func.count(Order.id).label("orders_count"),
            func.count(Order.id)
            .filter(Order.created_at >= period_start)
            .label("orders_in_period"),
            func.coalesce(func.sum(Order.total_price), 0).label("total_spent"),
            func.coalesce(
                func.sum(Order.total_price).filter(Order.created_at >= period_start),
                0,
            ).label("spent_in_period"),
            func.coalesce(func.avg(Order.total_price), 0).label("average_order_value"),
            *per_status,
        )
    ).one()


def count_active_products(db: Session) -> int:
    return (
        db.scalar(
            select(func.count()).select_from(Product).where(Product.is_active.is_(True))
        )
        or 0
    )


# Best-selling products by units sold (all time)
def get_top_products(db: Session, limit: int = TOP_PRODUCTS_LIMIT) -> list[Row]:
    quantity = func.sum(OrderItem.quantity)
    revenue = func.sum(OrderItem.quantity * OrderItem.price_at_purchase)
    return list(
        db.execute(
            select(
                Product.id.label("product_id"),
                Product.title.label("title"),
                quantity.label("quantity"),
                revenue.label("revenue"),
            )
            .select_from(OrderItem)
            .join(Product, Product.id == OrderItem.product_id)
            .group_by(Product.id, Product.title)
            .order_by(quantity.desc(), revenue.desc(), Product.title)
            .limit(limit)
        ).all()
    )


# Revenue and units sold per category (all time), largest revenue first
def get_top_categories(db: Session) -> list[Row]:
    revenue = func.sum(OrderItem.quantity * OrderItem.price_at_purchase)
    return list(
        db.execute(
            select(
                Category.name.label("category"),
                Category.slug.label("slug"),
                revenue.label("revenue"),
                func.sum(OrderItem.quantity).label("items_count"),
            )
            .select_from(OrderItem)
            .join(Product, Product.id == OrderItem.product_id)
            .join(Category, Category.id == Product.category_id)
            .group_by(Category.id, Category.name, Category.slug)
            .order_by(revenue.desc(), Category.name)
        ).all()
    )


# Order count and amount per UTC day from period_start on (days without orders are absent)
def get_orders_by_day(
    db: Session, period_start: datetime
) -> dict[date, tuple[int, Decimal]]:
    day = _utc_day()
    rows = db.execute(
        select(
            day.label("day"),
            func.count(Order.id).label("orders"),
            func.sum(Order.total_price).label("amount"),
        )
        .where(Order.created_at >= period_start)
        .group_by(day)
    ).all()
    return {row.day: (row.orders, row.amount) for row in rows}

