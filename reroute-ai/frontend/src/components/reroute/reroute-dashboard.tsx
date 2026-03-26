"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  ExternalLink,
  IndianRupee,
  Loader2,
  LogOut,
  MessageCircle,
  Mic,
  Plane,
  Plus,
  RotateCcw,
  ScrollText,
  Sofa,
  Sparkles,
  TrainFront,
  TriangleAlert,
  UtensilsCrossed,
  X,
} from "lucide-react";

import type {
  AgentConfirmResponse,
  AgentProposeResponse,
  DisruptionEventPublic,
  MonitorStatusResponse,
  TripDetailPublic,
  TripLegPublic,
} from "@/lib/api-types";
import { cn } from "@/lib/cn";
import {
  buildSnapshotTripSummary,
  cascadePreviewBullets,
  getRankedOptionDisplay,
  humanizeToolTraceLine,
  snapshotTripAdditions,
} from "@/lib/reroute-display";

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
      <span className="font-medium text-red-400">Disruption:</span> <span className="text-zinc-200">6E-204</span> cancelled by airline
    </>
  ) },
  { id: "2", time: "07:31", dot: "b", children: <>Cascade check initiated for trip <span className="text-zinc-200">Q4-032</span></> },
  { id: "3", time: "07:32", dot: "b", children: <>Called <span className="text-zinc-200">search_flights</span>(DEL, BLR, Mar 25)</> },
  { id: "4", time: "07:32", dot: "b", children: <>Called <span className="text-zinc-200">search_trains</span>(NDLS, SBC, Mar 25)</> },
  { id: "5", time: "07:32", dot: "b", children: <>Called <span className="text-zinc-200">search_multimodal</span>(DEL → BLR via HYD)</> },
  { id: "6", time: "07:33", dot: "g", children: <><span className="font-medium text-emerald-400">3 alternatives found.</span> Scored by ETA, cost, preference</> },
  { id: "7", time: "07:33", dot: "b", children: <>Called <span className="text-zinc-200">check_hotel_policy</span>(TAJ-BLR-8821)</> },
  { id: "8", time: "07:33", dot: "g", children: <><span className="font-medium text-emerald-400">Hotel updated.</span> Late check-in confirmed 00:30</> },
  { id: "9", time: "07:33", dot: "a", children: <>Calendar event <span className="text-zinc-200">&quot;9 AM BLR meeting&quot;</span> flagged at-risk</> },
  { id: "10", time: "07:34", dot: "b", children: <>Called <span className="text-zinc-200">check_compensation</span>(6E-204, country: IN)</> },
  { id: "11", time: "07:34", dot: "g", children: <><span className="font-medium text-emerald-400">DGCA eligible.</span> ₹10,000 claim document ready</> },
  { id: "12", time: "07:34", dot: "b", children: <>Called <span className="text-zinc-200">suggest_lounge</span>(DEL, T1D, gate B)</> },
  { id: "13", time: "07:34", dot: "g", children: <><span className="font-medium text-emerald-400">Dashboard ready.</span> Awaiting rebooking confirmation</> },
];

const logDotClass: Record<LogDot, string> = {
  g: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.22)]",
  a: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]",
  r: "bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.22)]",
  b: "bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.2)]",
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
  proposeJobState?: string | null;
  confirming: boolean;
  confirmError: string | null;
  /** Agent propose / async job failures (distinct from confirm). */
  proposeError: string | null;
  creatingDemo: boolean;
  runPropose: (simulate?: string | null) => Promise<void>;
  runConfirm: (selectedOptionId: string) => Promise<AgentConfirmResponse | null>;
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
    const friendly = humanizeToolTraceLine(line);
    rows.push({
      id: `tt-${seq}`,
      time: "—",
      dot: "b",
      children: <>{friendly}</>,
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
          <span className="font-medium text-red-400">{ev.kind}</span>
          {ev.disruption_type ? <> · {ev.disruption_type}</> : null}
        </>
      ),
    });
  }
  return rows;
}

function CascadePreviewFriendly({ preview }: { preview: Record<string, unknown> }) {
  const bullets = cascadePreviewBullets(preview);
  if (bullets.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No plain-language summary for this preview. Expand technical details if needed.
      </p>
    );
  }
  return (
    <>
      <ul className="space-y-2.5">
        {bullets.map((b) => (
          <li key={b.id} className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{b.label}</div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-200">{b.text}</p>
          </li>
        ))}
      </ul>
      <details className="group mt-3 border-t border-zinc-800/60 pt-3">
        <summary className="cursor-pointer select-none text-[11px] font-medium text-zinc-500 hover:text-zinc-400">
          Technical details (JSON)
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3 font-mono text-[10px] leading-snug text-zinc-500">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </details>
    </>
  );
}

function optionModalityIcon(modality: string | undefined) {
  const m = (modality ?? "flight").toLowerCase();
  if (m.includes("train")) return <TrainFront aria-hidden />;
  if (m.includes("car") || m.includes("ground") || m.includes("cab")) return <Car aria-hidden />;
  return <Plane aria-hidden />;
}

function readUiDensity(): "calm" | "standard" | "ops" {
  if (typeof window === "undefined") return "standard";
  const v = localStorage.getItem("reroute-ui-density");
  if (v === "calm" || v === "standard" || v === "ops") return v;
  return "standard";
}

