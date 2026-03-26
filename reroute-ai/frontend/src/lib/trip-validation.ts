/** Client-side checks aligned with backend expectations (IATA + sensible travel dates). */

const IATA_RE = /^[A-Z]{3}$/;

/** Normalize user input to 3-letter IATA (uppercase). */
export function normalizeIata(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 3);
}

export function isValidIata(code: string): boolean {
  return IATA_RE.test(normalizeIata(code));
}

/** Returns error message or null if OK. */
export function validateIataField(label: string, raw: string): string | null {
  const c = normalizeIata(raw);
  if (c.length !== 3) return `${label} must be exactly 3 letters (IATA).`;
  if (!IATA_RE.test(c)) return `${label} must be A–Z only (IATA).`;
  return null;
}

/** Travel date: not before ~1 year ago, not more than ~18 months ahead (product rule). */
export function validateTravelDateYmd(ymd: string): string | null {
  const t = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return "Use a valid travel date.";
  const d = new Date(`${t}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "Use a valid travel date.";
  const now = new Date();
  const min = new Date(now);
  min.setFullYear(min.getFullYear() - 1);
  const max = new Date(now);
  max.setMonth(max.getMonth() + 18);
  if (d < min) return "Travel date is too far in the past.";
  if (d > max) return "Travel date is too far in the future (max ~18 months).";
  return null;
}
