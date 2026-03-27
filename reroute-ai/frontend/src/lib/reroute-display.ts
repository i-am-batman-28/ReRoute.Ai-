import type { RankedOptionDTO } from "@/lib/api-types";

/** Turn ISO timestamps into a readable local string. */
export function formatFriendlyDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanizeDisruptionType(raw: string): string {
  const t = raw.toLowerCase();
  if (t === "delayed") return "Your flight is delayed — we ranked alternatives below.";
  if (t === "cancelled") return "Your flight was cancelled — see rebooking choices below.";
  if (t === "diverted") return "Your flight was diverted — review options to get back on track.";
  if (t === "unknown") return "Live airline status wasn’t available — check the carrier app and refresh.";
  return raw.replace(/_/g, " ");
}

export type RankedOptionDisplay = {
  route: string;
  arrivalLabel: string;
  priceLabel: string | null;
  modalityLabel: string;
  bookingRefShort: string;
  optionTitle: string;
  carrierName: string | null;
  carrierLogo: string | null;
  flightNumber: string | null;
};

/** Structured labels for cards — avoids one cluttered `summary` line. */
export function getRankedOptionDisplay(opt: RankedOptionDTO, index: number): RankedOptionDisplay {
  const leg = opt.legs?.[0];
  const lastLeg = opt.legs?.length ? opt.legs[opt.legs.length - 1] : undefined;
  const from = typeof leg?.from === "string" ? leg.from : undefined;
  const to = typeof lastLeg?.to === "string" ? lastLeg.to : typeof leg?.to === "string" ? leg.to : undefined;
  const arrivalFromLeg =
    typeof lastLeg?.arrival_time === "string" ? lastLeg.arrival_time : typeof leg?.arrival_time === "string" ? leg.arrival_time : undefined;

  const summary = opt.summary;
  const arriveMatch = summary.match(/arrive=([^\s]+)/) ?? summary.match(/arrive\s+([^\s·]+)/);
  // Try the new price_display field first, then regex fallback for both old (cost=USD 123) and new (· USD 123 ·) formats
  const costMatch = summary.match(/cost=([A-Z]{3})\s*([\d.]+)/i) ?? summary.match(/·\s*([A-Z]{3})\s+([\d,.]+)\s*·/i);

  const chainFromLegs = (opt.legs ?? [])
    .map((x) => (typeof x?.from === "string" ? x.from : null))
    .filter(Boolean) as string[];
  const tailTo = typeof lastLeg?.to === "string" ? lastLeg.to : null;
  const routeChain = chainFromLegs.length && tailTo ? [...chainFromLegs, tailTo].join(" → ") : null;
  const route =
    routeChain ??
    (from && to
      ? `${from} → ${to}`
      : summary
          .replace(/^Option\s+\d+:\s*/i, "")
          .split(/\s+arrive=/)[0]
          ?.trim() || `Option ${index + 1}`);

  const directArrival = (opt as Record<string, unknown>).arrival_display;
  const arrivalIso = arriveMatch?.[1] ?? arrivalFromLeg;
  const arrivalLabel = typeof directArrival === "string" && directArrival
    ? directArrival
    : formatFriendlyDateTime(arrivalIso);

  // Prefer direct price_display field from backend, fallback to regex extraction
  const directPrice = (opt as Record<string, unknown>).price_display;
  const priceLabel = typeof directPrice === "string" && directPrice
    ? directPrice
    : costMatch ? `${costMatch[1]} ${costMatch[2]}` : null;

  const baseModality = (opt.modality ?? "flight").replace(/_/g, " ");
  const stopCount = Math.max(0, (opt.legs?.length ?? 1) - 1);
  const stopsLabel = stopCount === 0 ? "non-stop" : `${stopCount} stop${stopCount === 1 ? "" : "s"}`;
  const modalityLabel = `${baseModality} · ${stopsLabel}`;

  const id = opt.option_id;
  const bookingRefShort =
    id.startsWith("mock_") || id.startsWith("mock_offer")
      ? "Demo fare"
      : id.length > 10
        ? `Ref …${id.slice(-6)}`
        : id;

  // Carrier info from legs
  const legCarrier = typeof leg?.carrier === "string" ? leg.carrier : null;
  const legFlightNum = typeof leg?.flight_number === "string" ? leg.flight_number : null;
  let carrierName: string | null = legCarrier;
  let carrierLogo: string | null = null;
  try {
    const { extractAirlineCode, findAirlineByIata } = require("@/lib/airlines");
    const code = legFlightNum ? extractAirlineCode(legFlightNum) : null;
    if (code) {
      const a = findAirlineByIata(code);
      if (a) { carrierName = carrierName || a.name; carrierLogo = a.logo; }
    }
  } catch { /* ok */ }

  const optionTitle = `${carrierName ? `${carrierName} · ` : ""}${route}${priceLabel ? ` · ${priceLabel}` : ""}`;

  return {
    route,
    arrivalLabel,
    priceLabel,
    modalityLabel,
    bookingRefShort,
    optionTitle,
    carrierName,
    carrierLogo,
    flightNumber: legFlightNum,
  };
}

