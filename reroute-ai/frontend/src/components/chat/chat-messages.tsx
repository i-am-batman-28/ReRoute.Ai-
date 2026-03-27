"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plane,
  Save,
  User,
  X,
} from "lucide-react";

import type { BookingConfirmedData, ChatMessagePublic, OptionCardData } from "@/lib/chat-types";
import { extractAirlineCode, findAirlineByIata } from "@/lib/airlines";

// ── Helpers ──────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\)|\n)/g);
  return parts.map((part, i) => {
    if (part === "\n") return <br key={i} />;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-[color:var(--surface-2)] px-1.5 py-0.5 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} className="underline underline-offset-2 text-[color:var(--primary)] hover:text-[color:var(--primary-strong)]">
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Entity Badges ────────────────────────────────────────────

function EntityBadges({ entities }: { entities: Record<string, unknown> | null }) {
  if (!entities || Object.keys(entities).length === 0) return null;
  const badges: { label: string; value: string }[] = [];
  for (const key of ["flight_number", "origin", "destination", "travel_date", "cabin_class"]) {
    const v = entities[key];
    if (v && typeof v === "string") badges.push({ label: key.replace(/_/g, " "), value: v });
  }
  const passengers = entities.passengers;
  if (Array.isArray(passengers) && passengers.length > 0) {
    badges.push({
      label: "passengers",
      value: passengers.map((p: Record<string, unknown>) => `${p.given_name || ""} ${p.family_name || ""}`.trim()).filter(Boolean).join(", ") || `${passengers.length} traveler(s)`,
    });
  }
  if (badges.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {badges.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--primary)]">
          <span className="opacity-70">{b.label}:</span> {b.value}
        </span>
      ))}
    </div>
  );
}

// ── Option Cards (inline booking) ────────────────────────────

