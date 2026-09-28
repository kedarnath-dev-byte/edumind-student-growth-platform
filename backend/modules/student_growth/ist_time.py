"""Asia/Kolkata (IST) calendar helpers + UTC JSON datetime serialization.

Prefer these for morning-job day bounds. Habit summaries still use UTC date
bounds unless separately migrated — keep that stable.

API response schemas should use ``UtcDateTime`` so naive UTC columns
serialize with a ``Z`` suffix (JS otherwise treats them as local time).
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated, Optional, Tuple
from zoneinfo import ZoneInfo

from pydantic import PlainSerializer

IST = ZoneInfo("Asia/Kolkata")
UTC = timezone.utc


def now_ist(reference: datetime | None = None) -> datetime:
    """Return *reference* (or now) as an aware datetime in Asia/Kolkata."""
    if reference is None:
        return datetime.now(IST)
    if reference.tzinfo is None:
        # Naive DB timestamps are treated as UTC (matching datetime.utcnow usage).
        reference = reference.replace(tzinfo=UTC)
    return reference.astimezone(IST)


def ist_calendar_date(reference: datetime | None = None) -> date:
    return now_ist(reference).date()


def format_due_at_ist(value: datetime, *, with_time: bool = False) -> str:
    """Format a due_at for WhatsApp (IST calendar)."""
    local = now_ist(value)
    if with_time:
        return local.strftime("%d %b %Y, %I:%M %p IST")
    return local.strftime("%d %b %Y")


def ist_day_bounds_utc(
    for_date: date | None = None,
) -> Tuple[datetime, datetime]:
    """
    Return [start, end) as naive UTC datetimes for an IST calendar day.

    Matches SQLAlchemy comparisons against naive UTC columns (datetime.utcnow).
    """
    day = for_date or ist_calendar_date()
    start_ist = datetime.combine(day, time.min, tzinfo=IST)
    end_ist = start_ist + timedelta(days=1)
    start_utc = start_ist.astimezone(UTC).replace(tzinfo=None)
    end_utc = end_ist.astimezone(UTC).replace(tzinfo=None)
    return start_utc, end_utc


def utc_isoformat(value: Optional[datetime]) -> Optional[str]:
    """Serialize DB naive-UTC (or aware) datetimes as ISO-8601 with Z."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)
    return value.isoformat().replace("+00:00", "Z")


UtcDateTime = Annotated[
    datetime,
    PlainSerializer(utc_isoformat, return_type=str, when_used="json"),
]


def is_future_due_ist(due_at: datetime, reference: datetime | None = None) -> bool:
    """True when due_at's IST calendar day is after reference's IST day."""
    return ist_calendar_date(due_at) > ist_calendar_date(reference)


def days_late_ist(due_at: datetime, completed_at: datetime | None = None) -> int:
    """Non-negative IST calendar days late (0 if same day or early)."""
    completed = completed_at or datetime.utcnow()
    delta = (ist_calendar_date(completed) - ist_calendar_date(due_at)).days
    return max(delta, 0)


def completed_on_due_date_ist(
    due_at: datetime, completed_at: datetime | None = None
) -> bool:
    completed = completed_at or datetime.utcnow()
    return ist_calendar_date(due_at) == ist_calendar_date(completed)

