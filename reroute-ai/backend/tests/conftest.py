"""Pytest setup — env before app import."""

import os

import pytest
from fastapi.testclient import TestClient

# Must run before `main` is imported by test modules.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production")


def pytest_configure() -> None:
    from config import get_settings

    get_settings.cache_clear()
    from database import reset_database_for_tests

    reset_database_for_tests()


@pytest.fixture
def client() -> TestClient:
    """Runs FastAPI lifespan (DB init) — use context manager."""
    from main import app

    with TestClient(app) as c:
        yield c
