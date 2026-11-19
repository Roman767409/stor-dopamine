import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Single cart line in a checkout request
class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=99)


# Delivery address; all strings are stripped of surrounding whitespace
class ShippingAddress(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=100)
    line1: str = Field(min_length=3, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(min_length=2, max_length=20)
    country: str = Field(min_length=2, max_length=100)


# Checkout request body: cart items plus shipping address
class CreateOrderRequest(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)
    shipping_address: ShippingAddress

    # Each product may appear only once in the items list
    @field_validator("items")
    @classmethod
    def items_have_unique_products(cls, value: list[OrderItemIn]) -> list[OrderItemIn]:
        product_ids = [item.product_id for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Duplicate products in items")
        return value
