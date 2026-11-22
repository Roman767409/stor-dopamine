from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.errors import get_request_id
from app.database import get_db
from app.models import User
from app.schemas.users import BalanceResetResponse
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


# Reset the current user's virtual balance to the starting amount (any role)
@router.post("/me/balance/reset", response_model=BalanceResetResponse)
def reset_balance(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.reset_balance(db, current_user, get_request_id(request))
