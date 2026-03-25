from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Settings loaded from the workspace root `.env`.

    This ensures the backend can see keys you already set at repo root.
    """

    _env_file = Path(__file__).resolve().parents[2] / ".env"
    model_config = SettingsConfigDict(env_file=str(_env_file), extra="ignore")

    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000"

    # Postgres: postgresql+asyncpg://user:pass@host:5433/dbname (see repo root `.env.example` + docker-compose).
    database_url: str = "sqlite+aiosqlite:///./reroute.db"
    debug_sql: bool = False

    # Auth
    jwt_secret_key: str = "change-me-use-long-random-string-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # External services
    AVIATION_STACK_API_KEY: str | None = None
    OPEN_METEO_ENABLED: bool = True

    OPENROUTESERVICE_API_KEY: str | None = None

    DUFFEL_API_KEY: str | None = None
    DUFFEL_VERSION: str = "v2"

    RESEND_API_KEY: str | None = None
    RESEND_FROM_EMAIL: str = "noreply@reroute.ai"
    EMAIL_ENABLED: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
