# ReRoute.AI application

This directory holds the **FastAPI** backend (`backend/`) and **Next.js** frontend (`frontend/`).

Project overview, environment variables, Docker services, and Celery setup are documented in the **[repository README](../README.md)** at the repo root.

### Quick commands

**Backend** (from `backend/`):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --reload --port 8000
```

**Frontend** (from `frontend/`):

```bash
npm install && npm run dev
```

**Health:** `GET http://localhost:8000/api/health`

**Agent design:** [docs/AGENT_ARCHITECTURE.md](docs/AGENT_ARCHITECTURE.md)
