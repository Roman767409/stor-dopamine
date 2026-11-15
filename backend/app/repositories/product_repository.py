import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Category, Product

SORT_ORDERS = {
    "price_asc": (Product.price.asc(), Product.id.asc()),
    "price_desc": (Product.price.desc(), Product.id.asc()),
    "title_asc": (Product.title.asc(), Product.id.asc()),
    "newest": (Product.created_at.desc(), Product.id.asc()),
}


# Усі активні товари разом із категорією, відсортовані за назвою
def list_active(db: Session) -> list[Product]:
    return list(
        db.scalars(
            select(Product)
            .options(joinedload(Product.category))
            .where(Product.is_active.is_(True))
            .order_by(Product.title)
        )
        .unique()
        .all()
    )


# Екранує спецсимволи LIKE, щоб введений текст шукався буквально
def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# Сторінка активних товарів за фільтрами + загальна кількість знайдених
def search_active(
    db: Session,
    *,
    page: int,
    page_size: int,
    category_slug: str | None = None,
    q: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "title_asc",
) -> tuple[list[Product], int]:
    filters = [Product.is_active.is_(True)]
    if category_slug is not None:
        filters.append(Category.slug == category_slug)
    if q is not None:
        filters.append(Product.title.ilike(f"%{_escape_like(q)}%", escape="\\"))
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)

    items_query = select(Product).options(joinedload(Product.category))
    count_query = select(func.count()).select_from(Product)
    if category_slug is not None:
        items_query = items_query.join(Category, Product.category_id == Category.id)
        count_query = count_query.join(Category, Product.category_id == Category.id)

    total = db.scalar(count_query.where(*filters)) or 0
    items = (
        db.scalars(
            items_query.where(*filters)
            .order_by(*SORT_ORDERS[sort])
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .unique()
        .all()
    )
    return list(items), total


# Активний товар за id разом із категорією
def get_active_by_id(db: Session, product_id: uuid.UUID) -> Product | None:
    return db.scalar(
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.id == product_id, Product.is_active.is_(True))
    )
