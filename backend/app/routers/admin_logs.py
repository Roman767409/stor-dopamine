from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.models import User
from app.schemas.admin_logs import AuditActionsResponse, AuditLogListResponse
from app.services import admin_log_service

router = APIRouter(prefix="/api/admin", tags=["admin"])

require_admin = require_role("admin")


# Audit log, newest first, with optional filters (dates are UTC, date_to inclusive)
@router.get("/logs", response_model=AuditLogListResponse)
def list_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: str | None = Query(None, max_length=64),
    entity_type: str | None = Query(None, max_length=64),
    actor: str | None = Query(None, max_length=254),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return admin_log_service.list_logs(
        db,
        page=page,
        page_size=page_size,
        action=action,
        entity_type=entity_type,
        actor=actor,
        date_from=date_from,
        date_to=date_to,
    )


# Distinct action names for the frontend filter
@router.get("/logs/actions", response_model=AuditActionsResponse)
def list_actions(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return admin_log_service.list_actions(db)
