# Architecture

## Request flow

1. **Router** — HTTP boundary: dependencies (auth, `get_db`), Pydantic types, `response_model`, `status_code`. Calls **one** service function per handler. No business logic, no `try/except`, no direct SQL.
2. **Service** — Business rules, orchestration, commits, calls to DAOs and outbound HTTP clients. Use `@handle_exceptions(logger=...)` (or your project’s equivalent) where you standardize errors and logging.
3. **DAO** — Database access only for **one** entity/model family. No commits. Prefer SQLAlchemy `select`/`execute`; raw SQL only when necessary. Do not wrap DB calls in `try/except` (let errors propagate to the service layer).

## Schemas vs models

- **Pydantic** (`schema/`): request bodies, responses, `BaseResponse[T]` envelopes.
- **SQLAlchemy** (`model/`): tables and columns. Never return ORM instances directly from the API without mapping to a schema when you care about a stable contract.

## Auth (monolith)

Use FastAPI `Depends(get_current_user)` (or optional user) with JWT/session/cookies as your app requires. Multi-router splits (public / authenticated / internal) are optional; document them in your `main.py` or `api_router.py`.

## Outbound HTTP

Call other services only from **service** functions. Use a **single** thin client module (e.g. `utils/internal_http.py`) built on `httpx.AsyncClient` with timeouts and explicit base URLs from settings — not ad hoc `requests` per file.

## Logging

One logger per module (`logging.getLogger(__name__)` or a small structured wrapper). Log at router entry (light), service entry (context), DAO only when it aids debugging (avoid noise). Never log secrets or full tokens.

## Transactions

`await session.commit()` in **services** after a coherent unit of work. Use rollback-on-error in your exception helper when you need all-or-nothing behavior.
