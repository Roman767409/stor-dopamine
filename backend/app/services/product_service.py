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


def list_catalog(db: Session) -> list[dict]:
    return [product_to_dict(p) for p in product_repository.list_active(db)]
