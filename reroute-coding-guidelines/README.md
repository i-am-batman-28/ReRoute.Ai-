# ReRoute coding guidelines (single-repo)

Self-contained standards for FastAPI backends **without** a shared `omnisage_common_lib`. Same layering and discipline as OmniSage docs, implemented with **project-local** modules (`app.utils`, `app.dao.base`, etc.).

## Contents

| Path | Purpose |
|------|---------|
| [docs/](docs/README.md) | Human-readable architecture and layout |
| [ai-rules/backend/.cursor/rules/](ai-rules/backend/.cursor/rules/) | Cursor rules (`.mdc`) — point Cursor at this folder or copy into your repo’s `.cursor/rules/` |
| [CI-CD/_semgrep/](CI-CD/_semgrep/) | Optional Semgrep checks |

## Using in a project

1. Copy or symlink `ai-rules/backend/.cursor/rules/*.mdc` into `<your-repo>/.cursor/rules/`, **or** add this repo as a multi-root workspace folder and scope rules to your backend package.
2. Align your tree with [docs/project_layout.md](docs/project_layout.md).
3. Implement the small local primitives once: `Base`, `get_db`, optional `BaseDAO`, `handle_exceptions`, structured logging, `internal_get`/`internal_post` if you call other HTTP services.

## Scope

- **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2 async, PostgreSQL.
- **Frontend:** Not defined here; use your stack’s own rules (e.g. Next.js + Tailwind for ReRoute).

OmniSage MCP servers are **optional**; these files are the source of truth when working offline or on greenfield repos.
