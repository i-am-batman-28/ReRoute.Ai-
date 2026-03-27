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
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--primary)]" aria-hidden />
        Loading overview…
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

  const recent = trips.slice(0, 4);
  const pending = monitor?.total_pending_proposals ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <section className="rounded-2xl border border-[color:var(--stroke)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary-soft),transparent_20%)_0%,var(--surface-1)_100%)] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold leading-snug tracking-tight text-[color:var(--fg)]">
          {user?.full_name?.trim()
            ? `Hi ${user.full_name.trim().split(" ")[0]}, ready for your next trip?`
            : "Hi there, ready for your next trip?"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Here's a quick look at your trips and live updates.
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/trips"
          className="rr-card rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-5 transition hover:shadow-[var(--shadow-2)]"
        >
          <div className="flex items-center gap-2 text-[color:var(--subtle)]">
            <MapPin className="h-4 w-4 text-[color:var(--primary)]" aria-hidden />
            <span className="text-xs font-semibold tracking-wide">Trips</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[color:var(--fg)]">{trips.length}</p>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">Itineraries in your account</p>
        </Link>
        <Link
          href="/monitor"
          className="rr-card rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-5 transition hover:shadow-[var(--shadow-2)]"
        >
          <div className="flex items-center gap-2 text-[color:var(--subtle)]">
            <Radar className="h-4 w-4 text-[color:var(--primary)]" aria-hidden />
            <span className="text-xs font-semibold tracking-wide">Monitor</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[color:var(--warn)]">{pending}</p>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">Pending proposals (all trips)</p>
        </Link>
        <Link
          href="/activity"
          className="rr-card rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-5 transition hover:shadow-[var(--shadow-2)]"
        >
          <div className="flex items-center gap-2 text-[color:var(--subtle)]">
            <span className="text-xs font-semibold tracking-wide">Activity</span>
          </div>
          <p className="mt-2 text-sm font-medium text-[color:var(--fg)]">Disruption timeline</p>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">Events across all trips</p>
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-[color:var(--fg)]">Recent trips</h2>
          <Link
            href="/trips"
            className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--subtle)] hover:text-[color:var(--primary)]"
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-4 py-8 text-center text-sm text-[color:var(--subtle)]">
            No trips yet.{" "}
            <Link href="/trips" className="font-medium text-[color:var(--primary)] underline underline-offset-2 hover:text-[color:var(--primary-strong)]">
              Create one on the Trips page
            </Link>
            .
          </p>
        ) : (
          <ul className="rr-card mt-4 divide-y divide-[color:var(--stroke)] overflow-hidden rounded-xl">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/trips/${t.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-[color:var(--surface-1)]"
                >
                  <span className="font-medium text-[color:var(--fg)]">{t.title?.trim() || "Untitled trip"}</span>
                  <span className="shrink-0 text-[color:var(--subtle)]">Updated {t.updated_at.slice(0, 10)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
