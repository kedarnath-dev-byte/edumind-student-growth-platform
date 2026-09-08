"""School-day calculations for the India release; stored timestamps remain UTC."""
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
SCHOOL_TIMEZONE = ZoneInfo('Asia/Kolkata')

def school_date(value=None):
    value = value or datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(SCHOOL_TIMEZONE).date()

def school_day_bounds():
    start = datetime.combine(school_date(), datetime.min.time(), tzinfo=SCHOOL_TIMEZONE)
    return start.astimezone(timezone.utc).replace(tzinfo=None), (start + timedelta(days=1)).astimezone(timezone.utc).replace(tzinfo=None)
