import uuid
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.lang import DEFAULT_LANG, SUPPORTED_LANGS, localized
from app.models import Product, User
from app.repositories import category_repository, product_repository
from app.schemas.admin_products import AdminProductCreate, AdminProductUpdate
from app.services import audit_service

ENTITY_TYPE = "product"

# Editable fields, in a stable order for audit details
EDITABLE_FIELDS = (
    "title",
    "description",
    "title_i18n",
    "description_i18n",
    "price",
    "category_id",
    "image_url",
    "is_active",
)


def _product_not_found() -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found"},
    )


def _ensure_category_exists(db: Session, category_id: int) -> None:
    if category_repository.get_by_id(db, category_id) is None:
        raise HTTPException(
            status_code=400,
            detail={"code": "CATEGORY_NOT_FOUND", "message": "Category not found"},
        )


# Makes a value JSON-safe for the JSONB details column (Decimal -> number)
def _audit_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    return value


# Translations for the admin form: every supported key, None where missing
def _i18n_out(value: dict | None) -> dict | None:
    if not value:
        return None
    return {lang: value.get(lang) for lang in SUPPORTED_LANGS}


# Admin view: base title/description (what the edit form changes) plus translations;
# the category name is shown in the request language
def product_to_admin_dict(product: Product, lang: str = DEFAULT_LANG) -> dict:
    return {
        "id": str(product.id),
        "title": product.title,
        "description": product.description,
        "title_i18n": _i18n_out(product.title_i18n),
        "description_i18n": _i18n_out(product.description_i18n),
        "price": float(product.price),
        "image_url": product.image_url,
        "is_active": product.is_active,
        "category": {
            "id": product.category.id,
            "name": localized(
                product.category.name_i18n, product.category.name, lang
            ),
            "slug": product.category.slug,
        },
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }


# Commits the transaction and reloads server-side values (timestamps, category)
def _commit_and_reload(db: Session, product: Product) -> Product:
    db.commit()
    db.refresh(product)
    return product


# All products (incl. inactive) for the admin panel
def list_products(
    db: Session,
    page: int,
    page_size: int,
    q: str | None,
    is_active: bool | None,
    lang: str = DEFAULT_LANG,
) -> dict:
    q = q.strip() if q else None
    products, total = product_repository.search_all(
        db, page=page, page_size=page_size, q=q or None, is_active=is_active
    )
    return {
        "items": [product_to_admin_dict(p, lang) for p in products],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# Creates a product and its audit entry in one transaction
def create_product(
    db: Session,
    data: AdminProductCreate,
    actor: User,
    request_id: str | None,
    lang: str = DEFAULT_LANG,
) -> dict:
    _ensure_category_exists(db, data.category_id)

    product = product_repository.create(
        db,
        Product(
            title=data.title,
            description=data.description or "",
            title_i18n=data.title_i18n,
            description_i18n=data.description_i18n,
            price=data.price,
            category_id=data.category_id,
            image_url=data.image_url,
            is_active=data.is_active,
        ),
    )
    audit_service.record(
        db,
        actor=actor,
        action="PRODUCT_CREATED",
        entity_type=ENTITY_TYPE,
        entity_id=product.id,
        details={
            field: _audit_value(getattr(product, field)) for field in EDITABLE_FIELDS
        },
        request_id=request_id,
    )
    return product_to_admin_dict(_commit_and_reload(db, product), lang)


# Partially updates a product; audits only the fields that really changed
def update_product(
    db: Session,
    product_id: uuid.UUID,
    data: AdminProductUpdate,
    actor: User,
    request_id: str | None,
    lang: str = DEFAULT_LANG,
) -> dict:
    product = product_repository.get_by_id(db, product_id, for_update=True)
    if product is None:
        raise _product_not_found()

    incoming = data.model_dump(exclude_unset=True)
    # description is NOT NULL in the DB: null means "clear it"
    if "description" in incoming and incoming["description"] is None:
        incoming["description"] = ""

    if (
        "category_id" in incoming
        and incoming["category_id"] != product.category_id
    ):
        _ensure_category_exists(db, incoming["category_id"])

    changes: dict[str, dict[str, Any]] = {}
    for field in EDITABLE_FIELDS:
        if field not in incoming:
            continue
        old_value = getattr(product, field)
        new_value = incoming[field]
        if old_value != new_value:
            changes[field] = {
                "old": _audit_value(old_value),
                "new": _audit_value(new_value),
            }
            setattr(product, field, new_value)

    if not changes:
        # Nothing to save: return the current state and release the row lock
        result = product_to_admin_dict(product, lang)
        db.rollback()
        return result

    # updated_at is bumped by the column's onupdate=now() on flush
    audit_service.record(
        db,
        actor=actor,
        action="PRODUCT_UPDATED",
        entity_type=ENTITY_TYPE,
        entity_id=product.id,
        details={"changes": changes},
        request_id=request_id,
    )
    return product_to_admin_dict(_commit_and_reload(db, product), lang)


# Soft delete: deactivates the product (order_items keep a RESTRICT FK to it).
# Idempotent: an already inactive product is left untouched and not audited.
def deactivate_product(
    db: Session,
    product_id: uuid.UUID,
    actor: User,
    request_id: str | None,
) -> None:
    product = product_repository.get_by_id(db, product_id, for_update=True)
    if product is None:
        raise _product_not_found()

    if not product.is_active:
        db.rollback()
        return

    product.is_active = False
    audit_service.record(
        db,
        actor=actor,
        action="PRODUCT_DELETED",
        entity_type=ENTITY_TYPE,
        entity_id=product.id,
        details={"deactivated": True, "title": product.title},
        request_id=request_id,
    )
    db.commit()
