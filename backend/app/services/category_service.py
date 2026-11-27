from sqlalchemy.orm import Session

from app.core.lang import DEFAULT_LANG, localized
from app.repositories import category_repository


# Category list for the catalog filter; names are in the request language
def list_categories(db: Session, lang: str = DEFAULT_LANG) -> list[dict]:
    return [
        {
            "id": row.id,
            "name": localized(row.name_i18n, row.name, lang),
            "slug": row.slug,
            "products_count": row.products_count,
        }
        for row in category_repository.list_with_active_counts(db, lang)
    ]
