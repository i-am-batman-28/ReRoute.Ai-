import { getApiBase } from "@/lib/api-base";
import { authFetch } from "@/lib/auth-fetch";
import type {
  AgentConfirmResponse,
  AgentProposeJobAccepted,
  AgentProposeJobStatus,
  AgentProposeResponse,
  DisruptionEventActivityPublic,
  DisruptionEventPublic,
  MonitorStatusResponse,
  RefreshSessionPublic,
  TripDetailPublic,
  TripPublic,
  UserPublic,
} from "@/lib/api-types";

const jsonHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

/** FastAPI `{ detail: string | array }` or raw body text. */
export async function apiErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) {
      return j.detail
        .map((x: { msg?: string }) => x.msg)
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    /* ignore */
  }
  return text.trim() || `Request failed (${res.status})`;
}

export async function apiGetMe(): Promise<UserPublic> {
  const res = await authFetch(`${getApiBase()}/users/me`, { headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<UserPublic>;
}

export async function apiLogout(): Promise<void> {
  const res = await authFetch(`${getApiBase()}/users/logout`, { method: "POST", headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

export async function apiPatchMe(body: { full_name?: string | null; avatar_url?: string | null }): Promise<UserPublic> {
  const res = await authFetch(`${getApiBase()}/users/me`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<UserPublic>;
}

export async function apiSetMePassword(newPassword: string): Promise<UserPublic> {
  const res = await authFetch(`${getApiBase()}/users/me/password`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<UserPublic>;
}

export async function apiUnlinkGoogle(): Promise<UserPublic> {
  const res = await authFetch(`${getApiBase()}/users/me/unlink-google`, {
    method: "POST",
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<UserPublic>;
}

export async function apiListSessions(): Promise<RefreshSessionPublic[]> {
  const res = await authFetch(`${getApiBase()}/users/me/sessions`, { headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<RefreshSessionPublic[]>;
}

export async function apiRevokeSession(sessionId: string): Promise<void> {
  const res = await authFetch(`${getApiBase()}/users/me/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

/** Revokes all refresh sessions and clears auth cookies (response Set-Cookie). */
export async function apiRevokeAllSessions(): Promise<void> {
  const res = await authFetch(`${getApiBase()}/users/me/sessions/revoke-all`, {
    method: "POST",
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

/** No auth; always call from client with plain fetch. */
export async function apiForgotPassword(email: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/users/forgot-password`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/users/reset-password`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

export async function apiListTrips(): Promise<TripPublic[]> {
  const res = await authFetch(`${getApiBase()}/trips`, { headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<TripPublic[]>;
}

export async function apiCreateTrip(body: { title?: string | null; snapshot: Record<string, unknown> }): Promise<TripPublic> {
  const res = await authFetch(`${getApiBase()}/trips`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<TripPublic>;
}

export async function apiUpdateTrip(
  tripId: string,
  body: { title?: string | null; snapshot?: Record<string, unknown>; itinerary_revision?: number },
): Promise<TripPublic> {
  const res = await authFetch(`${getApiBase()}/trips/${encodeURIComponent(tripId)}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<TripPublic>;
}

export async function apiDeleteTrip(tripId: string): Promise<void> {
  const res = await authFetch(`${getApiBase()}/trips/${encodeURIComponent(tripId)}`, {
    method: "DELETE",
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
}

export async function apiGetTripDetail(tripId: string): Promise<TripDetailPublic> {
  const res = await authFetch(`${getApiBase()}/trips/${encodeURIComponent(tripId)}/detail`, {
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<TripDetailPublic>;
}

export type AgentProposeOutcome =
  | { mode: "sync"; data: AgentProposeResponse }
  | { mode: "async"; job: AgentProposeJobAccepted };

/**
 * Runs agent propose. When `asyncMode` is true, backend may return 202 with a Celery task (requires Redis/worker).
 */
export async function apiAgentPropose(
  tripId: string,
  simulateDisruption?: string | null,
  options?: { asyncMode?: boolean },
): Promise<AgentProposeOutcome> {
  const res = await authFetch(`${getApiBase()}/agent/propose`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      trip_id: tripId,
      simulate_disruption: simulateDisruption ?? null,
      async_mode: Boolean(options?.asyncMode),
    }),
  });
  if (res.status === 202) {
    return { mode: "async", job: (await res.json()) as AgentProposeJobAccepted };
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return { mode: "sync", data: (await res.json()) as AgentProposeResponse };
}

export async function apiAgentProposeJobStatus(taskId: string): Promise<AgentProposeJobStatus> {
  const res = await authFetch(`${getApiBase()}/agent/propose/jobs/${encodeURIComponent(taskId)}`, {
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<AgentProposeJobStatus>;
}

export async function apiAgentConfirm(proposalId: string, selectedOptionId: string): Promise<AgentConfirmResponse> {
  const res = await authFetch(`${getApiBase()}/agent/confirm`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ proposal_id: proposalId, selected_option_id: selectedOptionId }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<AgentConfirmResponse>;
}

/** Recent events across all trips for the current user (single request). */
export async function apiListMyActivityEvents(limit = 200): Promise<DisruptionEventActivityPublic[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await authFetch(`${getApiBase()}/disruptions/events?${q}`, { headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<DisruptionEventActivityPublic[]>;
}

export async function apiListDisruptionEvents(tripId: string, limit = 100): Promise<DisruptionEventPublic[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await authFetch(
    `${getApiBase()}/disruptions/trips/${encodeURIComponent(tripId)}/events?${q}`,
    { headers: jsonHeaders },
  );
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<DisruptionEventPublic[]>;
}

export async function apiMonitorStatus(): Promise<MonitorStatusResponse> {
  const res = await authFetch(`${getApiBase()}/monitor/status`, { headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<MonitorStatusResponse>;
}
