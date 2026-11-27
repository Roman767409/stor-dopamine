import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.lang import get_lang
from app.database import get_db
from app.services import product_service

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    category: str | None = Query(None),
    q: str | None = Query(None, max_length=100),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    sort: Literal["price_asc", "price_desc", "title_asc", "newest"] = Query(
        "title_asc"
    ),
    db: Session = Depends(get_db),
    lang: str = Depends(get_lang),
):
    return product_service.list_catalog(
        db, page, page_size, category, q, min_price, max_price, sort, lang
    )


@router.get("/{product_id}")
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    lang: str = Depends(get_lang),
):
    return product_service.get_product(db, product_id, lang)
