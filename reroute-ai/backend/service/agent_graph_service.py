"""LangGraph-backed propose workflow (tools -> classification -> ranking context).

This module intentionally returns plain dict state so existing API schemas and
persistence paths in ``agent_service`` stay compatible.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any, TypedDict

from agent.tools import fetch_flight_status, fetch_weather_signals, search_alternatives
from integrations.location_resolver import resolve_coords


class AgentGraphState(TypedDict, total=False):
    trip_context: dict[str, Any]
    simulate_disruption: str | None
    flight_status: dict[str, Any]
    weather: dict[str, Any]
    offers: list[dict[str, Any]]
    duffel_passengers: list[dict[str, Any]]
    search_meta: dict[str, Any]
    tool_trace_summary: list[str]
    disruption_type: str
    delay_minutes: int | None
    booking_mode: str
    options: list[dict[str, Any]]
    options_by_offer_id: dict[str, dict[str, Any]]
    cascade_preview: dict[str, Any]
    compensation_draft: dict[str, Any]
    checkpoint_events: list[dict[str, Any]]


class AgentConfirmGraphState(TypedDict, total=False):
    booking_mode: str
    trip_context: dict[str, Any]
    selected_option_id: str
    applied_option_id: str
    options_by_offer_id: dict[str, dict[str, Any]]
    option_ctx: dict[str, Any]
    requires_user_review: bool
    acknowledged_uncertainty: bool
    duffel_passengers: list[dict[str, Any]]
    passenger_details: list[dict[str, Any]]
    stale_offer: bool
    duffel_order_id: str | None
    can_apply: bool
    error_message: str | None
    checkpoint_events: list[dict[str, Any]]


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _append_checkpoint(
    state: AgentGraphState | AgentConfirmGraphState,
    *,
    node: str,
    details: dict[str, Any] | None = None,
) -> None:
    ev = {
        "at": _now_iso(),
        "node": node,
        "details": details or {},
    }
    state.setdefault("checkpoint_events", []).append(ev)  # type: ignore[call-arg]


def _extract_http_status(exc: Exception) -> int | None:
    response = getattr(exc, "response", None)
    return getattr(response, "status_code", None)


def _extract_http_error_codes(exc: Exception) -> list[str]:
    response = getattr(exc, "response", None)
    if response is None:
        return []
    try:
        payload = response.json()
    except Exception:
        return []
    out: list[str] = []
    for e in payload.get("errors") or []:
        c = e.get("code")
        if isinstance(c, str) and c:
            out.append(c)
    return out


def _clean_passenger_payload(base: dict[str, Any], pid: Any) -> dict[str, Any]:
    def _pick_str(key: str, default: str) -> str:
        v = base.get(key)
        return v.strip() if isinstance(v, str) and v.strip() else default

    def _norm_gender(v: Any) -> str:
        if isinstance(v, str):
            t = v.strip().lower()
            if t in {"m", "male"}:
                return "m"
            if t in {"f", "female"}:
                return "f"
            if t in {"x", "other", "nonbinary", "non-binary"}:
                return "x"
        return "m"

    out: dict[str, Any] = {
        "id": pid,
        "email": _pick_str("email", "traveler@example.com"),
        "title": _pick_str("title", "mr"),
        "gender": _norm_gender(base.get("gender")),
        "family_name": _pick_str("family_name", "Traveler"),
        "given_name": _pick_str("given_name", "Guest"),
    }
    born_on = base.get("born_on")
    if isinstance(born_on, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", born_on.strip()):
        out["born_on"] = born_on.strip()
    else:
        out["born_on"] = "1990-01-01"
    phone = base.get("phone_number")
    if isinstance(phone, str):
        p = phone.strip().replace(" ", "")
        # Minimal E.164 shape; if invalid, omit instead of causing 422 hard-fail.
        if re.fullmatch(r"\+\d{8,15}", p):
            out["phone_number"] = p
    if "phone_number" not in out:
        # Duffel commonly requires this for order creation in test mode.
        out["phone_number"] = "+14155552671"
    return {k: v for k, v in out.items() if v not in (None, "")}


def _delay_label(delay_minutes: int | None) -> str:
    if delay_minutes is None:
        return "unknown delay"
    h, m = divmod(max(0, int(delay_minutes)), 60)
    if h and m:
        return f"{h}h {m}m"
    if h:
        return f"{h}h"
    return f"{m}m"


def _extract_arrival_time(offer: dict[str, Any]) -> str | None:
    slices = offer.get("slices") or []
    for s in slices:
        segments = (s.get("segments") or []) if isinstance(s, dict) else []
        for seg in segments:
            arriving_at = seg.get("arriving_at")
            if arriving_at:
                return str(arriving_at)
    return None


def _extract_offer_legs(offer: dict[str, Any]) -> list[dict[str, Any]]:
    legs: list[dict[str, Any]] = []
    slices = offer.get("slices") or []
    for s in slices:
        if not isinstance(s, dict):
            continue
        segments = s.get("segments") or []
        for seg in segments:
            if not isinstance(seg, dict):
                continue
            origin = (seg.get("origin") or {}) if isinstance(seg.get("origin"), dict) else {}
            destination = (seg.get("destination") or {}) if isinstance(seg.get("destination"), dict) else {}
            carrier = (seg.get("marketing_carrier") or {}) if isinstance(seg.get("marketing_carrier"), dict) else {}
            legs.append(
                {
                    "from": origin.get("iata_code"),
                    "to": destination.get("iata_code"),
                    "departure_time": seg.get("departing_at"),
                    "arrival_time": seg.get("arriving_at"),
                    "flight_number": seg.get("operating_carrier_flight_number")
                    or seg.get("marketing_carrier_flight_number"),
                    "carrier": carrier.get("name"),
                }
            )
    return legs


def _safe_int(v: object) -> int | None:
    try:
        if v is None:
            return None
        return int(v)  # type: ignore[arg-type]
    except Exception:
        return None


def _weather_code_label(code: int | None) -> str:
    if code is None:
        return "Unknown"
    if code == 0:
        return "Clear sky"
    if code in {1, 2, 3}:
        return "Partly cloudy"
    if code in {45, 48}:
        return "Fog"
    if code in {51, 53, 55}:
        return "Drizzle"
    if code in {61, 63, 65, 80, 81, 82}:
        return "Rain"
    if code in {71, 73, 75, 85, 86}:
        return "Snow"
    if code in {95, 96, 99}:
        return "Thunderstorm"
    return f"Code {code}"


def _score_offer(offer: dict[str, Any]) -> float:
    try:
        amount = float(offer.get("total_amount"))
    except Exception:
        amount = 999999.0
    arrival = _extract_arrival_time(offer)
    arrival_score = len(arrival) if arrival else 1000
    return amount + float(arrival_score) * 0.01


async def _observe_flight(state: AgentGraphState) -> AgentGraphState:
    trip_context = state["trip_context"]
    legs_block = trip_context.get("legs") if isinstance(trip_context.get("legs"), dict) else {}
    primary = legs_block.get("primary_flight") if isinstance(legs_block.get("primary_flight"), dict) else {}
    try:
        fs = await fetch_flight_status(
            flight_number=str(primary.get("flight_number") or ""),
            date=str(primary.get("date") or ""),
            simulate_disruption=state.get("simulate_disruption"),
        )
    except Exception as e:  # pragma: no cover - defensive
        fs = {"status": "unknown", "delay_minutes": None, "source": f"error:{type(e).__name__}"}
    _append_checkpoint(
        state,
        node="observe_flight",
        details={"status": fs.get("status"), "source": fs.get("source")},
    )
    return {"flight_status": fs, "checkpoint_events": state.get("checkpoint_events", [])}


async def _observe_weather(state: AgentGraphState) -> AgentGraphState:
    trip_context = state["trip_context"]
    legs_block = trip_context.get("legs") if isinstance(trip_context.get("legs"), dict) else {}
    primary = legs_block.get("primary_flight") if isinstance(legs_block.get("primary_flight"), dict) else {}
    wx = legs_block.get("weather") if isinstance(legs_block.get("weather"), dict) else {}
    origin_lat, origin_lon = wx.get("origin_lat"), wx.get("origin_lon")
    dest_lat, dest_lon = wx.get("destination_lat"), wx.get("destination_lon")
    # Auto-resolve destination coords by IATA/city on every run (existing trips included).
    if dest_lat is None or dest_lon is None:
        dest_code = primary.get("destination")
        if isinstance(dest_code, str) and dest_code.strip():
            coords = await resolve_coords(dest_code)
            if coords:
                dest_lat, dest_lon = coords
    if origin_lat is None or origin_lon is None:
        origin_code = primary.get("origin")
        if isinstance(origin_code, str) and origin_code.strip():
            coords = await resolve_coords(origin_code)
            if coords:
                origin_lat, origin_lon = coords

    weather: dict[str, Any] = {"source": "skipped_missing_coords", "origin_latest": {}, "destination_latest": {}}
    if dest_lat is not None and dest_lon is not None:
        try:
            dest_w = await fetch_weather_signals(latitude=float(dest_lat), longitude=float(dest_lon))
            weather["destination_latest"] = dest_w.get("latest") or {}
            weather["source"] = dest_w.get("source") or weather["source"]
        except Exception:
            weather["destination_latest"] = {}
            weather["source"] = "error"
    if origin_lat is not None and origin_lon is not None:
        try:
            org_w = await fetch_weather_signals(latitude=float(origin_lat), longitude=float(origin_lon))
            weather["origin_latest"] = org_w.get("latest") or {}
            if weather["source"] == "skipped_missing_coords":
                weather["source"] = org_w.get("source") or weather["source"]
        except Exception:
            weather["origin_latest"] = {}
            if weather["source"] == "skipped_missing_coords":
                weather["source"] = "error"
    _append_checkpoint(
        state,
        node="observe_weather",
        details={
            "source": weather.get("source"),
            "origin_lat": origin_lat,
            "origin_lon": origin_lon,
            "destination_lat": dest_lat,
            "destination_lon": dest_lon,
        },
    )
    return {"weather": weather, "checkpoint_events": state.get("checkpoint_events", [])}


async def _search_offers(state: AgentGraphState) -> AgentGraphState:
    try:
        search = await search_alternatives(
            trip_context=state["trip_context"],
            simulate_disruption=state.get("simulate_disruption"),
        )
    except Exception:
        search = {"source": "duffel_error", "orq": {"data": {"offers": [], "passengers": []}}}
    orq = (search.get("orq") or {}).get("data") or {}
    meta = (search.get("orq") or {}).get("_reroute_meta") or {}
    offers = orq.get("offers") or []
    passengers = orq.get("passengers") or []
    _append_checkpoint(
        state,
        node="search_offers",
        details={
            "offers_count": len(offers),
            "date_shifted": bool(meta.get("date_shifted")),
            "selected_departure_date": meta.get("selected_departure_date"),
        },
    )
    return {
        "offers": offers,
        "duffel_passengers": passengers,
        "search_meta": meta,
        "checkpoint_events": state.get("checkpoint_events", []),
    }


def _classify(state: AgentGraphState) -> AgentGraphState:
    fs = state.get("flight_status") or {}
    weather = state.get("weather") or {}
    offers = state.get("offers") or []
    search_meta = state.get("search_meta") if isinstance(state.get("search_meta"), dict) else {}
    raw_status = str(fs.get("status") or "unknown").lower()
    if raw_status not in {"delayed", "cancelled", "diverted", "unknown"}:
        raw_status = "unknown"
    delay_minutes = _safe_int(fs.get("delay_minutes"))
    if raw_status == "cancelled":
        delay_minutes = 0
    origin_latest = weather.get("origin_latest", {}) if isinstance(weather, dict) else {}
    dest_latest = weather.get("destination_latest", {}) if isinstance(weather, dict) else {}
    def _weather_text(prefix: str, latest: dict[str, Any]) -> str:
        code = _safe_int(latest.get("weather_code"))
        precip = _safe_int(latest.get("precipitation_probability"))
        wind = latest.get("wind_speed_10m")
        temp = latest.get("temperature_2m")
        if not latest:
            return f"weather_{prefix}: unavailable"
        return (
            f"weather_{prefix}: {_weather_code_label(code)}"
            f"{f', {temp}°C' if temp is not None else ''}"
            f"{f', rain chance {precip}%' if precip is not None else ''}"
            f"{f', wind {wind} km/h' if wind is not None else ''}"
        )
    tool_trace_summary = [
        f"flight_status: {raw_status} (source={fs.get('source')})",
        f"delay_minutes: {delay_minutes if delay_minutes is not None else 'unknown'}",
        _weather_text("origin", origin_latest),
        _weather_text("destination", dest_latest),
        f"duffel_offers_count: {len(offers) if isinstance(offers, list) else 0} (source=duffel)",
    ]
    if search_meta.get("date_shifted"):
        tool_trace_summary.append(
            "offer_date_shift: "
            f"requested={search_meta.get('requested_departure_date')} "
            f"selected={search_meta.get('selected_departure_date')}"
        )
    _append_checkpoint(
        state,
        node="classify",
        details={"disruption_type": raw_status, "delay_minutes": delay_minutes},
    )
    return {
        "disruption_type": raw_status,
        "delay_minutes": delay_minutes,
        "tool_trace_summary": tool_trace_summary,
        "checkpoint_events": state.get("checkpoint_events", []),
    }


def _rank_options(state: AgentGraphState) -> AgentGraphState:
    trip_context = state["trip_context"]
    legs_block = trip_context.get("legs") if isinstance(trip_context.get("legs"), dict) else {}
    primary = legs_block.get("primary_flight") if isinstance(legs_block.get("primary_flight"), dict) else {}
    offers = list(state.get("offers") or [])
    booking_mode = "live"
    if not offers:
        booking_mode = "mock"
        offers = [
            {"id": "mock_offer_1", "total_amount": "120.00", "total_currency": "USD", "slices": []},
            {"id": "mock_offer_2", "total_amount": "145.00", "total_currency": "USD", "slices": []},
            {"id": "mock_offer_3", "total_amount": "160.00", "total_currency": "USD", "slices": []},
        ]
    options_by_offer_id: dict[str, dict[str, Any]] = {}
    ranked: list[dict[str, Any]] = []
    for idx, offer in enumerate(sorted(offers, key=_score_offer)[:3], start=1):
        offer_id = str(offer.get("id") or f"offer_{idx}")
        total_amount = str(offer.get("total_amount") or "0")
        total_currency = str(offer.get("total_currency") or "USD")
        arrival_time = _extract_arrival_time(offer)
        offer_legs = _extract_offer_legs(offer)
        route_points = [str(x.get("from")) for x in offer_legs if x.get("from")] + (
            [str(offer_legs[-1].get("to"))] if offer_legs and offer_legs[-1].get("to") else []
        )
        route_chain = "→".join(route_points) if route_points else f"{primary.get('origin', 'N/A')}→{primary.get('destination', 'N/A')}"
        options_by_offer_id[offer_id] = {
            "duffel_offer_id": offer_id,
            "payments": [{"type": "balance", "currency": total_currency, "amount": total_amount}],
            "arrival_time": arrival_time,
            "legs": offer_legs,
        }
        ranked.append(
            {
                "option_id": offer_id,
                "score": float(idx),
                "summary": (
                    f"Option {idx}: {route_chain} "
                    f"arrive={arrival_time or 'TBD'} cost={total_currency} {total_amount}"
                ),
                "legs": offer_legs
                if offer_legs
                else [
                    {
                        "from": primary.get("origin"),
                        "to": primary.get("destination"),
                        "arrival_time": arrival_time,
                    }
                ],
                "modality": "flight",
            }
        )
    _append_checkpoint(
        state,
        node="rank_options",
        details={"booking_mode": booking_mode, "options_count": len(ranked)},
    )
    return {
        "booking_mode": booking_mode,
        "options_by_offer_id": options_by_offer_id,
        "options": ranked,
        "checkpoint_events": state.get("checkpoint_events", []),
    }


def _build_outputs(state: AgentGraphState) -> AgentGraphState:
    trip_context = state["trip_context"]
    legs_block = trip_context.get("legs") if isinstance(trip_context.get("legs"), dict) else {}
    disruption_type = str(state.get("disruption_type") or "unknown")
    delay_minutes = state.get("delay_minutes")
    conn_sub = legs_block.get("connection") if isinstance(legs_block.get("connection"), dict) else {}
    conn_buffer = int(conn_sub.get("departure_after_arrival_minutes") or 90)
    missed_connection = disruption_type in ("delayed", "diverted") and (delay_minutes or 0) >= conn_buffer
    if disruption_type == "delayed":
        disruption_message = f"Flight delayed by {_delay_label(delay_minutes)}."
    elif disruption_type == "cancelled":
        disruption_message = "Flight cancelled."
    elif disruption_type == "diverted":
        disruption_message = "Flight diverted."
    else:
        disruption_message = "Live disruption status unavailable right now."

    meet_sub = legs_block.get("meeting") if isinstance(legs_block.get("meeting"), dict) else {}
    meeting_scheduled = meet_sub.get("scheduled_time_utc") or "TBD"
    if disruption_type in ("delayed", "diverted") and delay_minutes is not None:
        meeting_message = f"Meeting likely delayed by ~{delay_minutes} minutes. Consider rescheduling from {meeting_scheduled}."
        hotel_message = f"Hotel check-in adjusted: late arrival buffer ~{delay_minutes} minutes."
    elif disruption_type == "cancelled":
        meeting_message = "Meeting rescheduling recommended due to cancellation."
        hotel_message = "Hotel check-in adjustment recommended due to cancellation."
    else:
        meeting_message = "Meeting impact unknown until live status stabilizes."
        hotel_message = "Hotel impact unknown until live status stabilizes."

    comp_eligible = disruption_type in ("cancelled", "diverted") or (
        disruption_type == "delayed" and (delay_minutes or 0) >= 120
    )
    cascade_preview = {
        "disruption_type": disruption_type,
        "disruption_message": disruption_message,
        "delay_minutes": delay_minutes,
        "missed_connection": missed_connection,
        "hotel_update_message": hotel_message,
        "meeting_update_message": meeting_message,
        "what_we_changed_summary": ["proposed top-3 rebooking options", "computed likely cascade from live status"],
    }
    compensation_draft = {
        "eligible": bool(comp_eligible),
        "eligibility_basis": {
            "rules_used": "hackathon_demo_delay_thresholds",
            "delay_minutes": delay_minutes,
            "disruption_type": disruption_type,
        },
        "claim_text_draft": (
            "Based on eligibility criteria, you may be entitled to compensation. Review official rules for final determination."
        ),
        "evidence_checklist": ["flight status record", "rebooking receipts", "incident notes", "bank details if submitting"],
    }
    _append_checkpoint(state, node="build_outputs")
    return {
        "cascade_preview": cascade_preview,
        "compensation_draft": compensation_draft,
        "checkpoint_events": state.get("checkpoint_events", []),
    }


async def run_propose_graph(*, trip_context: dict[str, Any], simulate_disruption: str | None) -> AgentGraphState:
    """Execute propose workflow via LangGraph when available.

    Falls back to direct node execution if langgraph isn't installed in the current env.
    """
    state: AgentGraphState = {
        "trip_context": trip_context,
        "simulate_disruption": simulate_disruption,
        "checkpoint_events": [],
    }
    try:
        from langgraph.graph import END, START, StateGraph  # type: ignore

        graph = StateGraph(AgentGraphState)
        graph.add_node("observe_flight", _observe_flight)
        graph.add_node("observe_weather", _observe_weather)
        graph.add_node("search_offers", _search_offers)
        graph.add_node("classify", _classify)
        graph.add_node("rank", _rank_options)
        graph.add_node("outputs", _build_outputs)
        graph.add_edge(START, "observe_flight")
        graph.add_edge("observe_flight", "observe_weather")
        graph.add_edge("observe_weather", "search_offers")
        graph.add_edge("search_offers", "classify")
        graph.add_edge("classify", "rank")
        graph.add_edge("rank", "outputs")
        graph.add_edge("outputs", END)
        app = graph.compile()
        result = await app.ainvoke(state)
        return result
    except Exception:
        # Env may not have optional langgraph dependency; keep behavior available.
        state.update(await _observe_flight(state))
        state.update(await _observe_weather(state))
        state.update(await _search_offers(state))
        state.update(_classify(state))
        state.update(_rank_options(state))
        state.update(_build_outputs(state))
        return state


def _confirm_precheck(state: AgentConfirmGraphState) -> AgentConfirmGraphState:
    if state.get("requires_user_review") and not state.get("acknowledged_uncertainty"):
        msg = (
            "Live disruption status is uncertain. Please verify delay/cancellation with the airline, "
            "then confirm again with acknowledgment."
        )
        _append_checkpoint(state, node="confirm_precheck_failed", details={"reason": "missing_ack"})
        return {
            "can_apply": False,
            "error_message": msg,
            "checkpoint_events": state.get("checkpoint_events", []),
        }
    selected = state.get("selected_option_id") or ""
    option_ctx = (state.get("options_by_offer_id") or {}).get(selected)
    if not option_ctx:
        _append_checkpoint(state, node="confirm_precheck_failed", details={"reason": "option_missing"})
        return {
            "can_apply": False,
            "error_message": "Selected option not found in proposal.",
            "checkpoint_events": state.get("checkpoint_events", []),
        }
    _append_checkpoint(state, node="confirm_precheck_ok", details={"selected_option_id": selected})
    return {"option_ctx": option_ctx, "can_apply": True, "error_message": None, "checkpoint_events": state.get("checkpoint_events", [])}


async def _confirm_verify_offer(state: AgentConfirmGraphState) -> AgentConfirmGraphState:
    if not state.get("can_apply"):
        return {"checkpoint_events": state.get("checkpoint_events", [])}
    if state.get("booking_mode") == "mock":
        _append_checkpoint(state, node="confirm_verify_offer_skipped", details={"booking_mode": "mock"})
        return {"stale_offer": False, "checkpoint_events": state.get("checkpoint_events", [])}
    try:
        from integrations.duffel_client import get_offer_latest

        selected = str(state.get("selected_option_id") or "")
        latest = await get_offer_latest(offer_id=selected)
        latest_data = latest.get("data") if isinstance(latest, dict) else None
        stale = not bool(latest_data and str(latest_data.get("id") or "") == selected)
        _append_checkpoint(state, node="confirm_verify_offer", details={"stale_offer": stale})
        return {"stale_offer": stale, "checkpoint_events": state.get("checkpoint_events", [])}
    except Exception as e:
        code = _extract_http_status(e)
        stale = code in (404, 410, 422)
        _append_checkpoint(
            state,
            node="confirm_verify_offer_http_error",
            details={"status_code": code, "stale_offer": stale},
        )
        return {"stale_offer": stale, "checkpoint_events": state.get("checkpoint_events", [])}


async def _confirm_create_order(state: AgentConfirmGraphState) -> AgentConfirmGraphState:
    if not state.get("can_apply"):
        return {"checkpoint_events": state.get("checkpoint_events", [])}
    if state.get("stale_offer"):
        return {
            "can_apply": False,
            "error_message": "Selected fare is no longer available. Re-run agent for fresh options.",
            "checkpoint_events": state.get("checkpoint_events", []),
        }
    selected = str(state.get("selected_option_id") or "")
    if state.get("booking_mode") == "mock":
        order_id = f"mock_order_{selected}"
        _append_checkpoint(state, node="confirm_create_order_mock", details={"order_id": order_id})
        return {
            "duffel_order_id": order_id,
            "applied_option_id": selected,
            "checkpoint_events": state.get("checkpoint_events", []),
        }

    option_ctx = state.get("option_ctx") or {}
    duffel_passengers = state.get("duffel_passengers") or []
    passenger_details = state.get("passenger_details") or []
    try:
        from integrations.duffel_client import create_order

        passengers_payload: list[dict[str, Any]] = []
        for i, duffel_p in enumerate(duffel_passengers):
            pid = duffel_p.get("id")
            base = passenger_details[i] if i < len(passenger_details) else (passenger_details[-1] if passenger_details else {})
            passengers_payload.append(_clean_passenger_payload(base=base, pid=pid))
        order_payload = {
            "data": {
                "selected_offers": [selected],
                "payments": option_ctx.get("payments") or [],
                "passengers": passengers_payload,
            }
        }
        order_resp = await create_order(order_payload=order_payload)
        order_id = (order_resp.get("data") or {}).get("id")
        _append_checkpoint(state, node="confirm_create_order_live", details={"order_id": order_id})
        return {
            "duffel_order_id": order_id,
            "applied_option_id": selected,
            "checkpoint_events": state.get("checkpoint_events", []),
        }
    except Exception as e:
        code = _extract_http_status(e)
        err_codes = _extract_http_error_codes(e)
        if code == 422:
            # 422 may be stale offer OR payload validation. Retry only stale-ish failures.
            non_retry_codes = {
                "invalid_phone_number",
                "invalid_email",
                "validation_required",
                "born_on_does_not_match",
            }
            retry_allowed = not any(c in non_retry_codes for c in err_codes)
            _append_checkpoint(
                state,
                node="confirm_create_order_422",
                details={"status_code": code, "retry": retry_allowed, "codes": err_codes},
            )
            if not retry_allowed:
                return {
                    "can_apply": False,
                    "error_message": "Booking payload was rejected by provider. Check passenger details and retry.",
                    "checkpoint_events": state.get("checkpoint_events", []),
                }
            try:
                from agent.tools import search_alternatives
                from integrations.duffel_client import create_order as create_order_retry

                trip_context = state.get("trip_context") if isinstance(state.get("trip_context"), dict) else {}
                search = await search_alternatives(trip_context=trip_context, simulate_disruption=None)
                orq = (search.get("orq") or {}).get("data") or {}
                fresh_offers = orq.get("offers") or []
                fresh_passengers = orq.get("passengers") or []
                if not fresh_offers:
                    raise RuntimeError("No fresh offers available")
                fresh = fresh_offers[0]
                fresh_id = str(fresh.get("id") or "")
                fresh_amount = str(fresh.get("total_amount") or "0")
                fresh_currency = str(fresh.get("total_currency") or "USD")

                passengers_payload_retry: list[dict[str, Any]] = []
                for i, duffel_p in enumerate(fresh_passengers):
                    pid = duffel_p.get("id")
                    base = passenger_details[i] if i < len(passenger_details) else (passenger_details[-1] if passenger_details else {})
                    passengers_payload_retry.append(_clean_passenger_payload(base=base, pid=pid))
                retry_payload = {
                    "data": {
                        "selected_offers": [fresh_id],
                        "payments": [{"type": "balance", "currency": fresh_currency, "amount": fresh_amount}],
                        "passengers": passengers_payload_retry,
                    }
                }
                retry_resp = await create_order_retry(order_payload=retry_payload)
                order_id = (retry_resp.get("data") or {}).get("id")
                _append_checkpoint(
                    state,
                    node="confirm_create_order_retry_success",
                    details={"order_id": order_id, "fresh_offer_id": fresh_id},
                )
                return {
                    "duffel_order_id": order_id,
                    "applied_option_id": fresh_id,
                    "checkpoint_events": state.get("checkpoint_events", []),
                }
            except Exception:
                _append_checkpoint(state, node="confirm_create_order_retry_failed")
                return {
                    "can_apply": False,
                    "error_message": "Selected fare expired during booking. Re-run agent and confirm a fresh option.",
                    "checkpoint_events": state.get("checkpoint_events", []),
                }
        if code is not None:
            _append_checkpoint(state, node="confirm_create_order_http_error", details={"status_code": code})
            return {
                "can_apply": False,
                "error_message": "Booking provider failed while creating order. Please retry shortly.",
                "checkpoint_events": state.get("checkpoint_events", []),
            }
        _append_checkpoint(state, node="confirm_create_order_error")
        return {
            "can_apply": False,
            "error_message": "Booking provider failed while creating order. Please retry shortly.",
            "checkpoint_events": state.get("checkpoint_events", []),
        }


async def run_confirm_graph(
    *,
    booking_mode: str,
    trip_context: dict[str, Any],
    selected_option_id: str,
    options_by_offer_id: dict[str, dict[str, Any]],
    requires_user_review: bool,
    acknowledged_uncertainty: bool,
    duffel_passengers: list[dict[str, Any]],
    passenger_details: list[dict[str, Any]],
) -> AgentConfirmGraphState:
    """Confirm/apply pre-booking graph.

    Returns gating + booking output used by service layer to update DB and itinerary.
    """
    state: AgentConfirmGraphState = {
        "booking_mode": booking_mode,
        "trip_context": trip_context,
        "selected_option_id": selected_option_id,
        "options_by_offer_id": options_by_offer_id,
        "requires_user_review": requires_user_review,
        "acknowledged_uncertainty": acknowledged_uncertainty,
        "duffel_passengers": duffel_passengers,
        "passenger_details": passenger_details,
        "checkpoint_events": [],
        "can_apply": True,
    }
    try:
        from langgraph.graph import END, START, StateGraph  # type: ignore

        graph = StateGraph(AgentConfirmGraphState)
        graph.add_node("precheck", _confirm_precheck)
        graph.add_node("verify_offer", _confirm_verify_offer)
        graph.add_node("create_order", _confirm_create_order)
        graph.add_edge(START, "precheck")
        graph.add_edge("precheck", "verify_offer")
        graph.add_edge("verify_offer", "create_order")
        graph.add_edge("create_order", END)
        app = graph.compile()
        return await app.ainvoke(state)
    except Exception:
        state.update(_confirm_precheck(state))
        state.update(await _confirm_verify_offer(state))
        state.update(await _confirm_create_order(state))
        return state
