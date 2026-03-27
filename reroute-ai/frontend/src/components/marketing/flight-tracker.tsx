"use client";

import { useState } from "react";
import { Search, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function FlightTrackerCTA() {
  const [flightNo, setFlightNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNo) return;
    
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/public/flight-status?flight_number=${encodeURIComponent(flightNo)}`);
      
      if (!res.ok) {
        throw new Error("Could not find flight");
      }
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Unable to track flight right now. The flight might not exist or the service is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "scheduled":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "delayed":
        return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
      case "cancelled":
      case "diverted":
        return "bg-red-500/20 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div id="hero-cta" className="mt-10 flex w-full max-w-lg flex-col items-center gap-4 scroll-mt-24">
      <form 
        onSubmit={handleTrack}
        className="relative flex w-full items-center rounded-full p-2 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl focus-within:ring-2 focus-within:ring-[var(--primary)]"
        style={{
          background: "color-mix(in srgb, var(--surface-1) 80%, transparent)",
          borderColor: "var(--stroke-strong)",
          borderWidth: "1px",
        }}
      >
        <div className="pl-4 pr-2 text-muted" style={{ color: "var(--muted)" }}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </div>
        <input 
          type="text" 
          name="flight"
          value={flightNo}
          onChange={(e) => setFlightNo(e.target.value)}
          placeholder="Enter Flight Number (e.g. AA 104)"
          className="flex-1 bg-transparent px-2 py-3 text-sm font-medium outline-none placeholder:font-normal"
          style={{ color: "var(--fg)" }}
          required
        />
        <button 
          type="submit"
          disabled={loading}
          className="ml-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          style={{
            background: "var(--primary)",
            color: "#fff",
            boxShadow: "0 4px 18px color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          {loading ? "Tracking..." : "Track Status"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="w-full rounded-2xl p-4 border text-sm flex gap-3 text-red-600 dark:text-red-400 bg-red-500/5 border-red-500/20 shadow-sm animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div 
          className="w-full animate-in fade-in slide-in-from-top-4 rounded-2xl border p-5 shadow-lg backdrop-blur-xl"
          style={{
            background: "color-mix(in srgb, var(--surface-2) 90%, transparent)",
            borderColor: "var(--stroke-strong)",
            color: "var(--fg)"
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-lg">{result.flight_number.toUpperCase()}</p>
              <p className="text-sm mt-1 font-medium" style={{ color: "var(--muted)" }}>
                Date: {result.date}
              </p>
            </div>
            
            <div className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                 getStatusColor(result.status)
            )}>
              {result.status === "active" || result.status === "scheduled" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {result.status}
              {result.delay_minutes > 0 && ` (${result.delay_minutes}m)`}
            </div>
          </div>
          
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--stroke)" }}>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
              {result.status === "delayed" || result.status === "cancelled" 
                ? "ReRoute.AI detected a disruption. Let our autonomous agent handle your rebooking, hotel cascades, and compensation claims." 
                : "Tracking actively. ReRoute.AI will secure your plans instantly if the schedule breaks."}
            </p>
            <Link
              href="/signup"
              className="flex w-full min-h-[44px] items-center justify-center rounded-xl text-sm font-semibold transition hover:opacity-90 shadow-sm"
              style={{
                background: "var(--fg)",
                color: "var(--bg)",
              }}
            >
              Sign up to Auto-Resolve
            </Link>
          </div>
        </div>
      )}

      {/* Alternative Login */}
      {!result && !loading && !error && (
        <div className="flex items-center gap-2 text-sm font-medium mt-3" style={{ color: "var(--muted)" }}>
          <span>Already managing an itinerary?</span>
          <Link href="/login" className="transition hover:underline underline-offset-4" style={{ color: "var(--primary)" }}>
            Sign in to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
