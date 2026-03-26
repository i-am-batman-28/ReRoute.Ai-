"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import { AIRPORTS } from "@/lib/airports";
import { apiCreateTrip, apiUpdateTrip } from "@/lib/reroute-api";
import {
  buildTripSnapshot,
  defaultTripFormState,
  emptyPassengerRow,
  parseSnapshotForTripForm,
  type PassengerRowInput,
  type TripFormInitialState,
} from "@/lib/trip-snapshot";
import { validateIataField, validateTravelDateYmd } from "@/lib/trip-validation";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";
const labelClass = "block text-xs font-medium uppercase tracking-wide text-zinc-500";
const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-zinc-400";

function localDatetimeToUtcIso(value: string): string {
  const v = value.trim();
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export type TripFormSeed = {
  tripId: string;
  title: string | null;
  snapshot: Record<string, unknown>;
};

export type TripFormProps = {
  mode: "create" | "edit";
  /** Edit: loaded trip data */
  seed: TripFormSeed | null;
  seedLoading: boolean;
  seedError: string | null;
  backHref: string;
  pageTitle: string;
  pageDescription: string;
  submitLabel: string;
};

export function TripForm({
  mode,
  seed,
  seedLoading,
  seedError,
  backHref,
  pageTitle,
  pageDescription,
  submitLabel,
}: TripFormProps) {
  const router = useRouter();
  const { user, loading, error: sessionError } = useRerouteSession();

  const [form, setForm] = useState<TripFormInitialState>(() => defaultTripFormState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !seed) return;
    const parsed = parseSnapshotForTripForm(seed.snapshot);
    setForm({
      ...parsed,
      title: seed.title?.trim() ?? "",
    });
  }, [mode, seed]);

  function setPassenger(i: number, patch: Partial<PassengerRowInput>) {
    setForm((f) => ({
      ...f,
      passengers: f.passengers.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));
  }

  function addPassenger() {
    setForm((f) => ({ ...f, passengers: [...f.passengers, emptyPassengerRow()] }));
  }

  function removePassenger(i: number) {
    setForm((f) =>
      f.passengers.length <= 1 ? f : { ...f, passengers: f.passengers.filter((_, j) => j !== i) },
    );
  }

  function parseOptionalCoord(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = user;
    if (!u?.email) return;

    setSaving(true);
    setError(null);

    const oErr = validateIataField("Origin", form.origin);
    const dErr = validateIataField("Destination", form.destination);
    if (oErr || dErr) {
      setError(oErr ?? dErr ?? "");
      setSaving(false);
      return;
    }

    const dateErr = validateTravelDateYmd(form.date);
    if (dateErr) {
      setError(dateErr);
      setSaving(false);
      return;
    }

    const filled = form.passengers.filter((p) => p.givenName.trim() && p.familyName.trim());
    if (filled.length === 0) {
      setError("Add at least one traveler with first and last name.");
      setSaving(false);
      return;
    }
    for (const p of filled) {
      if (!p.bornOn.trim()) {
        setError("Each traveler needs a date of birth.");
        setSaving(false);
        return;
      }
    }

    const olat = parseOptionalCoord(form.weatherOriginLat);
    const olon = parseOptionalCoord(form.weatherOriginLon);
    const dlat = parseOptionalCoord(form.weatherDestLat);
    const dlon = parseOptionalCoord(form.weatherDestLon);
    if (form.weatherOriginLat.trim() || form.weatherOriginLon.trim()) {
      if (olat == null || olon == null) {
        setError("Origin weather: enter both latitude and longitude, or leave both empty.");
        setSaving(false);
        return;
      }
    }
    if (form.weatherDestLat.trim() || form.weatherDestLon.trim()) {
      if (dlat == null || dlon == null) {
        setError("Destination weather: enter both latitude and longitude, or leave both empty.");
        setSaving(false);
        return;
      }
    }

    try {
      const snapshot = buildTripSnapshot({
        user: { email: u.email, fullName: u.full_name },
        flightNumber: form.flightNumber,
        date: form.date,
        origin: form.origin,
        destination: form.destination,
        scheduledDepartureTime: form.scheduledDepartureTime || undefined,
        scheduledArrivalTime: form.scheduledArrivalTime || undefined,
        cabinClass: form.cabinClass,
        budgetBand: form.budgetBand,
        passengers: filled.map((p) => ({
          ...p,
          phoneNumber: p.phoneNumber.trim() || "+10000000000",
        })),
        connectionDepartureAfterArrivalMinutes: form.connectionMins,
        hotelCheckInBufferMinutes: form.hotelBufferMins,
        meetingScheduledTimeUtc: form.meetingLocal.trim()
          ? localDatetimeToUtcIso(form.meetingLocal)
          : new Date().toISOString(),
        weatherOriginLat: olat,
        weatherOriginLon: olon,
        weatherDestinationLat: dlat,
        weatherDestinationLon: dlon,
      });

      if (mode === "create") {
        const trip = await apiCreateTrip({
          title: form.title.trim() || "My trip",
          snapshot,
        });
        router.push(`/trips/${trip.id}`);
        return;
      }

      if (!seed?.tripId) {
        setError("Missing trip id.");
        return;
      }
      await apiUpdateTrip(seed.tripId, {
        title: form.title.trim() || "My trip",
        snapshot,
      });
      router.push(`/trips/${seed.tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save trip.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user?.email) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-3 px-4 py-24 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <p className="text-sm text-red-400">{sessionError ?? "Sign in required."}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-emerald-400 underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (mode === "edit" && seedLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 px-4 py-24 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" aria-hidden />
        <p className="text-sm">Loading trip…</p>
      </div>
    );
  }

  if (mode === "edit" && seedError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-red-400">{seedError}</p>
        <Link href={backHref} className="mt-4 inline-block text-sm text-emerald-400 underline">
          Back
        </Link>
      </div>
    );
  }

  const destMapHref =
    form.weatherDestLat.trim() && form.weatherDestLon.trim()
      ? `https://www.google.com/maps?q=${encodeURIComponent(form.weatherDestLat.trim())},${encodeURIComponent(form.weatherDestLon.trim())}`
      : null;
  const originMapHref =
    form.weatherOriginLat.trim() && form.weatherOriginLon.trim()
      ? `https://www.google.com/maps?q=${encodeURIComponent(form.weatherOriginLat.trim())},${encodeURIComponent(form.weatherOriginLon.trim())}`
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={backHref}
        className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">{pageTitle}</h1>
      <p className="mt-1 text-sm text-zinc-500">{pageDescription}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-10" noValidate aria-describedby={error ? "trip-form-error" : undefined}>
        <section className="space-y-4">
          <h2 className={sectionTitle}>Trip</h2>
          <div>
            <label htmlFor="trip-title" className={labelClass}>
              Title
            </label>
            <input
              id="trip-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Client visit"
              className={inputClass}
            />
          </div>
          <div>
            <span className={labelClass}>Contact email</span>
            <p className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
              {user.email}
            </p>
            <p className="mt-1 text-xs text-zinc-600">Same as your login. All travelers use this email for booking contact.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={sectionTitle}>Primary flight</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="flight-num" className={labelClass}>
                Flight number *
              </label>
              <input
                id="flight-num"
                required
                type="text"
                value={form.flightNumber}
                onChange={(e) => setForm((f) => ({ ...f, flightNumber: e.target.value }))}
                placeholder="2117"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="flight-date" className={labelClass}>
                Travel date *
              </label>
              <input
                id="flight-date"
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dep-time" className={labelClass}>
                Scheduled departure (local time)
              </label>
              <input
                id="dep-time"
                type="time"
                value={form.scheduledDepartureTime}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDepartureTime: e.target.value }))}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-600">Optional — helps with disruption and cascade context.</p>
            </div>
            <div>
              <label htmlFor="arr-time" className={labelClass}>
                Scheduled arrival (local time)
              </label>
              <input
                id="arr-time"
                type="time"
                value={form.scheduledArrivalTime}
                onChange={(e) => setForm((f) => ({ ...f, scheduledArrivalTime: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="origin" className={labelClass}>
                Origin (IATA) *
              </label>
              <input
                id="origin"
                required
                type="text"
                maxLength={3}
                list="airports-reroute-list"
                value={form.origin}
                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value.toUpperCase() }))}
                placeholder="JFK"
                className={`${inputClass} font-mono`}
                autoComplete="off"
              />
              <datalist id="airports-reroute-list">
                {AIRPORTS.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.city}, {a.country}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="destination" className={labelClass}>
                Destination (IATA) *
              </label>
              <input
                id="destination"
                required
                type="text"
                maxLength={3}
                list="airports-reroute-list"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value.toUpperCase() }))}
                placeholder="ATL"
                className={`${inputClass} font-mono`}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cabin" className={labelClass}>
                Cabin
              </label>
              <select
                id="cabin"
                value={form.cabinClass}
                onChange={(e) => setForm((f) => ({ ...f, cabinClass: e.target.value }))}
                className={inputClass}
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
            <div>
              <label htmlFor="budget" className={labelClass}>
                Budget band
              </label>
              <select
                id="budget"
                value={form.budgetBand}
                onChange={(e) => setForm((f) => ({ ...f, budgetBand: e.target.value }))}
                className={inputClass}
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionTitle}>Travelers</h2>
            <button
              type="button"
              onClick={addPassenger}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add traveler
            </button>
          </div>
          <p className="text-xs text-zinc-600">Same contact email as your account for all passengers.</p>
          {form.passengers.map((p, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-300">Traveler {i + 1}</span>
                {form.passengers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removePassenger(i)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    aria-label={`Remove traveler ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass} htmlFor={`title-${i}`}>
                    Title
                  </label>
                  <select
                    id={`title-${i}`}
                    value={p.title}
                    onChange={(e) => setPassenger(i, { title: e.target.value })}
                    className={inputClass}
                  >
                    <option value="mr">Mr</option>
                    <option value="mrs">Mrs</option>
                    <option value="ms">Ms</option>
                    <option value="miss">Miss</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor={`gn-${i}`}>
                    First name *
                  </label>
                  <input
                    id={`gn-${i}`}
                    value={p.givenName}
                    onChange={(e) => setPassenger(i, { givenName: e.target.value })}
                    className={inputClass}
                    required={i === 0}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`fn-${i}`}>
                    Last name *
                  </label>
                  <input
                    id={`fn-${i}`}
                    value={p.familyName}
                    onChange={(e) => setPassenger(i, { familyName: e.target.value })}
                    className={inputClass}
                    required={i === 0}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`dob-${i}`}>
                    Date of birth *
                  </label>
                  <input
                    id={`dob-${i}`}
                    type="date"
                    value={p.bornOn}
                    onChange={(e) => setPassenger(i, { bornOn: e.target.value })}
                    className={inputClass}
                    required={i === 0}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`gen-${i}`}>
                    Gender
                  </label>
                  <select
                    id={`gen-${i}`}
                    value={p.gender}
                    onChange={(e) => setPassenger(i, { gender: e.target.value as PassengerRowInput["gender"] })}
                    className={inputClass}
                  >
                    <option value="m">M</option>
                    <option value="f">F</option>
                    <option value="x">Unspecified</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor={`phone-${i}`}>
                    Phone
                  </label>
                  <input
                    id={`phone-${i}`}
                    type="tel"
                    value={p.phoneNumber}
                    onChange={(e) => setPassenger(i, { phoneNumber: e.target.value })}
                    placeholder="+1…"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className={sectionTitle}>Connection & commitments</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="conn" className={labelClass}>
                Connection buffer (min after arrival)
              </label>
              <input
                id="conn"
                type="number"
                min={0}
                max={600}
                value={form.connectionMins}
                onChange={(e) => setForm((f) => ({ ...f, connectionMins: Number(e.target.value) }))}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-600">Used for missed-connection heuristics.</p>
            </div>
            <div>
              <label htmlFor="hotel" className={labelClass}>
                Hotel check-in buffer (minutes)
              </label>
              <input
                id="hotel"
                type="number"
                min={0}
                max={600}
                value={form.hotelBufferMins}
                onChange={(e) => setForm((f) => ({ ...f, hotelBufferMins: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="meeting" className={labelClass}>
              Meeting / key commitment (local)
            </label>
            <input
              id="meeting"
              type="datetime-local"
              value={form.meetingLocal}
              onChange={(e) => setForm((f) => ({ ...f, meetingLocal: e.target.value }))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-600">Stored in UTC for the agent. Leave empty to use “now” as placeholder.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={sectionTitle}>Weather (optional)</h2>
          <p className="text-xs text-zinc-600">
            Open-Meteo uses coordinates. Leave blank to skip; or fill origin and/or destination pairs as decimals.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={labelClass}>Origin latitude</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.weatherOriginLat}
                onChange={(e) => setForm((f) => ({ ...f, weatherOriginLat: e.target.value }))}
                placeholder="e.g. 40.7128"
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>Origin longitude</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.weatherOriginLon}
                onChange={(e) => setForm((f) => ({ ...f, weatherOriginLon: e.target.value }))}
                placeholder="e.g. -74.0060"
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>Destination latitude</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.weatherDestLat}
                onChange={(e) => setForm((f) => ({ ...f, weatherDestLat: e.target.value }))}
                placeholder="e.g. 33.7490"
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>Destination longitude</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.weatherDestLon}
                onChange={(e) => setForm((f) => ({ ...f, weatherDestLon: e.target.value }))}
                placeholder="e.g. -84.3880"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {originMapHref ? (
              <a
                href={originMapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
              >
                Open origin in Maps
              </a>
            ) : null}
            {destMapHref ? (
              <a
                href={destMapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
              >
                Open destination in Maps
              </a>
            ) : null}
          </div>
        </section>

        {error ? (
          <p id="trip-form-error" className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {submitLabel}
          </button>
          <Link
            href={backHref}
            className="inline-flex min-h-10 items-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
