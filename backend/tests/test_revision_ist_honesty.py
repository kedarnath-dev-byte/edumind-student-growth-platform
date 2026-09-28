"""Revision due honesty uses Asia/Kolkata calendar days (north-star)."""

from datetime import datetime, timedelta

from modules.student_growth.ist_time import (
    completed_on_due_date_ist,
    days_late_ist,
    is_future_due_ist,
    ist_calendar_date,
)


def test_same_utc_midnight_split_can_differ_in_ist():
    # 2026-09-27 20:00 UTC = 2026-09-28 01:30 IST
    due = datetime(2026, 9, 27, 20, 0, 0)
    completed = datetime(2026, 9, 27, 22, 0, 0)
    assert due.date() == completed.date()  # same UTC day
    assert ist_calendar_date(due) == ist_calendar_date(completed)
    assert completed_on_due_date_ist(due, completed) is True


def test_utc_same_day_but_ist_next_day_is_not_on_time_for_earlier_due():
    # due 2026-09-27 18:00 UTC = 2026-09-27 23:30 IST
    # completed 2026-09-27 20:00 UTC = 2026-09-28 01:30 IST
    due = datetime(2026, 9, 27, 18, 0, 0)
    completed = datetime(2026, 9, 27, 20, 0, 0)
    assert due.date() == completed.date()
    assert ist_calendar_date(due) != ist_calendar_date(completed)
    assert completed_on_due_date_ist(due, completed) is False
    assert days_late_ist(due, completed) == 1


def test_future_lock_uses_ist_calendar():
    due = datetime.utcnow() + timedelta(days=3)
    assert is_future_due_ist(due) is True
