import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


# One audit log entry as shown in the admin logs table
class AuditLogOut(BaseModel):
    id: int
    created_at: datetime
    actor_user_id: uuid.UUID | None
    actor_email: str | None
    action: str
    entity_type: str
    entity_id: str | None
    details: dict[str, Any] | None
    request_id: str | None


# Paginated audit log list
class AuditLogListResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int


# Distinct action names for the action filter
class AuditActionsResponse(BaseModel):
    actions: list[str]
