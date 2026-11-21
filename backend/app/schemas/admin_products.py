from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

# The products.title column is String(120); a longer title would fail in the DB
TITLE_MAX_LENGTH = 120
IMAGE_URL_MAX_LENGTH = 500

Title = Annotated[str, Field(min_length=1, max_length=TITLE_MAX_LENGTH)]
Price = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
CategoryId = Annotated[int, Field(ge=1)]
ImageUrl = Annotated[str, Field(max_length=IMAGE_URL_MAX_LENGTH)]


# Category embedded in an admin product
class AdminCategoryOut(BaseModel):
    id: int
    name: str
    slug: str


# Product as seen by an admin (active or not)
class AdminProductOut(BaseModel):
    id: str
    title: str
    description: str
    price: float
    image_url: str | None
    is_active: bool
    category: AdminCategoryOut
    created_at: datetime
    updated_at: datetime


# Paginated admin product list
class AdminProductListResponse(BaseModel):
    items: list[AdminProductOut]
    total: int
    page: int
    page_size: int


# Body of POST /api/admin/products
class AdminProductCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: Title
    description: str | None = None
    price: Price
    category_id: CategoryId
    image_url: ImageUrl | None = None
    is_active: bool = True


# Body of PATCH /api/admin/products/{id}; only the sent fields are changed
class AdminProductUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: Title | None = None
    description: str | None = None
    price: Price | None = None
    category_id: CategoryId | None = None
    image_url: ImageUrl | None = None
    is_active: bool | None = None

    # These columns are NOT NULL, so an explicit null is rejected
    # (description and image_url may be cleared with null)
    @field_validator("title", "price", "category_id", "is_active", mode="after")
    @classmethod
    def not_null(cls, value):
        if value is None:
            raise ValueError("Field cannot be null")
        return value
