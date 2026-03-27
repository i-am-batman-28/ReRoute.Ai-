"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { TripPublic } from "@/lib/api-types";
import { buildSnapshotTripSummary } from "@/lib/reroute-display";
import { apiListMyActivityEvents, apiListTrips } from "@/lib/reroute-api";

type Row = {
  id: string;
  trip_id: string;
  kind: string;
  disruption_type: string | null;
  proposal_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  tripTitle: string | null;
  route: string | null;
};

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
      const [trips, events] = await Promise.all([apiListTrips(), apiListMyActivityEvents(300)]);
      const byId = new Map<string, TripPublic>(trips.map((tr) => [tr.id, tr]));
      setRows(
        events.map((ev) => {
          const tr = byId.get(ev.trip_id);
          const route = tr?.snapshot
            ? buildSnapshotTripSummary(tr.snapshot as Record<string, unknown>).primaryRoute
            : null;
          return {
            id: ev.id,
            trip_id: ev.trip_id,
            kind: ev.kind,
            disruption_type: ev.disruption_type,
            proposal_id: ev.proposal_id,
            payload: ev.payload,
            created_at: ev.created_at,
            tripTitle: tr?.title ?? ev.trip_title,
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
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--primary)]" aria-hidden />
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 text-sm font-medium text-[color:var(--primary)] underline underline-offset-2 hover:text-[color:var(--primary)]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--fg)]">Activity</h1>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">
            Disruption and agent-related events across all trips, newest first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] px-3 py-2 text-xs font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)]"
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
              <li key={ev.id} className="rr-card rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--subtle)]">
                    {when.toLocaleString()}
                  </span>
                  <Link
                    href={`/trips/${ev.trip_id}`}
                    className="text-xs font-medium text-[color:var(--primary)] underline-offset-2 hover:text-[color:var(--primary-strong)] hover:underline"
                  >
                    {ev.tripTitle?.trim() || "Trip"} →
                  </Link>
                </div>
                <p className="mt-1 text-sm font-medium text-[color:var(--fg)]">{ev.kind}</p>
                {ev.route ? (
                  <p className="mt-0.5 text-xs text-[color:var(--subtle)]">
                    Route <span className="font-mono text-[color:var(--muted)]">{ev.route}</span>
                  </p>
                ) : null}
                {ev.disruption_type ? (
                  <p className="mt-0.5 text-sm text-[color:var(--subtle)]">{ev.disruption_type}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
