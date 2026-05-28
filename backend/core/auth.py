import os
import time
from typing import Any

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import Header, HTTPException
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

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
