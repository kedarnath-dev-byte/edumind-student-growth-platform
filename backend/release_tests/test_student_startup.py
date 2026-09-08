"""The low-memory deployment must start without the legacy AI packages."""
import os
import subprocess
import sys


def test_student_application_starts_without_legacy_ai(tmp_path):
    result = subprocess.run(
        [sys.executable, "-c", """
from fastapi.testclient import TestClient
from main import app
with TestClient(app) as client:
    assert client.get('/api/v1/health').status_code == 200
    assert client.get('/api/v1/auth/me').status_code == 401
assert not any(name in __import__('sys').modules for name in ['chromadb', 'langchain', 'groq'])
"""],
        env={**os.environ, "ENABLE_LEGACY_AI": "false", "ENVIRONMENT": "test",
             "DATABASE_URL": f"sqlite:///{tmp_path / 'startup.db'}"},
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
