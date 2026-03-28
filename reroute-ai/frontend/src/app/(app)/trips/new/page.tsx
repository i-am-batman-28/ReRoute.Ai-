"use client";

import { useState } from "react";
import { Camera, FileText } from "lucide-react";

import { TripForm } from "@/components/trip-form";
import { TicketUpload } from "@/components/ticket-upload";
import type { TripFormInitialState } from "@/lib/trip-snapshot";

export default function NewTripPage() {
  const [seed, setSeed] = useState<Partial<TripFormInitialState> | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [extractedRaw, setExtractedRaw] = useState<Record<string, string> | null>(null);

  function handleExtracted(entities: Record<string, unknown>, raw: Record<string, string>) {
    setExtractedRaw(raw);
    // Map extracted entities to TripFormInitialState
    const s: Partial<TripFormInitialState> = {};
    if (entities.flight_number) s.flightNumber = String(entities.flight_number);
    if (entities.origin) s.origin = String(entities.origin);
    if (entities.destination) s.destination = String(entities.destination);
    if (entities.travel_date) s.date = String(entities.travel_date);
    if (entities.scheduled_departure_time) s.scheduledDepartureTime = String(entities.scheduled_departure_time);
    if (entities.scheduled_arrival_time) s.scheduledArrivalTime = String(entities.scheduled_arrival_time);
    if (entities.cabin_class) s.cabinClass = String(entities.cabin_class);

    const pax = entities.passengers;
    if (Array.isArray(pax) && pax.length > 0) {
      s.passengers = pax.map((p: Record<string, unknown>) => ({
        title: String(p.title ?? "mr"),
        givenName: String(p.given_name ?? ""),
        familyName: String(p.family_name ?? ""),
        gender: (p.gender === "f" ? "f" : p.gender === "x" ? "x" : "m") as "m" | "f" | "x",
        bornOn: String(p.born_on ?? ""),
        phoneNumber: String(p.phone_number ?? ""),
      }));
    }

    setSeed(s);
    setShowUpload(false);
  }

  return (
    <div>
      {/* Upload section */}
      {showUpload ? (
        <div className="mx-auto max-w-2xl px-6 pt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--fg)]">Upload ticket</h2>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="text-sm text-[color:var(--subtle)] hover:text-[color:var(--fg)]"
            >
              Cancel — fill manually
            </button>
          </div>
          <TicketUpload onExtracted={handleExtracted} />
        </div>
      ) : !seed ? (
        <div className="mx-auto max-w-2xl px-6 pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--primary)]/30 bg-[color:var(--primary-soft)]/10 px-5 py-3 text-sm font-medium text-[color:var(--primary)] transition hover:bg-[color:var(--primary-soft)]/20"
            >
              <Camera className="h-4 w-4" />
              Upload boarding pass or ticket
            </button>
            <span className="text-xs text-[color:var(--subtle)]">
              <FileText className="mr-1 inline h-3 w-3" />
              AI extracts flight details automatically
            </span>
          </div>
        </div>
      ) : null}

      {/* Trip form — pre-filled from extraction if available */}
      <TripForm
        mode="create"
        seed={null}
        seedLoading={false}
        seedError={null}
        prefill={seed}
        backHref="/trips"
        pageTitle={seed ? "Confirm extracted details" : "New trip"}
        pageDescription={
          seed
            ? "We extracted these details from your ticket. Review, add any missing info (DOB, phone), and create the trip."
            : "Primary flight, schedule, travelers, and preferences."
        }
        submitLabel="Create trip"
      />
    </div>
  );
}
