"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Minus, Plane, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useChat } from "@/hooks/use-chat";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

// ── localStorage persistence helpers ─────────────────────────

const WIDGET_STATE_KEY = "reroute-chat-widget-state";
const SOUND_PREF_KEY = "reroute-chat-sound";

function readWidgetState(): "open" | "minimized" | "closed" {
  if (typeof window === "undefined") return "closed";
  return (localStorage.getItem(WIDGET_STATE_KEY) as "open" | "minimized" | "closed") || "closed";
}

function writeWidgetState(state: "open" | "minimized" | "closed") {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIDGET_STATE_KEY, state);
}

function readSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

// ── Sound notification ───────────────────────────────────────

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = 0.08;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext not available
  }
}

// ── Phase Indicator ──────────────────────────────────────────

function PhaseIndicator({ phase, tripId }: { phase: string; tripId: string | null }) {
  const labels: Record<string, { text: string; color: string }> = {
    collecting: { text: "Collecting info", color: "var(--primary)" },
    ready_to_save: { text: "Ready to save", color: "#22c55e" },
    trip_created: { text: "Trip saved", color: "#22c55e" },
    agent_running: { text: "Agent scanning...", color: "#f59e0b" },
    agent_complete: { text: "Options ready", color: "#22c55e" },
    done: { text: "Complete", color: "#22c55e" },
  };
  const info = labels[phase] || labels.collecting;

  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.color }} />
      <span className="text-[11px] font-medium" style={{ color: info.color }}>{info.text}</span>
      {tripId && (
        <a
          href={`/trips/${tripId}`}
          className="text-[10px] underline underline-offset-2 text-[color:var(--primary)] hover:text-[color:var(--primary-strong)]"
        >
          View trip
        </a>
      )}
    </div>
  );
}

// ── Entity Progress ──────────────────────────────────────────

