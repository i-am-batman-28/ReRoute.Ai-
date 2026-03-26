"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { DisruptionEventPublic, TripPublic } from "@/lib/api-types";
import { buildSnapshotTripSummary } from "@/lib/reroute-display";
import { apiListDisruptionEvents, apiListTrips } from "@/lib/reroute-api";

type Row = DisruptionEventPublic & { tripTitle: string | null; route: string | null };

export default function ActivityPage() {
  const { user } = useRerouteSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const trips = await apiListTrips();
      if (trips.length === 0) {
        setRows([]);
        return;
      }
      const byId = new Map<string, TripPublic>(trips.map((tr) => [tr.id, tr]));
      const batches = await Promise.all(
        trips.map(async (tr) => {
          const ev = await apiListDisruptionEvents(tr.id, 200);
          return ev.map((e) => ({
            ...e,
            tripTitle: tr.title,
          }));
        }),
      );
      const merged = batches.flat().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRows(
        merged.map((r) => {
          const tr = byId.get(r.trip_id);
          const route = tr?.snapshot
            ? buildSnapshotTripSummary(tr.snapshot as Record<string, unknown>).primaryRoute
            : null;
          return {
            ...r,
            tripTitle: tr?.title ?? r.tripTitle,
            route,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const empty = useMemo(() => rows.length === 0 && !loading && !error, [rows.length, loading, error]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500/70" aria-hidden />
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 text-sm font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Activity</h1>
          <p className="mt-1 text-sm text-zinc-500">Disruption and agent-related events across all trips, newest first.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {empty ? (
        <p className="mt-10 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-12 text-center text-sm text-zinc-500">
          No events yet. Open a trip and run the agent to generate traces.
        </p>
      ) : (
        <ol className="mt-8 space-y-3">
          {rows.map((ev) => {
            const when = new Date(ev.created_at);
            return (
              <li key={ev.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{when.toLocaleString()}</span>
                  <Link
                    href={`/trips/${ev.trip_id}`}
                    className="text-xs font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
                  >
                    {ev.tripTitle?.trim() || "Trip"} →
                  </Link>
                </div>
                <p className="mt-1 text-sm font-medium text-zinc-100">{ev.kind}</p>
                {ev.route ? (
                  <p className="mt-0.5 text-xs text-zinc-600">
                    Route <span className="font-mono text-zinc-400">{ev.route}</span>
                  </p>
                ) : null}
                {ev.disruption_type ? <p className="mt-0.5 text-sm text-zinc-500">{ev.disruption_type}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
