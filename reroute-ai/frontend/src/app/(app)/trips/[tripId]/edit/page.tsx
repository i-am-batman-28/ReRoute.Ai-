"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { TripForm, type TripFormSeed } from "@/components/trip-form";
import { useRerouteSession } from "@/components/reroute-session-provider";
import { apiGetTripDetail } from "@/lib/reroute-api";

export default function EditTripPage() {
  const params = useParams();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const { user } = useRerouteSession();
  const [seed, setSeed] = useState<TripFormSeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !tripId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await apiGetTripDetail(tripId);
      setSeed({
        tripId: d.trip.id,
        title: d.trip.title,
        snapshot: d.trip.snapshot as Record<string, unknown>,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load trip.");
      setSeed(null);
    } finally {
      setLoading(false);
    }
  }, [user, tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!tripId) {
    return <p className="px-4 py-8 text-sm text-red-400">Invalid trip.</p>;
  }

  return (
    <TripForm
      mode="edit"
      seed={seed}
      seedLoading={loading}
      seedError={error}
      backHref={`/trips/${tripId}`}
      pageTitle="Edit trip"
      pageDescription="Update your itinerary snapshot. Saving replaces the stored trip data used by the agent."
      submitLabel="Save changes"
    />
  );
}