function EntityProgress({
  entities,
  missingFields,
}: {
  entities: Record<string, unknown>;
  missingFields: string[];
}) {
  const allRequired = ["flight_number", "origin", "destination", "travel_date", "passengers"];
  const collected = allRequired.filter(
    (f) => !missingFields.some((m) => m === f || m.startsWith(f)),
  );
  const progress = allRequired.length > 0 ? (collected.length / allRequired.length) * 100 : 0;

  if (Object.keys(entities).length === 0) return null;

  // Build detailed missing info
  const missingLabels: string[] = [];
  for (const m of missingFields) {
    if (m === "flight_number") missingLabels.push("flight number");
    else if (m === "origin") missingLabels.push("origin airport");
    else if (m === "destination") missingLabels.push("destination airport");
    else if (m === "travel_date") missingLabels.push("travel date");
    else if (m === "passengers") missingLabels.push("passenger info");
    else if (m.endsWith("_name")) missingLabels.push(m.replace("_", " ").replace("_", " "));
    else if (m.endsWith("_dob")) missingLabels.push(`${m.split("_")[0]} ${m.split("_")[1]} date of birth`);
    else if (m.endsWith("_phone")) missingLabels.push(`${m.split("_")[0]} ${m.split("_")[1]} phone`);
  }

  return (
    <div className="border-b border-[color:var(--stroke)] px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[color:var(--muted)] font-medium uppercase tracking-wider">
          Trip info
        </span>
        <span className="text-[10px] text-[color:var(--subtle)]">
          {collected.length}/{allRequired.length}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: progress === 100 ? "#22c55e" : "var(--primary)",
          }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {allRequired.map((field) => {
          const done = collected.includes(field);
          return (
            <span
              key={field}
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                done
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-[color:var(--surface-2)] text-[color:var(--subtle)]"
              }`}
            >
              {done ? "\u2713" : "\u25CB"} {field.replace(/_/g, " ")}
            </span>
          );
        })}
      </div>
      {missingLabels.length > 0 && missingLabels.length <= 3 && (
        <p className="mt-1 text-[9px] text-[color:var(--subtle)]">
          Need: {missingLabels.join(", ")}
        </p>
      )}
    </div>
  );
}

// ── Main Widget ──────────────────────────────────────────────

export function ChatWidget() {
  // SSR + first client paint must match: never read localStorage in useState initializers.
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevMsgCountRef = useRef(0);
  const restoredFromStorageRef = useRef(false);
  const chat = useChat();
  const router = useRouter();

  // Restore widget + sound prefs after mount (avoids hydration mismatch).
  useEffect(() => {
    const ws = readWidgetState();
    setOpen(ws === "open");
    setMinimized(ws === "minimized");
    setSoundEnabled(readSoundPref());
    restoredFromStorageRef.current = true;
  }, []);

  // Track unread messages when widget is closed/minimized
  useEffect(() => {
    const newCount = chat.messages.filter((m) => m.role === "assistant").length;
    if (newCount > prevMsgCountRef.current) {
      if (!open || minimized) {
        setUnreadCount((c) => c + (newCount - prevMsgCountRef.current));
      }
      // Play sound for new bot message
      if (soundEnabled && prevMsgCountRef.current > 0) {
        playNotificationSound();
      }
    }
    prevMsgCountRef.current = newCount;
  }, [chat.messages, open, minimized, soundEnabled]);

  // Persist widget state (skip until localStorage restore ran — avoids overwriting with "closed")
  useEffect(() => {
    if (!restoredFromStorageRef.current) return;
    if (open && !minimized) writeWidgetState("open");
    else if (minimized) writeWidgetState("minimized");
    else writeWidgetState("closed");
  }, [open, minimized]);

  const toggle = useCallback(() => {
    if (minimized) {
      setMinimized(false);
      setOpen(true);
      setUnreadCount(0);
      return;
    }
    setOpen((p) => {
      if (!p) setUnreadCount(0);
      return !p;
    });
  }, [minimized]);

  const minimize = useCallback(() => setMinimized(true), []);
  const close = useCallback(() => {
    setOpen(false);
    setMinimized(false);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((s) => {
      const next = !s;
      if (typeof window !== "undefined") localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
      return next;
    });
  }, []);

  // Handle special chip actions
  const handleChipAction = useCallback(
    (value: string) => {
      switch (value) {
        case "__USE_MY_INFO__":
          chat.useMyInfo();
          break;
        case "__EDIT_ENTITIES__":
          // Scroll to latest entity card (no-op for now, user can edit inline)
          break;
        case "__VIEW_TRIP__":
          if (chat.session?.trip_id) {
            router.push(`/trips/${chat.session.trip_id}`);
          }
          break;
        case "__NEW_SESSION__":
          chat.startNewSession();
          break;
        default:
          break;
      }
    },
    [chat, router],
  );

  // Handle inline booking confirmation
  const handleConfirmOption = useCallback(
    (optionIndex: number) => {
      chat.sendMessage(`Confirm option ${optionIndex}`);
    },
    [chat],
  );

  // Handle entity save from editor card
  const handleSaveEntities = useCallback(
    (entities: Record<string, unknown>) => {
      chat.updateEntities(entities);
    },
    [chat],
  );

  // ── Floating button ──
  if (!open && !minimized) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-strong))",
          boxShadow: "0 4px 24px rgba(59, 130, 246, 0.35), 0 0 0 3px rgba(59, 130, 246, 0.1)",
        }}
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {unreadCount === 0 && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: "var(--primary)" }}
          />
        )}
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[color:var(--bg)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // ── Minimized pill ──
  if (minimized) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-all duration-300 hover:scale-105"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--stroke)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        <Plane className="h-4 w-4 text-[color:var(--primary)]" />
        <span className="text-xs font-medium text-[color:var(--fg)]">ReRoute AI</span>
        {chat.sending && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
      </button>
    );
  }

  // ── Full panel ──
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
      style={{
        width: "min(400px, calc(100vw - 32px))",
        height: "min(620px, calc(100vh - 48px))",
        background: "var(--bg)",
        border: "1px solid var(--stroke)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--stroke)]"
        style={{ background: "linear-gradient(135deg, var(--surface-0), var(--surface-1))" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-strong))" }}
          >
            <Plane className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--fg)] leading-tight">ReRoute AI</p>
            {chat.session && (
              <PhaseIndicator phase={chat.session.phase} tripId={chat.session.trip_id} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)] transition-colors"
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={chat.startNewSession}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)] transition-colors"
            title="New conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={minimize}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)] transition-colors"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)] transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Entity progress bar */}
      {chat.session?.phase === "collecting" && (
        <EntityProgress entities={chat.entities} missingFields={chat.missingFields} />
      )}

      {/* Error banner */}
      {chat.error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {chat.error}
        </div>
      )}

      {/* Messages */}
      <ChatMessages
        messages={chat.messages}
        sending={chat.sending}
        phase={chat.session?.phase}
        onConfirmOption={handleConfirmOption}
        onSaveEntities={handleSaveEntities}
      />

      {/* Input + Quick Reply Chips */}
      <ChatInput
        onSend={chat.sendMessage}
        onChipAction={handleChipAction}
        sending={chat.sending}
        disabled={chat.loading}
        quickReplies={chat.quickReplies}
      />
    </div>
  );
}
