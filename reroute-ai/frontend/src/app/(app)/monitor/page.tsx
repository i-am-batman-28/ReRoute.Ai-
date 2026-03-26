"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { MonitorStatusResponse, TripPublic } from "@/lib/api-types";
import { buildSnapshotTripSummary } from "@/lib/reroute-display";
import { apiListTrips, apiMonitorStatus } from "@/lib/reroute-api";

export default function MonitorPage() {
  const { user } = useRerouteSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonitorStatusResponse | null>(null);
  const [tripsById, setTripsById] = useState<Map<string, TripPublic>>(new Map());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [m, list] = await Promise.all([apiMonitorStatus(), apiListTrips()]);
      setData(m);
      setTripsById(new Map(list.map((x) => [x.id, x])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load monitor status.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500/70" aria-hidden />
        Loading monitor…
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

  const trips = data?.trips ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--fg)]">Monitor</h1>
      <p className="mt-1 text-sm text-[color:var(--subtle)]">
        Live summary of trips under watch, pending proposals, and last disruption signals.
      </p>

      {data ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rr-card rounded-xl px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--subtle)]">Trips</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--fg)]">{data.trip_count}</div>
          </div>
          <div className="rr-card rounded-xl px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--subtle)]">Pending proposals</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--warn)]">{data.total_pending_proposals}</div>
          </div>
          <div className="rr-card rounded-xl px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--subtle)]">Shown in table</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--fg)]">{data.trips_shown}</div>
          </div>
          <p className="sm:col-span-3 text-xs text-[color:var(--subtle)]">
            Generated {new Date(data.generated_at).toLocaleString()}
          </p>
        </div>
      ) : null}

      {trips.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-12 text-center text-sm text-zinc-500">
          No monitored trips yet.{" "}
          <Link href="/trips" className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
            Add a trip
          </Link>
          .
        </p>
      ) : (
        <div className="rr-card mt-8 overflow-x-auto rounded-xl">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[color:var(--stroke)] bg-[color:var(--surface-0)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Trip</th>
                <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Route</th>
                <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Revision</th>
                <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Pending</th>
                <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Last disruption</th>
                <th className="px-4 py-3 font-medium text-[color:var(--muted)]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--stroke)]">
              {trips.map((row) => {
                const tr = tripsById.get(row.trip_id);
                const route = tr?.snapshot
                  ? buildSnapshotTripSummary(tr.snapshot as Record<string, unknown>).primaryRoute
                  : null;
                return (
                <tr key={row.trip_id} className="transition hover:bg-[color:var(--surface-1)]">
                  <td className="px-4 py-3 font-medium text-[color:var(--fg)]">{row.title?.trim() || "Untitled"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[color:var(--subtle)]">{route ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-[color:var(--subtle)]">{row.itinerary_revision}</td>
                  <td className="px-4 py-3 tabular-nums text-[color:var(--warn)]">{row.pending_proposal_count}</td>
                  <td className="px-4 py-3 text-[color:var(--subtle)]">
                    {row.last_disruption_kind ? (
                      <>
                        {row.last_disruption_kind}
                        {row.last_disruption_at ? (
                          <span className="block text-xs text-[color:var(--subtle)] opacity-80">
                            {new Date(row.last_disruption_at).toLocaleString()}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/trips/${row.trip_id}`}
                      className="font-medium text-[color:var(--primary)] underline-offset-2 hover:text-[color:var(--primary-strong)] hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
