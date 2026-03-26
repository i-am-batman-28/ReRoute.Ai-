"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, MapPin, Radar } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { MonitorStatusResponse, TripPublic } from "@/lib/api-types";
import { apiListTrips, apiMonitorStatus } from "@/lib/reroute-api";

export default function DashboardOverviewPage() {
  const { user } = useRerouteSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripPublic[]>([]);
  const [monitor, setMonitor] = useState<MonitorStatusResponse | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [list, mon] = await Promise.all([apiListTrips(), apiMonitorStatus()]);
      setTrips([...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      setMonitor(mon);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load overview.");
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
        Loading overview…
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

  const recent = trips.slice(0, 4);
  const pending = monitor?.total_pending_proposals ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Overview</h1>
      <p className="mt-1 text-sm text-zinc-500">Trips, monitoring, and agent activity across your workspace.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/trips"
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20 transition hover:border-zinc-700"
        >
          <div className="flex items-center gap-2 text-zinc-500">
            <MapPin className="h-4 w-4 text-emerald-500/80" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Trips</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-50">{trips.length}</p>
          <p className="mt-1 text-sm text-zinc-500">Itineraries in your account</p>
        </Link>
        <Link
          href="/monitor"
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20 transition hover:border-zinc-700"
        >
          <div className="flex items-center gap-2 text-zinc-500">
            <Radar className="h-4 w-4 text-emerald-500/80" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Monitor</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-200">{pending}</p>
          <p className="mt-1 text-sm text-zinc-500">Pending proposals (all trips)</p>
        </Link>
        <Link
          href="/activity"
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20 transition hover:border-zinc-700"
        >
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wide">Activity</span>
          </div>
          <p className="mt-2 text-sm font-medium text-zinc-100">Disruption timeline</p>
          <p className="mt-1 text-sm text-zinc-500">Events across all trips</p>
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-100">Recent trips</h2>
          <Link
            href="/trips"
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-emerald-400"
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
            No trips yet.{" "}
            <Link href="/trips" className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
              Create one on the Trips page
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/40">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/trips/${t.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-zinc-800/40"
                >
                  <span className="font-medium text-zinc-100">{t.title?.trim() || "Untitled trip"}</span>
                  <span className="shrink-0 text-zinc-500">Updated {t.updated_at.slice(0, 10)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
