"""Shared AuthZ / seed overrides for FastAPI TestClient suites."""

from types import SimpleNamespace

from core.auth import get_current_supabase_user, get_resolved_edumind_profile

SEED_HEADERS = {"X-Dev-Seed-Secret": "test-seed-secret"}


def install_dev_seed_env(monkeypatch) -> None:
    monkeypatch.setenv("DEV_SEED_SECRET", "test-seed-secret")
    monkeypatch.setenv("ENV", "test")
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("RENDER_ENVIRONMENT", raising=False)


def admin_profile_override(student_id: int | None = 1):
    async def _override():
        return {
            "authenticated": True,
            "supabase_user_id": "test-admin",
            "email": "admin@edumind.local",
            "app_user": SimpleNamespace(id=99, role="ADMIN", full_name="Test Admin"),
            "student_profile": (
                SimpleNamespace(id=student_id) if student_id is not None else None
            ),
            "teacher_profile": None,
            "parent_profile": None,
            "parent_children": [],
            "teacher_classrooms": [],
        }

    return _override


async def fake_supabase_user():
    return {
        "sub": "test-admin",
        "email": "admin@edumind.local",
        "aud": "authenticated",
    }


def install_admin_auth_overrides(app) -> None:
    app.dependency_overrides[get_current_supabase_user] = fake_supabase_user
    app.dependency_overrides[get_resolved_edumind_profile] = admin_profile_override()
