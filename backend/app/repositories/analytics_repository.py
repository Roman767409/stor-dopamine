import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, cast, func, select
from sqlalchemy.engine import Row
from sqlalchemy.orm import Session

from app.models import Category, Order, OrderItem, Product

# NOTE: read-only aggregates; no db.commit() here.


# Calendar day of created_at in UTC (independent of the DB session time zone)
def _utc_day():
    return cast(func.timezone("UTC", Order.created_at), Date)


# All per-order totals in one pass: count, average, max, last date and two week sums.
# Week bounds are UTC midnights: previous week [prev_week_start, week_start), last week [week_start, ...).
def get_order_summary(
    db: Session, user_id: uuid.UUID, week_start: datetime, prev_week_start: datetime
) -> Row:
    return db.execute(
        select(
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.avg(Order.total_price), 0).label("average_order_value"),
            func.coalesce(func.max(Order.total_price), 0).label("largest_order"),
            func.max(Order.created_at).label("last_order_at"),
            func.coalesce(
                func.sum(Order.total_price).filter(Order.created_at >= week_start), 0
            ).label("last_week_total"),
            func.coalesce(
                func.sum(Order.total_price).filter(
                    Order.created_at >= prev_week_start, Order.created_at < week_start
                ),
                0,
            ).label("previous_week_total"),
        ).where(Order.user_id == user_id)
    ).one()


# Spending per category over all time, largest first
def get_spending_by_category(db: Session, user_id: uuid.UUID) -> list[Row]:
    amount = func.sum(OrderItem.quantity * OrderItem.price_at_purchase)
    return list(
        db.execute(
            select(
                Category.name.label("category"),
                Category.name_i18n.label("category_i18n"),
                Category.slug.label("slug"),
                amount.label("amount"),
                func.sum(OrderItem.quantity).label("items_count"),
            )
            .select_from(OrderItem)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Product, Product.id == OrderItem.product_id)
            .join(Category, Category.id == Product.category_id)
            .where(Order.user_id == user_id)
            # Grouping by the primary key covers the other category columns
            .group_by(Category.id)
            .order_by(amount.desc(), Category.name)
        ).all()
    )


# Order totals per UTC day from window_start on (days without orders are absent)
def get_spending_by_day(
    db: Session, user_id: uuid.UUID, window_start: datetime
) -> dict[date, Decimal]:
    day = _utc_day()
    rows = db.execute(
        select(day.label("day"), func.sum(Order.total_price).label("amount"))
        .where(Order.user_id == user_id, Order.created_at >= window_start)
        .group_by(day)
    ).all()
    return {row.day: row.amount for row in rows}
