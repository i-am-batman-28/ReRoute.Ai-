"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthShell, authInputClass, authLabelClass } from "@/components/auth/auth-shell";
import { getApiBase } from "@/lib/api-base";
import { clearStoredToken } from "@/lib/auth-token";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_oauth: "Google sign-in failed.",
  oauth_missing: "OAuth response was incomplete.",
  oauth_state: "Security check failed. Try signing in again.",
  oauth_token: "Could not complete Google sign-in.",
  oauth_failed: "Could not complete Google sign-in.",
  oauth_profile: "Could not read your Google profile.",
  account_conflict: "This email is linked to another Google account.",
};

export default function LoginPage() {
  const router = useRouter();
  const googleAuthUrl = `${getApiBase()}/auth/google/login`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "ok") {
      setError(null);
      setSuccessBanner("Password updated. Sign in with your new password.");
      const u = new URL(window.location.href);
      u.searchParams.delete("reset");
      window.history.replaceState({}, "", u.pathname + (u.search ? u.search : ""));
      return;
    }
    const code = params.get("error");
    if (!code) return;
    setSuccessBanner(null);
    setError(OAUTH_ERROR_MESSAGES[code] ?? "Sign-in failed");
    const u = new URL(window.location.href);
    u.searchParams.delete("error");
    window.history.replaceState({}, "", u.pathname + (u.search ? u.search : ""));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessBanner(null);
    setLoading(true);
    try {
      clearStoredToken();
      const res = await fetch(`${getApiBase()}/users/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        access_token?: string;
        expires_in?: number;
      };
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Login failed");
        return;
      }
      if (!data.access_token) {
        setError("Invalid response from server");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace to manage trips, proposals, and disruption recovery."
      footer={
        <>
          New to ReRoute?{" "}
          <Link href="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {successBanner ? (
          <p
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
            role="status"
          >
            {successBanner}
          </p>
        ) : null}
        <div>
          <label htmlFor="login-email" className={authLabelClass}>
            Email
          </label>
          <input
            id="login-email"
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
        <div>
          <label htmlFor="login-password" className={authLabelClass}>
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={authInputClass}
          />
          <p className="mt-2 text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-emerald-400/90 hover:text-emerald-300">
              Forgot password?
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="remember-me"
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
          />
          <label htmlFor="remember-me" className="text-sm text-zinc-400">
            Remember this device (longer session)
          </label>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-500">
            <span className="bg-zinc-950 px-2">Or continue with</span>
          </div>
        </div>

        <a
          href={googleAuthUrl}
          onClick={(e) => {
            e.preventDefault();
            window.location.assign(googleAuthUrl);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900/80 py-3.5 text-sm font-semibold text-zinc-100 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </a>
      </div>

      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 transition hover:text-zinc-300">
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
