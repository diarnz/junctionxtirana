from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
DATA_DIR = BACKEND_DIR / "data"


def _default_database_url() -> str:
    db_path = DATA_DIR / "spaceflow.db"
    return f"sqlite+aiosqlite:///{db_path.as_posix()}"


def _default_secret_key() -> str:
    # Safe dev fallback so the app boots even before production env is wired.
    return "spaceflow-dev-secret-key-change-me-before-production"


class Settings(BaseSettings):
    DATABASE_URL: str = Field(default_factory=_default_database_url)
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None

    SECRET_KEY: str = Field(default_factory=_default_secret_key)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    OPENROUTER_API_KEY: str | None = None
    AI_MODEL: str = "anthropic/claude-3.5-sonnet"
    AI_TEMPERATURE: float = 0.1
    AI_MAX_TOKENS: int = 4096

    DEBUG: bool = True
    AUTO_CREATE_TABLES: bool = True
    AUTO_SEED_DATA: bool = True
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,"
        "http://127.0.0.1:5173,http://127.0.0.1:3000"
    )

    APP_NAME: str = "SpaceFlow API"
    APP_VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @computed_field
    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @computed_field
    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
