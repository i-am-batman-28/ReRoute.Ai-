"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";

import { AuthShell, authInputClass, authLabelClass } from "@/components/auth/auth-shell";
import { apiResetPassword } from "@/lib/reroute-api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!token.trim()) {
      setError("Invalid or missing reset link. Request a new email from the forgot-password page.");
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword(token.trim(), password);
      router.push("/login?reset=ok");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token.trim()) {
    return (
      <div className="space-y-4 text-sm text-zinc-300">
        <p>This link is missing a token. Open the link from your email, or request a new reset.</p>
        <Link href="/forgot-password" className="font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary)]">
          Request reset email
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label htmlFor="reset-password" className={authLabelClass}>
          New password
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="reset-confirm" className={authLabelClass}>
          Confirm password
        </label>
        <input
          id="reset-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
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
            Updating…
          </>
        ) : (
          "Save new password"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter a new password for your ReRoute account."
      footer={
        <>
          <Link href="/login" className="text-sm text-zinc-500 transition hover:text-zinc-300">
            ← Back to sign in
          </Link>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[color:var(--primary)]" aria-hidden />
            Loading…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
