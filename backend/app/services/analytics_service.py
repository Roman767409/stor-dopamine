from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.constants import STARTING_BALANCE
from app.models import User
from app.repositories import analytics_repository

# Money as a JSON number rounded to cents, like the other endpoints
def _money(value) -> float:
    return float(Decimal(value or 0).quantize(Decimal("0.01")))


# UTC midnight of the given date as an aware datetime
def _utc_midnight(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=timezone.utc)


# Savings dashboard data for the user; `days` is the by_day window ending today (UTC)
def get_savings(db: Session, user: User, days: int) -> dict:
    today = datetime.now(timezone.utc).date()
    window_first_day = today - timedelta(days=days - 1)
    # "Last 7 days" = today and the 6 days before it; the previous week is the 7 days before that
    week_start = _utc_midnight(today - timedelta(days=6))
    prev_week_start = _utc_midnight(today - timedelta(days=13))

    summary = analytics_repository.get_order_summary(
        db, user.id, week_start, prev_week_start
    )
    categories = analytics_repository.get_spending_by_category(db, user.id)
    daily = analytics_repository.get_spending_by_day(
        db, user.id, _utc_midnight(window_first_day)
    )

    return {
        "total_saved": _money(user.total_saved_amount),
        "current_balance": _money(user.virtual_balance),
        "starting_balance": int(STARTING_BALANCE),
        "orders_count": summary.orders_count,
        "average_order_value": _money(summary.average_order_value),
        "largest_order": _money(summary.largest_order),
        "last_order_at": (
            summary.last_order_at.isoformat() if summary.last_order_at else None
        ),
        "last_week_total": _money(summary.last_week_total),
        "previous_week_total": _money(summary.previous_week_total),
        "by_category": [
            {
                "category": row.category,
                "slug": row.slug,
                "amount": _money(row.amount),
                "items_count": int(row.items_count),
            }
            for row in categories
        ],
        # Every day of the window, oldest first; days without orders get 0
        "by_day": [
            {"date": day.isoformat(), "amount": _money(daily.get(day))}
            for day in (window_first_day + timedelta(days=i) for i in range(days))
        ],
    }
