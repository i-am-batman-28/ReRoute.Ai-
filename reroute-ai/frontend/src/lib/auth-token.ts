/**
 * Legacy localStorage key cleared on logout / cookie migration.
 * Sessions use httpOnly cookies (access + refresh); do not store JWT in JS.
 */
const STORAGE_KEY = "reroute_access_token";

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
