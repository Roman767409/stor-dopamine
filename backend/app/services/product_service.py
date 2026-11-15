import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Product
from app.repositories import product_repository


def product_to_dict(product: Product) -> dict:
    return {
        "id": str(product.id),
        "title": product.title,
        "description": product.description,
        "category": product.category.name,
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
    )
    return {
        "items": [product_to_dict(p) for p in products],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


def get_product(db: Session, product_id: uuid.UUID) -> dict:
    product = product_repository.get_active_by_id(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found"},
        )
    return product_to_dict(product)