function apiBannerCopy(
  b: ReRouteDashboardBridge,
  confirmedForTrip: boolean,
): { title: string; sub: string } | null {
  if (confirmedForTrip) return null;
  const ro = b.proposal?.ranked_options ?? [];
  if (ro.length > 0) {
    return {
      title: `Rebooking options ready (${ro.length})`,
      sub: "Review ranked alternatives below.",
    };
  }
  const dis = [...b.events]
    .filter((e) => e.disruption_type)
    .sort((a, x) => new Date(x.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (dis) {
    return {
      title: `Recorded disruption: ${dis.disruption_type ?? dis.kind}`,
      sub: "The agent used this when you last ran a proposal. Run the agent again to refresh ranked options.",
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

type ControlStep = "run" | "options" | "confirm" | "compensation";

const WORKFLOW_STEP_ORDER: ControlStep[] = ["run", "options", "confirm", "compensation"];

type ReRouteDashboardProps = {
  userLabel: string;
  onLogout: () => void;
  bridge?: ReRouteDashboardBridge;
  /** Hide marketing top bar; use with app shell navigation. */
  embedded?: boolean;
};

export function ReRouteDashboard({ userLabel, onLogout, bridge, embedded }: ReRouteDashboardProps) {
  const optsRef = useRef<HTMLDivElement>(null);
  const logWrapRef = useRef<HTMLDivElement>(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [apiConfirmedPair, setApiConfirmedPair] = useState<{ proposalId: string; optionId: string } | null>(null);
  const [meetingStatus, setMeetingStatus] = useState<"pending" | "moved" | "kept">("pending");
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [compFillPct, setCompFillPct] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>(INITIAL_LOGS);
  const [extraLogsByTrip, setExtraLogsByTrip] = useState<Record<string, LogLine[]>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useId();

  const isApi = Boolean(bridge);
  const isApiReady = Boolean(bridge && bridge.state === "ready" && bridge.detail);

  const [confirmedOnce, setConfirmedOnce] = useState(false);
  const [rippleOpen, setRippleOpen] = useState(false);
  const [cascadeTeaserOpen, setCascadeTeaserOpen] = useState(false);
  const [agentLogsOpen, setAgentLogsOpen] = useState(false);

  const tripKey = bridge?.tripId ?? "demo";
  const [confirmedOnceTripKey, setConfirmedOnceTripKey] = useState<string | null>(null);
  const [manualStep, setManualStep] = useState<ControlStep | null>(null);
  const [manualStepTripKey, setManualStepTripKey] = useState<string | null>(null);

  const effectiveCascadePreview = useMemo(() => {
    if (bridge?.proposal?.cascade_preview && typeof bridge.proposal.cascade_preview === "object") {
      return bridge.proposal.cascade_preview as Record<string, unknown>;
    }
    const id = bridge?.tripId;
    if (!id || typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`reroute.cascade.v1:${id}`);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [bridge?.proposal?.cascade_preview, bridge?.tripId]);

  const effectiveCompensationDraft = useMemo(() => {
    if (bridge?.proposal?.compensation_draft) {
      return bridge.proposal.compensation_draft as Record<string, unknown>;
    }
    const id = bridge?.tripId;
    if (!id || typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`reroute.compensation.v1:${id}`);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [bridge?.proposal?.compensation_draft, bridge?.tripId]);

  const ripplePreviewCount = useMemo(() => {
    if (!effectiveCascadePreview) return 0;
    return cascadePreviewBullets(effectiveCascadePreview).length;
  }, [effectiveCascadePreview]);

  const rankedOptionsCount = bridge?.proposal?.ranked_options?.length ?? 0;
  const hasRankedOptions = isApiReady && rankedOptionsCount > 0;
  const confirmedOnceForTrip = confirmedOnce && confirmedOnceTripKey === tripKey;
  const compensationEligible =
    confirmedOnceForTrip ||
    Boolean(effectiveCompensationDraft) ||
    Boolean(bridge?.proposal?.compensation_draft);
  const suggestedStep: ControlStep = !isApiReady ? "run" : confirmedOnceForTrip ? "confirm" : hasRankedOptions ? "options" : "run";

  const isStepEnabled = useCallback(
    (step: ControlStep) => {
      if (step === "run") return true;
      if (step === "options") return isApiReady && hasRankedOptions;
      if (step === "confirm") return confirmedOnceForTrip;
      return compensationEligible;
    },
    [compensationEligible, confirmedOnceForTrip, hasRankedOptions, isApiReady],
  );

  const activeStep: ControlStep =
    manualStep && manualStepTripKey === tripKey && isStepEnabled(manualStep) ? manualStep : suggestedStep;

  const activeStepIndex = WORKFLOW_STEP_ORDER.indexOf(activeStep);
  const stepIsComplete = useCallback(
    (step: ControlStep) => {
      const i = WORKFLOW_STEP_ORDER.indexOf(step);
      return i >= 0 && i < activeStepIndex;
    },
    [activeStepIndex],
  );

  type UiDensity = "calm" | "standard" | "ops";
  type RailTab = "radar" | "assistant" | "weather" | "logs";
  const [uiDensity, setUiDensity] = useState<UiDensity>(() => readUiDensity());
  const [railTab, setRailTab] = useState<RailTab>("radar");

  const persistDensity = useCallback((d: UiDensity) => {
    setUiDensity(d);
    if (typeof window !== "undefined") localStorage.setItem("reroute-ui-density", d);
    if (d === "calm") setAgentLogsOpen(false);
  }, []);

  const tripStatusLine = useMemo(() => {
    if (!isApiReady || !bridge) return null;
    if (bridge.proposing) {
      return { tone: "active" as const, text: "Agent is analyzing your itinerary and ranking options…" };
    }
    if (bridge.confirming) {
      return { tone: "active" as const, text: "Confirming your selected path…" };
    }
    const ro = bridge.proposal?.ranked_options?.length ?? 0;
    if (ro > 0 && !confirmedOnceForTrip) {
      return {
        tone: "ok" as const,
        text: `Choose one of ${ro} ranked rebook path${ro === 1 ? "" : "s"}, then confirm.`,
      };
    }
    if (confirmedOnceForTrip) {
      return {
        tone: "ok" as const,
        text: "Rebooking confirmed — review downstream ripple and compensation when ready.",
      };
    }
    const dis = [...bridge.events]
      .filter((e) => e.disruption_type)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (dis) {
      return {
        tone: "warn" as const,
        text: `Disruption recorded (${dis.disruption_type ?? dis.kind}). Run the agent for ranked options.`,
      };
    }
    return {
      tone: "muted" as const,
      text: "No open proposal yet — run the agent or simulate a disruption to generate ranked options.",
    };
  }, [bridge, confirmedOnceForTrip, isApiReady]);

  const showSeparateRebookingCard =
    !isApiReady ||
    activeStep === "options" ||
    hasRankedOptions ||
    Boolean(bridge?.proposing) ||
    Boolean(bridge?.confirming);

  const activeProposalId = bridge?.proposal?.proposal_id ?? null;
  const apiConfirmedOptionId =
    activeProposalId && apiConfirmedPair?.proposalId === activeProposalId ? apiConfirmedPair.optionId : null;
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

  const snapshotAdditions = useMemo(() => {
    if (!isApiReady || !bridge?.detail?.trip?.snapshot) return [];
    return snapshotTripAdditions(bridge.detail.trip.snapshot as Record<string, unknown>);
  }, [isApiReady, bridge?.detail?.trip?.snapshot]);

  const snapshotTripSummary = useMemo(() => {
    if (!isApiReady || !bridge?.detail?.trip?.snapshot) return null;
    return buildSnapshotTripSummary(bridge.detail.trip.snapshot as Record<string, unknown>);
  }, [isApiReady, bridge?.detail?.trip?.snapshot]);

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

  const displayLogs = useMemo(() => {
    const extra = extraLogsByTrip[bridge?.tripId ?? ""] ?? [];
    return isApiReady ? [...apiBaseLogs, ...extra] : logs;
  }, [isApiReady, apiBaseLogs, extraLogsByTrip, bridge?.tripId, logs]);

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

  const resetDemoWorkspace = useCallback(() => {
    setConfirmedId(null);
    setMeetingStatus("pending");
    setClaimSubmitted(false);
    setCompFillPct(60);
    setLogs(INITIAL_LOGS);
    setBannerVisible(true);
    pushToast(<RotateCcw className="h-4 w-4" aria-hidden />, "Demo reset", "Scenario restored to the starting state.");
  }, [pushToast]);

  const addLog = useCallback(
    (dot: LogDot, children: React.ReactNode) => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const row: LogLine = { id: `${Date.now()}`, time, dot, children };
      if (isApiReady) {
        const tid = bridge?.tripId ?? "";
        setExtraLogsByTrip((prev) => ({
          ...prev,
          [tid]: [...(prev[tid] ?? []), row],
        }));
      } else {
        setLogs((prev) => [...prev, row]);
      }
    },
    [isApiReady, bridge?.tripId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCompFillPct(60);
    }, 350);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = logWrapRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayLogs]);

  const lastProposalToastIdRef = useRef<string | null>(null);
  useEffect(() => {
    lastProposalToastIdRef.current = null;
  }, [bridge?.tripId]);

  const lastProposeErrToastRef = useRef<string | null>(null);
  useEffect(() => {
    if (!bridge?.proposeError) {
      lastProposeErrToastRef.current = null;
      return;
    }
    const err = bridge.proposeError;
    if (lastProposeErrToastRef.current === err) return;
    lastProposeErrToastRef.current = err;
    queueMicrotask(() => {
      pushToast(<AlertTriangle className="h-4 w-4" aria-hidden />, "Agent run failed", err);
    });
  }, [bridge?.proposeError, pushToast]);

  const prevProposingRef = useRef(false);
  useEffect(() => {
    const p = bridge?.proposing;
    const ended = prevProposingRef.current && !p;
    prevProposingRef.current = Boolean(p);
    if (!ended || !bridge?.proposal?.ranked_options?.length) return;
    const pid = bridge.proposal.proposal_id;
    if (lastProposalToastIdRef.current === pid) return;
    lastProposalToastIdRef.current = pid;
    const n = bridge.proposal.ranked_options.length;
    queueMicrotask(() => {
      pushToast(<Check className="h-4 w-4" aria-hidden />, "Options ready", `${n} ranked rebooking option(s).`);
    });
  }, [bridge?.proposing, bridge?.proposal, pushToast]);

  useEffect(() => {
    if (isApi) return;
    const id = window.setTimeout(() => {
      pushToast(<Check aria-hidden />, "Hotel updated automatically", "Taj MG Road late check-in confirmed for 00:30 AM. No action needed.");
    }, 400);
    return () => window.clearTimeout(id);
  }, [pushToast, isApi]);

  const scrollToOpts = useCallback(() => {
    const el = optsRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, []);

  const focusStepTab = useCallback((step: ControlStep) => {
    document.getElementById(`reroute-step-tab-${step}`)?.focus();
  }, []);

  const onWorkflowStepKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
      const enabled = WORKFLOW_STEP_ORDER.filter((s) => isStepEnabled(s));
      if (enabled.length === 0) return;
      let idx = enabled.indexOf(activeStep);
      if (idx < 0) idx = 0;
      if (e.key === "ArrowRight") idx = Math.min(idx + 1, enabled.length - 1);
      else if (e.key === "ArrowLeft") idx = Math.max(idx - 1, 0);
      else if (e.key === "Home") idx = 0;
      else idx = enabled.length - 1;
      const next = enabled[idx];
      if (next !== activeStep) {
        setManualStepTripKey(tripKey);
        setManualStep(next);
        setRippleOpen(next === "confirm");
        setAgentLogsOpen(false);
        e.preventDefault();
        window.requestAnimationFrame(() => focusStepTab(next));
      }
    },
    [activeStep, focusStepTab, isStepEnabled, tripKey],
  );

  async function confirmOpt(id: string, name: string) {
    if (isApiReady && bridge) {
      const proposalIdBefore = bridge.proposal?.proposal_id;
      const res = await bridge.runConfirm(id);
      if (!res) return;
      if (!res.applied) {
        pushToast(
          <AlertTriangle className="h-4 w-4" aria-hidden />,
          "Confirmation incomplete",
          res.message,
        );
        return;
      }
      if (proposalIdBefore) {
        setApiConfirmedPair({ proposalId: proposalIdBefore, optionId: id });
      }
      setConfirmedOnce(true);
      setConfirmedOnceTripKey(tripKey);
      setRippleOpen(true);
      addLog("g", (
        <>
          <span className="font-medium text-emerald-400">Confirmed:</span> <span className="text-zinc-200">{name}</span> — updating itinerary
        </>
      ));
      const detailParts = [res.message];
      if (res.duffel_order_id) detailParts.push(`Order ${res.duffel_order_id}`);
      if (res.itinerary_revision != null) detailParts.push(`Revision ${res.itinerary_revision}`);
      if (res.email_sent) detailParts.push("Email sent");
      else if (res.email_queued) detailParts.push("Email queued");
      pushToast(<Check aria-hidden />, "Booking confirmed", detailParts.join(" · "));
      return;
    }
    setConfirmedId(id);
    setConfirmedOnce(true);
    setConfirmedOnceTripKey(tripKey);
    setRippleOpen(true);
    addLog("g", (
      <>
        <span className="font-medium text-emerald-400">Confirmed:</span> <span className="text-zinc-200">{name}</span> — updating itinerary
      </>
    ));
    pushToast(<Check aria-hidden />, "Booking confirmed", `${name} selected. Itinerary updated across all segments.`);
  }

  function resolveMeeting(action: "moved" | "kept") {
    if (action === "moved") {
      setMeetingStatus("moved");
      addLog("g", <>Calendar updated. <span className="font-medium text-emerald-400">3 attendees notified.</span></>);
      pushToast(<Calendar aria-hidden />, "Meeting rescheduled", "9 AM moved to 11 AM. Invite sent to 3 attendees.");
    } else {
      setMeetingStatus("kept");
      addLog("a", <><span className="font-medium text-amber-300">Meeting kept at 9 AM.</span> Tight but feasible.</>);
    }
  }

  function submitClaim() {
    setClaimSubmitted(true);
    setCompFillPct(100);
    if (isApiReady) {
      addLog("g", <span className="text-zinc-300">Compensation: marked as submitted in this workspace (no live claim API).</span>);
      pushToast(<IndianRupee aria-hidden />, "Recorded", "This is a local confirmation only — real claims go through your airline or regulator process.", "money");
    } else {
      addLog("g", <><span className="font-medium text-emerald-400">Demo claim filed.</span> Illustration only.</>);
      pushToast(<IndianRupee aria-hidden />, "Demo claim", "Illustration only — not a real filing.", "money");
    }
  }

  const showTripBody = !bridge || bridge.state === "ready";
  const segmentPulseLabel =
    isApiReady && bridge?.detail
      ? `Monitoring ${Math.max(bridge.detail.legs.length || 1, bridge.detail.segments.length, 1)} segments`
      : "Monitoring 3 segments";
  const apiBanner = isApiReady && bridge ? apiBannerCopy(bridge, confirmedOnceForTrip) : null;

  return (
    <div className={cn("min-h-full bg-[color:var(--bg)] text-[color:var(--fg)] antialiased")}>
      <div className="pointer-events-none fixed inset-0 rr-hero-sky" aria-hidden />
      <div className="fixed right-4 top-4 z-[1100] flex max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex gap-3 rounded-xl border border-[color:var(--stroke)] bg-[color:color-mix(in_oklab,var(--bg),white_6%)] p-3 shadow-lg shadow-black/40 backdrop-blur-md"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] text-[color:var(--fg)]",
                t.iconTone === "money" &&
                  "border-[color:color-mix(in_oklab,var(--ok),transparent_55%)] bg-[color:color-mix(in_oklab,var(--ok),transparent_88%)] text-[color:var(--ok)]",
              )}
            >
              {t.icon}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-sm font-semibold text-[color:var(--fg)]">{t.title}</div>
              <div className="mt-0.5 text-xs leading-snug text-[color:var(--subtle)]">{t.text}</div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-[color:var(--subtle)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 pb-16 pt-2 sm:px-6">
        {embedded ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-zinc-400">
              <Link href="/trips" className="shrink-0 font-medium text-zinc-300 hover:text-white">
                Trips
              </Link>
              <span aria-hidden className="text-zinc-600">
                /
              </span>
              <span className="min-w-0 truncate font-medium text-zinc-100" title={bridge?.detail?.trip.title ?? undefined}>
                {bridge?.detail?.trip.title?.trim() || (bridge?.state === "ready" ? "Trip" : "…")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {segmentPulseLabel}
              </div>
              <Link
                href="/trips"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                <Plus size={15} aria-hidden />
                New trip
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-serif text-xl font-semibold tracking-tight text-zinc-100" style={{ fontFamily: "var(--tg-playfair), Georgia, serif" }}>
                ReRoute <em className="not-italic text-emerald-400">AI</em>
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Agent active
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {segmentPulseLabel}
              </div>
              <span
                className="hidden max-w-[200px] truncate rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 sm:inline"
                title={userLabel}
              >
                {userLabel}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                onClick={onLogout}
              >
                <LogOut size={15} aria-hidden />
                Log out
              </button>
              <Link
                href="/trips"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                <Plus size={15} aria-hidden />
                New Trip
              </Link>
            </div>
          </div>
        )}

        {bridge && bridge.state === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Loader2 className="h-9 w-9 shrink-0 animate-spin text-emerald-500/80" aria-hidden />
            <p className="text-sm text-zinc-500">Loading trip data…</p>
            <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
              <div className="h-24 animate-pulse rounded-xl bg-zinc-900/60" />
              <div className="h-24 animate-pulse rounded-xl bg-zinc-900/60" />
              <div className="h-40 animate-pulse rounded-xl bg-zinc-900/60 sm:col-span-2" />
            </div>
          </div>
        ) : null}

        {bridge && bridge.state === "empty" ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <div className="text-2xl font-semibold tracking-tight text-zinc-100">No trips yet</div>
            <p className="max-w-md text-sm text-zinc-500">
              Create a demo trip to load itinerary, monitor status, and run the agent against your snapshot.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              disabled={bridge.creatingDemo}
              onClick={() => void bridge.createDemoTrip()}
            >
              {bridge.creatingDemo ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
              Create demo trip
            </button>
          </div>
        ) : null}

        {bridge && bridge.state === "error" ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/25 bg-red-500/5 px-6 py-16 text-center">
            <p className="text-sm text-red-300">{bridge.errorMessage ?? "Something went wrong."}</p>
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              onClick={() => void bridge.refresh()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {showTripBody ? (
          <>
            {bannerVisible && !isApi ? (
              <div className="mb-6 flex flex-col gap-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300" aria-hidden>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-100">Flight 6E-204 (New Delhi → Bengaluru) has been cancelled</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-400">
                      Agent found 3 alternatives · Hotel check-in updated · 2 downstream effects resolved automatically
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setBannerVisible(false)}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    onClick={scrollToOpts}
                  >
                    View options
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {bannerVisible && isApiReady && bridge && apiBanner ? (
              <div className="mb-6 flex flex-col gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200" aria-hidden>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-100">{apiBanner.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-400">{apiBanner.sub}</div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setBannerVisible(false)}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/90 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400"
                    onClick={scrollToOpts}
                  >
                    View options
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mb-8 flex flex-col-reverse gap-6 border-b border-zinc-800 pb-8 lg:flex-col">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {!isApiReady ? (
                  <>
                    <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active trip · Mar 25–28, 2026</div>
                    <div className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-50" style={{ fontFamily: "var(--tg-playfair), Georgia, serif" }}>
                      Business — Q4 Review Circuit
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-zinc-400">
                      <span className="font-medium text-zinc-200">New Delhi</span>
                      <span className="text-zinc-600">→</span>
                      <span className="font-medium text-zinc-200">Bengaluru</span>
                      <span className="text-zinc-600">→</span>
                      <span className="font-medium text-zinc-200">Mumbai</span>
                      <span className="text-zinc-500"> · 3 segments</span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                      Walkthrough: compare ranked paths, confirm one, then open <strong className="font-medium text-zinc-300">Ripple</strong> and{" "}
                      <strong className="font-medium text-zinc-300">Compensation</strong> in the steps above.
                    </p>
                  </>
                ) : bridge?.detail ? (
                  <>
                    <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{formatTripEyebrow(bridge.detail)}</div>
                    <div className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-50" style={{ fontFamily: "var(--tg-playfair), Georgia, serif" }}>
                      {bridge.detail.trip.title?.trim() || "Untitled trip"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-zinc-400">
                      {citiesLine.map((city, i) => (
                        <span key={`${city}-${i}`} className="contents">
                          {i > 0 ? <span className="text-zinc-600">→</span> : null}
                          <span className="font-medium text-zinc-200">{city}</span>
                        </span>
                      ))}
                      <span className="text-zinc-500">
                        {" "}
                        · rev {bridge.detail.trip.itinerary_revision} · {sortedLegs.length || 1} leg
                        {(sortedLegs.length || 1) === 1 ? "" : "s"}
                      </span>
                    </div>
                    {snapshotTripSummary &&
                    (snapshotTripSummary.flightNumber ||
                      snapshotTripSummary.travelDate ||
                      snapshotTripSummary.scheduledDepartureLabel ||
                      snapshotTripSummary.scheduledArrivalLabel ||
                      snapshotTripSummary.travelerLine ||
                      snapshotTripSummary.weatherLine) ? (
                      <ul
                        className="mt-3 max-w-2xl list-inside list-disc space-y-1 text-sm text-zinc-500"
                        aria-label="Itinerary snapshot"
                      >
                        {snapshotTripSummary.flightNumber || snapshotTripSummary.travelDate ? (
                          <li>
                            {snapshotTripSummary.flightNumber ? (
                              <>
                                Flight <span className="font-medium text-zinc-300">{snapshotTripSummary.flightNumber}</span>
                              </>
                            ) : null}
                            {snapshotTripSummary.travelDate ? (
                              <>
                                {snapshotTripSummary.flightNumber ? " · " : null}
                                {snapshotTripSummary.travelDate}
                              </>
                            ) : null}
                          </li>
                        ) : null}
                        {snapshotTripSummary.scheduledDepartureLabel || snapshotTripSummary.scheduledArrivalLabel ? (
                          <li>
                            Scheduled{" "}
                            {snapshotTripSummary.scheduledDepartureLabel ? (
                              <>dep {snapshotTripSummary.scheduledDepartureLabel}</>
                            ) : null}
                            {snapshotTripSummary.scheduledDepartureLabel && snapshotTripSummary.scheduledArrivalLabel ? ", " : null}
                            {snapshotTripSummary.scheduledArrivalLabel ? (
                              <>arr {snapshotTripSummary.scheduledArrivalLabel}</>
                            ) : null}{" "}
                            (local)
                          </li>
                        ) : null}
                        {snapshotTripSummary.travelerLine ? <li>{snapshotTripSummary.travelerLine}</li> : null}
                        {snapshotTripSummary.weatherLine ? <li>{snapshotTripSummary.weatherLine}</li> : null}
                      </ul>
                    ) : null}
                    {tripStatusLine ? (
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                        <p
                          className={cn(
                            "max-w-2xl flex-1 text-sm leading-relaxed transition-colors duration-200",
                            tripStatusLine.tone === "active" && "text-emerald-300/95",
                            tripStatusLine.tone === "ok" && "text-zinc-300",
                            tripStatusLine.tone === "warn" && "text-amber-200/90",
                            tripStatusLine.tone === "muted" && "text-zinc-500",
                          )}
                          role="status"
                          aria-live="polite"
                        >
                          {tripStatusLine.text}
                        </p>
                        {bridge ? (
                          <button
                            type="button"
                            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 self-start rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 sm:self-auto"
                            onClick={() => void bridge.refresh()}
                          >
                            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Refresh trip
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!isApiReady ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-300">
                      1 Cancelled
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                      1 Delayed
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                      1 On track
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                      Claim ready
                    </span>
                  </>
                ) : bridge ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                      Phase: {bridge.proposal?.phase ?? "idle"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                      Trip loaded
                    </span>
                    {bridge.proposal?.ranked_options?.length ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                        {bridge.proposal.ranked_options.length} options
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                {!isApiReady ? (
                  <button
                    type="button"
                    className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 sm:w-auto"
                    onClick={resetDemoWorkspace}
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Reset demo
                  </button>
                ) : null}
                <div
                  className="flex w-full flex-wrap gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-1 sm:w-auto sm:flex-1"
                  role="group"
                  aria-label="Information density"
                >
                  {(["calm", "standard", "ops"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => persistDensity(d)}
                      className={cn(
                        "min-h-10 flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold capitalize transition sm:flex-none sm:min-h-0",
                        uiDensity === d
                          ? "bg-zinc-800 text-white ring-1 ring-zinc-700"
                          : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  role="tablist"
                  aria-label="Workflow steps"
                  onKeyDown={onWorkflowStepKeyDown}
                >
                  {(
                    [
                      { step: "run" as const, label: "Run agent" },
                      { step: "options" as const, label: "Ranked options" },
                      { step: "confirm" as const, label: "Ripple" },
                      { step: "compensation" as const, label: "Compensation" },
                    ] as const
                  ).map(({ step, label }) => {
                    const enabled = isStepEnabled(step);
                    const active = activeStep === step;
                    const done = stepIsComplete(step);
                    return (
                      <button
                        key={step}
                        id={`reroute-step-tab-${step}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-current={active ? "step" : undefined}
                        tabIndex={enabled ? (active ? 0 : -1) : -1}
                        disabled={!enabled}
                        onClick={() => {
                          setManualStepTripKey(tripKey);
                          setManualStep(step);
                          setRippleOpen(step === "confirm");
                          setAgentLogsOpen(false);
                        }}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition duration-200",
                          active &&
                            "border-emerald-400/50 bg-emerald-500/15 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.2)] ring-2 ring-emerald-500/25",
                          !active && done && enabled && "border-emerald-500/15 bg-zinc-900/50 text-zinc-500",
                          !active && !done && enabled && "border-zinc-800/80 bg-zinc-900/30 text-zinc-300 hover:bg-zinc-900/60",
                          !enabled && "cursor-not-allowed border-zinc-800/60 bg-zinc-950/40 opacity-40",
                        )}
                      >
                        {done && !active ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500/90" aria-hidden /> : null}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

        <div
          className={cn(
            "grid gap-6 transition-[grid-template-columns] duration-300",
            "max-lg:grid-cols-1",
            uiDensity === "calm" && "lg:grid-cols-1",
            uiDensity === "standard" && "lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]",
            uiDensity === "ops" && "lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-6 lg:min-h-0">
            {activeStep === "run" || activeStep === "options" ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
                  Flight segments
                </div>
                <span className="text-xs text-zinc-500">
                  {isApiReady && bridge?.detail?.trip.updated_at
                    ? `Updated ${bridge.detail.trip.updated_at.slice(0, 16).replace("T", " ")}`
                    : "Refreshed 2 min ago"}
                </span>
              </div>

              {!isApiReady ? (
                <>
                  <div className="flex gap-4 border-t border-zinc-800/60 px-4 py-4 first:border-t-0 hover:bg-zinc-800/15">
                    <div className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.2)]" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs italic text-zinc-500">6E-204</span>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                          <span>Delhi</span>
                          <span className="text-xs text-zinc-600">→</span>
                          <span>Bengaluru</span>
                        </div>
                        <span className="rounded-md border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">Cancelled</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">
                          Scheduled: <strong>07:45</strong>
                        </span>
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">IndiGo · Crew unavailability</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">Agent: 3 alternatives found</span>
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">Hotel notified</span>
                      </div>
                    </div>
                    <div className="shrink-0 self-start">
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50" onClick={scrollToOpts}>
                        Options
                        <ChevronDown size={14} aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 border-t border-zinc-800/60 px-4 py-4 first:border-t-0 hover:bg-zinc-800/15">
                    <div className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs italic text-zinc-500">6E-789</span>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                          <span>Delhi</span>
                          <span className="text-xs text-zinc-600">→</span>
                          <span>Bengaluru</span>
                        </div>
                        <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">Delayed +2h</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">
                          Original: <span className="text-zinc-600 line-through">10:15</span> <span className="font-semibold text-amber-300">12:15</span>
                        </span>
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">
                          Gate: <strong>B-14</strong>
                        </span>
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">IndiGo</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500">
                          <span>Boarding in 4h 20m</span>
                          <span>45%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-amber-500/80 transition-all duration-500" style={{ width: "45%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 self-start">
                      <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">Alt · option 1</span>
                    </div>
                  </div>

                  <div className="flex gap-4 border-t border-zinc-800/60 px-4 py-4 first:border-t-0 hover:bg-zinc-800/15">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs italic text-zinc-500">AI-657</span>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                          <span>Bengaluru</span>
                          <span className="text-xs text-zinc-600">→</span>
                          <span>Mumbai</span>
                        </div>
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">On track</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">
                          Departure: <strong>14:50 tomorrow</strong>
                        </span>
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">Air India · Seat 12A</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500">
                          <span>Departs in ~31h</span>
                          <span>Confirmed</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-emerald-500/80 transition-all duration-500" style={{ width: "100%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 self-start">
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                        <Check aria-hidden />
                        Confirmed
                      </span>
                    </div>
                  </div>
                </>
              ) : sortedLegs.length > 0 ? (
                sortedLegs.map((leg) => (
                  <div key={leg.id} className="flex gap-4 border-t border-zinc-800/60 px-4 py-4 first:border-t-0 hover:bg-zinc-800/15">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs italic text-zinc-500">{leg.flight_number ?? leg.mode}</span>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                          <span>{leg.origin_code}</span>
                          <span className="text-xs text-zinc-600">→</span>
                          <span>{leg.destination_code}</span>
                        </div>
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">{leg.mode}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">
                          Travel date: <strong>{leg.travel_date ?? "—"}</strong>
                        </span>
                        <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">Order #{leg.segment_order}</span>
                      </div>
                    </div>
                    <div className="shrink-0 self-start">
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50" onClick={scrollToOpts}>
                        Options
                        <ChevronDown size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))
              ) : primaryFromSnapshot ? (
                <div className="flex gap-4 border-t border-zinc-800/60 px-4 py-4 first:border-t-0 hover:bg-zinc-800/15">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs italic text-zinc-500">{primaryFromSnapshot.flight_number ?? "—"}</span>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                        <span>{primaryFromSnapshot.origin ?? "—"}</span>
                        <span className="text-xs text-zinc-600">→</span>
                        <span>{primaryFromSnapshot.destination ?? "—"}</span>
                      </div>
                      <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">From snapshot</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                      <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">
                        Date: <strong>{primaryFromSnapshot.date ?? "—"}</strong>
                      </span>
                      <span className="text-xs text-zinc-400 [&_strong]:font-medium [&_strong]:text-zinc-200">Leg rows will appear after itinerary sync</span>
                    </div>
                  </div>
                  <div className="shrink-0 self-start">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50" onClick={scrollToOpts}>
                      Options
                      <ChevronDown size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-zinc-500">No flight legs yet. Trip snapshot is stored — run agent or wait for sync.</p>
              )}
              {isApiReady && bridge && activeStep === "run" && !showSeparateRebookingCard && !bridge.proposing ? (
                <div className="border-t border-emerald-500/15 bg-gradient-to-b from-emerald-500/[0.07] to-zinc-950/20 px-5 py-5 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25">
                      <Plane className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Run the agent from here</h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        One action: we scan legs, rank rebook paths, and draft ripple context — then you move to{" "}
                        <strong className="font-medium text-zinc-400">Ranked options</strong> automatically.
                      </p>
                      <ul className="mt-3 space-y-2 text-xs text-zinc-400">
                        <li className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                          Multimodal search (flights, trains, mixed legs) scored by ETA and cost
                        </li>
                        <li className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                          Downstream checks (hotels, meetings) summarized in the next step
                        </li>
                        <li className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                          Compensation draft when rules apply
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-md shadow-emerald-500/15 transition hover:bg-emerald-400 disabled:opacity-50"
                      disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                      onClick={() => void bridge.runPropose(null)}
                    >
                      {bridge.proposing ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
                      Run agent
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                      disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                      onClick={() => void bridge.runPropose("cancel")}
                    >
                      Simulate cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                      disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                      onClick={() => void bridge.runPropose("delay")}
                    >
                      Simulate delay
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
                    <span className="font-semibold text-zinc-500">Sandbox:</span> simulations affect status/cascade copy; offer lists often match live search.
                    Safe to retry — only this trip&apos;s proposal changes.
                  </p>
                </div>
              ) : null}
              {!isApiReady ? (
                <div className="border-t border-zinc-800/80 px-4 py-3">
                  <p className="text-[11px] text-zinc-600">Interactive demo — sample data, not a live PNR. Use Reset demo in the bar above to start over.</p>
                </div>
              ) : null}
              </div>
            ) : null}

            {isApiReady &&
            effectiveCascadePreview &&
            hasRankedOptions &&
            (activeStep === "run" || activeStep === "options") ? (
              <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.04] shadow-sm shadow-black/10">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-amber-500/[0.06]"
                  onClick={() => setCascadeTeaserOpen((o) => !o)}
                  aria-expanded={cascadeTeaserOpen}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">After you confirm</div>
                    <p className="mt-1 text-sm text-zinc-200">
                      See how hotels, meetings, and connections may need updates — in plain language below.
                    </p>
                  </div>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", cascadeTeaserOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {cascadeTeaserOpen ? (
                  <div className="border-t border-amber-500/15 px-4 py-3">
                    <CascadePreviewFriendly preview={effectiveCascadePreview} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {showSeparateRebookingCard && (activeStep === "run" || activeStep === "options") ? (
              <div
                className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm shadow-black/20"
                ref={optsRef}
                id="rebooking-options"
              >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  Rebooking options
                  <span className="ml-1 inline-flex gap-0.5" aria-hidden>
                    <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400/80 [animation-delay:-0.2s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400/80 [animation-delay:-0.1s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400/80" />
                  </span>
                </div>
                <span className="text-xs italic text-zinc-500" style={{ fontFamily: "var(--tg-instrument-serif), Georgia, serif" }}>
                  Ranked by arrival + cost
                </span>
              </div>
              <div className="divide-y divide-zinc-800/80">
                {!isApiReady ? (
                  <>
                    <div
                      className={cn(
                        "relative flex flex-wrap items-stretch gap-3 p-4",
                        (!confirmedId || confirmedId === "6e789") && "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/20",
                      )}
                    >
                      {!confirmedId ? (
                        <div className="absolute right-3 top-3 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                          Best
                        </div>
                      ) : null}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300">
                        <Plane aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-100">IndiGo 6E-789 — stay on delayed flight</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span>DEL → BLR direct</span>
                          <span className="text-zinc-600">·</span>
                          <span>No extra cost</span>
                          <span className="text-zinc-600">·</span>
                          <span>Same airline</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                        <div className="text-sm font-semibold tabular-nums text-zinc-100">15:30</div>
                        <div className="text-xs font-medium text-amber-300/90">+2h 15m</div>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                            confirmedId === "6e789" || !confirmedId
                              ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                              : "border border-zinc-700 font-medium text-zinc-300 hover:bg-zinc-800",
                          )}
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

                    <div
                      className={cn(
                        "relative flex flex-wrap items-stretch gap-3 p-4",
                        confirmedId === "train" && "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/20",
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300">
                        <TrainFront aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-100">Rajdhani Express — NDLS to SBC</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span>Departs 08:00</span>
                          <span className="text-zinc-600">·</span>
                          <span>AC First Class</span>
                          <span className="text-zinc-600">·</span>
                          <span>~26h</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                        <div className="text-sm font-semibold tabular-nums text-zinc-100">+1 day</div>
                        <div className="text-xs font-medium text-amber-300/90">+26h</div>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                            confirmedId === "train"
                              ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                              : "border border-zinc-700 font-medium text-zinc-300 hover:bg-zinc-800",
                          )}
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

                    <div
                      className={cn(
                        "relative flex flex-wrap items-stretch gap-3 p-4",
                        confirmedId === "hyd" && "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/20",
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300">
                        <Plane aria-hidden />
                        <Car aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-100">Fly to Hyderabad, cab to Bengaluru</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span>AI-401 08:30</span>
                          <span className="text-zinc-600">·</span>
                          <span>3h drive (170 km)</span>
                          <span className="text-zinc-600">·</span>
                          <span>+₹3,200</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                        <div className="text-sm font-semibold tabular-nums text-zinc-100">14:00</div>
                        <div className="text-xs font-medium text-amber-300/90">+3h 45m</div>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                            confirmedId === "hyd"
                              ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                              : "border border-zinc-700 font-medium text-zinc-300 hover:bg-zinc-800",
                          )}
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
                    {bridge.proposeError ? (
                      <p className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-300" role="alert">
                        {bridge.proposeError}
                      </p>
                    ) : null}
                    {bridge.confirmError ? (
                      <p className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-300">{bridge.confirmError}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 px-4 py-3">
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50",
                          activeStep === "options" && hasRankedOptions
                            ? "border-zinc-600 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                            : "border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800",
                        )}
                        disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                        onClick={() => void bridge.runPropose(null)}
                      >
                        {bridge.proposing ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
                        {activeStep === "options" && hasRankedOptions ? "Re-run agent" : "Run agent"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                        disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                        onClick={() => void bridge.runPropose("cancel")}
                      >
                        Simulate cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                        disabled={bridge.proposing || bridge.confirming || !bridge.tripId}
                        onClick={() => void bridge.runPropose("delay")}
                      >
                        Simulate delay
                      </button>
                    </div>
                    <p className="border-b border-zinc-800/80 px-4 pb-3 text-[11px] leading-relaxed text-zinc-600">
                      <span className="font-medium text-zinc-500">Training mode:</span> cancel/delay simulations change disruption classification and cascade
                      text; the same fare search may return the same top offers. Sandbox proposal is for{" "}
                      <strong className="text-zinc-400">this trip only</strong> — refresh if the API state feels stuck.
                    </p>
                    {bridge.proposing && !bridge.proposal?.ranked_options?.length ? (
                      <div className="space-y-2 p-4" aria-busy="true" aria-label="Agent ranking options">
                        <p className="text-xs font-medium text-emerald-300/90">
                          {bridge.proposeJobState
                            ? `Background job: ${bridge.proposeJobState}…`
                            : "Ranking options…"}
                        </p>
                        <div className="h-14 animate-pulse rounded-lg bg-zinc-800/50 transition-opacity" />
                        <div className="h-14 animate-pulse rounded-lg bg-zinc-800/50 transition-opacity [animation-delay:75ms]" />
                        <div className="h-14 animate-pulse rounded-lg bg-zinc-800/50 transition-opacity [animation-delay:150ms]" />
                      </div>
                    ) : null}
                    {bridge.proposal?.ranked_options?.length ? (
                      bridge.proposal.ranked_options.map((opt, idx) => {
                        const isBest = idx === 0 && !apiConfirmedOptionId;
                        const isSel = apiConfirmedOptionId === opt.option_id;
                        const d = getRankedOptionDisplay(opt, idx);
                        return (
                          <div
                            key={opt.option_id}
                            className={cn(
                              "relative flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-4",
                              (isBest || isSel) && "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/20",
                            )}
                          >
                            {isBest ? (
                              <div className="absolute right-3 top-3 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                                Best match
                              </div>
                            ) : null}
                            <div className="flex min-w-0 flex-1 gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-300">
                                {optionModalityIcon(opt.modality)}
                              </div>
                              <div className="min-w-0 flex-1 space-y-3">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Option {idx + 1}
                                    {isBest ? <span className="ml-2 text-emerald-400/90">Recommended</span> : null}
                                  </p>
                                  <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-50">{d.route}</p>
                                </div>
                                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Arrives</dt>
                                    <dd className="mt-0.5 text-sm font-medium text-zinc-100">{d.arrivalLabel}</dd>
                                  </div>
                                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total fare</dt>
                                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                                      {d.priceLabel ?? "—"}
                                    </dd>
                                  </div>
                                </dl>
                                <p className="text-[11px] text-zinc-600">
                                  {d.modalityLabel} · {d.bookingRefShort}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-stretch justify-center gap-2 border-t border-zinc-800/60 pt-3 sm:w-36 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 sm:min-h-11",
                                  isSel || !apiConfirmedOptionId
                                    ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                                    : "border border-zinc-700 font-medium text-zinc-300 hover:bg-zinc-800",
                                )}
                                disabled={bridge.confirming || !bridge.proposal}
                                onClick={() => void confirmOpt(opt.option_id, d.optionTitle)}
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
                                    Choose this
                                    <ChevronRight size={12} aria-hidden />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-8">
                        <div className="rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/30 p-5 text-center transition-colors duration-200 sm:text-left">
                          <p className="text-sm font-semibold text-zinc-200">No ranked options yet</p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                            Run the agent on your live itinerary, or use{" "}
                            <strong className="font-medium text-zinc-400">Simulate cancel / delay</strong> to generate a demo proposal for this trip.
                          </p>
                          <ul className="mx-auto mt-4 max-w-md space-y-2 text-left text-xs text-zinc-500 sm:mx-0">
                            <li className="flex gap-2">
                              <span className="text-emerald-500" aria-hidden>
                                ·
                              </span>
                              Scans legs and builds scored alternatives
                            </li>
                            <li className="flex gap-2">
                              <span className="text-emerald-500" aria-hidden>
                                ·
                              </span>
                              Prepares cascade preview for hotels &amp; connections
                            </li>
                            <li className="flex gap-2">
                              <span className="text-emerald-500" aria-hidden>
                                ·
                              </span>
                              When ready, switch to <strong className="text-zinc-400">Ranked options</strong> (unlocks after the first proposal)
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            ) : null}

            {activeStep === "confirm" || activeStep === "compensation" ? (
              <>
                <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  Downstream effects
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    {isApiReady
                      ? effectiveCascadePreview
                        ? `${ripplePreviewCount || "—"} preview item${ripplePreviewCount === 1 ? "" : "s"}`
                        : "No agent preview"
                      : "Sample story"}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-zinc-700 bg-zinc-900/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setRippleOpen((v) => !v)}
                  >
                    {rippleOpen ? "Hide details" : "View details"}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-zinc-800/80">
                {rippleOpen ? (
                  <div className="contents">
                    {isApiReady ? (
                      <>
                        {effectiveCascadePreview ? (
                          <div className="border-b border-zinc-800/80 px-4 py-4">
                            <div className="flex gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200">
                                <TriangleAlert aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-zinc-100">From your last agent run</div>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                  Plain-language summary of what could change. This is not a live booking or calendar sync.
                                </p>
                                <div className="mt-4">
                                  <CascadePreviewFriendly preview={effectiveCascadePreview} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-sm leading-relaxed text-zinc-500">
                            No cascade preview is stored for this trip. Run the agent to generate downstream context, then
                            confirm a rebooking option.
                          </div>
                        )}
                        {snapshotAdditions.length > 0 ? (
                          <div className="px-4 py-4">
                            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                              From your itinerary snapshot
                            </p>
                            <ul className="space-y-2">
                              {snapshotAdditions.map((a) => (
                                <li key={a.key} className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
                                  <div className="text-[10px] font-semibold text-zinc-500">{a.label}</div>
                                  <p className="mt-1 text-sm text-zinc-300">{a.text}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <p className="border-b border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-xs leading-relaxed text-amber-200/90">
                          Illustrative demo only — not your real hotel, meeting, or connection.
                        </p>
                        <div className="flex gap-3 px-4 py-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                            <Check aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-zinc-100">Hotel — late check-in (example)</div>
                            <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                              Sample copy: hotel notified of late arrival. Your live trip uses data from the agent only.
                            </div>
                          </div>
                          <div className="shrink-0 self-center">
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                              Done
                            </span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "flex gap-3 px-4 py-4",
                            meetingStatus === "pending" ? "bg-amber-500/5" : "bg-zinc-900/20",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm",
                              meetingStatus === "pending"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                            )}
                          >
                            {meetingStatus === "pending" ? <Calendar aria-hidden /> : <Check aria-hidden />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-zinc-100">
                              {meetingStatus === "moved"
                                ? "Meeting — moved (example)"
                                : meetingStatus === "kept"
                                  ? "Meeting — kept (example)"
                                  : "Meeting — suggested move (example)"}
                            </div>
                            <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                              {meetingStatus === "pending"
                                ? "Try Move it / Keep it to see how the demo behaves."
                                : meetingStatus === "moved"
                                  ? "Demo only — not a real calendar."
                                  : "Demo only — not a real calendar."}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end justify-center gap-2 self-center">
                            {meetingStatus === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
                                  onClick={() => resolveMeeting("moved")}
                                >
                                  Move it
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                                  onClick={() => resolveMeeting("kept")}
                                >
                                  Keep it
                                </button>
                              </>
                            ) : meetingStatus === "moved" ? (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                Moved
                              </span>
                            ) : (
                              <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                Kept
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 px-4 py-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                            <Check aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-zinc-100">Next connection (example)</div>
                            <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                              Sample: buffer after rebooking. In a real trip, this comes from your itinerary and agent
                              output.
                            </div>
                          </div>
                          <div className="shrink-0 self-center">
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                              OK
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-zinc-500">
                    Details collapsed. Click “View details” to expand.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                  <Check aria-hidden />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    {isApiReady ? "Rebooking applied" : "Demo: trip back on track"}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {isApiReady
                      ? "Your itinerary revision was updated. Open Compensation if your agent draft shows eligibility."
                      : "This banner is part of the offline walkthrough. Connect a real trip for live status."}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={isApiReady}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
                  isApiReady
                    ? "cursor-not-allowed border border-zinc-700 bg-zinc-900/60 text-zinc-500"
                    : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
                )}
                title={isApiReady ? "Sharing is not available yet for live trips." : undefined}
              >
                Share itinerary
                <ExternalLink size={15} aria-hidden />
              </button>
            </div>
                </>
            ) : null}
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col gap-4 transition-[gap] duration-300 lg:min-h-0",
              uiDensity === "calm" && "lg:mx-auto lg:w-full lg:max-w-md",
              uiDensity === "standard" && "lg:gap-3",
            )}
          >
            {activeStep === "compensation" ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  Compensation
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    isApiReady && effectiveCompensationDraft && effectiveCompensationDraft.eligible === true
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : isApiReady
                        ? "border-zinc-600 bg-zinc-800/80 text-zinc-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200",
                  )}
                >
                  {isApiReady
                    ? effectiveCompensationDraft && effectiveCompensationDraft.eligible === true
                      ? "Eligible (draft)"
                      : effectiveCompensationDraft
                        ? "Review draft"
                        : "No draft"
                    : "Demo only"}
                </span>
              </div>
              <div className="space-y-4 p-4">
                {isApiReady ? (
                  effectiveCompensationDraft ? (
                    <>
                      <p className="text-sm leading-relaxed text-zinc-300">
                        {typeof effectiveCompensationDraft.claim_text_draft === "string"
                          ? effectiveCompensationDraft.claim_text_draft
                          : "Compensation draft from the agent is available below. Final eligibility depends on airline rules."}
                      </p>
                      <details className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3 text-[11px] text-zinc-500">
                        <summary className="cursor-pointer font-medium text-zinc-400">Full draft (JSON)</summary>
                        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono leading-snug">
                          {JSON.stringify(effectiveCompensationDraft, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      No compensation draft for this trip yet. Run the agent after a disruption is recorded to generate a
                      draft.
                    </p>
                  )
                ) : (
                  <>
                    <div>
                      <div
                        className="flex items-baseline gap-1 font-serif text-4xl font-semibold tracking-tight text-emerald-300"
                        style={{ fontFamily: "var(--tg-playfair), Georgia, serif" }}
                      >
                        <span className="text-2xl text-emerald-400/90">₹</span>
                        <span>10,000</span>
                      </div>
                      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Demo figure only</div>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      Offline demo copy — not a real claim. Connect a trip and run the agent for a real draft.
                    </p>
                  </>
                )}
                <div className="flex justify-between text-[11px] font-medium text-zinc-500">
                  <span>Claim progress</span>
                  <span>{claimSubmitted ? "Step 3 of 3" : "Step 2 of 3"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-emerald-500/80 transition-all duration-500" style={{ width: `${compFillPct}%` }} />
                </div>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold disabled:opacity-60",
                    isApiReady
                      ? "border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800"
                      : "bg-[color:var(--primary)] text-[color:var(--bg)] hover:bg-[color:var(--primary-strong)]",
                  )}
                  disabled={claimSubmitted || (isApiReady && !effectiveCompensationDraft)}
                  onClick={submitClaim}
                >
                  {claimSubmitted ? (
                    <>
                      <Check size={15} aria-hidden />
                      Claim submitted
                    </>
                  ) : (
                    <>
                      {isApiReady ? "Mark as submitted (demo)" : "Review & submit claim (demo)"}
                      <ChevronRight size={15} aria-hidden />
                    </>
                  )}
                </button>
                {!isApiReady ? (
                  <div className="space-y-2 border-t border-[color:var(--stroke)] pt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--subtle)]">Demo perks (not real)</p>
                    <div className="flex gap-2 text-xs text-[color:var(--muted)]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] text-[color:var(--muted)]">
                        <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      Meal voucher (illustration)
                    </div>
                    <div className="flex gap-2 text-xs text-[color:var(--muted)]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] text-[color:var(--muted)]">
                        <Sofa className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      Lounge access (illustration)
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            ) : null}

            {uiDensity !== "ops" ? (
              <div
                className="flex shrink-0 gap-1 rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface-1)] p-1"
                role="tablist"
                aria-label="Context panels"
              >
                {(
                  [
                    { id: "radar" as const, label: "Legs", icon: BarChart3 },
                    { id: "assistant" as const, label: "Assist", icon: Sparkles },
                    { id: "weather" as const, label: "Weather", icon: Cloud },
                    { id: "logs" as const, label: "Logs", icon: ScrollText },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={railTab === id}
                    onClick={() => {
                      setRailTab(id);
                      if (id !== "logs") setAgentLogsOpen(false);
                    }}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition sm:min-h-10",
                      railTab === id
                        ? "bg-[color:var(--surface-2)] text-[color:var(--fg)] ring-1 ring-[color:var(--stroke-strong)]"
                        : "text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {(uiDensity === "ops" || railTab === "radar") ? (
              <div className="rr-card overflow-hidden rounded-xl transition-opacity duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--stroke)] px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--subtle)]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--subtle)]" aria-hidden />
                    Itinerary legs
                  </div>
                  <span className="text-xs text-[color:var(--subtle)]">{isApiReady ? "From trip" : "Demo"}</span>
                </div>
                <div className={cn("space-y-3 p-4", uiDensity === "calm" && "space-y-2 p-3")}>
                  {isApiReady && sortedLegs.length > 0 ? (
                    sortedLegs.map((leg) => (
                      <div
                        key={leg.id}
                        className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2.5 text-sm text-[color:var(--muted)]"
                      >
                        <div className="font-mono text-xs font-semibold text-[color:var(--fg)]">
                          {leg.flight_number ?? leg.mode}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--subtle)]">
                          {leg.origin_code} → {leg.destination_code}
                          {leg.travel_date ? ` · ${leg.travel_date}` : ""}
                        </div>
                      </div>
                    ))
                  ) : isApiReady && primaryFromSnapshot ? (
                    <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2.5 text-sm text-[color:var(--muted)]">
                      <div className="font-mono text-xs font-semibold text-[color:var(--fg)]">
                        {primaryFromSnapshot.flight_number ?? "—"}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--subtle)]">
                        {primaryFromSnapshot.origin} → {primaryFromSnapshot.destination}
                        {primaryFromSnapshot.date ? ` · ${primaryFromSnapshot.date}` : ""}
                      </div>
                      <p className="mt-2 text-[11px] text-[color:var(--subtle)] opacity-85">
                        Synced legs will appear after itinerary refresh.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-[color:var(--subtle)]">
                      Predictive on-time scores are not shown here yet. Use the agent run and activity log for current
                      signals.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {(uiDensity === "ops" || railTab === "assistant") ? (
              <div className="rr-card overflow-hidden rounded-xl transition-opacity duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--stroke)] px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--subtle)]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)]" aria-hidden />
                    Assistant
                  </div>
                  <span className="text-xs text-[color:var(--subtle)]">Voice ready (UI)</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface-2)]"
                      onClick={() =>
                        pushToast(
                          <MessageCircle className="h-4 w-4" aria-hidden />,
                          "Assistant",
                          "Type or use voice (UI shell).",
                        )
                      }
                    >
                      <MessageCircle className="h-4 w-4 opacity-90" aria-hidden />
                      Ask ReRoute
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold text-[color:var(--bg)] transition hover:bg-[color:var(--primary-strong)]"
                      onClick={() =>
                        pushToast(
                          <Mic className="h-4 w-4" aria-hidden />,
                          "Voice (demo)",
                          "Microphone capture is not wired in this build.",
                        )
                      }
                    >
                      <Mic className="h-4 w-4" aria-hidden />
                      Voice
                    </button>
                    <span className="text-xs text-[color:var(--subtle)]">High‑stress mode: clear next action</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      "Summarize what changed and what I should do now.",
                      "Show the best option if I must reach by 11:00.",
                      "Minimize total cost, keep hotel unchanged.",
                      "Explain trade-offs between top 2 options.",
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2 text-left text-xs text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)]"
                        onClick={() =>
                          pushToast(<Sparkles className="h-4 w-4" aria-hidden />, "Prompt queued (demo)", q)
                        }
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {(uiDensity === "ops" || railTab === "weather") ? (
              <div className="rr-card overflow-hidden rounded-xl transition-opacity duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--stroke)] px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--subtle)]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--subtle)]" aria-hidden />
                    Weather context
                  </div>
                </div>
                <div className="p-4">
                  {isApiReady && citiesLine.length > 0 && citiesLine[0] !== "—" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed text-[color:var(--muted)]">
                        Airports on this trip: {citiesLine.join(" → ")}. Live weather cards require coordinates in your trip
                        snapshot and are summarized during each agent run (see Activity log).
                      </p>
                      <p className="text-[11px] text-[color:var(--subtle)]">
                        We don&apos;t show fake temperatures here — check the agent tool trace for what was evaluated.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-[color:var(--subtle)]">
                      Connect a trip with airport codes in your itinerary to see route context. No live weather is shown in
                      this panel until wired to your provider.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {(uiDensity === "ops" || railTab === "logs") ? (
              uiDensity === "ops" ? (
                !agentLogsOpen ? (
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
                        Agent activity
                      </div>
                      <button
                        type="button"
                        className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-900/30 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900/50"
                        onClick={() => setAgentLogsOpen(true)}
                      >
                        View logs ({displayLogs.length})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm shadow-black/20">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
                        Agent activity
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-[color:var(--stroke)] bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--primary)]">
                          Live
                        </span>
                        <button
                          type="button"
                          className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-900/30 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900/50"
                          onClick={() => setAgentLogsOpen(false)}
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 space-y-0 overflow-y-auto p-2 font-mono text-[12px]" ref={logWrapRef}>
                      {displayLogs.map((row) => (
                        <div key={row.id} className="flex gap-3 border-t border-zinc-800/40 py-2 pl-1 first:border-t-0">
                          <span className="w-10 shrink-0 tabular-nums text-zinc-600">{row.time}</span>
                          <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", logDotClass[row.dot])} />
                          <span className="min-w-0 leading-snug text-zinc-300">{row.children}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm shadow-black/20 transition-opacity duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
                      Agent activity
                    </div>
                    <span className="rounded-md border border-[color:var(--stroke)] bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--primary)]">
                      {displayLogs.length} events
                    </span>
                  </div>
                  <div className="max-h-[min(24rem,55vh)] space-y-0 overflow-y-auto p-2 font-mono text-[12px]" ref={logWrapRef}>
                    {displayLogs.map((row) => (
                      <div key={row.id} className="flex gap-3 border-t border-zinc-800/40 py-2 pl-1 first:border-t-0">
                        <span className="w-10 shrink-0 tabular-nums text-zinc-600">{row.time}</span>
                        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", logDotClass[row.dot])} />
                        <span className="min-w-0 leading-snug text-zinc-300">{row.children}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
