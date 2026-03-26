"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Loader2, Pencil, Trash2 } from "lucide-react";

import { ReRouteDashboard } from "@/components/reroute/reroute-dashboard";
import { useRerouteSession } from "@/components/reroute-session-provider";
import { useTripWorkspace } from "@/hooks/use-trip-workspace";
import { apiCreateTrip, apiDeleteTrip } from "@/lib/reroute-api";
import { snapshotForDuplicate } from "@/lib/trip-snapshot";

export default function TripWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const { user, logout } = useRerouteSession();
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const {
    tripLoad,
    tripError,
    detail,
    monitor,
    events,
    proposal,
    proposing,
    proposeJobState,
    confirming,
    confirmError,
    proposeError,
    runPropose,
    runConfirm,
    refresh,
    dismissProposal,
  } = useTripWorkspace(tripId);

  async function duplicateTrip() {
    if (!user || !tripId || !detail) return;
    setDuplicating(true);
    try {
      const snap = snapshotForDuplicate(detail.trip.snapshot as Record<string, unknown>);
      const created = await apiCreateTrip({
        title: `${detail.trip.title?.trim() || "Trip"} (copy)`,
        snapshot: snap,
      });
      router.push(`/trips/${created.id}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not duplicate trip.");
    } finally {
      setDuplicating(false);
    }
  }

  async function deleteTrip() {
    if (!user || !tripId) return;
    if (!window.confirm("Delete this trip and its stored itinerary? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiDeleteTrip(tripId);
      router.push("/trips");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not delete trip.");
    } finally {
      setDeleting(false);
    }
  }

  if (!tripId) {
    return (
      <div className="px-4 py-16 text-center text-sm text-zinc-500">
        Invalid trip.{" "}
        <Link href="/trips" className="font-medium underline underline-offset-2 hover:opacity-80" style={{ color: "var(--primary)" }}>
          Back to trips
        </Link>
      </div>
    );
  }

  const userLabel = user?.full_name?.trim() ? `${user.full_name} · ${user.email}` : (user?.email ?? "");

  const bridgeState =
    tripLoad === "loading" || tripLoad === "idle"
      ? "loading"
      : tripLoad === "error"
        ? "error"
        : "ready";

  return (
    <>
      {bridgeState === "ready" && detail ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/trips"
            className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            ← Trips
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/trips/${tripId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit trip
            </Link>
            <button
              type="button"
              disabled={duplicating || !detail}
              onClick={() => void duplicateTrip()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              Duplicate
            </button>
            {proposal ? (
              <button
                type="button"
                onClick={() => dismissProposal()}
                className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
              >
                Clear session proposal
              </button>
            ) : null}
            <button
              type="button"
              disabled={deleting}
              onClick={() => void deleteTrip()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--danger)] hover:bg-red-500/20 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
              Delete trip
            </button>
          </div>
        </div>
      ) : null}
      <ReRouteDashboard
        userLabel={userLabel}
        onLogout={logout}
        embedded
        bridge={{
          state: bridgeState,
          errorMessage: tripError,
          tripId,
          detail,
          monitor,
          events,
          proposal,
          proposing,
          proposeJobState,
          confirming,
          confirmError,
          proposeError,
          creatingDemo: false,
          runPropose,
          runConfirm,
          refresh,
          createDemoTrip: async () => {},
        }}
      />
    </>
  );
}
