"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getApiBase } from "@/lib/api-base";
import { authFetch } from "@/lib/auth-fetch";
import { clearStoredToken } from "@/lib/auth-token";
import { apiLogout, apiErrorMessage } from "@/lib/reroute-api";
import type { UserPublic } from "@/lib/api-types";

function coerceUser(raw: unknown): UserPublic {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid user payload");
  }
  const u = raw as Record<string, unknown>;
  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    full_name: u.full_name == null ? null : String(u.full_name),
    created_at: String(u.created_at ?? ""),
    avatar_url: u.avatar_url == null || u.avatar_url === undefined ? null : String(u.avatar_url),
    google_account_linked: Boolean(u.google_account_linked),
  };
}

type RerouteSessionContextValue = {
  user: UserPublic | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  logout: () => void;
};

const RerouteSessionContext = createContext<RerouteSessionContextValue | null>(null);

const jsonHeaders: HeadersInit = { "Content-Type": "application/json" };
const REQUEST_TIMEOUT_MS = 10000;

export function RerouteSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const timeoutId = window.setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await authFetch(`${getApiBase()}/users/me`, { headers: jsonHeaders, signal: ctrl.signal });
      if (res.status === 401) {
        clearStoredToken();
        setUser(null);
        setLoading(false);
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(await apiErrorMessage(res));
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(coerceUser(await res.json()));
    } catch {
      setError("Could not reach session service. Check backend and refresh.");
      setUser(null);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const logout = useCallback(() => {
    void (async () => {
      try {
        await apiLogout();
      } catch {
        /* still clear client */
      }
      clearStoredToken();
      setUser(null);
      router.push("/login");
      router.refresh();
    })();
  }, [router]);

  return (
    <RerouteSessionContext.Provider value={{ user, loading, error, reload, logout }}>
      {children}
    </RerouteSessionContext.Provider>
  );
}

export function useRerouteSession() {
  const ctx = useContext(RerouteSessionContext);
  if (!ctx) {
    throw new Error("useRerouteSession must be used within RerouteSessionProvider");
  }
  return ctx;
}
