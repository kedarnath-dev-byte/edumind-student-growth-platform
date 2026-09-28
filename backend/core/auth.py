import os
import time
from typing import Any

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from core.database import get_db

load_dotenv()

JWKS_CACHE_TTL_SECONDS = 60 * 60
_jwks_cache: dict[str, Any] = {"jwks": None, "expires_at": 0}


def get_bearer_token(authorization_header: str | None) -> str:
    if not authorization_header:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    scheme, _, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Missing authorization token")

    return token.strip()


def get_supabase_url() -> str:
    return (os.getenv("SUPABASE_URL") or "").rstrip("/")


def build_supabase_jwks_url(supabase_url: str | None = None) -> str:
    base_url = (supabase_url or get_supabase_url()).rstrip("/")
    if not base_url:
        raise HTTPException(status_code=500, detail="Supabase URL is not configured")
    return f"{base_url}/auth/v1/.well-known/jwks.json"


def fetch_supabase_jwks() -> dict[str, Any]:
    now = time.time()
    if _jwks_cache["jwks"] and _jwks_cache["expires_at"] > now:
        return _jwks_cache["jwks"]

    jwks_url = build_supabase_jwks_url()
    try:
        response = httpx.get(jwks_url, timeout=10)
        response.raise_for_status()
        jwks = response.json()
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authorization token",
        ) from exc

    _jwks_cache["jwks"] = jwks
    _jwks_cache["expires_at"] = now + JWKS_CACHE_TTL_SECONDS
    return jwks


def _get_signing_key(token: str, jwks: dict[str, Any]):
    try:
        jwk_client = PyJWKClient("")
        jwk_client.fetch_data = lambda: jwks
        return jwk_client.get_signing_key_from_jwt(token).key
    except (InvalidTokenError, PyJWKClientError, KeyError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authorization token",
        ) from exc


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    supabase_url = get_supabase_url()
    if not supabase_url:
        raise HTTPException(status_code=500, detail="Supabase URL is not configured")

    jwks = fetch_supabase_jwks()
    signing_key = _get_signing_key(token, jwks)

    try:
        return jwt.decode(
            token,
            signing_key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=f"{supabase_url}/auth/v1",
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authorization token",
        ) from exc


async def get_current_supabase_user(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = get_bearer_token(authorization)
    return verify_supabase_jwt(token)


async def require_admin_user(
    payload: dict[str, Any] = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Require a linked EduMind ADMIN profile for the current Supabase user.

    Uses get_current_supabase_user + AuthProfileService.resolve_current_user and
    raises 403 unless role is ADMIN. Returns the resolved profile dict.
    """
    from modules.student_growth.auth_profile_service import AuthProfileService

    profile = AuthProfileService(db).resolve_current_user(payload)
    app_user = profile.get("app_user")
    role = (getattr(app_user, "role", None) or "").upper()
    if role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )
    return profile


async def get_resolved_edumind_profile(
    payload: dict[str, Any] = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """JWT + linked EduMind AppUser/profile (404 if not linked)."""
    from modules.student_growth.auth_profile_service import AuthProfileService

    return AuthProfileService(db).resolve_current_user(payload)


def require_roles(*roles: str):
    """FastAPI dependency factory: require JWT + linked profile with one of roles."""
    allowed = {r.upper() for r in roles}

    async def _require(
        profile: dict[str, Any] = Depends(get_resolved_edumind_profile),
    ) -> dict[str, Any]:
        app_user = profile.get("app_user")
        role = (getattr(app_user, "role", None) or "").upper()
        if role not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Requires role: {', '.join(sorted(allowed))}",
            )
        return profile

    return _require


def assert_can_access_student(profile: dict[str, Any], student_id: int) -> None:
    """STUDENT → own profile only; ADMIN/TEACHER any; PARENT → linked children."""
    app_user = profile.get("app_user")
    role = (getattr(app_user, "role", None) or "").upper()
    if role in {"ADMIN", "TEACHER"}:
        return
    if role == "STUDENT":
        student_profile = profile.get("student_profile")
        if student_profile is None or int(student_profile.id) != int(student_id):
            raise HTTPException(
                status_code=403,
                detail="Cannot access another student's data",
            )
        return
    if role == "PARENT":
        children = profile.get("parent_children") or []
        child_ids = {int(c.id) for c in children if getattr(c, "id", None) is not None}
        if int(student_id) not in child_ids:
            raise HTTPException(
                status_code=403,
                detail="Cannot access a student who is not linked to this parent",
            )
        return
    raise HTTPException(status_code=403, detail="Insufficient role for student data")
