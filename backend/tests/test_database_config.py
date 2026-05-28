from core.database import (
    SQLITE_DATABASE_URL,
    get_database_url,
    normalize_database_url,
)


def test_database_url_missing_uses_sqlite_fallback(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    assert get_database_url() == SQLITE_DATABASE_URL


def test_postgres_url_normalizes_to_psycopg2():
    raw_url = "postgres://postgres:password@example.com:5432/postgres"

    assert (
        normalize_database_url(raw_url)
        == "postgresql+psycopg2://postgres:password@example.com:5432/postgres"
    )


def test_postgresql_url_normalizes_to_psycopg2():
    raw_url = "postgresql://postgres:password@example.com:5432/postgres"

    assert (
        normalize_database_url(raw_url)
        == "postgresql+psycopg2://postgres:password@example.com:5432/postgres"
    )


def test_postgresql_psycopg2_url_stays_unchanged():
    raw_url = "postgresql+psycopg2://postgres:password@example.com:5432/postgres"

    assert normalize_database_url(raw_url) == raw_url