export type CascadeBullet = { id: string; label: string; text: string };

/** Human-readable cascade — no raw JSON for default view. */
export function cascadePreviewBullets(preview: Record<string, unknown>): CascadeBullet[] {
  const out: CascadeBullet[] = [];

  const dt = preview.disruption_type;
  if (typeof dt === "string" && dt.trim()) {
    out.push({ id: "situation", label: "Situation", text: humanizeDisruptionType(dt) });
  }

  const mc = preview.missed_connection;
  if (typeof mc === "boolean") {
    out.push({
      id: "connection",
      label: "Connections",
      text: mc
        ? "A connection on your itinerary may be at risk if the delay holds."
        : "Your connections still look feasible with the timing we used.",
    });
  }

  const hotel = preview.hotel_update_message;
  if (typeof hotel === "string" && hotel.trim()) {
    out.push({ id: "hotel", label: "Hotel check-in", text: hotel });
  }

  const meeting = preview.meeting_update_message;
  if (typeof meeting === "string" && meeting.trim()) {
    out.push({ id: "meeting", label: "Meetings & calendar", text: meeting });
  }

  const w = preview.what_we_changed_summary;
  if (Array.isArray(w)) {
    w.forEach((x, i) => {
      if (typeof x === "string" && x.trim()) {
        out.push({ id: `note-${i}`, label: "What we prepared", text: x });
      }
    });
  }

  return out;
}

export type SnapshotTripSummary = {
  primaryRoute: string | null;
  flightNumber: string | null;
  travelDate: string | null;
  scheduledDepartureLabel: string | null;
  scheduledArrivalLabel: string | null;
  travelerLine: string | null;
  weatherLine: string | null;
};

function timeLabelFromLocalField(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.includes("T")) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const m = raw.match(/T(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : null;
  }
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Compact summary of user-entered snapshot fields for trip header / detail. */
export function buildSnapshotTripSummary(snapshot: Record<string, unknown> | undefined): SnapshotTripSummary {
  const empty: SnapshotTripSummary = {
    primaryRoute: null,
    flightNumber: null,
    travelDate: null,
    scheduledDepartureLabel: null,
    scheduledArrivalLabel: null,
    travelerLine: null,
    weatherLine: null,
  };
  if (!snapshot || typeof snapshot.legs !== "object" || !snapshot.legs) return empty;
  const legs = snapshot.legs as Record<string, unknown>;
  const pf = legs.primary_flight;
  if (!pf || typeof pf !== "object") return empty;
  const p = pf as Record<string, unknown>;
  const o = typeof p.origin === "string" ? p.origin : null;
  const dest = typeof p.destination === "string" ? p.destination : null;
  const primaryRoute = o && dest ? `${o}→${dest}` : null;
  const flightNumber = typeof p.flight_number === "string" ? p.flight_number : null;
  const travelDate = typeof p.date === "string" ? p.date : null;
  const scheduledDepartureLabel = timeLabelFromLocalField(p.scheduled_departure_local);
  const scheduledArrivalLabel = timeLabelFromLocalField(p.scheduled_arrival_local);

  let travelerLine: string | null = null;
  const pax = snapshot.passengers;
  if (Array.isArray(pax) && pax.length > 0) {
    const names = pax
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const r = x as { given_name?: string; family_name?: string };
        const gn = typeof r.given_name === "string" ? r.given_name.trim() : "";
        const fn = typeof r.family_name === "string" ? r.family_name.trim() : "";
        return gn || fn ? `${gn} ${fn}`.trim() : null;
      })
      .filter(Boolean) as string[];
    if (names.length) travelerLine = `${names.length} traveler${names.length === 1 ? "" : "s"}: ${names.join(", ")}`;
  }

  let weatherLine: string | null = null;
  const wx = legs.weather;
  if (wx && typeof wx === "object") {
    const w = wx as Record<string, unknown>;
    const hasO = w.origin_lat != null && w.origin_lon != null;
    const hasD = w.destination_lat != null && w.destination_lon != null;
    if (hasO && hasD) weatherLine = "Weather: origin + destination coordinates set";
    else if (hasD) weatherLine = "Weather: destination coordinates set";
    else if (hasO) weatherLine = "Weather: origin coordinates set";
  }

  return {
    primaryRoute,
    flightNumber,
    travelDate,
    scheduledDepartureLabel,
    scheduledArrivalLabel,
    travelerLine,
    weatherLine,
  };
}

