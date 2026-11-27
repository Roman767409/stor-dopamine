import uuid

from fastapi import APIRouter, Depends, Header, Path, Query, Request, Response
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.errors import get_request_id
from app.core.lang import get_lang
from app.database import get_db
from app.models import User
from app.schemas.orders import (
    CreateOrderRequest,
    OrderDetailResponse,
    OrderListResponse,
    TrackingResponse,
)
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["orders"])


# Checkout: 201 for a new order, 200 when the Idempotency-Key was already used
@router.post("", status_code=201)
def create_order(
    body: CreateOrderRequest,
    request: Request,
    response: Response,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=64
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result, created = order_service.place_order(
        db,
        current_user.id,
        idempotency_key,
        body,
        request_id=get_request_id(request),
    )
    response.status_code = 201 if created else 200
    return result


# Order history of the current user, newest first
@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.list_orders(db, current_user.id, page, page_size)


# Parcel tracking for the current user's order.
# Registered before "/{order_id}" so the static "track" segment is matched first.
@router.get("/track/{tracking_number}", response_model=TrackingResponse)
def track_order(
    tracking_number: str = Path(pattern=r"^DS-[A-Z0-9]{10}$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.track_order(db, current_user.id, tracking_number)


# Details of one order of the current user
@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    return order_service.get_order(db, current_user.id, order_id, lang)
