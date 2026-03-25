"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  CloudRain,
  CloudSun,
  ExternalLink,
  Hotel,
  IndianRupee,
  Loader2,
  LogOut,
  Plane,
  Plus,
  Sofa,
  Sun,
  TrainFront,
  TriangleAlert,
  UtensilsCrossed,
  X,
} from "lucide-react";

import type {
  AgentProposeResponse,
  DisruptionEventPublic,
  MonitorStatusResponse,
  TripDetailPublic,
  TripLegPublic,
} from "@/lib/api-types";

import "./reroute-dashboard-a.css";
import "./reroute-dashboard-b.css";

type LogDot = "g" | "a" | "r" | "b";

type LogLine = {
  id: string;
  time: string;
  dot: LogDot;
  children: React.ReactNode;
};

const INITIAL_LOGS: LogLine[] = [
  { id: "1", time: "07:31", dot: "r", children: (
    <>
      <span className="tg-hi-r">Disruption:</span> <span className="tg-hi">6E-204</span> cancelled by airline
    </>
  ) },
  { id: "2", time: "07:31", dot: "b", children: <>Cascade check initiated for trip <span className="tg-hi">Q4-032</span></> },
  { id: "3", time: "07:32", dot: "b", children: <>Called <span className="tg-hi">search_flights</span>(DEL, BLR, Mar 25)</> },
  { id: "4", time: "07:32", dot: "b", children: <>Called <span className="tg-hi">search_trains</span>(NDLS, SBC, Mar 25)</> },
  { id: "5", time: "07:32", dot: "b", children: <>Called <span className="tg-hi">search_multimodal</span>(DEL → BLR via HYD)</> },
  { id: "6", time: "07:33", dot: "g", children: <><span className="tg-hi-g">3 alternatives found.</span> Scored by ETA, cost, preference</> },
  { id: "7", time: "07:33", dot: "b", children: <>Called <span className="tg-hi">check_hotel_policy</span>(TAJ-BLR-8821)</> },
  { id: "8", time: "07:33", dot: "g", children: <><span className="tg-hi-g">Hotel updated.</span> Late check-in confirmed 00:30</> },
  { id: "9", time: "07:33", dot: "a", children: <>Calendar event <span className="tg-hi">&quot;9 AM BLR meeting&quot;</span> flagged at-risk</> },
  { id: "10", time: "07:34", dot: "b", children: <>Called <span className="tg-hi">check_compensation</span>(6E-204, country: IN)</> },
  { id: "11", time: "07:34", dot: "g", children: <><span className="tg-hi-g">DGCA eligible.</span> ₹10,000 claim document ready</> },
  { id: "12", time: "07:34", dot: "b", children: <>Called <span className="tg-hi">suggest_lounge</span>(DEL, T1D, gate B)</> },
  { id: "13", time: "07:34", dot: "g", children: <><span className="tg-hi-g">Dashboard ready.</span> Awaiting rebooking confirmation</> },
];

const dotClass: Record<LogDot, string> = {
  g: "tg-ld-g",
  a: "tg-ld-a",
  r: "tg-ld-r",
  b: "tg-ld-b",
};

export type ReRouteDashboardBridge = {
  state: "loading" | "empty" | "ready" | "error";
  errorMessage: string | null;
  tripId: string | null;
  detail: TripDetailPublic | null;
  monitor: MonitorStatusResponse | null;
  events: DisruptionEventPublic[];
  proposal: AgentProposeResponse | null;
  proposing: boolean;
  confirming: boolean;
  confirmError: string | null;
  creatingDemo: boolean;
  runPropose: (simulate?: string | null) => Promise<void>;
  runConfirm: (selectedOptionId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  createDemoTrip: () => Promise<void>;
};

function snapshotPrimaryFlight(snapshot: Record<string, unknown> | undefined): {
  flight_number?: string;
  date?: string;
  origin?: string;
  destination?: string;
} | null {
  if (!snapshot || typeof snapshot.legs !== "object" || !snapshot.legs) return null;
  const legs = snapshot.legs as Record<string, unknown>;
  const pf = legs.primary_flight;
  if (!pf || typeof pf !== "object") return null;
  return pf as { flight_number?: string; date?: string; origin?: string; destination?: string };
}

function breadcrumbFromLegs(legs: TripLegPublic[]): string[] {
  if (legs.length === 0) return [];
  const sorted = [...legs].sort((a, b) => a.segment_order - b.segment_order);
  const codes: string[] = [sorted[0].origin_code];
  for (const leg of sorted) {
    codes.push(leg.destination_code);
  }
  return [...new Set(codes)];
}

function formatTripEyebrow(detail: TripDetailPublic): string {
  const t = detail.trip.updated_at?.slice(0, 10);
  return t ? `Active trip · updated ${t}` : "Active trip";
}

function eventDot(kind: string): LogDot {
  const k = kind.toLowerCase();
  if (k.includes("disrupt") || k.includes("cancel")) return "r";
  if (k.includes("warn") || k.includes("proposal")) return "a";
  if (k.includes("confirm") || k.includes("resolve")) return "g";
  return "b";
}

function buildApiLogs(events: DisruptionEventPublic[], toolTrace: string[] | undefined): LogLine[] {
  const rows: LogLine[] = [];
  let seq = 0;
  for (const line of toolTrace ?? []) {
    seq += 1;
    rows.push({
      id: `tt-${seq}`,
      time: "—",
      dot: "b",
      children: <>{line}</>,
    });
  }
  const sortedEv = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const ev of sortedEv) {
    seq += 1;
    const d = new Date(ev.created_at);
    const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    rows.push({
      id: ev.id,
      time,
      dot: eventDot(ev.kind),
      children: (
        <>
          <span className="tg-hi-r">{ev.kind}</span>
          {ev.disruption_type ? <> · {ev.disruption_type}</> : null}
        </>
      ),
    });
  }
  return rows;
}

