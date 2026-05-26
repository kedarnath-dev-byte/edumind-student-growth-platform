"""
Render-compatible ASGI entry point.

The backend app lives in backend/main.py. Some Render services start from the
repository root with `uvicorn main:app`, so this wrapper exposes the same app
without requiring dashboard command changes.
"""

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.main import app  # noqa: E402
