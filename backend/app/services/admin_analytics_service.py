from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.lang import DEFAULT_LANG, localized
from app.repositories import admin_analytics_repository
from app.services import tracking_service


# Money as a JSON number rounded to cents, like the other endpoints
def _money(value) -> float:
    return float(Decimal(value or 0).quantize(Decimal("0.01")))


# UTC midnight of the given date as an aware datetime
def _utc_midnight(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=timezone.utc)


# Store-wide statistics. The period is the last `days` UTC days including today,
# so the *_in_period values match the sums of by_day.
# Product titles and category names are in the request language.
def get_analytics(db: Session, days: int, lang: str = DEFAULT_LANG) -> dict:
    now = tracking_service.utc_now()
    today = now.date()
    first_day = today - timedelta(days=days - 1)
    period_start = _utc_midnight(first_day)

    users = admin_analytics_repository.get_user_counts(db, period_start)
    summary = admin_analytics_repository.get_order_summary(db, period_start, now)
    active_products = admin_analytics_repository.count_active_products(db)
    top_products = admin_analytics_repository.get_top_products(db)
    top_categories = admin_analytics_repository.get_top_categories(db)
    daily = admin_analytics_repository.get_orders_by_day(db, period_start)

    total_spent = _money(summary.total_spent)
    return {
        "users_count": users.users_count,
        "new_users": users.new_users,
        "orders_count": summary.orders_count,
        "orders_in_period": summary.orders_in_period,
        "total_spent": total_spent,
        "total_volume": total_spent,
        "spent_in_period": _money(summary.spent_in_period),
        "average_order_value": _money(summary.average_order_value),
        "active_products_count": active_products,
        "orders_by_status": {
            status: getattr(summary, status) for status, _ in tracking_service.STATUS_STEPS
        },
        "top_products": [
            {
                "product_id": row.product_id,
                "title": localized(row.title_i18n, row.title, lang),
                "quantity": int(row.quantity),
                "sold": int(row.quantity),
                "revenue": _money(row.revenue),
            }
            for row in top_products
        ],
        "top_categories": [
            {
                "category": localized(row.category_i18n, row.category, lang),
                "slug": row.slug,
                "revenue": _money(row.revenue),
                "items_count": int(row.items_count),
            }
            for row in top_categories
        ],
        # Every day of the period, oldest first; days without orders get zeros
        "by_day": [
            {
                "date": day.isoformat(),
                "orders": daily.get(day, (0, None))[0],
                "amount": _money(daily.get(day, (0, None))[1]),
            }
            for day in (first_day + timedelta(days=i) for i in range(days))
        ],
    }
