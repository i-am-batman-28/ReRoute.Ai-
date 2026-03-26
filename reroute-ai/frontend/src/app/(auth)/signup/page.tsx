"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { AuthShell, authLabelClass } from "@/components/auth/auth-shell";
import { getApiBase } from "@/lib/api-base";
import { clearStoredToken } from "@/lib/auth-token";

const authInputBase =
  "mt-2 w-full rounded-xl border px-4 py-3 text-sm shadow-inner outline-none transition focus:ring-2";

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
          <Link
            href="/login"
            className="font-semibold transition hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>

        {/* Full name */}
        <div>
          <label htmlFor="signup-name" className={authLabelClass}>
            Full name{" "}
            <span className="font-normal normal-case tracking-normal" style={{ color: "var(--subtle)" }}>
              (optional)
            </span>
          </label>
          <input
            id="signup-name"
            name="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Morgan"
            className={authInputBase}
            style={{
              borderColor: "var(--stroke-strong)",
              background: "var(--surface-0)",
              color: "var(--fg)",
            }}
          />
        </div>

        {/* Email */}
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
            className={authInputBase}
            style={{
              borderColor: "var(--stroke-strong)",
              background: "var(--surface-0)",
              color: "var(--fg)",
            }}
          />
        </div>

        {/* Password */}
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
            className={authInputBase}
            style={{
              borderColor: "var(--stroke-strong)",
              background: "var(--surface-0)",
              color: "var(--fg)",
            }}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--subtle)" }}>
            Minimum 8 characters. Use a unique password you don&apos;t reuse elsewhere.
          </p>
        </div>

        {/* Error */}
        {error ? (
          <p
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "rgba(248,113,113,0.30)",
              background: "rgba(248,113,113,0.10)",
              color: "var(--danger)",
            }}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
          style={{
            background: "var(--primary)",
            color: "#fff",
            boxShadow: "0 6px 20px color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
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

        <p className="text-center text-xs leading-relaxed" style={{ color: "var(--subtle)" }}>
          By continuing you agree to use ReRoute in line with your organization&apos;s policies. We never sell your
          itinerary data.
        </p>
      </form>

      <p className="mt-6 text-center">
        <Link href="/" className="text-sm transition hover:opacity-80" style={{ color: "var(--subtle)" }}>
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
