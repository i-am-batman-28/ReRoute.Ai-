"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { AuthShell, authInputClass, authLabelClass } from "@/components/auth/auth-shell";
import { apiForgotPassword } from "@/lib/reroute-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiForgotPassword(email.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="If an account with this email has a password, we will send reset instructions."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary)]">
            Sign in
          </Link>
        </>
      }
    >
      {done ? (
        <div className="space-y-4 rounded-xl border border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] px-4 py-5 text-sm text-zinc-200">
          <p>
            If an account exists for <span className="font-medium text-zinc-100">{email}</span> and it uses a
            password, check your inbox for a reset link.
          </p>
          <p className="text-zinc-500">Google-only accounts do not receive this email — use Google sign-in instead.</p>
          <Link
            href="/login"
            className="inline-flex text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary)]"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="forgot-email" className={authLabelClass}>
              Email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={authInputClass}
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] py-3.5 text-sm font-semibold text-white shadow-lg shadow-md transition hover:bg-[color:var(--primary)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
