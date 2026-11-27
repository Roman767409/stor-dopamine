import uuid

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.auth import require_role
from app.core.errors import get_request_id
from app.core.lang import get_lang
from app.database import get_db
from app.models import User
from app.schemas.admin_products import (
    AdminProductCreate,
    AdminProductListResponse,
    AdminProductOut,
    AdminProductUpdate,
)
from app.services import admin_product_service

router = APIRouter(prefix="/api/admin", tags=["admin"])

require_admin = require_role("admin")


# All products (incl. inactive) with optional title search and status filter
@router.get("/products", response_model=AdminProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
    lang: str = Depends(get_lang),
):
    return admin_product_service.list_products(
        db, page, page_size, q, is_active, lang
    )


@router.post("/products", status_code=201, response_model=AdminProductOut)
def create_product(
    body: AdminProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    lang: str = Depends(get_lang),
):
    return admin_product_service.create_product(
        db, body, admin, get_request_id(request), lang
    )


@router.patch("/products/{product_id}", response_model=AdminProductOut)
def update_product(
    product_id: uuid.UUID,
    body: AdminProductUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    lang: str = Depends(get_lang),
):
    return admin_product_service.update_product(
        db, product_id, body, admin, get_request_id(request), lang
    )


# Soft delete: the product is deactivated, never removed from the DB
@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    admin_product_service.deactivate_product(
        db, product_id, admin, get_request_id(request)
    )
    return Response(status_code=204)
