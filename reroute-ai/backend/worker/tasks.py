"""Background tasks — expand with monitor sweep, async propose, outbound email."""

from __future__ import annotations

import logging

from worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="reroute.ping")
def ping() -> str:
    """Health check for worker connectivity."""
    return "pong"


@celery_app.task(name="reroute.monitor.enqueue_cycle")
def enqueue_monitor_cycle() -> dict:
    """
    Beat hook: future home for per-user / per-trip monitor fan-out.
    v1: no-op success so infra can be validated (redis + worker + beat).
    """
    logger.info("monitor.enqueue_cycle_stub")
    return {"ok": True, "detail": "stub — wire trip scans and agent checks here"}
