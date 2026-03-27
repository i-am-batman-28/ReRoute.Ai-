"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, CheckCircle, AlertTriangle, Loader2, MapPin, Plane, Radar, Shield } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { MonitorStatusResponse, TripPublic } from "@/lib/api-types";
import { buildSnapshotTripSummary } from "@/lib/reroute-display";
import { apiListTrips, apiMonitorStatus } from "@/lib/reroute-api";

function MonitoringPulse({ generatedAt }: { generatedAt: string | null }) {
  const timeAgo = generatedAt
    ? Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000)
    : null;
  const label = timeAgo !== null
    ? timeAgo < 1 ? "Just now" : `${timeAgo}m ago`
    : "Connecting...";

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs font-medium text-emerald-400">Monitoring active</span>
      <span className="text-xs text-zinc-500">· Last scan: {label}</span>
    </div>
  );
}

function StatusSummaryCards({ monitor, trips }: { monitor: MonitorStatusResponse | null; trips: TripPublic[] }) {
  const disruptions = (monitor?.trips ?? []).filter((t) => t.last_disruption_kind && t.last_disruption_kind !== "monitor_scan");
  const allOnTime = disruptions.length === 0 && trips.length > 0;
  const hasDisruptions = disruptions.length > 0;
  const pendingCount = monitor?.total_pending_proposals ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Flight Status Card */}
      <div className={`rounded-xl border p-4 ${allOnTime ? "border-emerald-500/30 bg-emerald-500/5" : hasDisruptions ? "border-amber-500/30 bg-amber-500/5" : "border-[color:var(--stroke)] bg-[color:var(--surface-0)]"}`}>
        <div className="flex items-center gap-2">
          {allOnTime ? (
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          ) : hasDisruptions ? (
            <AlertTriangle className="h-5 w-5 text-amber-500/70" />
          ) : (
            <Plane className="h-5 w-5 text-zinc-500" />
          )}
          <span className="text-sm font-semibold text-[color:var(--fg)]">
            {allOnTime ? "All flights on time" : hasDisruptions ? `${disruptions.length} disruption${disruptions.length > 1 ? "s" : ""} detected` : "No flights monitored"}
          </span>
        </div>
        <p className="mt-1 text-xs text-[color:var(--subtle)]">
          {allOnTime ? "No action needed — we're watching." : hasDisruptions ? "Agent has found alternatives." : "Add a trip to start monitoring."}
        </p>
      </div>

      {/* Pending Actions Card */}
      <div className={`rounded-xl border p-4 ${pendingCount > 0 ? "border-blue-500/30 bg-blue-500/5" : "border-[color:var(--stroke)] bg-[color:var(--surface-0)]"}`}>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-400" />
          <span className="text-sm font-semibold text-[color:var(--fg)]">
            {pendingCount > 0 ? `${pendingCount} pending proposal${pendingCount > 1 ? "s" : ""}` : "No pending actions"}
          </span>
        </div>
        <p className="mt-1 text-xs text-[color:var(--subtle)]">
          {pendingCount > 0 ? "Review and confirm rebooking options." : "All clear — nothing to review."}
        </p>
      </div>

      {/* Trips Watched Card */}
      <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-4">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-[color:var(--primary)]" />
          <span className="text-sm font-semibold text-[color:var(--fg)]">{monitor?.trip_count ?? 0} trip{(monitor?.trip_count ?? 0) !== 1 ? "s" : ""} watched</span>
        </div>
        <p className="mt-1 text-xs text-[color:var(--subtle)]">
          Scanning every 10 minutes for disruptions.
        </p>
      </div>
    </div>
  );
}

