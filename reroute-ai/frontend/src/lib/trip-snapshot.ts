/** Builds `POST /trips` snapshot (server injects `trip_id`; user block uses logged-in identity). */

export type TripSnapshotUserInput = {
  email: string;
  fullName: string | null;
};

export type PassengerRowInput = {
  title: string;
  givenName: string;
  familyName: string;
  gender: "m" | "f" | "x";
  bornOn: string;
  phoneNumber: string;
};

export type BuildTripSnapshotInput = {
  user: TripSnapshotUserInput;
  flightNumber: string;
  /** YYYY-MM-DD — used for status APIs + Duffel departure_date */
  date: string;
  origin: string;
  destination: string;
  /** Optional HH:mm (local) — stored on primary_flight for cascade / display */
  scheduledDepartureTime?: string;
  scheduledArrivalTime?: string;
  cabinClass: string;
  budgetBand: string;
  passengers: PassengerRowInput[];
  connectionDepartureAfterArrivalMinutes: number;
  hotelCheckInBufferMinutes: number;
  /** ISO 8601 UTC for meeting cascade copy */
  meetingScheduledTimeUtc: string;
  weatherOriginLat?: number | null;
  weatherOriginLon?: number | null;
  weatherDestinationLat?: number | null;
  weatherDestinationLon?: number | null;
};

function trim(s: string): string {
  return s.trim();
}

function combineDateAndTime(date: string, time: string | undefined): string | undefined {
  const t = time?.trim();
  if (!t) return undefined;
  return `${date.trim()}T${t}:00`;
}

/**
 * Builds snapshot JSON for the agent + Duffel.
 * All passenger `email` fields use the logged-in user's email (booking contact).
 */
export function buildTripSnapshot(input: BuildTripSnapshotInput): Record<string, unknown> {
  const date = trim(input.date);
  const origin = trim(input.origin).toUpperCase();
  const destination = trim(input.destination).toUpperCase();
  const email = trim(input.user.email);
  const fullName = input.user.fullName?.trim() || email;

  const depLocal = combineDateAndTime(date, input.scheduledDepartureTime);
  const arrLocal = combineDateAndTime(date, input.scheduledArrivalTime);

  const passengers = input.passengers.map((p, i) => ({
    title: trim(p.title) || "mr",
    given_name: trim(p.givenName) || "Traveler",
    family_name: trim(p.familyName) || String(i + 1),
    gender: p.gender,
    phone_number: trim(p.phoneNumber) || "+14155552671",
    email,
    born_on: trim(p.bornOn) || "1990-01-01",
  }));

  const legs: Record<string, unknown> = {
    primary_flight: {
      flight_number: trim(input.flightNumber),
      date,
      origin,
      destination,
      scheduled_departure_date: date,
      ...(depLocal ? { scheduled_departure_local: depLocal } : {}),
      ...(arrLocal ? { scheduled_arrival_local: arrLocal } : {}),
    },
    connection: {
      departure_after_arrival_minutes: Math.max(0, Math.floor(input.connectionDepartureAfterArrivalMinutes)),
    },
    hotel: {
      check_in_buffer_minutes: Math.max(0, Math.floor(input.hotelCheckInBufferMinutes)),
    },
    meeting: {
      scheduled_time_utc: input.meetingScheduledTimeUtc,
    },
  };

  const w: Record<string, number> = {};
  const olat = input.weatherOriginLat;
  const olon = input.weatherOriginLon;
  const dlat = input.weatherDestinationLat;
  const dlon = input.weatherDestinationLon;
  if (olat != null && olon != null && !Number.isNaN(olat) && !Number.isNaN(olon)) {
    w.origin_lat = olat;
    w.origin_lon = olon;
  }
  if (dlat != null && dlon != null && !Number.isNaN(dlat) && !Number.isNaN(dlon)) {
    w.destination_lat = dlat;
    w.destination_lon = dlon;
  }
  if (Object.keys(w).length > 0) {
    legs.weather = w;
  }

  return {
    user: {
      email,
      full_name: fullName,
    },
    passengers,
    preferences: {
      cabin_class: input.cabinClass,
      budget_band: input.budgetBand,
    },
    legs,
  };
}

/** Full form state for create/edit trip UI. */
export type TripFormInitialState = {
  title: string;
  flightNumber: string;
  date: string;
  scheduledDepartureTime: string;
  scheduledArrivalTime: string;
  origin: string;
  destination: string;
  cabinClass: string;
  budgetBand: string;
  passengers: PassengerRowInput[];
  connectionMins: number;
  hotelBufferMins: number;
  meetingLocal: string;
  weatherOriginLat: string;
  weatherOriginLon: string;
  weatherDestLat: string;
  weatherDestLon: string;
};

