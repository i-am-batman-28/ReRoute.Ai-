# ReRoute.AI — agent context and actions

## What counts as “knowledge” (locked direction)

| Layer | Role |
|-------|------|
| **LangGraph state** | Working memory for the run: current phase, ranked options, last tool errors, user confirmation id. |
| **DB trip snapshot** | Source of truth for legs, hotels, meetings, user prefs — loaded at start and updated only on **apply** after confirm. |
| **Tool results** | Factual API outputs (status, weather, search offers). The model must **not** invent schedules; it reasons over these JSON blobs. |
| **Deterministic rules** | Python code: eligibility checks, scoring weights, hard gates (e.g. min connection time). |
| **Prompt policy blurb** | Short curated text (see `agent/policy.py`) for tone and passenger-rights *explanations* — not a second database. |
| **RAG** | Optional later — only if you need citations from long PDFs (CARs, airline contracts). Default is **off**. |

## How actions are performed (no hallucinated bookings)

1. **Observe** — Tools fetch live/mocked data (`integrations/`). Results are written into graph state and optionally logged.
2. **Propose** — The LLM + rules produce a **structured plan** (ranked alternatives + cascade hints). Nothing mutates the trip yet.
3. **Persist proposal** — Service layer stores the proposal with a **proposal id** (DB or cache) for the UI.
4. **Confirm** — User explicitly approves (UI → API). This is a **hard gate** (graph `interrupt` or separate endpoint).
5. **Apply** — `service/itinerary_service` (or similar) applies changes: update DB snapshot, emit events. For hackathon, **simulate** airline PNR changes; structure matches production.

The LLM **never** calls “book” directly without passing through your **apply** path after confirmation.

## File map

- `agent/state.py` — state shape for LangGraph.
- `agent/policy.py` — short policy strings for prompts.
- `agent/tools.py` — tool implementations calling `integrations/`.
- `agent/actions.py` — action phases and apply orchestration helpers.
- `agent/graph_runner.py` — graph build/run (requires `[agent]` extra).
- `service/agent_service.py` — load trip, run graph, return proposals.
- `integrations/*` — flight status, search, weather, maps — **tools are the only side-effect boundary** before apply.
