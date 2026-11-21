import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog

# NOTE: no db.commit() here — the entry is committed together with the business change.


# Add an audit entry to the current transaction (flush only, so id and created_at are set)
def create_entry(
    db: Session,
    *,
    actor_user_id: uuid.UUID | None,
    actor_email: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: dict | None = None,
    request_id: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        request_id=request_id,
    )
    db.add(entry)
    db.flush()
    return entry


# Escapes LIKE wildcards so the search text is matched literally
def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\%").replace("_", "\_")


# Page of audit entries matching the filters (newest first) + total count.
# created_to is exclusive.
def search_entries(
    db: Session,
    *,
    page: int,
    page_size: int,
    action: str | None = None,
    entity_type: str | None = None,
    actor: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> tuple[list[AuditLog], int]:
    filters = []
    if action is not None:
        filters.append(AuditLog.action == action)
    if entity_type is not None:
        filters.append(AuditLog.entity_type == entity_type)
    if actor:
        filters.append(
            AuditLog.actor_email.ilike(f"%{_escape_like(actor)}%", escape="\\")
        )
    if created_from is not None:
        filters.append(AuditLog.created_at >= created_from)
    if created_to is not None:
        filters.append(AuditLog.created_at < created_to)

    total = db.scalar(select(func.count()).select_from(AuditLog).where(*filters)) or 0
    items = db.scalars(
        select(AuditLog)
        .where(*filters)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(items), total


# Distinct action names, sorted alphabetically
def list_distinct_actions(db: Session) -> list[str]:
    return list(
        db.scalars(select(AuditLog.action).distinct().order_by(AuditLog.action)).all()
    )