export function emptyPassengerRow(): PassengerRowInput {
  return {
    title: "mr",
    givenName: "",
    familyName: "",
    gender: "m",
    bornOn: "",
    phoneNumber: "",
  };
}

export function defaultTripFormState(): TripFormInitialState {
  return {
    title: "",
    flightNumber: "",
    date: "",
    scheduledDepartureTime: "",
    scheduledArrivalTime: "",
    origin: "",
    destination: "",
    cabinClass: "economy",
    budgetBand: "mid",
    passengers: [emptyPassengerRow()],
    connectionMins: 90,
    hotelBufferMins: 60,
    meetingLocal: "",
    weatherOriginLat: "",
    weatherOriginLon: "",
    weatherDestLat: "",
    weatherDestLon: "",
  };
}

function timeFromScheduledLocal(s: unknown): string {
  if (typeof s !== "string") return "";
  const m = s.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function utcIsoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseSnapshotForTripForm(snapshot: Record<string, unknown>): TripFormInitialState {
  const base = defaultTripFormState();
  const legs = snapshot.legs;
  if (!legs || typeof legs !== "object") return base;
  const L = legs as Record<string, unknown>;

  const pf = L.primary_flight;
  if (pf && typeof pf === "object") {
    const p = pf as Record<string, unknown>;
    if (typeof p.flight_number === "string") base.flightNumber = p.flight_number;
    if (typeof p.date === "string") base.date = p.date;
    if (typeof p.origin === "string") base.origin = p.origin.trim().toUpperCase();
    if (typeof p.destination === "string") base.destination = p.destination.trim().toUpperCase();
    base.scheduledDepartureTime = timeFromScheduledLocal(p.scheduled_departure_local);
    base.scheduledArrivalTime = timeFromScheduledLocal(p.scheduled_arrival_local);
  }

  const prefs = snapshot.preferences;
  if (prefs && typeof prefs === "object") {
    const pr = prefs as Record<string, unknown>;
    if (typeof pr.cabin_class === "string") base.cabinClass = pr.cabin_class;
    if (typeof pr.budget_band === "string") base.budgetBand = pr.budget_band;
  }

  const pax = snapshot.passengers;
  if (Array.isArray(pax) && pax.length > 0) {
    base.passengers = pax.map((x) => {
      if (!x || typeof x !== "object") return emptyPassengerRow();
      const r = x as Record<string, unknown>;
      const g = r.gender;
      const gender: PassengerRowInput["gender"] =
        g === "f" || g === "m" || g === "x" ? g : "m";
      return {
        title: typeof r.title === "string" ? r.title : "mr",
        givenName: typeof r.given_name === "string" ? r.given_name : "",
        familyName: typeof r.family_name === "string" ? r.family_name : "",
        gender,
        bornOn: typeof r.born_on === "string" ? r.born_on : "",
        phoneNumber: typeof r.phone_number === "string" ? r.phone_number : "",
      };
    });
  }

  const conn = L.connection;
  if (conn && typeof conn === "object") {
    const c = conn as { departure_after_arrival_minutes?: number };
    if (typeof c.departure_after_arrival_minutes === "number") {
      base.connectionMins = c.departure_after_arrival_minutes;
    }
  }

  const hotel = L.hotel;
  if (hotel && typeof hotel === "object") {
    const h = hotel as { check_in_buffer_minutes?: number };
    if (typeof h.check_in_buffer_minutes === "number") {
      base.hotelBufferMins = h.check_in_buffer_minutes;
    }
  }

  const meeting = L.meeting;
  if (meeting && typeof meeting === "object") {
    const st = (meeting as { scheduled_time_utc?: string }).scheduled_time_utc;
    if (typeof st === "string" && st.trim()) {
      base.meetingLocal = utcIsoToDatetimeLocal(st);
    }
  }

  const wx = L.weather;
  if (wx && typeof wx === "object") {
    const w = wx as Record<string, unknown>;
    const num = (v: unknown): string => {
      if (typeof v === "number" && Number.isFinite(v)) return String(v);
      if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return v.trim();
      return "";
    };
    base.weatherOriginLat = num(w.origin_lat);
    base.weatherOriginLon = num(w.origin_lon);
    base.weatherDestLat = num(w.destination_lat);
    base.weatherDestLon = num(w.destination_lon);
  }

  return base;
}

/** Deep clone snapshot for POST /trips and strip server-owned id. */
export function snapshotForDuplicate(snapshot: Record<string, unknown>): Record<string, unknown> {
  const c = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
  delete c.trip_id;
  return c;
}
