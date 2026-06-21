from __future__ import annotations

import app.platform  # noqa: F401 — Windows asyncio fix before engine creation

from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import DATA_DIR, settings


DATA_DIR.mkdir(parents=True, exist_ok=True)

engine_kwargs: dict[str, Any] = {"echo": settings.DEBUG}
if not settings.is_sqlite:
    engine_kwargs.update(
        {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "pool_recycle": 3600,
        }
    )
    if "pooler.supabase.com" in settings.DATABASE_URL:
        # Supabase poolers can reject psycopg prepared statements across pooled sessions.
        engine_kwargs["connect_args"] = {"prepare_threshold": None}

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
