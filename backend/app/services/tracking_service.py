from datetime import datetime, timedelta, timezone

# Time since created_at after which an order reaches each status.
# The only place to tune the delivery simulation (e.g. shorten for a demo).
PROCESSING_AFTER = timedelta(seconds=30)
IN_TRANSIT_AFTER = timedelta(minutes=10)
DELIVERED_AFTER = timedelta(hours=2)

# Statuses in lifecycle order with the offset at which each one is reached
STATUS_STEPS: list[tuple[str, timedelta]] = [
    ("CREATED", timedelta(0)),
    ("PROCESSING", PROCESSING_AFTER),
    ("IN_TRANSIT", IN_TRANSIT_AFTER),
    ("DELIVERED", DELIVERED_AFTER),
]
STATUS_RANK = {status: rank for rank, (status, _) in enumerate(STATUS_STEPS)}


# Current UTC time (timezone-aware)
def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Treat naive datetimes as UTC so comparisons never mix naive and aware values
def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# Status that follows purely from the time elapsed since created_at
def compute_status(created_at: datetime, now: datetime) -> str:
    elapsed = _as_utc(now) - _as_utc(created_at)
    status = STATUS_STEPS[0][0]
    for step_status, offset in STATUS_STEPS:
        if elapsed >= offset:
            status = step_status
    return status


# Status to report: the computed one, but never earlier than the stored one
def effective_status(stored_status: str, created_at: datetime, now: datetime) -> str:
    computed = compute_status(created_at, now)
    # Unknown stored values rank lowest, so the computed status wins
    if STATUS_RANK.get(stored_status, -1) > STATUS_RANK[computed]:
        return stored_status
    return computed


# Statuses that come before the given one (used for "never go back" updates)
def statuses_before(status: str) -> list[str]:
    return [step for step, _ in STATUS_STEPS[: STATUS_RANK[status]]]


# Moment the parcel is (or was) expected to be delivered
def estimated_delivery_at(created_at: datetime) -> datetime:
    return _as_utc(created_at) + DELIVERED_AFTER


# Four lifecycle steps with the moment each one is reached.
# A step also counts as reached if the reported status is already at or past it.
def build_timeline(created_at: datetime, status: str, now: datetime) -> list[dict]:
    created = _as_utc(created_at)
    current = _as_utc(now)
    status_rank = STATUS_RANK.get(status, 0)
    return [
        {
            "status": step_status,
            "reached_at": (created + offset).isoformat(),
            "is_reached": created + offset <= current or rank <= status_rank,
        }
        for rank, (step_status, offset) in enumerate(STATUS_STEPS)
    ]
