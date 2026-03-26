/**
 * Backend API root including `/api` prefix.
 * Must be an absolute URL to the FastAPI host so OAuth (and cookies) hit :8000, not Next.js :3000.
 */
export function getApiBase(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").trim().replace(/\/+$/, "");
  if (!raw || raw.startsWith("/")) {
    raw = "http://localhost:8000";
  }
  if (raw.endsWith("/api")) {
    return raw;
  }
  return `${raw}/api`;
}
