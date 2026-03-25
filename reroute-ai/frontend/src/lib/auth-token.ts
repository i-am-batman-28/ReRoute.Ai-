/** Client-only token storage. Prefer httpOnly cookies + CSP hardening for production if XSS is a concern. */
const STORAGE_KEY = "reroute_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
