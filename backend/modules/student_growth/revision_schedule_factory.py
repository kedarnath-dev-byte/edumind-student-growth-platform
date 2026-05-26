"""Factory for creating spaced revision schedules."""

from datetime import datetime, timedelta
from typing import List, Tuple

try:
    from dateutil.relativedelta import relativedelta
except ImportError:  # pragma: no cover - fallback for minimal environments
    relativedelta = None


class RevisionScheduleFactory:
    """Creates the fixed MVP spaced revision schedule."""

    STAGES = ("24H", "7D", "1M", "3M", "6M")

    @classmethod
    def create_schedule(cls, created_at: datetime) -> List[Tuple[str, datetime]]:
        return [
            ("24H", created_at + timedelta(days=1)),
            ("7D", created_at + timedelta(days=7)),
            ("1M", cls._add_months(created_at, 1)),
            ("3M", cls._add_months(created_at, 3)),
            ("6M", cls._add_months(created_at, 6)),
        ]

    @staticmethod
    def _add_months(value: datetime, months: int) -> datetime:
        if relativedelta is not None:
            return value + relativedelta(months=months)
        return value + timedelta(days=30 * months)
