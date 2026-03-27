"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import { useCreateDemoTrip } from "@/hooks/use-trip-workspace";
import type { TripPublic } from "@/lib/api-types";
import { apiCreateTrip, apiDeleteTrip, apiListTrips } from "@/lib/reroute-api";
import { buildSnapshotTripSummary } from "@/lib/reroute-display";
import { snapshotForDuplicate } from "@/lib/trip-snapshot";

export default function TripsPage() {
  const router = useRouter();
  const { user } = useRerouteSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripPublic[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiListTrips();
      setTrips([...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load trips.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const { createDemoTrip, creating, error: createErr, clearError } = useCreateDemoTrip(load);

  async function duplicateTrip(trip: TripPublic) {
    if (!user) return;
    setDuplicatingId(trip.id);
    try {
      const snap = snapshotForDuplicate(trip.snapshot as Record<string, unknown>);
      const created = await apiCreateTrip({
        title: `${trip.title?.trim() || "Trip"} (copy)`,
        snapshot: snap,
      });
      await load();
      router.push(`/trips/${created.id}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not duplicate trip.");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function deleteTrip(id: string, label: string) {
    if (!user) return;
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await apiDeleteTrip(id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not delete trip.");
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
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--fg)]">Trips</h1>
          <p className="mt-1 text-sm text-[color:var(--subtle)]">
            Create a real itinerary or open a quick demo. Run the agent from any trip.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] px-4 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface-2)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New trip
          </Link>
          <button
            type="button"
            onClick={() => {
              clearError();
              void createDemoTrip();
            }}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--bg)] transition hover:bg-[color:var(--primary-strong)] disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            Demo trip
          </button>
        </div>
      </div>

      {createErr ? <p className="mt-4 text-sm text-red-400">{createErr}</p> : null}

      {trips.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-4 py-12 text-center text-sm text-[color:var(--subtle)]">
          No trips yet.{" "}
          <Link
            href="/trips/new"
            className="font-medium text-[color:var(--primary)] underline underline-offset-2 hover:text-[color:var(--primary-strong)]"
          >
            Create a trip
          </Link>{" "}
          or use Demo trip.
        </p>
      ) : (
        <ul className="rr-card mt-8 divide-y divide-[color:var(--stroke)] overflow-hidden rounded-xl">
          {trips.map((t) => {
            const route = buildSnapshotTripSummary(t.snapshot as Record<string, unknown>).primaryRoute;
            const routePrefix = route ? `${route} · ` : "";
            return (
            <li key={t.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/trips/${t.id}`}
                className="min-w-0 flex-1 font-medium text-[color:var(--fg)] transition hover:text-[color:var(--primary)]"
              >
                {t.title?.trim() || "Untitled trip"}
                <span className="mt-0.5 block text-xs font-normal text-[color:var(--subtle)]">
                  {routePrefix}
                  Updated {t.updated_at.slice(0, 10)} · rev {t.itinerary_revision}
                </span>
              </Link>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={`/trips/${t.id}`}
                  className="rounded-lg border border-[color:var(--stroke)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]"
                >
                  Open
                </Link>
                <Link
                  href={`/trips/${t.id}/edit`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--stroke)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={duplicatingId === t.id}
                  onClick={() => void duplicateTrip(t)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--stroke)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)] disabled:opacity-50"
                  aria-label={`Duplicate ${t.title ?? "trip"}`}
                >
                  {duplicatingId === t.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Copy
                </button>
                <button
                  type="button"
                  disabled={deletingId === t.id}
                  onClick={() => void deleteTrip(t.id, t.title?.trim() || "Untitled trip")}
                  className="inline-flex items-center gap-1 rounded-lg border border-[color:color-mix(in_oklab,var(--danger),transparent_55%)] bg-[color:color-mix(in_oklab,var(--danger),transparent_90%)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--danger)] transition hover:bg-[color:color-mix(in_oklab,var(--danger),transparent_85%)] disabled:opacity-50"
                  aria-label={`Delete ${t.title ?? "trip"}`}
                >
                  {deletingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
