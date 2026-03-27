"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ReRouteDashboard } from "@/components/reroute/reroute-dashboard";
import { useRerouteSession } from "@/components/reroute-session-provider";
import { useTripWorkspace } from "@/hooks/use-trip-workspace";

export default function TripWorkspacePage() {
  const params = useParams();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const { user, logout } = useRerouteSession();
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
          {proposal ? (
            <button
              type="button"
              onClick={() => dismissProposal()}
              className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
            >
              Clear session proposal
            </button>
          ) : null}
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
