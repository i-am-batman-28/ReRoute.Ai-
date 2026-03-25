import { getApiBase } from "@/lib/api-base";
import type {
  AgentConfirmResponse,
  AgentProposeResponse,
  DisruptionEventPublic,
  MonitorStatusResponse,
  TripDetailPublic,
  TripPublic,
  UserPublic,
} from "@/lib/api-types";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function apiGetMe(token: string): Promise<UserPublic> {
  const res = await fetch(`${getApiBase()}/users/me`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<UserPublic>;
}

export async function apiListTrips(token: string): Promise<TripPublic[]> {
  const res = await fetch(`${getApiBase()}/trips`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TripPublic[]>;
}

export async function apiCreateTrip(
  token: string,
  body: { title?: string | null; snapshot: Record<string, unknown> },
): Promise<TripPublic> {
  const res = await fetch(`${getApiBase()}/trips`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TripPublic>;
}

export async function apiGetTripDetail(token: string, tripId: string): Promise<TripDetailPublic> {
  const res = await fetch(`${getApiBase()}/trips/${encodeURIComponent(tripId)}/detail`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TripDetailPublic>;
}

export async function apiAgentPropose(
  token: string,
  tripId: string,
  simulateDisruption?: string | null,
): Promise<AgentProposeResponse> {
  const res = await fetch(`${getApiBase()}/agent/propose`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      trip_id: tripId,
      simulate_disruption: simulateDisruption ?? null,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AgentProposeResponse>;
}

export async function apiAgentConfirm(
  token: string,
  proposalId: string,
  selectedOptionId: string,
): Promise<AgentConfirmResponse> {
  const res = await fetch(`${getApiBase()}/agent/confirm`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ proposal_id: proposalId, selected_option_id: selectedOptionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<AgentConfirmResponse>;
}

export async function apiListDisruptionEvents(
  token: string,
  tripId: string,
  limit = 100,
): Promise<DisruptionEventPublic[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(
    `${getApiBase()}/disruptions/trips/${encodeURIComponent(tripId)}/events?${q}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<DisruptionEventPublic[]>;
}

export async function apiMonitorStatus(token: string): Promise<MonitorStatusResponse> {
  const res = await fetch(`${getApiBase()}/monitor/status`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MonitorStatusResponse>;
}
