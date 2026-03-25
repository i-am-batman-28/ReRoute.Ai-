/**
 * Demo snapshot for POST /api/trips — same shape as backend `demo_snapshot_for_api()`
 * (no trip_id; server injects it).
 */
export function demoTripSnapshot(): Record<string, unknown> {
  const scheduled = new Date().toISOString();
  return {
    passengers: [
      {
        title: "mr",
        given_name: "Tony",
        family_name: "Stark",
        gender: "m",
        phone_number: "+442080160508",
        email: "tony@example.com",
        born_on: "1980-07-24",
      },
    ],
    preferences: { cabin_class: "economy", budget_band: "mid" },
    legs: {
      primary_flight: {
        flight_number: "2117",
        date: "2026-04-01",
        origin: "NYC",
        destination: "ATL",
        scheduled_departure_date: "2026-04-01",
      },
      connection: { departure_after_arrival_minutes: 90 },
      hotel: { check_in_buffer_minutes: 60 },
      meeting: { scheduled_time_utc: scheduled },
      weather: {
        origin_lat: 40.7128,
        origin_lon: -74.006,
        destination_lat: 33.749,
        destination_lon: -84.388,
      },
    },
  };
}
