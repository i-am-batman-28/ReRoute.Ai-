"""LangGraph graph build/run. Requires `pip install -e '.[agent]'`."""

from __future__ import annotations

import logging
from typing import Any

from agent.state import TripAgentState

logger = logging.getLogger(__name__)


def build_graph():
    """Return a compiled LangGraph graph when agent extras are installed."""
    try:
        from langgraph.graph import StateGraph  # type: ignore[import-not-found]
    except ImportError as e:
        raise RuntimeError(
            "LangGraph is not installed. Install agent extras: pip install -e '.[agent]'"
        ) from e

    _ = StateGraph  # noqa: F841 — wired when nodes (observe, tools, propose, interrupt) are added
    raise NotImplementedError("Graph wiring: add nodes (observe, tool, propose, interrupt)")


async def run_trip_agent(_initial: TripAgentState) -> dict[str, Any]:
    """Execute graph for one trip run; returns final state dict."""
    build_graph()
    return {}
