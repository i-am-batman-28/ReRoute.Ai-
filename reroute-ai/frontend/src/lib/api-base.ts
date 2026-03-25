/** Backend API root including `/api` prefix. */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
  return `${raw}/api`;
}
