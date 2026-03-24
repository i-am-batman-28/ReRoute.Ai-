"""Async engine, session factory, and table creation."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import get_settings
from model.base import Base

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _ensure_engine():
    global _engine, _session_factory
    if _engine is not None:
        return
    settings = get_settings()
    _engine = create_async_engine(
        settings.database_url,
        echo=settings.debug_sql,
    )
    _session_factory = async_sessionmaker(
        _engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )


def get_engine():
    _ensure_engine()
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    _ensure_engine()
    assert _session_factory is not None
    return _session_factory


async def init_db(base: type[DeclarativeBase] = Base) -> None:
    """Create tables if they do not exist."""
    _ensure_engine()
    eng = get_engine()
    async with eng.begin() as conn:
        await conn.run_sync(base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


def reset_database_for_tests() -> None:
    """Clear engine singleton (sync) — use before tests with in-memory SQLite."""
    global _engine, _session_factory
    _engine = None
    _session_factory = None
