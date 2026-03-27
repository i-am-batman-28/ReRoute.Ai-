"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Loader2, MapPin, Pencil, Plane, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { MonitorStatusResponse, TripPublic } from "@/lib/api-types";
import { apiDeleteTrip, apiListTrips, apiMonitorStatus } from "@/lib/reroute-api";
import { buildSnapshotTripSummary } from "@/lib/reroute-display";

type TripStatus = "on_time" | "delayed" | "cancelled" | "diverted" | "rebooked" | "unknown";

function getTripStatus(tripId: string, monitor: MonitorStatusResponse | null, trip: TripPublic): TripStatus {
  const row = (monitor?.trips ?? []).find((t) => t.trip_id === tripId);
  if (!row) return "unknown";

  // Check if rebooked (revision > 1 means itinerary was updated)
  if (trip.itinerary_revision > 1) return "rebooked";

  const kind = row.last_disruption_kind;
  if (!kind || kind === "monitor_scan") return "on_time";
  if (kind === "agent_confirm") return "rebooked";

  // Check disruption type from the monitor data
  return "delayed"; // monitor_alert means something changed
}

function StatusBadge({ status }: { status: TripStatus }) {
  const config: Record<TripStatus, { label: string; bg: string; text: string; Icon: typeof CheckCircle }> = {
    on_time: { label: "On time", bg: "bg-emerald-500/10", text: "text-emerald-400", Icon: CheckCircle },
    delayed: { label: "Disrupted", bg: "bg-amber-500/10", text: "text-amber-400", Icon: Clock },
    cancelled: { label: "Cancelled", bg: "bg-red-500/10", text: "text-red-400", Icon: XCircle },
    diverted: { label: "Diverted", bg: "bg-orange-500/10", text: "text-orange-400", Icon: AlertTriangle },
    rebooked: { label: "Rebooked", bg: "bg-blue-500/10", text: "text-blue-400", Icon: RefreshCw },
    unknown: { label: "Monitoring", bg: "bg-zinc-500/10", text: "text-zinc-400", Icon: Plane },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${c.bg} px-2 py-0.5 text-[11px] font-medium ${c.text}`}>
      <c.Icon className="h-3 w-3" /> {c.label}
    </span>
  );
}

export default function TripsPage() {
  const { user } = useRerouteSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripPublic[]>([]);
  const [monitor, setMonitor] = useState<MonitorStatusResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<{ id: string; label: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [list, mon] = await Promise.all([apiListTrips(), apiMonitorStatus()]);
      setTrips([...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      setMonitor(mon);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load trips.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteTrip(id: string) {
    if (!user) return;
    setDeletingId(id);
    try {
      await apiDeleteTrip(id);
      await load();
      setTripToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete trip.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--primary)]" aria-hidden />
        Loading trips…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-6 py-16 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 text-sm font-medium text-[color:var(--primary)] underline underline-offset-2">Retry</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--fg)]">Trips</h1>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">
            Build an itinerary and run the agent from any trip.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--bg)] shadow-sm transition hover:bg-[color:var(--primary-strong)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New trip
          </Link>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-4 py-14 text-center">
          <Plane className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-4 text-base font-medium text-[color:var(--fg)]">No trips yet</p>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">
            Create your first trip and we'll start monitoring for disruptions automatically.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/trips/new" className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--bg)]">
              <Plus className="h-4 w-4" /> Create a trip
            </Link>
          </div>
        </div>
      ) : (
        <ul className="rr-card mt-8 divide-y divide-[color:var(--stroke)] overflow-hidden rounded-xl">
          {trips.map((t) => {
            const route = buildSnapshotTripSummary(t.snapshot as Record<string, unknown>).primaryRoute;
            const routePrefix = route ? `${route} · ` : "";
            const status = getTripStatus(t.id, monitor, t);
            return (
            <li key={t.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/trips/${t.id}`}
                className="min-w-0 flex-1 font-medium text-[color:var(--fg)] transition hover:text-[color:var(--primary)]"
              >
                <div className="flex items-center gap-2">
                  <span>{t.title?.trim() || "Untitled trip"}</span>
                  <StatusBadge status={status} />
                </div>
                <span className="mt-0.5 block text-xs font-normal text-[color:var(--subtle)]">
                  {routePrefix}
                  Updated {t.updated_at.slice(0, 10)} · rev {t.itinerary_revision}
                </span>
              </Link>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link href={`/trips/${t.id}`} className="rounded-lg border border-[color:var(--stroke)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]">Open</Link>
                <Link href={`/trips/${t.id}/edit`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[color:var(--stroke)] text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]" aria-label={`Edit ${t.title ?? "trip"}`} title="Edit trip">
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <button
                  type="button"
                  disabled={deletingId === t.id}
                  onClick={() => setTripToDelete({ id: t.id, label: t.title?.trim() || "Untitled trip" })}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[color:color-mix(in_oklab,var(--danger),transparent_55%)] bg-[color:color-mix(in_oklab,var(--danger),transparent_90%)] text-[color:var(--danger)] transition hover:bg-[color:color-mix(in_oklab,var(--danger),transparent_85%)] disabled:opacity-50"
                  aria-label={`Delete ${t.title ?? "trip"}`}
                  title="Delete trip"
                >
                  {deletingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {tripToDelete ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-6 shadow-xl">
            <h2 className="text-base font-semibold text-[color:var(--fg)]">Delete trip?</h2>
            <p className="mt-2 text-sm text-[color:var(--subtle)]">Delete &ldquo;{tripToDelete.label}&rdquo;? This cannot be undone.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setTripToDelete(null)} disabled={deletingId === tripToDelete.id} className="rounded-lg border border-[color:var(--stroke)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void deleteTrip(tripToDelete.id)} disabled={deletingId === tripToDelete.id} className="inline-flex items-center gap-1.5 rounded-lg border border-[color:color-mix(in_oklab,var(--danger),transparent_55%)] bg-[color:color-mix(in_oklab,var(--danger),transparent_90%)] px-4 py-2 text-sm font-semibold text-[color:var(--danger)] transition hover:bg-[color:color-mix(in_oklab,var(--danger),transparent_85%)] disabled:opacity-50">
                {deletingId === tripToDelete.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