function OnboardingGuide({ hasTrips, autoRebook }: { hasTrips: boolean; autoRebook: boolean }) {
  if (hasTrips && autoRebook) return null;

  const steps = [
    { done: hasTrips, label: "Add a trip", desc: "Create your first trip with flight details.", href: "/trips/new", icon: Plane },
    { done: hasTrips, label: "Enable auto-rebook", desc: "Let the agent book alternatives automatically.", href: "/settings", icon: Shield },
    { done: hasTrips && autoRebook, label: "Relax", desc: "We'll monitor and handle disruptions for you.", href: null, icon: CheckCircle },
  ];

  return (
    <div className="rounded-xl border border-dashed border-[color:var(--primary)]/30 bg-[color:var(--primary-soft)]/10 p-5">
      <h3 className="text-sm font-semibold text-[color:var(--fg)]">Get started in 3 steps</h3>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-1 items-start gap-3 rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] p-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-emerald-500/20 text-emerald-400" : "bg-[color:var(--surface-2)] text-[color:var(--subtle)]"}`}>
              {s.done ? <CheckCircle className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${s.done ? "text-emerald-400 line-through" : "text-[color:var(--fg)]"}`}>
                {s.href && !s.done ? <Link href={s.href} className="hover:underline">{s.label}</Link> : s.label}
              </p>
              <p className="text-xs text-[color:var(--subtle)]">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const tripsById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);

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
        <button type="button" onClick={() => void load()} className="mt-4 text-sm font-medium text-[color:var(--primary)] underline underline-offset-2">Retry</button>
      </div>
    );
  }

  const recent = trips.slice(0, 4);
  const monitorRows = monitor?.trips ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Hero Section */}
      <section className="rounded-2xl border border-[color:var(--stroke)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary-soft),transparent_20%)_0%,var(--surface-1)_100%)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-[color:var(--fg)]">
              {user?.full_name?.trim()
                ? `Hi ${user.full_name.trim().split(" ")[0]}, ready for your next trip?`
                : "Hi there, ready for your next trip?"}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Your always-on travel disruption command center.
            </p>
          </div>
          <MonitoringPulse generatedAt={monitor?.generated_at ?? null} />
        </div>
      </section>

      {/* Onboarding */}
      <div className="mt-6">
        <OnboardingGuide hasTrips={trips.length > 0} autoRebook={user?.auto_rebook ?? false} />
      </div>

      {/* Status Summary Cards */}
      <div className="mt-6">
        <StatusSummaryCards monitor={monitor} trips={trips} />
      </div>

      {/* Monitoring Table */}
      <section className="mt-10" id="monitoring">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--fg)]">Monitored Trips</h2>
            <p className="mt-1 text-sm text-[color:var(--subtle)]">
              Flight status, pending proposals, and last disruption signals.
            </p>
          </div>
          <MonitoringPulse generatedAt={monitor?.generated_at ?? null} />
        </div>

        {monitorRows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-4 py-12 text-center">
            <Radar className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-[color:var(--fg)]">No trips being monitored</p>
            <p className="mt-1 text-xs text-[color:var(--subtle)]">Create a trip and we'll start scanning for disruptions automatically.</p>
            <Link href="/trips/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--bg)]">
              <Plane className="h-4 w-4" /> Add your first trip
            </Link>
          </div>
        ) : (
          <div className="rr-card mt-4 overflow-x-auto rounded-xl border border-[color:var(--stroke)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[color:var(--stroke)] bg-[color:var(--surface-0)]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Trip</th>
                  <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Route</th>
                  <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Status</th>
                  <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Pending</th>
                  <th className="px-4 py-3 font-medium text-[color:var(--muted)]">Last scan</th>
                  <th className="px-4 py-3 font-medium text-[color:var(--muted)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--stroke)]">
                {monitorRows.map((row) => {
                  const tr = tripsById.get(row.trip_id);
                  const route = tr?.snapshot ? buildSnapshotTripSummary(tr.snapshot as Record<string, unknown>).primaryRoute : null;
                  const kind = row.last_disruption_kind;
                  const isDisruption = kind && kind !== "monitor_scan";
                  return (
                    <tr key={row.trip_id} className="cursor-pointer transition hover:bg-[color:var(--surface-1)]" onClick={() => window.location.href = `/trips/${row.trip_id}`}>
                      <td className="px-4 py-3 font-medium text-[color:var(--fg)]">{row.title?.trim() || "Untitled"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[color:var(--subtle)]">{route ?? "—"}</td>
                      <td className="px-4 py-3">
                        {isDisruption ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500/70">
                            <AlertTriangle className="h-3 w-3" /> {kind}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> On time
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[color:var(--warn)]">{row.pending_proposal_count || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[color:var(--subtle)]">
                        {row.last_disruption_at ? new Date(row.last_disruption_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-zinc-600">→</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Trips */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-[color:var(--fg)]">Recent trips</h2>
          <Link href="/trips" className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--subtle)] hover:text-[color:var(--primary)]">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-4 py-10 text-center">
            <MapPin className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-[color:var(--fg)]">No trips yet</p>
            <p className="mt-1 text-xs text-[color:var(--subtle)]">Create a trip to get started with disruption monitoring.</p>
            <Link href="/trips/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--bg)]">
              Create your first trip
            </Link>
          </div>
        ) : (
          <ul className="rr-card mt-4 divide-y divide-[color:var(--stroke)] overflow-hidden rounded-xl">
            {recent.map((t) => (
              <li key={t.id}>
                <Link href={`/trips/${t.id}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-[color:var(--surface-1)]">
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
