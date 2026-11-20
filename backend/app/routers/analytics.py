from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.analytics import SavingsResponse
from app.services import analytics_service

# Prefix /api/analytics is set where the router is included (app/main.py)
router = APIRouter(tags=["analytics"])


# Savings dashboard for the current user; `days` sets the by_day window
@router.get("/savings", response_model=SavingsResponse)
def get_savings(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_savings(db, current_user, days)
