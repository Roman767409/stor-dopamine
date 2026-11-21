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


# --- Admin queries (no commit here; the service owns the transaction) ---


# Page of all products (active or not) with categories + total count.
# Category is joined eagerly to avoid N+1.
def search_all(
    db: Session,
    *,
    page: int,
    page_size: int,
    q: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[Product], int]:
    filters = []
    if q:
        filters.append(Product.title.ilike(f"%{_escape_like(q)}%", escape="\\"))
    if is_active is not None:
        filters.append(Product.is_active.is_(is_active))

    total = db.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    items = (
        db.scalars(
            select(Product)
            .options(joinedload(Product.category))
            .where(*filters)
            .order_by(Product.created_at.desc(), Product.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .unique()
        .all()
    )
    return list(items), total


# Any product by id (active or not) with its category.
# for_update locks the row so concurrent admin edits don't overwrite each other.
def get_by_id(
    db: Session, product_id: uuid.UUID, *, for_update: bool = False
) -> Product | None:
    query = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.id == product_id)
    )
    if for_update:
        # Lock only the products row, not the joined category
        query = query.with_for_update(of=Product)
    return db.scalar(query)


# Add a new product to the session and flush so id and timestamps are set
def create(db: Session, product: Product) -> Product:
    db.add(product)
    db.flush()
    return product
