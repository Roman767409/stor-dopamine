import uuid

from pydantic import BaseModel


# Order counts per lifecycle status; all four keys are always present
class OrdersByStatusOut(BaseModel):
    CREATED: int
    PROCESSING: int
    IN_TRANSIT: int
    DELIVERED: int


# One best-selling product (all time)
class TopProductOut(BaseModel):
    product_id: uuid.UUID
    title: str
    quantity: int
    # Same as quantity; the field name used by the admin analytics page
    sold: int
    revenue: float


# Revenue and units sold in one category (all time)
class TopCategoryOut(BaseModel):
    category: str
    slug: str
    revenue: float
    items_count: int


# Orders placed on one UTC day ("YYYY-MM-DD")
class DailyOrdersOut(BaseModel):
    date: str
    orders: int
    amount: float


# Store-wide statistics for the admin analytics page
class AdminAnalyticsResponse(BaseModel):
    users_count: int
    new_users: int
    orders_count: int
    orders_in_period: int
    total_spent: float
    # Same as total_spent; the field name used by the admin analytics page
    total_volume: float
    spent_in_period: float
    average_order_value: float
    active_products_count: int
    orders_by_status: OrdersByStatusOut
    top_products: list[TopProductOut]
    top_categories: list[TopCategoryOut]
    by_day: list[DailyOrdersOut]
