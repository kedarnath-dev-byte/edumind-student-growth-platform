"""Mux status helper — no network when env unset."""

import os

from modules.mux.mux_service import COMING_ONLINE, mux_configured, mux_status_payload


def test_mux_not_configured_without_env(monkeypatch):
    monkeypatch.delenv("MUX_TOKEN_ID", raising=False)
    monkeypatch.delenv("MUX_TOKEN_SECRET", raising=False)
    assert mux_configured() is False
    payload = mux_status_payload()
    assert payload["configured"] is False
    assert COMING_ONLINE in payload["message"]
    assert payload["min_duration_seconds"] == 30
    assert payload["max_duration_seconds"] == 180


def test_mux_configured_with_env(monkeypatch):
    monkeypatch.setenv("MUX_TOKEN_ID", "tid")
    monkeypatch.setenv("MUX_TOKEN_SECRET", "tsec")
    assert mux_configured() is True
    assert mux_status_payload()["configured"] is True
