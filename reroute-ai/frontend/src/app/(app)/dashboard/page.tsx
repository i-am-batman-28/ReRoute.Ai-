"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ReRouteDashboard } from "@/components/reroute/reroute-dashboard";
import { getApiBase } from "@/lib/api-base";
import type { AgentProposeResponse, TripDetailPublic } from "@/lib/api-types";
import { clearStoredToken, getStoredToken } from "@/lib/auth-token";
import { demoTripSnapshot } from "@/lib/demo-trip-snapshot";
import {
  apiAgentConfirm,
  apiAgentPropose,
  apiCreateTrip,
  apiGetTripDetail,
  apiListDisruptionEvents,
  apiListTrips,
  apiMonitorStatus,
} from "@/lib/reroute-api";
import type { UserPublic } from "@/lib/types";

type TripLoadState = "idle" | "loading" | "empty" | "ready" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [tripLoad, setTripLoad] = useState<TripLoadState>("idle");
  const [tripError, setTripError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TripDetailPublic | null>(null);
  const [monitor, setMonitor] = useState<Awaited<ReturnType<typeof apiMonitorStatus>> | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof apiListDisruptionEvents>>>([]);
  const [proposal, setProposal] = useState<AgentProposeResponse | null>(null);
  const [proposing, setProposing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [creatingDemo, setCreatingDemo] = useState(false);

  const loadMe = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      router.replace("/");
      return;
    }
    setToken(t);
    setLoadingUser(true);
    setUserError(null);
    try {
      const res = await fetch(`${getApiBase()}/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        clearStoredToken();
        router.replace("/");
        return;
      }
      if (!res.ok) {
        setUserError("Could not load your profile.");
        return;
      }
      const data = (await res.json()) as UserPublic;
      setUser(data);
    } catch {
      setUserError("Network error — is the API running?");
    } finally {
      setLoadingUser(false);
    }
  }, [router]);

  const loadTripData = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    setTripLoad("loading");
    setTripError(null);
    try {
      const list = await apiListTrips(t);
      if (list.length === 0) {
        setTripId(null);
        setDetail(null);
        setMonitor(null);
        setEvents([]);
        setProposal(null);
        setTripLoad("empty");
        return;
      }
      const sorted = [...list].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      const id = sorted[0].id;
      setTripId(id);
      const [d, m, ev] = await Promise.all([
        apiGetTripDetail(t, id),
        apiMonitorStatus(t),
        apiListDisruptionEvents(t, id),
      ]);
      setDetail(d);
      setMonitor(m);
      setEvents(ev);
      setTripLoad("ready");
    } catch (e) {
      setTripError(e instanceof Error ? e.message : "Could not load trips.");
      setTripLoad("error");
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!user || !token) return;
    void loadTripData();
  }, [user, token, loadTripData]);

  const runPropose = useCallback(
    async (simulateDisruption?: string | null) => {
      const t = getStoredToken();
      if (!t || !tripId) return;
      setProposing(true);
      setConfirmError(null);
      try {
        const res = await apiAgentPropose(t, tripId, simulateDisruption);
        setProposal(res);
      } catch (e) {
        setConfirmError(e instanceof Error ? e.message : "Agent propose failed.");
      } finally {
        setProposing(false);
      }
    },
    [tripId],
  );

  const runConfirm = useCallback(
    async (selectedOptionId: string): Promise<boolean> => {
      const t = getStoredToken();
      if (!t || !proposal) return false;
      setConfirming(true);
      setConfirmError(null);
      try {
        await apiAgentConfirm(t, proposal.proposal_id, selectedOptionId);
        setProposal(null);
        await loadTripData();
        return true;
      } catch (e) {
        setConfirmError(e instanceof Error ? e.message : "Confirm failed.");
        return false;
      } finally {
        setConfirming(false);
      }
    },
    [proposal, loadTripData],
  );

  const createDemoTrip = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    setCreatingDemo(true);
    setTripError(null);
    try {
      await apiCreateTrip(t, { title: "Demo trip", snapshot: demoTripSnapshot() });
      await loadTripData();
    } catch (e) {
      setTripError(e instanceof Error ? e.message : "Could not create trip.");
      setTripLoad("error");
    } finally {
      setCreatingDemo(false);
    }
  }, [loadTripData]);

  function logout() {
    clearStoredToken();
    router.push("/");
    router.refresh();
  }

  if (loadingUser) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-[#faf8f3] text-sm text-[#6b6558]">
        Loading trip…
      </div>
    );
  }

  if (userError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{userError}</p>
        <button
          type="button"
          onClick={() => void loadMe()}
          className="mt-4 text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user || !token) {
    return null;
  }

  const userLabel = user.full_name?.trim() ? `${user.full_name} · ${user.email}` : user.email;

  const bridgeState =
    tripLoad === "loading" || tripLoad === "idle"
      ? "loading"
      : tripLoad === "empty"
        ? "empty"
        : tripLoad === "error"
          ? "error"
          : "ready";

  return (
    <ReRouteDashboard
      userLabel={userLabel}
      onLogout={logout}
      bridge={{
        state: bridgeState,
        errorMessage: tripError,
        tripId,
        detail,
        monitor,
        events,
        proposal,
        proposing,
        confirming,
        confirmError,
        creatingDemo,
        runPropose,
        runConfirm,
        refresh: loadTripData,
        createDemoTrip,
      }}
    />
  );
}
