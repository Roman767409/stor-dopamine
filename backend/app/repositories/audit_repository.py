import uuid

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
