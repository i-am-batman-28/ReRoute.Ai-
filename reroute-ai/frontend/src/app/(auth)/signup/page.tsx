"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { AuthShell, authInputClass, authLabelClass } from "@/components/auth/auth-shell";
import { getApiBase } from "@/lib/api-base";
import { clearStoredToken } from "@/lib/auth-token";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const signupRes = await fetch(`${getApiBase()}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName.trim() || null,
        }),
      });
      const signupData = (await signupRes.json().catch(() => ({}))) as { detail?: string | { msg?: string }[] };
      if (!signupRes.ok) {
        const msg =
          typeof signupData.detail === "string"
            ? signupData.detail
            : Array.isArray(signupData.detail)
              ? signupData.detail.map((d) => d.msg).filter(Boolean).join(", ") || "Signup failed"
              : "Signup failed";
        setError(msg);
        return;
      }

      clearStoredToken();
      const loginRes = await fetch(`${getApiBase()}/users/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember_me: true }),
      });
      const loginData = (await loginRes.json().catch(() => ({}))) as { access_token?: string };
      if (!loginRes.ok || !loginData.access_token) {
        setError("Account created — please sign in.");
        router.push("/login");
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
      title="Create your account"
      subtitle="Start monitoring trips and running recovery workflows in minutes."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary)]">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label htmlFor="signup-name" className={authLabelClass}>
            Full name <span className="font-normal normal-case tracking-normal text-zinc-600">(optional)</span>
          </label>
          <input
            id="signup-name"
            name="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Morgan"
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-email" className={authLabelClass}>
            Work email
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className={authLabelClass}>
            Password
          </label>
          <input
            id="signup-password"
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
          <p className="mt-1.5 text-xs text-zinc-600">Minimum 8 characters. Use a unique password you don’t reuse elsewhere.</p>
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-center text-xs leading-relaxed text-zinc-600">
          By continuing you agree to use ReRoute in line with your organization’s policies. We never sell your itinerary
          data.
        </p>
      </form>

      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 transition hover:text-zinc-300">
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
