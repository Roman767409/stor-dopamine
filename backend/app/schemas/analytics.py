from pydantic import BaseModel


# Spending in one category over all time
class CategorySpendingOut(BaseModel):
    category: str
    slug: str
    amount: float
    items_count: int


# Sum of order totals for one UTC day ("YYYY-MM-DD")
class DailySpendingOut(BaseModel):
    date: str
    amount: float


# Savings dashboard data for the current user
class SavingsResponse(BaseModel):
    total_saved: float
    current_balance: float
    starting_balance: float
    orders_count: int
    average_order_value: float
    # Used by the dashboard's "Largest order" card
    largest_order: float
    last_order_at: str | None
    # Used by "Compared to last week": last 7 UTC days (incl. today) and the 7 days before
    last_week_total: float
    previous_week_total: float
    by_category: list[CategorySpendingOut]
    by_day: list[DailySpendingOut]
