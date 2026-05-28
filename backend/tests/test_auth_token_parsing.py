import pytest
from fastapi import HTTPException

from core.auth import (
    build_supabase_jwks_url,
    get_bearer_token,
    verify_supabase_jwt,
)


def test_missing_authorization_header_raises_auth_error():
    with pytest.raises(HTTPException) as exc:
        get_bearer_token(None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Missing authorization token"


def test_malformed_authorization_header_raises_auth_error():
    with pytest.raises(HTTPException) as exc:
        get_bearer_token("Token abc")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Missing authorization token"


def test_bearer_token_extracts_token():
    assert get_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"


def test_jwks_url_builder_uses_supabase_url():
    assert (
        build_supabase_jwks_url("https://nlcjzvcpuerskzitnlee.supabase.co")
        == "https://nlcjzvcpuerskzitnlee.supabase.co/auth/v1/.well-known/jwks.json"
    )


def test_invalid_token_verification_raises_safe_auth_error(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://nlcjzvcpuerskzitnlee.supabase.co")
    monkeypatch.setattr("core.auth.fetch_supabase_jwks", lambda: {"keys": []})

    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt("not-a-real-token")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid or expired authorization token"
