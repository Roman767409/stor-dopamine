from sqlalchemy import and_, func, select
from sqlalchemy.engine import Row
from sqlalchemy.orm import Session

from app.models import Category, Product

# NOTE: read-only queries; no db.commit() here.


# All categories sorted by name with the number of active products in each.
# LEFT JOIN keeps categories without active products (count 0).
def list_with_active_counts(db: Session) -> list[Row]:
    return list(
        db.execute(
            select(
                Category.id,
                Category.name,
                Category.slug,
                func.count(Product.id).label("products_count"),
            )
            .outerjoin(
                Product,
                and_(Product.category_id == Category.id, Product.is_active.is_(True)),
            )
            .group_by(Category.id, Category.name, Category.slug)
            .order_by(Category.name, Category.id)
        ).all()
    )


# Category by id, or None
def get_by_id(db: Session, category_id: int) -> Category | None:
    return db.get(Category, category_id)
