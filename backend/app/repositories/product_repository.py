from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Product


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
