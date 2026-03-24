# Suggested project layout

Adjust names to match your package (`app`, `backend`, `saarthi_backend`, etc.).

```
your_package/
  main.py                 # FastAPI app, lifespan, middleware, exception handlers
  api_router.py           # include_router for domain routers (optional)
  deps.py                 # get_db, get_current_user, shared Depends
  config.py               # pydantic-settings / env (no secrets in git)

  routers/                # *_router.py — thin handlers
  service/                # *_service.py — business logic (or services/)
  dao/
    base_dao.py           # optional: BaseDAO[Model] + shared helpers e.g. count
    *_dao.py
  schema/                 # Pydantic: *_schemas.py, common_schemas.py
  model/                  # SQLAlchemy: *_model.py, declarative Base

  utils/
    exceptions.py         # app errors + handle_exceptions decorator
    logging_config.py     # optional JSON/structlog setup
    internal_http.py      # optional: internal_get/post/...
```

## Minimal local primitives (implement once)

| Need | Typical location |
|------|------------------|
| Declarative `Base` | `model/base.py` or `database.py` |
| Engine + session factory + `get_db` | `database.py` + `deps.py` |
| API envelope `BaseResponse[T]` | `schema/common_schemas.py` |
| Typed errors + handlers | `utils/exceptions.py` + registered in `main.py` |
| Optional `BaseDAO` | `dao/base_dao.py` — `__init__(model_class, session)` |

## Enums

Keep enums next to schemas (`schema/enums.py` or per-domain `schema/trip_enums.py`). Import them in routers; do not duplicate stringly-typed filters.
