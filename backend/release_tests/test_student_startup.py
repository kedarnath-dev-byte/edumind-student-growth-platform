"""The low-memory deployment must start without the legacy AI packages."""
import os
import subprocess
import sys

import pytest


@pytest.mark.parametrize("ai_setting", [None, "false"])
def test_student_application_starts_without_legacy_ai(tmp_path, ai_setting):
    environment = {**os.environ, "ENVIRONMENT": "test",
                   "DATABASE_URL": f"sqlite:///{tmp_path / 'startup.db'}"}
    environment.pop("ENABLE_LEGACY_AI", None)
    if ai_setting is not None:
        environment["ENABLE_LEGACY_AI"] = ai_setting
    result = subprocess.run(
        [sys.executable, "-c", """
from fastapi.testclient import TestClient
from main import app
with TestClient(app) as client:
    assert client.get('/api/v1/health').status_code == 200
    assert client.get('/api/v1/auth/me').status_code == 401
    assert client.post('/api/v1/ingestion/upload').status_code == 404
    assert client.post('/api/v1/rag/query').status_code == 404
    assert client.get('/api/v1/evaluation/admin/dashboard').status_code == 404
assert not any(name in __import__('sys').modules for name in ['chromadb', 'langchain', 'groq'])
"""],
        env=environment,
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