/** Optional lines from trip snapshot (meeting/hotel) — only show when present. */
export function snapshotTripAdditions(snapshot: Record<string, unknown> | undefined): { key: string; label: string; text: string }[] {
  const out: { key: string; label: string; text: string }[] = [];
  if (!snapshot || typeof snapshot.legs !== "object" || !snapshot.legs) return out;
  const legs = snapshot.legs as Record<string, unknown>;
  const meeting = legs.meeting;
  if (meeting && typeof meeting === "object" && meeting !== null) {
    const st = (meeting as { scheduled_time_utc?: string }).scheduled_time_utc;
    if (typeof st === "string" && st.trim()) {
      out.push({
        key: "meeting",
        label: "From your trip · meeting",
        text: `A meeting is noted for ${formatFriendlyDateTime(st)}.`,
      });
    }
  }
  const hotel = legs.hotel;
  if (hotel && typeof hotel === "object" && hotel !== null) {
    const name = (hotel as { name?: string }).name;
    const buf = (hotel as { check_in_buffer_minutes?: number }).check_in_buffer_minutes;
    if (typeof name === "string" && name.trim()) {
      out.push({ key: "hotel-name", label: "From your trip · hotel", text: name });
    } else if (typeof buf === "number") {
      out.push({
        key: "hotel-buf",
        label: "From your trip · hotel",
        text: `Check-in buffer: ${buf} minutes (from itinerary snapshot).`,
      });
    }
  }
  return out;
}

/** Softer copy for agent tool trace lines (API log strip). */
export function humanizeToolTraceLine(line: string): string {
  if (line.startsWith("flight_status:")) {
    const m = line.match(/flight_status:\s*(\S+)/);
    const src = line.match(/source=([^)]+)\)/);
    const status = m?.[1] ?? "unknown";
    if (status === "unknown" || line.includes("error")) {
      return "Checked flight status — airline feed didn’t return live data yet.";
    }
    return `Checked flight status (${status}${src ? `, ${src[1]}` : ""}).`;
  }
  if (line.startsWith("weather_origin:")) {
    const s = line.replace(/^weather_origin:\s*/i, "").trim();
    return s === "unavailable" ? "Origin weather unavailable." : `Origin weather: ${s}.`;
  }
  if (line.startsWith("weather_destination:")) {
    const s = line.replace(/^weather_destination:\s*/i, "").trim();
    return s === "unavailable" ? "Destination weather unavailable." : `Destination weather: ${s}.`;
  }
  if (line.startsWith("duffel_offers_count:")) {
    const n = line.match(/duffel_offers_count:\s*(\d+)/);
    const count = n?.[1] ?? "0";
    return `Searched airline offers — ${count} fare(s) available to compare.`;
  }
  if (line.startsWith("offer_date_shift:")) {
    const requested = line.match(/requested=([0-9-]+)/)?.[1];
    const selected = line.match(/selected=([0-9-]+)/)?.[1];
    if (requested && selected && requested !== selected) {
      return `No fare on ${requested}; showed next available date ${selected}.`;
    }
    return "Offer date fallback was evaluated.";
  }
  if (line.startsWith("delay_minutes:")) {
    const m = line.match(/delay_minutes:\s*([^\s]+)/);
    const raw = m?.[1] ?? "unknown";
    const n = Number(raw);
    if (!Number.isFinite(n)) return "Delay duration is not available from the feed.";
    const minutes = Math.max(0, Math.trunc(n));
    const h = Math.floor(minutes / 60);
    const mm = minutes % 60;
    if (h > 0 && mm > 0) return `Delay recorded: ${h}h ${mm}m.`;
    if (h > 0) return `Delay recorded: ${h}h.`;
    return `Delay recorded: ${mm}m.`;
  }
  return line;
}