function OptionCards({
  data,
  onConfirm,
}: {
  data: OptionCardData;
  onConfirm: (optionIndex: number) => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      {data.disruption_summary && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] text-amber-300 font-medium">
          {data.disruption_summary}
        </div>
      )}
      {data.options.map((opt) => {
        const fnMatch = opt.summary.match(/\b([A-Z0-9]{2}\d{2,4})\b/);
        const code = fnMatch ? extractAirlineCode(fnMatch[0]) : null;
        const airline = code ? findAirlineByIata(code) : null;
        const duffelCarrier = typeof (opt.legs?.[0] as Record<string, unknown>)?.carrier === "string" ? (opt.legs[0] as Record<string, unknown>).carrier as string : null;
        const name = airline?.name ?? duffelCarrier;
        const logoUrl = airline?.logo ?? null;
        return (
        <div
          key={opt.option_id}
          className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-3 transition-all hover:border-[color:var(--primary)] hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={name ?? ""} className="h-5 w-5 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[10px] font-bold text-[color:var(--primary)]">
                    {opt.index}
                  </span>
                )}
                <span className="text-[12px] font-semibold text-[color:var(--fg)] truncate">
                  {name ?? opt.summary.split("·")[0]?.trim() ?? `Option ${opt.index}`}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[color:var(--muted)] leading-relaxed line-clamp-2">
                {opt.summary}
              </p>
              {opt.legs.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[color:var(--subtle)]">
                  <Plane className="h-3 w-3" />
                  {opt.legs.map((l, j) => (
                    <span key={j}>
                      {l.origin} → {l.destination}
                      {j < opt.legs.length - 1 && " · "}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onConfirm(opt.index)}
              className="shrink-0 flex items-center gap-1 rounded-lg bg-[color:var(--primary)] px-2.5 py-1.5 text-[11px] font-medium text-white transition-all hover:bg-[color:var(--primary-strong)] active:scale-95"
            >
              <CheckCircle className="h-3 w-3" />
              Book
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ── Editable Entity Card ─────────────────────────────────────

function EntityEditorCard({
  data,
  onSave,
}: {
  data: { entities: Record<string, unknown>; editable: boolean };
  onSave: (entities: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(data.entities);
  const [expanded, setExpanded] = useState(true);

  const fields = [
    { key: "flight_number", label: "Flight" },
    { key: "origin", label: "From" },
    { key: "destination", label: "To" },
    { key: "travel_date", label: "Date" },
    { key: "cabin_class", label: "Cabin" },
  ];

  const passengers = (draft.passengers || []) as Record<string, unknown>[];

  const handleFieldChange = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handlePassengerChange = (idx: number, field: string, value: string) => {
    setDraft((d) => {
      const pax = [...((d.passengers || []) as Record<string, unknown>[])];
      pax[idx] = { ...pax[idx], [field]: value };
      return { ...d, passengers: pax };
    });
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <div className="mt-2 rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-[color:var(--fg)] hover:bg-[color:var(--surface-1)] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Plane className="h-3 w-3 text-[color:var(--primary)]" />
          Trip Summary
        </span>
        <div className="flex items-center gap-1">
          {data.editable && !editing && (
            <span
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[color:var(--primary)] hover:bg-[color:var(--primary-soft)] cursor-pointer"
            >
              <Pencil className="h-3 w-3" /> Edit
            </span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--stroke)] px-3 py-2 space-y-2">
          {/* Scalar fields */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {fields.map((f) => {
              const val = draft[f.key];
              return (
                <div key={f.key}>
                  <label className="text-[9px] uppercase tracking-wider text-[color:var(--subtle)] font-medium">
                    {f.label}
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={typeof val === "string" ? val : ""}
                      onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      className="mt-0.5 w-full rounded bg-[color:var(--surface-1)] border border-[color:var(--stroke)] px-2 py-1 text-[11px] text-[color:var(--fg)] outline-none focus:border-[color:var(--primary)]"
                    />
                  ) : (
                    <p className="text-[12px] font-medium text-[color:var(--fg)]">
                      {typeof val === "string" && val ? val : "—"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Passengers */}
          {passengers.length > 0 && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[color:var(--subtle)] font-medium">
                Passengers ({passengers.length})
              </label>
              <div className="mt-1 space-y-1.5">
                {passengers.map((p, idx) => (
                  <div key={idx} className="rounded-lg bg-[color:var(--surface-1)] px-2.5 py-1.5">
                    {editing ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text" placeholder="First name"
                          value={typeof p.given_name === "string" ? p.given_name : ""}
                          onChange={(e) => handlePassengerChange(idx, "given_name", e.target.value)}
                          className="rounded bg-[color:var(--surface-0)] border border-[color:var(--stroke)] px-2 py-1 text-[11px] text-[color:var(--fg)] outline-none focus:border-[color:var(--primary)]"
                        />
                        <input
                          type="text" placeholder="Last name"
                          value={typeof p.family_name === "string" ? p.family_name : ""}
                          onChange={(e) => handlePassengerChange(idx, "family_name", e.target.value)}
                          className="rounded bg-[color:var(--surface-0)] border border-[color:var(--stroke)] px-2 py-1 text-[11px] text-[color:var(--fg)] outline-none focus:border-[color:var(--primary)]"
                        />
                        <input
                          type="text" placeholder="DOB (YYYY-MM-DD)"
                          value={typeof p.born_on === "string" ? p.born_on : ""}
                          onChange={(e) => handlePassengerChange(idx, "born_on", e.target.value)}
                          className="rounded bg-[color:var(--surface-0)] border border-[color:var(--stroke)] px-2 py-1 text-[11px] text-[color:var(--fg)] outline-none focus:border-[color:var(--primary)]"
                        />
                        <input
                          type="text" placeholder="Phone (+1...)"
                          value={typeof p.phone_number === "string" ? p.phone_number : ""}
                          onChange={(e) => handlePassengerChange(idx, "phone_number", e.target.value)}
                          className="rounded bg-[color:var(--surface-0)] border border-[color:var(--stroke)] px-2 py-1 text-[11px] text-[color:var(--fg)] outline-none focus:border-[color:var(--primary)]"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[color:var(--fg)]">
                          {[
                            typeof p.given_name === "string" ? p.given_name : "",
                            typeof p.family_name === "string" ? p.family_name : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </span>
                        <span className="text-[10px] text-[color:var(--subtle)]">
                          {typeof p.born_on === "string" && p.born_on ? p.born_on : "No DOB"} &middot; {typeof p.phone_number === "string" && p.phone_number ? p.phone_number : "No phone"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit actions */}
          {editing && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setDraft(data.entities); setEditing(false); }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-[color:var(--subtle)] hover:bg-[color:var(--surface-1)]"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 rounded-lg bg-[color:var(--primary)] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[color:var(--primary-strong)]"
              >
                <Save className="h-3 w-3" /> Save changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Booking Confirmed Card ───────────────────────────────────

function BookingConfirmedCard({ data }: { data: BookingConfirmedData }) {
  return (
    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <span className="text-[12px] font-semibold text-emerald-300">Booking Confirmed</span>
      </div>
      {data.option_summary && (
        <p className="text-[11px] text-emerald-200/80 mb-1">{data.option_summary}</p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-emerald-300/70">
        {data.duffel_order_id && (
          <span>Order: <code className="font-mono">{data.duffel_order_id}</code></span>
        )}
        {data.itinerary_revision != null && (
          <span>Rev: {data.itinerary_revision}</span>
        )}
      </div>
    </div>
  );
}

// ── Agent Progress Indicator ─────────────────────────────────

function AgentProgressIndicator() {
  const steps = [
    { label: "Checking flight status", icon: "plane" },
    { label: "Fetching weather data", icon: "cloud" },
    { label: "Searching alternatives", icon: "search" },
    { label: "Ranking options", icon: "bar-chart" },
  ];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
        <span className="text-[11px] font-semibold text-amber-300">Agent scanning...</span>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {i < activeStep ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : i === activeStep ? (
              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-[color:var(--stroke)]" />
            )}
            <span className={`text-[10px] ${i <= activeStep ? "text-[color:var(--fg)]" : "text-[color:var(--subtle)]"}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Typing Indicator ─────────────────────────────────────────

function TypingIndicator({ phase }: { phase?: string }) {
  const isAgentRunning = phase === "agent_running";
  return (
    <div className="flex items-start gap-2.5 px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
        <Bot className="h-3.5 w-3.5 text-[color:var(--primary)]" />
      </div>
      <div className="flex flex-col items-start">
        <div className="rounded-2xl rounded-tl-sm bg-[color:var(--surface-1)] px-4 py-2.5">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--muted)] [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--muted)] [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--muted)] [animation-delay:300ms]" />
          </div>
        </div>
        {isAgentRunning && <AgentProgressIndicator />}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function ChatMessages({
  messages,
  sending,
  phase,
  onConfirmOption,
  onSaveEntities,
}: {
  messages: ChatMessagePublic[];
  sending: boolean;
  phase?: string;
  onConfirmOption?: (optionIndex: number) => void;
  onSaveEntities?: (entities: Record<string, unknown>) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  if (messages.length === 0 && !sending) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
          <Bot className="h-6 w-6 text-[color:var(--primary)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[color:var(--fg)]">ReRoute AI Assistant</p>
          <p className="mt-1 text-xs text-[color:var(--muted)] leading-relaxed max-w-[220px]">
            Tell me about your flight and I&apos;ll set everything up for disruption monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 py-3 scrollbar-thin">
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <div key={msg.id} className={`flex items-start gap-2.5 px-2 ${isUser ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-[color:var(--surface-2)]" : "bg-[color:var(--primary-soft)]"}`}>
              {isUser ? <User className="h-3.5 w-3.5 text-[color:var(--fg)]" /> : <Bot className="h-3.5 w-3.5 text-[color:var(--primary)]" />}
            </div>

            {/* Bubble + cards */}
            <div className={`max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${isUser ? "rounded-tr-sm bg-[color:var(--primary)] text-white" : "rounded-tl-sm bg-[color:var(--surface-1)] text-[color:var(--fg)]"}`}>
                {renderContent(msg.content)}
              </div>

              {/* Entity badges */}
              {!isUser && msg.extracted_entities && <EntityBadges entities={msg.extracted_entities} />}

              {/* Option cards */}
              {!isUser && msg.card_type === "options" && msg.card_data && onConfirmOption && (
                <OptionCards
                  data={msg.card_data as unknown as OptionCardData}
                  onConfirm={onConfirmOption}
                />
              )}

              {/* Entity summary/editor card */}
              {!isUser && msg.card_type === "entity_summary" && msg.card_data && onSaveEntities && (
                <EntityEditorCard
                  data={msg.card_data as { entities: Record<string, unknown>; editable: boolean }}
                  onSave={onSaveEntities}
                />
              )}

              {/* Booking confirmed card */}
              {!isUser && msg.card_type === "booking_confirmed" && msg.card_data && (
                <BookingConfirmedCard data={msg.card_data as unknown as BookingConfirmedData} />
              )}

              <span className="mt-1 text-[10px] text-[color:var(--subtle)] px-1">
                {formatTime(msg.created_at)}
              </span>
            </div>
          </div>
        );
      })}

      {sending && <TypingIndicator phase={phase} />}
      <div ref={bottomRef} />
    </div>
  );
}
