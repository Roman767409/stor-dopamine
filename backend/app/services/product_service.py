import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.lang import DEFAULT_LANG, localized
from app.models import Product
from app.repositories import product_repository


# Public product view; texts are in the request language (lang -> en -> base)
def product_to_dict(product: Product, lang: str = DEFAULT_LANG) -> dict:
    return {
        "id": str(product.id),
        "title": localized(product.title_i18n, product.title, lang),
        "description": localized(
            product.description_i18n, product.description, lang
        ),
        "category": localized(
            product.category.name_i18n, product.category.name, lang
        ),
        "category_slug": product.category.slug,
        "price": float(product.price),
        "image_url": product.image_url,
    }


# Сторінка каталогу з фільтрами, пошуком і сортуванням
def list_catalog(
    db: Session,
    page: int,
    page_size: int,
    category: str | None,
    q: str | None,
    min_price: float | None,
    max_price: float | None,
    sort: str,
    lang: str = DEFAULT_LANG,
) -> dict:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_PRICE_RANGE",
                "message": "min_price must not exceed max_price",
            },
        )
    products, total = product_repository.search_active(
        db,
        page=page,
        page_size=page_size,
        category_slug=category,
        q=q,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        lang=lang,
    )
    return {
        "items": [product_to_dict(p, lang) for p in products],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


def get_product(
    db: Session, product_id: uuid.UUID, lang: str = DEFAULT_LANG
) -> dict:
    product = product_repository.get_active_by_id(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found"},
        )
    return product_to_dict(product, lang)
