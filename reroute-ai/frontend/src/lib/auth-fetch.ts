/**
 * Cookie-based API access (httpOnly access + refresh cookies from the API).
 * On 401, attempts one POST /users/refresh then retries the original request.
 * POST bodies must be re-readable (string bodies — as used by reroute-api).
 */

import { getApiBase } from "@/lib/api-base";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

function shouldSkipRefresh(url: string): boolean {
  return url.includes("/users/refresh") || url.includes("/users/login");
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${getApiBase()}/users/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return res.ok;
}

/**
 * Fetch with credentials; on 401 runs refresh once (unless URL is login/refresh) then retries.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const merged: RequestInit = { ...init, credentials: "include" };
  const res = await fetch(input, merged);
  if (res.status !== 401) return res;
  if (shouldSkipRefresh(url)) return res;
  const ok = await tryRefresh();
  if (!ok) return res;
  return fetch(input, merged);
}
