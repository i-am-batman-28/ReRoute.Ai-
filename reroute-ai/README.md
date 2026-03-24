# ReRoute.AI

Monorepo: **FastAPI** backend (`backend/`) + **Next.js** frontend (`frontend/`).

## Quick start

**Backend** (from `backend/`):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --reload --port 8000
```

**Frontend** (from `frontend/`):

```bash
npm run dev
```

API health: `GET http://localhost:8000/api/health`

## Guidelines

See `../reroute-coding-guidelines/` for Cursor rules and architecture docs.
