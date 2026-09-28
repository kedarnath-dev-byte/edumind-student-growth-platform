"""Development-only endpoint for local demo seed data."""

import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.dev_seed_service import DevSeedService

router = APIRouter(prefix="/api/v1/dev", tags=["Development Seed"])


def _is_production() -> bool:
    """True when running as production (seed must be hard-disabled)."""
    env = (
        os.getenv("ENVIRONMENT")
        or os.getenv("ENV")
        or os.getenv("APP_ENV")
        or os.getenv("RENDER_ENVIRONMENT")
        or ""
    ).strip().lower()
    if env in {"production", "prod"}:
        return True
    if env in {"staging", "development", "dev", "local", "test"}:
        return False
    # Render free/web without explicit staging → treat as production.
    if (os.getenv("RENDER") or "").strip().lower() in {"true", "1"}:
        return True
    return False


def _seed_secret_ok(x_dev_seed_secret: str | None) -> bool:
    expected = (os.getenv("DEV_SEED_SECRET") or "").strip()
    if not expected or not x_dev_seed_secret:
        return False
    return hmac.compare_digest(expected, x_dev_seed_secret.strip())


@router.post("/seed-demo-data")
async def seed_demo_data(
    db: Session = Depends(get_db),
    x_dev_seed_secret: str | None = Header(default=None, alias="X-Dev-Seed-Secret"),
    authorization: str | None = Header(default=None),
):
    """
    Non-production only. Requires ADMIN JWT **or** matching X-Dev-Seed-Secret
    when DEV_SEED_SECRET is configured. Always 403 in production.
    """
    if _is_production():
        raise HTTPException(
            status_code=403,
            detail="Demo seed is disabled in production.",
        )

    # Prefer secret gate for local/CI without full JWT stack; else require admin.
    if _seed_secret_ok(x_dev_seed_secret):
        return DevSeedService(db).seed_demo_data()

    # Manual admin check (avoid Depends so secret path works without JWT).
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail=(
                "Admin JWT or X-Dev-Seed-Secret required "
                "(and seed is disabled in production)."
            ),
        )
    from core.auth import get_bearer_token, verify_supabase_jwt
    from modules.student_growth.auth_profile_service import AuthProfileService

    token = get_bearer_token(authorization)
    payload = verify_supabase_jwt(token)
    profile = AuthProfileService(db).resolve_current_user(payload)
    app_user = profile.get("app_user")
    role = (getattr(app_user, "role", None) or "").upper()
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return DevSeedService(db).seed_demo_data()
