"""Asia/Kolkata (IST) calendar helpers for revision WhatsApp digests.

Prefer these for morning-job day bounds. Habit summaries still use UTC date
bounds unless separately migrated — keep that stable.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Tuple
from zoneinfo import ZoneInfo

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
