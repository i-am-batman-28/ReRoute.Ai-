"use client";

import { useCallback, useEffect, useState } from "react";

import type { AgentConfirmResponse, AgentProposeResponse, TripDetailPublic } from "@/lib/api-types";
import { demoTripSnapshot } from "@/lib/demo-trip-snapshot";
import {
  apiAgentConfirm,
  apiAgentPropose,
  apiAgentProposeJobStatus,
  apiCreateTrip,
  apiGetTripDetail,
  apiListDisruptionEvents,
  apiMonitorStatus,
} from "@/lib/reroute-api";

import { useRerouteSession } from "@/components/reroute-session-provider";

export type TripWorkspaceLoadState = "idle" | "loading" | "ready" | "error";

const PROPOSAL_STORAGE_PREFIX = "reroute.proposal.v1";

function proposalStorageKey(tripId: string) {
  return `${PROPOSAL_STORAGE_PREFIX}:${tripId}`;
}

function readStoredProposal(tripId: string): AgentProposeResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(proposalStorageKey(tripId));
    if (!raw) return null;
    return JSON.parse(raw) as AgentProposeResponse;
  } catch {
    return null;
  }
}

function writeStoredProposal(tripId: string, proposal: AgentProposeResponse | null) {
  if (typeof window === "undefined") return;
  if (!proposal) {
    sessionStorage.removeItem(proposalStorageKey(tripId));
    return;
  }
  sessionStorage.setItem(proposalStorageKey(tripId), JSON.stringify(proposal));
}

const AGENT_PROPOSE_ASYNC = process.env.NEXT_PUBLIC_REROUTE_AGENT_ASYNC === "1";

async function pollProposeJobUntilDone(
  taskId: string,
  onState?: (state: string) => void,
): Promise<AgentProposeResponse> {
  const maxMs = 300_000;
  const start = Date.now();
  let delay = 800;
  while (Date.now() - start < maxMs) {
    const st = await apiAgentProposeJobStatus(taskId);
    onState?.(st.state);
    if (st.state === "SUCCESS" && st.result) return st.result;
    if (st.state === "FAILURE") throw new Error(st.error ?? "Agent job failed");
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 200, 3000);
  }
  throw new Error("Agent job timed out. Try again or use synchronous propose (disable NEXT_PUBLIC_REROUTE_AGENT_ASYNC).");
}

export function useTripWorkspace(tripId: string) {
  const { user } = useRerouteSession();
  const [tripLoad, setTripLoad] = useState<TripWorkspaceLoadState>("idle");
  const [tripError, setTripError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TripDetailPublic | null>(null);
  const [monitor, setMonitor] = useState<Awaited<ReturnType<typeof apiMonitorStatus>> | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof apiListDisruptionEvents>>>([]);
  const [proposal, setProposalState] = useState<AgentProposeResponse | null>(null);
  const [proposing, setProposing] = useState(false);
  const [proposeJobState, setProposeJobState] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const setProposal = useCallback(
    (p: AgentProposeResponse | null) => {
      setProposalState(p);
      if (tripId) writeStoredProposal(tripId, p);
      if (typeof window !== "undefined" && tripId && p) {
        if (p.cascade_preview && typeof p.cascade_preview === "object") {
          sessionStorage.setItem(`reroute.cascade.v1:${tripId}`, JSON.stringify(p.cascade_preview));
        }
        if (p.compensation_draft && typeof p.compensation_draft === "object") {
          sessionStorage.setItem(`reroute.compensation.v1:${tripId}`, JSON.stringify(p.compensation_draft));
        }
      }
    },
    [tripId],
  );

  const loadTripData = useCallback(async () => {
    if (!user || !tripId) return;
    setTripLoad("loading");
    setTripError(null);
    try {
      const [d, m, ev] = await Promise.all([
        apiGetTripDetail(tripId),
        apiMonitorStatus(),
        apiListDisruptionEvents(tripId),
      ]);
      setDetail(d);
      setMonitor(m);
      setEvents(ev);
      setTripLoad("ready");
    } catch (e) {
      setTripError(e instanceof Error ? e.message : "Could not load this trip.");
      setTripLoad("error");
      setDetail(null);
      setMonitor(null);
      setEvents([]);
    }
  }, [user, tripId]);

  useEffect(() => {
    if (!user || !tripId) return;
    void loadTripData();
  }, [user, tripId, loadTripData]);

  useEffect(() => {
    if (!tripId || tripLoad !== "ready") return;
    setProposalState((prev) => {
      if (prev) return prev;
      const restored = readStoredProposal(tripId);
      if (restored?.proposal_id && restored.ranked_options?.length) return restored;
      return prev;
    });
  }, [tripId, tripLoad]);

  const runPropose = useCallback(
    async (simulateDisruption?: string | null) => {
      if (!user || !tripId) return;
      setProposing(true);
      setProposeJobState(null);
      setConfirmError(null);
      setProposeError(null);
      try {
        const outcome = await apiAgentPropose(tripId, simulateDisruption, { asyncMode: AGENT_PROPOSE_ASYNC });
        if (outcome.mode === "sync") {
          setProposal(outcome.data);
          return;
        }
        setProposeJobState(outcome.job.state);
        const data = await pollProposeJobUntilDone(outcome.job.task_id, (s) => setProposeJobState(s));
        setProposal(data);
      } catch (e) {
        setProposeError(e instanceof Error ? e.message : "Agent propose failed.");
      } finally {
        setProposing(false);
        setProposeJobState(null);
      }
    },
    [user, tripId, setProposal],
  );

  const runConfirm = useCallback(
    async (selectedOptionId: string, options?: { acknowledgeDisruptionUncertainty?: boolean }): Promise<AgentConfirmResponse | null> => {
      const prop = proposal;
      if (!user || !prop) return null;
      setConfirming(true);
      setConfirmError(null);
      setProposeError(null);
      try {
        const res = await apiAgentConfirm(prop.proposal_id, selectedOptionId, options);
        if (res.applied) {
          setProposal(null);
        }
        await loadTripData();
        return res;
      } catch (e) {
        setConfirmError(e instanceof Error ? e.message : "Confirm failed.");
        return null;
      } finally {
        setConfirming(false);
      }
    },
    [user, proposal, loadTripData, setProposal],
  );

  const dismissProposal = useCallback(() => {
    setProposal(null);
  }, [setProposal]);

  return {
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
    refresh: loadTripData,
    dismissProposal,
  };
}

/** Create demo trip from trips list page (uses session). */
export function useCreateDemoTrip(onSuccess: () => Promise<void>) {
  const { user } = useRerouteSession();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDemoTrip = useCallback(async () => {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      await apiCreateTrip({ title: "Demo trip", snapshot: demoTripSnapshot() });
      await onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create demo trip.");
    } finally {
      setCreating(false);
    }
  }, [user, onSuccess]);

  const clearError = useCallback(() => setError(null), []);

  return { createDemoTrip, creating, error, clearError };
}
