from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.lang import SUPPORTED_LANGS

# The products.title column is String(120); a longer title would fail in the DB
TITLE_MAX_LENGTH = 120
IMAGE_URL_MAX_LENGTH = 500

Title = Annotated[str, Field(min_length=1, max_length=TITLE_MAX_LENGTH)]
Price = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
CategoryId = Annotated[int, Field(ge=1)]
ImageUrl = Annotated[str, Field(max_length=IMAGE_URL_MAX_LENGTH)]

# Translations as sent by the admin form: {"en": "...", "pl": "...", "uk": "..."}
I18nTextIn = dict[str, str]


# Validates a translations object: only en/pl/uk keys, values trimmed, empty values
# dropped, optional length limit. Returns None when no translation is left.
def clean_i18n(value: dict[str, str] | None, max_length: int | None) -> dict[str, str] | None:
    if value is None:
        return None
    unknown = sorted(set(value) - set(SUPPORTED_LANGS))
    if unknown:
        raise ValueError(
            f"Unsupported language keys: {', '.join(unknown)} "
            f"(allowed: {', '.join(SUPPORTED_LANGS)})"
        )
    cleaned: dict[str, str] = {}
    for lang in SUPPORTED_LANGS:
        text = value.get(lang, "").strip()
        if not text:
            continue
        if max_length is not None and len(text) > max_length:
            raise ValueError(f"'{lang}' must be at most {max_length} characters")
        cleaned[lang] = text
    return cleaned or None


# Translations in admin responses: all three keys, null where there is no translation
class I18nTextOut(BaseModel):
    en: str | None = None
    pl: str | None = None
    uk: str | None = None


# Category embedded in an admin product
class AdminCategoryOut(BaseModel):
    id: int
    name: str
    slug: str


# Product as seen by an admin (active or not).
# title and description are the base (untranslated) texts; translations are separate.
class AdminProductOut(BaseModel):
    id: str
    title: str
    description: str
    title_i18n: I18nTextOut | None
    description_i18n: I18nTextOut | None
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
    title_i18n: I18nTextIn | None = None
    description_i18n: I18nTextIn | None = None
    price: Price
    category_id: CategoryId
    image_url: ImageUrl | None = None
    is_active: bool = True

    @field_validator("title_i18n", mode="after")
    @classmethod
    def check_title_i18n(cls, value):
        return clean_i18n(value, TITLE_MAX_LENGTH)

    @field_validator("description_i18n", mode="after")
    @classmethod
    def check_description_i18n(cls, value):
        return clean_i18n(value, None)


# Body of PATCH /api/admin/products/{id}; only the sent fields are changed
class AdminProductUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: Title | None = None
    description: str | None = None
    # Replaces the whole translations object; null clears it
    title_i18n: I18nTextIn | None = None
    description_i18n: I18nTextIn | None = None
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

    @field_validator("title_i18n", mode="after")
    @classmethod
    def check_title_i18n(cls, value):
        return clean_i18n(value, TITLE_MAX_LENGTH)

    @field_validator("description_i18n", mode="after")
    @classmethod
    def check_description_i18n(cls, value):
        return clean_i18n(value, None)