function optionModalityIcon(modality: string | undefined) {
  const m = (modality ?? "flight").toLowerCase();
  if (m.includes("train")) return <TrainFront aria-hidden />;
  if (m.includes("car") || m.includes("ground") || m.includes("cab")) return <Car aria-hidden />;
  return <Plane aria-hidden />;
}

function apiBannerCopy(b: ReRouteDashboardBridge): { title: string; sub: string } | null {
  const ro = b.proposal?.ranked_options ?? [];
  if (ro.length > 0) {
    return {
      title: `Rebooking options ready (${ro.length})`,
      sub: ro[0]?.summary ? `${ro[0].summary}` : "Review ranked alternatives below.",
    };
  }
  const dis = [...b.events]
    .filter((e) => e.disruption_type)
    .sort((a, x) => new Date(x.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (dis) {
    return {
      title: `Disruption: ${dis.disruption_type ?? dis.kind}`,
      sub: "Run the agent to fetch ranked alternatives.",
    };
  }
  return null;
}

type ToastItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  iconTone?: "default" | "money";
};

type ReRouteDashboardProps = {
  userLabel: string;
  onLogout: () => void;
  bridge?: ReRouteDashboardBridge;
};

export function ReRouteDashboard({ userLabel, onLogout, bridge }: ReRouteDashboardProps) {
  const optsRef = useRef<HTMLDivElement>(null);
  const logWrapRef = useRef<HTMLDivElement>(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [apiConfirmedOptionId, setApiConfirmedOptionId] = useState<string | null>(null);
  const [meetingStatus, setMeetingStatus] = useState<"pending" | "moved" | "kept">("pending");
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [barsReady, setBarsReady] = useState(false);
  const [compFillPct, setCompFillPct] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>(INITIAL_LOGS);
  const [extraApiLogs, setExtraApiLogs] = useState<LogLine[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useId();

  const isApi = Boolean(bridge);
  const isApiReady = Boolean(bridge && bridge.state === "ready" && bridge.detail);

  useEffect(() => {
    if (bridge?.proposal?.proposal_id) setApiConfirmedOptionId(null);
  }, [bridge?.proposal?.proposal_id]);

  useEffect(() => {
    setExtraApiLogs([]);
  }, [bridge?.tripId]);

  const sortedLegs = useMemo(() => {
    if (!isApiReady || !bridge?.detail) return [];
    return [...bridge.detail.legs].sort((a, b) => a.segment_order - b.segment_order);
  }, [isApiReady, bridge]);

  const primaryFromSnapshot = useMemo(() => {
    if (!isApiReady || !bridge?.detail) return null;
    return snapshotPrimaryFlight(bridge.detail.trip.snapshot as Record<string, unknown>);
  }, [isApiReady, bridge]);

  const citiesLine = useMemo(() => {
    const b = breadcrumbFromLegs(sortedLegs);
    if (b.length) return b;
    if (primaryFromSnapshot?.origin && primaryFromSnapshot?.destination) {
      return [primaryFromSnapshot.origin, primaryFromSnapshot.destination];
    }
    return ["—"];
  }, [sortedLegs, primaryFromSnapshot]);

  const apiBaseLogs = useMemo(() => {
    if (!isApiReady || !bridge) return [];
    const merged = buildApiLogs(bridge.events, bridge.proposal?.tool_trace_summary);
    if (merged.length) return merged;
    return [
      {
        id: "ph-api",
        time: "—",
        dot: "b" as LogDot,
        children: <>No audit events yet. Run the agent to populate traces.</>,
      },
    ];
  }, [isApiReady, bridge]);

  const displayLogs = isApiReady ? [...apiBaseLogs, ...extraApiLogs] : logs;

  const pushToast = useCallback(
    (icon: React.ReactNode, title: string, text: string, iconTone: ToastItem["iconTone"] = "default") => {
      const id = `${toastId}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, icon, title, text, iconTone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);
    },
    [toastId],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addLog = useCallback(
    (dot: LogDot, children: React.ReactNode) => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const row: LogLine = { id: `${Date.now()}`, time, dot, children };
      if (isApiReady) {
        setExtraApiLogs((prev) => [...prev, row]);
      } else {
        setLogs((prev) => [...prev, row]);
      }
    },
    [isApiReady],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setBarsReady(true);
      setCompFillPct(60);
    }, 350);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = logWrapRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayLogs]);

  useEffect(() => {
    if (isApi) return;
    const id = window.setTimeout(() => {
      pushToast(<Check aria-hidden />, "Hotel updated automatically", "Taj MG Road late check-in confirmed for 00:30 AM. No action needed.");
    }, 400);
    return () => window.clearTimeout(id);
  }, [pushToast, isApi]);

  const scrollToOpts = () => optsRef.current?.scrollIntoView({ behavior: "smooth" });

  async function confirmOpt(id: string, name: string) {
    if (isApiReady && bridge) {
      const ok = await bridge.runConfirm(id);
      if (!ok) return;
      setApiConfirmedOptionId(id);
      addLog("g", (
        <>
          <span className="tg-hi-g">Confirmed:</span> <span className="tg-hi">{name}</span> — updating itinerary
        </>
      ));
      pushToast(<Check aria-hidden />, "Booking confirmed", `${name} selected. Itinerary updated across all segments.`);
      return;
    }
    setConfirmedId(id);
    addLog("g", (
      <>
        <span className="tg-hi-g">Confirmed:</span> <span className="tg-hi">{name}</span> — updating itinerary
      </>
    ));
    pushToast(<Check aria-hidden />, "Booking confirmed", `${name} selected. Itinerary updated across all segments.`);
  }

  function resolveMeeting(action: "moved" | "kept") {
    if (action === "moved") {
      setMeetingStatus("moved");
      addLog("g", <>Calendar updated. <span className="tg-hi-g">3 attendees notified.</span></>);
      pushToast(<Calendar aria-hidden />, "Meeting rescheduled", "9 AM moved to 11 AM. Invite sent to 3 attendees.");
    } else {
      setMeetingStatus("kept");
      addLog("a", <><span className="tg-hi-a">Meeting kept at 9 AM.</span> Tight but feasible.</>);
    }
  }

  function submitClaim() {
    setClaimSubmitted(true);
    setCompFillPct(100);
    addLog("g", <><span className="tg-hi-g">Compensation claim filed.</span> Ref: DGCA-2026-0893</>);
    pushToast(<IndianRupee aria-hidden />, "Claim submitted", "₹10,000 claim filed under DGCA rules. Processing: 7–14 days.", "money");
  }

  const showTripBody = !bridge || bridge.state === "ready";
  const segmentPulseLabel =
    isApiReady && bridge?.detail
      ? `Monitoring ${Math.max(bridge.detail.legs.length || 1, bridge.detail.segments.length, 1)} segments`
      : "Monitoring 3 segments";
  const apiBanner = isApiReady && bridge ? apiBannerCopy(bridge) : null;

  return (
    <div className="tg-dashboard-root">
      <div className="tg-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="tg-toast">
            <div className={`tg-toast-icon ${t.iconTone === "money" ? "tg-toast-icon-money" : ""}`}>{t.icon}</div>
            <div className="tg-toast-body">
              <div className="tg-toast-title">{t.title}</div>
              <div className="tg-toast-text">{t.text}</div>
            </div>
            <button type="button" className="tg-toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <div className="tg-wrap">
        <div className="tg-topbar">
          <div className="tg-logo">
            <span className="tg-logo-name">
              ReRoute <em>AI</em>
            </span>
            <span className="tg-logo-pill">Agent active</span>
          </div>
          <div className="tg-topbar-right">
            <div className="tg-pulse-wrap">
              <div className="tg-pulse" aria-hidden />
              <span className="tg-pulse-label">{segmentPulseLabel}</span>
            </div>
            <span className="tg-user-pill" title={userLabel}>
              {userLabel}
            </span>
            <button type="button" className="tg-btn" onClick={onLogout}>
              <LogOut size={15} aria-hidden />
              Log out
            </button>
            <button type="button" className="tg-btn tg-btn-primary">
              <Plus size={15} aria-hidden />
              New Trip
            </button>
          </div>
        </div>

        {bridge && bridge.state === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-[#6b6558]">
            <Loader2 className="h-8 w-8 shrink-0 animate-spin opacity-60" aria-hidden />
            Loading trip data…
          </div>
        ) : null}

        {bridge && bridge.state === "empty" ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <div className="tg-trip-title">No trips yet</div>
            <p className="tg-muted max-w-md text-sm">
              Create a demo trip to load itinerary, monitor status, and run the agent against your snapshot.
            </p>
            <button
              type="button"
              className="tg-btn tg-btn-primary inline-flex items-center gap-2"
              disabled={bridge.creatingDemo}
              onClick={() => void bridge.createDemoTrip()}
            >
              {bridge.creatingDemo ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
              Create demo trip
            </button>
          </div>
        ) : null}

        {bridge && bridge.state === "error" ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <p className="text-sm text-red-700">{bridge.errorMessage ?? "Something went wrong."}</p>
            <button type="button" className="tg-btn tg-btn-primary" onClick={() => void bridge.refresh()}>
              Retry
            </button>
          </div>
        ) : null}

        {showTripBody ? (
          <>
            {bannerVisible && !isApi ? (
              <div className="tg-disruption-banner">
                <div className="tg-banner-icon" aria-hidden>
                  <AlertTriangle />
                </div>
                <div className="tg-banner-body">
                  <div className="tg-banner-title">Flight 6E-204 (New Delhi → Bengaluru) has been cancelled</div>
                  <div className="tg-banner-sub">
                    Agent found 3 alternatives · Hotel check-in updated · 2 downstream effects resolved automatically
                  </div>
                </div>
                <div className="tg-banner-actions">
                  <button type="button" className="tg-btn-sm tg-btn-ghost-sm" onClick={() => setBannerVisible(false)}>
                    Dismiss
                  </button>
                  <button type="button" className="tg-btn-sm tg-btn-red" onClick={scrollToOpts}>
                    View options
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {bannerVisible && isApiReady && bridge && apiBanner ? (
              <div className="tg-disruption-banner">
                <div className="tg-banner-icon" aria-hidden>
                  <AlertTriangle />
                </div>
                <div className="tg-banner-body">
                  <div className="tg-banner-title">{apiBanner.title}</div>
                  <div className="tg-banner-sub">{apiBanner.sub}</div>
                </div>
                <div className="tg-banner-actions">
                  <button type="button" className="tg-btn-sm tg-btn-ghost-sm" onClick={() => setBannerVisible(false)}>
                    Dismiss
                  </button>
                  <button type="button" className="tg-btn-sm tg-btn-red" onClick={scrollToOpts}>
                    View options
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="tg-trip-head">
              <div>
                {!isApiReady ? (
                  <>
                    <div className="tg-trip-eyebrow">Active trip · Mar 25–28, 2026</div>
                    <div className="tg-trip-title">Business — Q4 Review Circuit</div>
                    <div className="tg-trip-breadcrumb">
                      <span className="tg-city">New Delhi</span>
                      <span className="tg-sep">→</span>
                      <span className="tg-city">Bengaluru</span>
                      <span className="tg-sep">→</span>
                      <span className="tg-city">Mumbai</span>
                      <span className="tg-muted"> · 3 segments</span>
                    </div>
                  </>
                ) : bridge?.detail ? (
                  <>
                    <div className="tg-trip-eyebrow">{formatTripEyebrow(bridge.detail)}</div>
                    <div className="tg-trip-title">{bridge.detail.trip.title?.trim() || "Untitled trip"}</div>
                    <div className="tg-trip-breadcrumb">
                      {citiesLine.map((city, i) => (
                        <span key={`${city}-${i}`}>
                          {i > 0 ? <span className="tg-sep">→</span> : null}
                          <span className="tg-city">{city}</span>
                        </span>
                      ))}
                      <span className="tg-muted">
                        {" "}
                        · rev {bridge.detail.trip.itinerary_revision} · {sortedLegs.length || 1} leg
                        {(sortedLegs.length || 1) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
              <div className="tg-tag-row">
                {!isApiReady ? (
                  <>
                    <span className="tg-tag tg-tag-red">1 Cancelled</span>
                    <span className="tg-tag tg-tag-amber">1 Delayed</span>
                    <span className="tg-tag tg-tag-green">1 On track</span>
                    <span className="tg-tag tg-tag-green">Claim ready</span>
                  </>
                ) : bridge ? (
                  <>
                    <span className="tg-tag tg-tag-amber">Phase: {bridge.proposal?.phase ?? "idle"}</span>
                    <span className="tg-tag tg-tag-green">Trip loaded</span>
                    {bridge.proposal?.ranked_options?.length ? (
                      <span className="tg-tag tg-tag-green">{bridge.proposal.ranked_options.length} options</span>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div className="tg-metrics">
              {!isApiReady || !bridge?.monitor ? (
                <>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Disruptions</div>
                    <div className="tg-metric-value tg-mv-red">2</div>
                    <div className="tg-metric-sub">+1 in the last hour</div>
                  </div>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Auto-resolved</div>
                    <div className="tg-metric-value tg-mv-green">3</div>
                    <div className="tg-metric-sub">Hotel · Meeting · Route</div>
                  </div>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Compensation</div>
                    <div className="tg-metric-value tg-mv-green">₹10k</div>
                    <div className="tg-metric-sub">Ready to submit</div>
                  </div>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Time saved</div>
                    <div className="tg-metric-value tg-mv-ink">3.5h</div>
                    <div className="tg-metric-sub">vs. manual resolution</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Trips (monitor)</div>
                    <div className="tg-metric-value tg-mv-ink">{bridge.monitor.trip_count}</div>
                    <div className="tg-metric-sub">Shown: {bridge.monitor.trips_shown}</div>
                  </div>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Pending proposals</div>
                    <div className="tg-metric-value tg-mv-amber">{bridge.monitor.total_pending_proposals}</div>
                    <div className="tg-metric-sub">Across monitored trips</div>
                  </div>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Itinerary revision</div>
                    <div className="tg-metric-value tg-mv-green">{bridge.detail?.trip.itinerary_revision ?? "—"}</div>
                    <div className="tg-metric-sub">Current trip</div>
                  </div>
                  <div className="tg-metric">
                    <div className="tg-metric-label">Audit events</div>
                    <div className="tg-metric-value tg-mv-ink">{bridge.events.length}</div>
                    <div className="tg-metric-sub">This trip</div>
                  </div>
                </>
              )}
            </div>

        <div className="tg-main-grid">
          <div className="tg-col-left">
            <div className="tg-card">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-ink" />
                  Flight segments
                </div>
                <span className="tg-muted">
                  {isApiReady && bridge?.detail?.trip.updated_at
                    ? `Updated ${bridge.detail.trip.updated_at.slice(0, 16).replace("T", " ")}`
                    : "Refreshed 2 min ago"}
                </span>
              </div>

              {!isApiReady ? (
                <>
                  <div className="tg-flight-row">
                    <div className="tg-fl-indicator tg-fi-red" />
                    <div className="tg-fl-body">
                      <div className="tg-fl-top">
                        <span className="tg-fl-num">6E-204</span>
                        <div className="tg-fl-route-text">
                          <span>Delhi</span>
                          <span className="tg-fl-arrow">→</span>
                          <span>Bengaluru</span>
                        </div>
                        <span className="tg-tag tg-tag-red">Cancelled</span>
                      </div>
                      <div className="tg-fl-details">
                        <span className="tg-fl-detail">
                          Scheduled: <strong>07:45</strong>
                        </span>
                        <span className="tg-fl-detail">IndiGo · Crew unavailability</span>
                      </div>
                      <div className="tg-fl-details tg-mt-2">
                        <span className="tg-tag tg-tag-amber tg-fs-10">Agent: 3 alternatives found</span>
                        <span className="tg-tag tg-tag-green tg-fs-10">Hotel notified</span>
                      </div>
                    </div>
                    <div className="tg-fl-right">
                      <button type="button" className="tg-btn tg-btn-compact" onClick={scrollToOpts}>
                        Options
                        <ChevronDown size={14} aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="tg-flight-row">
                    <div className="tg-fl-indicator tg-fi-amber" />
                    <div className="tg-fl-body">
                      <div className="tg-fl-top">
                        <span className="tg-fl-num">6E-789</span>
                        <div className="tg-fl-route-text">
                          <span>Delhi</span>
                          <span className="tg-fl-arrow">→</span>
                          <span>Bengaluru</span>
                        </div>
                        <span className="tg-tag tg-tag-amber">Delayed +2h</span>
                      </div>
                      <div className="tg-fl-details">
                        <span className="tg-fl-detail">
                          Original: <span className="tg-strike">10:15</span> <span className="tg-new-time">12:15</span>
                        </span>
                        <span className="tg-fl-detail">
                          Gate: <strong>B-14</strong>
                        </span>
                        <span className="tg-fl-detail">IndiGo</span>
                      </div>
                      <div className="tg-fl-progress-wrap">
                        <div className="tg-fl-prog-meta">
                          <span>Boarding in 4h 20m</span>
                          <span>45%</span>
                        </div>
                        <div className="tg-fl-prog-track">
                          <div className="tg-fl-prog-fill tg-pfill-amber" style={{ width: "45%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="tg-fl-right">
                      <span className="tg-tag tg-tag-amber tg-fs-10">Alt · option 1</span>
                    </div>
                  </div>

                  <div className="tg-flight-row">
                    <div className="tg-fl-indicator tg-fi-green" />
                    <div className="tg-fl-body">
                      <div className="tg-fl-top">
                        <span className="tg-fl-num">AI-657</span>
                        <div className="tg-fl-route-text">
                          <span>Bengaluru</span>
                          <span className="tg-fl-arrow">→</span>
                          <span>Mumbai</span>
                        </div>
                        <span className="tg-tag tg-tag-green">On track</span>
                      </div>
                      <div className="tg-fl-details">
                        <span className="tg-fl-detail">
                          Departure: <strong>14:50 tomorrow</strong>
                        </span>
                        <span className="tg-fl-detail">Air India · Seat 12A</span>
                      </div>
                      <div className="tg-fl-progress-wrap">
                        <div className="tg-fl-prog-meta">
                          <span>Departs in ~31h</span>
                          <span>Confirmed</span>
                        </div>
                        <div className="tg-fl-prog-track">
                          <div className="tg-fl-prog-fill tg-pfill-green" style={{ width: "100%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="tg-fl-right">
                      <span className="tg-tag tg-tag-green tg-fs-10 tg-tag-inline-icon">
                        <Check aria-hidden />
                        Confirmed
                      </span>
                    </div>
                  </div>
                </>
              ) : sortedLegs.length > 0 ? (
                sortedLegs.map((leg) => (
                  <div key={leg.id} className="tg-flight-row">
                    <div className="tg-fl-indicator tg-fi-green" />
                    <div className="tg-fl-body">
                      <div className="tg-fl-top">
                        <span className="tg-fl-num">{leg.flight_number ?? leg.mode}</span>
                        <div className="tg-fl-route-text">
                          <span>{leg.origin_code}</span>
                          <span className="tg-fl-arrow">→</span>
                          <span>{leg.destination_code}</span>
                        </div>
                        <span className="tg-tag tg-tag-green">{leg.mode}</span>
                      </div>
                      <div className="tg-fl-details">
                        <span className="tg-fl-detail">
                          Travel date: <strong>{leg.travel_date ?? "—"}</strong>
                        </span>
                        <span className="tg-fl-detail">Order #{leg.segment_order}</span>
                      </div>
                    </div>
                    <div className="tg-fl-right">
                      <button type="button" className="tg-btn tg-btn-compact" onClick={scrollToOpts}>
                        Options
                        <ChevronDown size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))
              ) : primaryFromSnapshot ? (
                <div className="tg-flight-row">
                  <div className="tg-fl-indicator tg-fi-green" />
                  <div className="tg-fl-body">
                    <div className="tg-fl-top">
                      <span className="tg-fl-num">{primaryFromSnapshot.flight_number ?? "—"}</span>
                      <div className="tg-fl-route-text">
                        <span>{primaryFromSnapshot.origin ?? "—"}</span>
                        <span className="tg-fl-arrow">→</span>
                        <span>{primaryFromSnapshot.destination ?? "—"}</span>
                      </div>
                      <span className="tg-tag tg-tag-amber">From snapshot</span>
                    </div>
                    <div className="tg-fl-details">
                      <span className="tg-fl-detail">
                        Date: <strong>{primaryFromSnapshot.date ?? "—"}</strong>
                      </span>
                      <span className="tg-fl-detail">Leg rows will appear after itinerary sync</span>
                    </div>
                  </div>
                  <div className="tg-fl-right">
                    <button type="button" className="tg-btn tg-btn-compact" onClick={scrollToOpts}>
                      Options
                      <ChevronDown size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="tg-muted px-4 py-6 text-sm">No flight legs yet. Trip snapshot is stored — run agent or wait for sync.</p>
              )}
            </div>

            <div className="tg-card" ref={optsRef} id="rebooking-options">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-green" />
                  Rebooking options
                  <span className="tg-typing" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <span className="tg-muted tg-italic-serif">Ranked by arrival + cost</span>
              </div>
              <div className="tg-options-wrap">
                {!isApiReady ? (
                  <>
                    <div className={`tg-opt ${!confirmedId || confirmedId === "6e789" ? "tg-opt-best" : ""}`}>
                      {!confirmedId ? <div className="tg-best-tag">Best</div> : null}
                      <div className="tg-opt-icon">
                        <Plane aria-hidden />
                      </div>
                      <div className="tg-opt-body">
                        <div className="tg-opt-name">IndiGo 6E-789 — stay on delayed flight</div>
                        <div className="tg-opt-meta">
                          <span>DEL → BLR direct</span>
                          <span className="tg-opt-sep">·</span>
                          <span>No extra cost</span>
                          <span className="tg-opt-sep">·</span>
                          <span>Same airline</span>
                        </div>
                      </div>
                      <div className="tg-opt-right">
                        <div className="tg-opt-time">15:30</div>
                        <div className="tg-opt-delta-bad">+2h 15m</div>
                        <button
                          type="button"
                          className={`tg-opt-btn ${
                            confirmedId === "6e789" ? "tg-opt-btn-primary" : confirmedId ? "tg-opt-btn-ghost" : "tg-opt-btn-primary"
                          }`}
                          onClick={() => void confirmOpt("6e789", "6E-789")}
                        >
                          {confirmedId === "6e789" ? (
                            <>
                              <Check size={12} aria-hidden />
                              Confirmed
                            </>
                          ) : confirmedId ? (
                            "Select"
                          ) : (
                            <>
                              Confirm
                              <ChevronRight size={12} aria-hidden />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={`tg-opt ${confirmedId === "train" ? "tg-opt-best" : ""}`}>
                      <div className="tg-opt-icon">
                        <TrainFront aria-hidden />
                      </div>
                      <div className="tg-opt-body">
                        <div className="tg-opt-name">Rajdhani Express — NDLS to SBC</div>
                        <div className="tg-opt-meta">
                          <span>Departs 08:00</span>
                          <span className="tg-opt-sep">·</span>
                          <span>AC First Class</span>
                          <span className="tg-opt-sep">·</span>
                          <span>~26h</span>
                        </div>
                      </div>
                      <div className="tg-opt-right">
                        <div className="tg-opt-time">+1 day</div>
                        <div className="tg-opt-delta-bad">+26h</div>
                        <button
                          type="button"
                          className={`tg-opt-btn ${confirmedId === "train" ? "tg-opt-btn-primary" : "tg-opt-btn-ghost"}`}
                          onClick={() => void confirmOpt("train", "Rajdhani Express")}
                        >
                          {confirmedId === "train" ? (
                            <>
                              <Check size={12} aria-hidden />
                              Confirmed
                            </>
                          ) : (
                            "Select"
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={`tg-opt ${confirmedId === "hyd" ? "tg-opt-best" : ""}`}>
                      <div className="tg-opt-icon tg-opt-icon-sm tg-opt-icon-row">
                        <Plane aria-hidden />
                        <Car aria-hidden />
                      </div>
                      <div className="tg-opt-body">
                        <div className="tg-opt-name">Fly to Hyderabad, cab to Bengaluru</div>
                        <div className="tg-opt-meta">
                          <span>AI-401 08:30</span>
                          <span className="tg-opt-sep">·</span>
                          <span>3h drive (170 km)</span>
                          <span className="tg-opt-sep">·</span>
                          <span>+₹3,200</span>
                        </div>
                      </div>
                      <div className="tg-opt-right">
                        <div className="tg-opt-time">14:00</div>
                        <div className="tg-opt-delta-bad">+3h 45m</div>
                        <button
                          type="button"
                          className={`tg-opt-btn ${confirmedId === "hyd" ? "tg-opt-btn-primary" : "tg-opt-btn-ghost"}`}
                          onClick={() => void confirmOpt("hyd", "HYD + Cab")}
                        >
                          {confirmedId === "hyd" ? (
                            <>
                              <Check size={12} aria-hidden />
                              Confirmed
                            </>
                          ) : (
                            "Select"
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : bridge ? (
                  <>
                    {bridge.confirmError ? (
                      <p className="tg-muted border-b border-[#e8e4dc] px-4 py-2 text-sm text-red-700">{bridge.confirmError}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 border-b border-[#e8e4dc] px-4 py-3">
                      <button
                        type="button"
                        className="tg-btn tg-btn-compact"
                        disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                        onClick={() => void bridge.runPropose(null)}
                      >
                        {bridge.proposing ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
                        Run agent
                      </button>
                      <button
                        type="button"
                        className="tg-btn tg-btn-compact"
                        disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                        onClick={() => void bridge.runPropose("cancel")}
                      >
                        Simulate cancel
                      </button>
                      <button
                        type="button"
                        className="tg-btn tg-btn-compact"
                        disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                        onClick={() => void bridge.runPropose("delay")}
                      >
                        Simulate delay
                      </button>
                    </div>
                    {bridge.proposal?.ranked_options?.length ? (
                      bridge.proposal.ranked_options.map((opt, idx) => {
                        const isBest = idx === 0 && !apiConfirmedOptionId;
                        const isSel = apiConfirmedOptionId === opt.option_id;
                        return (
                          <div key={opt.option_id} className={`tg-opt ${isBest || isSel ? "tg-opt-best" : ""}`}>
                            {isBest ? <div className="tg-best-tag">Best</div> : null}
                            <div className="tg-opt-icon">{optionModalityIcon(opt.modality)}</div>
                            <div className="tg-opt-body">
                              <div className="tg-opt-name">{opt.summary}</div>
                              <div className="tg-opt-meta">
                                <span>Score {opt.score.toFixed(2)}</span>
                                <span className="tg-opt-sep">·</span>
                                <span>{opt.modality ?? "flight"}</span>
                                <span className="tg-opt-sep">·</span>
                                <span>{opt.option_id}</span>
                              </div>
                            </div>
                            <div className="tg-opt-right">
                              <div className="tg-opt-time">#{idx + 1}</div>
                              <div className="tg-opt-delta-bad">ranked</div>
                              <button
                                type="button"
                                className={`tg-opt-btn ${
                                  isSel ? "tg-opt-btn-primary" : apiConfirmedOptionId ? "tg-opt-btn-ghost" : "tg-opt-btn-primary"
                                }`}
                                disabled={bridge.confirming || !bridge.proposal}
                                onClick={() => void confirmOpt(opt.option_id, opt.summary)}
                              >
                                {isSel ? (
                                  <>
                                    <Check size={12} aria-hidden />
                                    Confirmed
                                  </>
                                ) : apiConfirmedOptionId ? (
                                  "Select"
                                ) : (
                                  <>
                                    Confirm
                                    <ChevronRight size={12} aria-hidden />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="tg-muted px-4 py-6 text-sm">
                        No proposal yet. Use Run agent, or simulate cancel / delay for demo disruptions.
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div className="tg-card">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-amber" />
                  Ripple effect — cascade handled
                </div>
                <span className="tg-tag tg-tag-green" style={{ fontSize: 10 }}>
                  {isApiReady && bridge?.proposal?.cascade_preview ? "Agent preview" : "3 of 3 resolved"}
                </span>
              </div>
              <div className="tg-cascade-wrap">
                {isApiReady && bridge?.proposal?.cascade_preview ? (
                  <div className="tg-cascade-item tg-ci-warn">
                    <div className="tg-ci-icon tg-cii-amber">
                      <TriangleAlert aria-hidden />
                    </div>
                    <div className="tg-ci-body">
                      <div className="tg-ci-title">Cascade preview (API)</div>
                      <div className="tg-ci-sub max-h-28 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug">
                        {JSON.stringify(bridge.proposal.cascade_preview, null, 2)}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="tg-cascade-item tg-ci-resolved">
                  <div className="tg-ci-icon tg-cii-green">
                    <Check aria-hidden />
                  </div>
                  <div className="tg-ci-body">
                    <div className="tg-ci-title">Hotel Taj MG Road — late check-in confirmed</div>
                    <div className="tg-ci-sub">
                      Original 22:00 updated to 00:30. Hotel acknowledged. No cancellation fee.
                    </div>
                  </div>
                  <div className="tg-ci-end">
                    <span className="tg-status-pill tg-sp-green">Done</span>
                  </div>
                </div>

                <div
                  className={`tg-cascade-item ${
                    meetingStatus === "pending" ? "tg-ci-warn" : "tg-ci-resolved"
                  }`}
                >
                  <div className={`tg-ci-icon ${meetingStatus === "pending" ? "tg-cii-amber" : "tg-cii-green"}`}>
                    {meetingStatus === "pending" ? <Calendar aria-hidden /> : <Check aria-hidden />}
                  </div>
                  <div className="tg-ci-body">
                    <div className="tg-ci-title">
                      {meetingStatus === "moved"
                        ? "9:00 AM meeting — moved to 11:00 AM"
                        : meetingStatus === "kept"
                          ? "9:00 AM meeting — kept at original time"
                          : "9:00 AM meeting — suggested move to 11:00 AM"}
                    </div>
                    <div className="tg-ci-sub">
                      {meetingStatus === "pending"
                        ? "Arriving ~00:30 AM. 9 AM is a tight ask. Invite drafted for 3 attendees."
                        : meetingStatus === "moved"
                          ? "Calendar updated and invites sent."
                          : "You chose to keep the original slot."}
                    </div>
                  </div>
                  <div className="tg-ci-end">
                    {meetingStatus === "pending" ? (
                      <>
                        <button type="button" className="tg-ci-btn tg-cib-green" onClick={() => resolveMeeting("moved")}>
                          Move it
                        </button>
                        <button type="button" className="tg-ci-btn tg-cib-ghost" onClick={() => resolveMeeting("kept")}>
                          Keep it
                        </button>
                      </>
                    ) : meetingStatus === "moved" ? (
                      <span className="tg-status-pill tg-sp-green">Moved</span>
                    ) : (
                      <span className="tg-status-pill tg-sp-gray">Kept</span>
                    )}
                  </div>
                </div>

                <div className="tg-cascade-item tg-ci-resolved">
                  <div className="tg-ci-icon tg-cii-green">
                    <Check aria-hidden />
                  </div>
                  <div className="tg-ci-body">
                    <div className="tg-ci-title">BLR → BOM connection still viable</div>
                    <div className="tg-ci-sub">
                      AI-657 departs 14:50 tomorrow. 15h+ buffer with revised arrival. No action needed.
                    </div>
                  </div>
                  <div className="tg-ci-end">
                    <span className="tg-status-pill tg-sp-green">Safe</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tg-status-footer">
              <div className="tg-sf-check">
                <Check aria-hidden />
              </div>
              <div className="tg-sf-body">
                <div className="tg-sf-title">Your trip is back on track.</div>
                <div className="tg-sf-sub">
                  3 downstream effects resolved automatically · Rebooking awaits your confirmation · Compensation claim ready
                </div>
              </div>
              <button type="button" className="tg-btn tg-btn-primary">
                Share itinerary
                <ExternalLink size={15} aria-hidden />
              </button>
            </div>
          </div>

          <div className="tg-col-right">
            <div className="tg-card">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-green" />
                  Compensation
                </div>
                <span className="tg-status-pill tg-sp-green">Eligible</span>
              </div>
              <div className="tg-comp-body">
                <div className="tg-comp-amount">
                  <span className="tg-comp-cur">₹</span>
                  <span className="tg-comp-num">10,000</span>
                </div>
                <div className="tg-comp-label">Estimated entitlement</div>
                <div className="tg-comp-rule">
                  Under <strong>DGCA Circular No. 13/2010</strong>, cancellations due to airline fault with &lt;14 days notice
                  entitle you to compensation. Crew unavailability qualifies.
                </div>
                {isApiReady && bridge?.proposal?.compensation_draft ? (
                  <div className="mb-3 max-h-24 overflow-y-auto rounded border border-[#e8e4dc] bg-[#faf8f3] p-2 font-mono text-[11px] leading-snug text-[#5c574d]">
                    {JSON.stringify(bridge.proposal.compensation_draft, null, 2)}
                  </div>
                ) : null}
                <div className="tg-comp-prog-head">
                  <span>Claim progress</span>
                  <span>{claimSubmitted ? "Step 3 of 3" : "Step 2 of 3"}</span>
                </div>
                <div className="tg-comp-track">
                  <div className="tg-comp-fill" style={{ width: `${compFillPct}%` }} />
                </div>
                <button
                  type="button"
                  className={`tg-btn tg-btn-primary tg-claim-full ${claimSubmitted ? "tg-opacity-70" : ""}`}
                  disabled={claimSubmitted}
                  onClick={submitClaim}
                >
                  {claimSubmitted ? (
                    <>
                      <Check size={15} aria-hidden />
                      Claim submitted
                    </>
                  ) : (
                    <>
                      Review & submit claim
                      <ChevronRight size={15} aria-hidden />
                    </>
                  )}
                </button>
                <div className="tg-perks">
                  <div className="tg-perk">
                    <span className="tg-perk-icon">
                      <UtensilsCrossed aria-hidden />
                    </span>
                    Meal voucher ₹400 — show at counter
                  </div>
                  <div className="tg-perk">
                    <span className="tg-perk-icon">
                      <Sofa aria-hidden />
                    </span>
                    Lounge access — Gate B12, 3 min walk
                  </div>
                  <div className="tg-perk">
                    <span className="tg-perk-icon">
                      <Hotel aria-hidden />
                    </span>
                    Hotel if next departure &gt;8h away
                  </div>
                </div>
              </div>
            </div>

            <div className="tg-card">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-ink" />
                  Predictive radar
                </div>
                <span className="tg-muted">Live</span>
              </div>
              <div className="tg-radar-wrap">
                <div className="tg-radar-row">
                  <div className="tg-radar-fl">6E-789</div>
                  <div className="tg-radar-track-wrap">
                    <div className="tg-radar-meta">
                      <span>On-time probability</span>
                    </div>
                    <div className="tg-radar-track">
                      <div className="tg-radar-bar tg-rb-amber" style={{ width: barsReady ? "52%" : "0%" }} />
                    </div>
                  </div>
                  <div className="tg-radar-pct tg-text-amber">52%</div>
                </div>
                <div className="tg-radar-row">
                  <div className="tg-radar-fl">AI-657</div>
                  <div className="tg-radar-track-wrap">
                    <div className="tg-radar-meta">
                      <span>On-time probability</span>
                    </div>
                    <div className="tg-radar-track">
                      <div className="tg-radar-bar tg-rb-green" style={{ width: barsReady ? "88%" : "0%" }} />
                    </div>
                  </div>
                  <div className="tg-radar-pct tg-text-green-mid">88%</div>
                </div>
                <div className="tg-radar-warn">
                  <strong className="tg-radar-warn-title">6E-789 risk factors</strong>
                  Inbound aircraft from Chennai +40 min late · DEL peak congestion 38% · Weather: clear
                </div>
              </div>
            </div>

            <div className="tg-card">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-ink" />
                  Airport weather
                </div>
              </div>
              <div className="tg-wx-grid">
                <div className="tg-wx-cell">
                  <div className="tg-wx-city">DEL · Origin</div>
                  <div className="tg-wx-main">
                    <span className="tg-wx-icon">
                      <Sun aria-hidden />
                    </span>
                    <span className="tg-wx-temp">28°</span>
                  </div>
                  <div className="tg-wx-desc">Clear</div>
                  <div className="tg-wx-wind">12 km/h · Vis 10 km</div>
                </div>
                <div className="tg-wx-cell">
                  <div className="tg-wx-city">BLR · Destination</div>
                  <div className="tg-wx-main">
                    <span className="tg-wx-icon">
                      <CloudSun aria-hidden />
                    </span>
                    <span className="tg-wx-temp">22°</span>
                  </div>
                  <div className="tg-wx-desc">Partly cloudy</div>
                  <div className="tg-wx-wind">8 km/h · Vis 8 km</div>
                </div>
                <div className="tg-wx-cell">
                  <div className="tg-wx-city">BOM · Final</div>
                  <div className="tg-wx-main">
                    <span className="tg-wx-icon">
                      <CloudRain aria-hidden />
                    </span>
                    <span className="tg-wx-temp">31°</span>
                  </div>
                  <div className="tg-wx-desc">Light showers</div>
                  <div className="tg-wx-wind">18 km/h · Vis 5 km</div>
                </div>
                <div className="tg-wx-cell tg-wx-alert-cell">
                  <div className="tg-wx-city tg-wx-alert-title tg-tag-inline-icon">
                    <TriangleAlert aria-hidden />
                    Alert
                  </div>
                  <div className="tg-wx-warn-cell">BOM moderate rainfall Mar 28. No airport impact currently.</div>
                </div>
              </div>
            </div>

            <div className="tg-card">
              <div className="tg-card-head">
                <div className="tg-card-title">
                  <span className="tg-card-title-dot tg-dot-ink" />
                  Agent activity
                </div>
                <span className="tg-tag tg-tag-green" style={{ fontSize: 10 }}>
                  Live
                </span>
              </div>
              <div className="tg-log-wrap" ref={logWrapRef}>
                {displayLogs.map((row) => (
                  <div key={row.id} className="tg-log-row">
                    <span className="tg-log-t">{row.time}</span>
                    <span className={`tg-log-d ${dotClass[row.dot]}`} />
                    <span className="tg-log-txt">{row.children}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
