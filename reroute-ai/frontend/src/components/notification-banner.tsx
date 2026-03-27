"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plane, X } from "lucide-react";

import { useNotifications, type NotificationEvent } from "@/hooks/use-notifications";

function BannerContent({ event, onDismiss }: { event: NotificationEvent; onDismiss: () => void }) {
  const router = useRouter();
  const data = event.data;

  const isAutoRebook = event.type === "auto_rebook";
  const isAlert = event.type === "disruption_alert";

  const bgColor = isAutoRebook
    ? "bg-emerald-500/15 border-emerald-500/30"
    : "bg-amber-500/15 border-amber-500/30";
  const iconColor = isAutoRebook ? "text-emerald-400" : "text-amber-400";
  const Icon = isAutoRebook ? Check : AlertTriangle;

  return (
    <div
      className={`fixed top-16 left-1/2 z-50 -translate-x-1/2 w-full max-w-lg animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl border ${bgColor} backdrop-blur-md px-4 py-3 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isAutoRebook ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[color:var(--fg)]">
            {isAutoRebook ? "Auto-rebooked!" : "Flight disruption detected"}
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--muted)] line-clamp-2">
            {data.message || `Your flight was ${data.disruption_type || "disrupted"}.`}
          </p>
          {data.trip_id && (
            <button
              type="button"
              onClick={() => {
                router.push(`/trips/${data.trip_id}`);
                onDismiss();
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
            >
              <Plane className="h-3 w-3" />
              View trip
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationBanner() {
  const { latestEvent, dismissLatest } = useNotifications();

  if (!latestEvent || latestEvent.type === "connected") return null;

  return <BannerContent event={latestEvent} onDismiss={dismissLatest} />;
}
