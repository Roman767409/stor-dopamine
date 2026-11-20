from sqlalchemy.orm import Session

from app.repositories import category_repository


# Category list for the catalog filter
def list_categories(db: Session) -> list[dict]:
    return [
        {
            "id": row.id,
            "name": row.name,
            "slug": row.slug,
            "products_count": row.products_count,
        }
        for row in category_repository.list_with_active_counts(db)
    ]
