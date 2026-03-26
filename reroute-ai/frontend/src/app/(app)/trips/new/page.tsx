"use client";

import { TripForm } from "@/components/trip-form";

export default function NewTripPage() {
  return (
    <TripForm
      mode="create"
      seed={null}
      seedLoading={false}
      seedError={null}
      backHref="/trips"
      pageTitle="New trip"
      pageDescription="Primary flight, schedule, travelers, and preferences. Contact email is your account (used for notifications and booking)."
      submitLabel="Create trip"
    />
  );
}
