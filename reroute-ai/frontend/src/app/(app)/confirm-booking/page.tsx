"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import { apiAgentConfirm } from "@/lib/reroute-api";
import type { AgentConfirmResponse } from "@/lib/api-types";

export default function ConfirmBookingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useRerouteSession();

  const proposalId = params.get("proposal_id");
  const optionId = params.get("option_id");

  const [status, setStatus] = useState<"idle" | "confirming" | "success" | "error">("idle");
  const [result, setResult] = useState<AgentConfirmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = useCallback(async () => {
    if (!proposalId || !optionId || !user) return;
    setStatus("confirming");
    try {
      const res = await apiAgentConfirm(proposalId, optionId, {
        acknowledgeDisruptionUncertainty: true,
      });
      setResult(res);
      setStatus(res.applied ? "success" : "error");
      if (!res.applied) setError(res.message);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Confirmation failed");
    }
  }, [proposalId, optionId, user]);

  useEffect(() => {
    if (user && proposalId && optionId && status === "idle") {
      confirm();
    }
  }, [user, proposalId, optionId, status, confirm]);

  if (!proposalId || !optionId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <X className="h-10 w-10 text-red-400" />
        <h1 className="text-xl font-semibold text-zinc-100">Invalid confirmation link</h1>
        <p className="text-sm text-zinc-500">Missing proposal or option ID.</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      {status === "confirming" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-[color:var(--primary)]" />
          <h1 className="text-xl font-semibold text-zinc-100">Confirming your rebooking...</h1>
          <p className="text-sm text-zinc-500">Please wait while we process your selection.</p>
        </>
      )}

      {status === "success" && result && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Rebooking confirmed!</h1>
          <p className="text-sm text-zinc-400">{result.message}</p>
          {result.duffel_order_id && (
            <p className="text-xs text-zinc-500">
              Order reference: <code className="font-mono text-zinc-300">{result.duffel_order_id}</code>
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/trips")}
            className="mt-2 rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white"
          >
            View your trips
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
            <X className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Could not confirm</h1>
          <p className="text-sm text-red-400">{error}</p>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => { setStatus("idle"); setError(null); }}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => router.push("/trips")}
              className="rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Go to trips
            </button>
          </div>
        </>
      )}
    </div>
  );
}
