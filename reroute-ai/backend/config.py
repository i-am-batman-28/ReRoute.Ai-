from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_DIR = _BACKEND_DIR.parent  # reroute-ai/
_REPO_ROOT = _PROJECT_DIR.parent  # ReRoute.Ai- (workspace root)


def _discover_env_files() -> tuple[Path, ...] | None:
    """
    Load env files in order; later files override earlier ones (pydantic-settings).

    Search paths (first → last priority for overrides):
      1. `<workspace>/ReRoute.Ai-/.env`
      2. `<workspace>/ReRoute.Ai-/reroute-ai/.env`
      3. `<workspace>/ReRoute.Ai-/reroute-ai/backend/.env`
    """
    candidates = (
        _REPO_ROOT / ".env",
        _PROJECT_DIR / ".env",
        _BACKEND_DIR / ".env",
    )
    found = tuple(p for p in candidates if p.is_file())
    return found if found else None


class Settings(BaseSettings):
    """
    Settings from environment variables and optional `.env` files.

    Files loaded (when present), low → high precedence: repo root, `reroute-ai/.env`,
    `reroute-ai/backend/.env`. OS environment variables override file values.
    """

    model_config = SettingsConfigDict(
        env_file=_discover_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000"

    # Postgres: postgresql+asyncpg://user:pass@host:5433/dbname (see `.env.example` + docker-compose).
    database_url: str = "sqlite+aiosqlite:///./reroute.db"
    debug_sql: bool = False

    # Redis (cache / Celery broker). Compose: `docker compose -f reroute-ai/docker-compose.yml up -d redis`
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None

    # Auth
    jwt_secret_key: str = "change-me-use-long-random-string-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # External services (used by integrations/* and services)
    AVIATION_STACK_API_KEY: str | None = None
    OPEN_METEO_ENABLED: bool = True

    OPENROUTESERVICE_API_KEY: str | None = None

    DUFFEL_API_KEY: str | None = None
    DUFFEL_VERSION: str = "v2"

    RESEND_API_KEY: str | None = None
    RESEND_FROM_EMAIL: str = "noreply@reroute.ai"
    EMAIL_ENABLED: bool = True
    # When True, agent propose/confirm enqueue Resend sends to Celery (worker must run).
    email_via_celery: bool = False

    # Outbound HTTP (Duffel, AviationStack, Open-Meteo, Resend, ORS)
    http_timeout_connect: float = 10.0
    http_timeout_read: float = 90.0

    # Reset proposals stuck in `applying` (worker beat + manual task).
    stale_applying_minutes: int = 15

    # Agent / LLM (optional; LangChain also reads OPENAI_API_KEY from the process env)
    OPENAI_API_KEY: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_celery_broker_url(self) -> str:
        return self.celery_broker_url or self.redis_url

    @property
    def resolved_celery_result_backend(self) -> str:
        return self.celery_result_backend or self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
