/**
 * Backend API root including `/api` prefix.
 * Must be an absolute URL to the FastAPI host so OAuth (and cookies) hit :8000, not Next.js :3000.
 */
function coerceApiRoot(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t || t.startsWith("/")) {
    return "http://localhost:8000";
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      new URL(t);
      return t;
    } catch {
      return "http://localhost:8000";
    }
  }
  const withScheme =
    t.includes("localhost") || /^\d{1,3}(\.\d{1,3}){3}/.test(t) || t.startsWith("127.")
      ? `http://${t}`
      : `https://${t}`;
  try {
    new URL(withScheme);
    return withScheme;
  } catch {
    return "http://localhost:8000";
  }
}

export function getApiBase(): string {
  const raw = coerceApiRoot(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");
  if (raw.endsWith("/api")) {
    return raw;
  }
  return `${raw}/api`;
}
