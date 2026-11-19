from fastapi import APIRouter, Depends, Header, Response
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.orders import CreateOrderRequest
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["orders"])


# Checkout: 201 for a new order, 200 when the Idempotency-Key was already used
@router.post("", status_code=201)
def create_order(
    body: CreateOrderRequest,
    response: Response,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=64
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result, created = order_service.place_order(
        db, current_user.id, idempotency_key, body
    )
    response.status_code = 201 if created else 200
    return result
