"""Development-only endpoint for local demo seed data."""

import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import require_admin_user
from core.database import get_db
from modules.student_growth.dev_seed_service import DevSeedService

router = APIRouter(prefix="/api/v1/dev", tags=["Development Seed"])


def _is_production() -> bool:
    env = (
        os.getenv("ENVIRONMENT")
        or os.getenv("ENV")
        or os.getenv("APP_ENV")
        or os.getenv("RENDER_ENVIRONMENT")
        or ""
    ).strip().lower()
    return env in {"production", "prod"} or os.getenv("RENDER") == "true" and env != "staging"


@router.post("/seed-demo-data")
async def seed_demo_data(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    """Admin-only. Blocked in production — never public seed."""
    if _is_production():
        raise HTTPException(
            status_code=403,
            detail="Demo seed is disabled in production.",
        )
    return DevSeedService(db).seed_demo_data()
