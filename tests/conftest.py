"""
conftest.py
Shared pytest fixtures for EduMind AI test suite.
"""
import pytest

BASE_URL = "https://edumind-ai-ff.onrender.com"
FRONTEND_URL = "https://edumind-ai-two.vercel.app"

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

@pytest.fixture(scope="session")
def frontend_url():
    return FRONTEND_URL
