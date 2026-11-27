import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.lang import DEFAULT_LANG, SUPPORTED_LANGS, localized_sql
from app.models import Category, Product


# ORDER BY clauses for the catalog; title_asc sorts by the title in the request language
def _sort_order(sort: str, lang: str) -> tuple:
    if sort == "price_asc":
        return (Product.price.asc(), Product.id.asc())
    if sort == "price_desc":
        return (Product.price.desc(), Product.id.asc())
    if sort == "newest":
        return (Product.created_at.desc(), Product.id.asc())
    # title_asc (default)
    return (
        localized_sql(Product.title_i18n, Product.title, lang).asc(),
        Product.id.asc(),
    )


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


# Case-insensitive substring match on the base title and on every translation,
# so "headphones", "słuchawki" and "навушники" find the same product
def _title_matches(q: str):
    pattern = f"%{_escape_like(q)}%"
    return or_(
        Product.title.ilike(pattern, escape="\\"),
        *(
            Product.title_i18n[lang].astext.ilike(pattern, escape="\\")
            for lang in SUPPORTED_LANGS
        ),
    )


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
    lang: str = DEFAULT_LANG,
) -> tuple[list[Product], int]:
    filters = [Product.is_active.is_(True)]
    if category_slug is not None:
        filters.append(Category.slug == category_slug)
    if q is not None:
        filters.append(_title_matches(q))
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
            .order_by(*_sort_order(sort, lang))
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
        filters.append(_title_matches(q))
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
