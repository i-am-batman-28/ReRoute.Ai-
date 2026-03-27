"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, FileText, Loader2, Upload, X, Check, Plane } from "lucide-react";

import { apiExtractFromTicket, type TicketExtractResult } from "@/lib/reroute-api";
import { airlineFromFlight } from "@/lib/airlines";

type TicketUploadProps = {
  onExtracted: (entities: Record<string, unknown>, raw: Record<string, string>) => void;
  compact?: boolean;
};

export function TicketUpload({ onExtracted, compact = false }: TicketUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TicketExtractResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a JPEG, PNG, WebP, GIF, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum 10 MB.");
      return;
    }

    setError(null);
    setResult(null);
    setUploading(true);
    setFileName(file.name);

    try {
      const res = await apiExtractFromTicket(file);
      setResult(res);
      if (res.ok) {
        onExtracted(res.entities, res.extracted_raw);
      } else {
        setError("Could not extract data from this file. Try a clearer image.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onExtracted]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  const reset = () => {
    setResult(null);
    setError(null);
    setFileName(null);
  };

  // Compact mode — just a button
  if (compact) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onInputChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-1)] px-3 py-2 text-xs font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface-2)] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {uploading ? "Extracting..." : "Upload ticket"}
        </button>
        {error ? <p className="mt-1 text-[11px] text-red-400">{error}</p> : null}
      </div>
    );
  }

  // Success state
  if (result?.ok) {
    const raw = result.extracted_raw;
    const airline = raw.flight_number ? airlineFromFlight(raw.flight_number) : undefined;
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--fg)]">Ticket extracted</p>
              <p className="text-xs text-[color:var(--subtle)]">{fileName}</p>
            </div>
          </div>
          <button type="button" onClick={reset} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {raw.flight_number && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Flight</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[color:var(--fg)]">
                {airline?.logo && <img src={airline.logo} alt="" className="h-4 w-4 rounded object-contain" />}
                {raw.flight_number}
              </dd>
            </div>
          )}
          {raw.origin && raw.destination && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Route</dt>
              <dd className="mt-0.5 flex items-center gap-1 text-sm font-medium text-[color:var(--fg)]">
                <Plane className="h-3 w-3 text-zinc-500" /> {raw.origin} → {raw.destination}
              </dd>
            </div>
          )}
          {raw.travel_date && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Date</dt>
              <dd className="mt-0.5 text-sm font-medium text-[color:var(--fg)]">{raw.travel_date}</dd>
            </div>
          )}
          {raw.departure_time && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Departs</dt>
              <dd className="mt-0.5 text-sm font-medium text-[color:var(--fg)]">{raw.departure_time}</dd>
            </div>
          )}
          {raw.passenger_name && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Passenger</dt>
              <dd className="mt-0.5 text-sm font-medium text-[color:var(--fg)]">{raw.passenger_name}</dd>
            </div>
          )}
          {raw.cabin_class && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cabin</dt>
              <dd className="mt-0.5 text-sm font-medium capitalize text-[color:var(--fg)]">{raw.cabin_class}</dd>
            </div>
          )}
          {(raw.seat || raw.gate || raw.booking_reference) && (
            <div className="rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Details</dt>
              <dd className="mt-0.5 text-xs text-[color:var(--fg)]">
                {[raw.seat && `Seat ${raw.seat}`, raw.gate && `Gate ${raw.gate}`, raw.booking_reference && `PNR ${raw.booking_reference}`].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
        </div>

        {raw.airline && (
          <p className="mt-3 text-xs text-[color:var(--subtle)]">
            {airline?.logo && <img src={airline.logo} alt="" className="mr-1 inline h-3 w-3 rounded object-contain" />}
            {raw.airline}
          </p>
        )}
      </div>
    );
  }

  // Upload state
  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors ${
        dragOver
          ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]/20"
          : "border-[color:var(--stroke)] bg-[color:var(--surface-0)]"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onInputChange}
      />

      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--primary)]" />
            <p className="text-sm font-medium text-[color:var(--fg)]">Extracting flight details...</p>
            <p className="text-xs text-[color:var(--subtle)]">GPT-4o is reading your ticket</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
              <Upload className="h-5 w-5 text-[color:var(--subtle)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--fg)]">Upload your ticket</p>
              <p className="mt-1 text-xs text-[color:var(--subtle)]">
                Boarding pass, e-ticket, or booking confirmation
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]"
              >
                <Camera className="h-4 w-4" />
                Choose file
              </button>
              <span className="text-xs text-[color:var(--subtle)]">or drag and drop</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> JPEG, PNG, PDF</span>
              <span>Max 10 MB</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2 text-center text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
