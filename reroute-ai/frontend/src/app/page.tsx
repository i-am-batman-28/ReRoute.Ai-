"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Grainient } from "@/components/ui/grainient";
import { getApiBase } from "@/lib/api-base";
import { setStoredToken } from "@/lib/auth-token";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string; access_token?: string };
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Login failed");
        return;
      }
      if (!data.access_token) {
        setError("Invalid response from server");
        return;
      }
      setStoredToken(data.access_token);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Grainient />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-[380px] rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur-xl ring-1 ring-emerald-950/[0.04] sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-lg font-semibold tracking-tight text-emerald-950">
              ReRoute<span className="text-emerald-700">.AI</span>
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-800/55">
              Travel Disruption Intelligence
            </p>
            <h1 className="mt-6 text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[1.65rem]">
              Your trip breaks.{" "}
              <span className="text-emerald-800">We fix it.</span>
            </h1>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 text-zinc-900 outline-none transition duration-300 placeholder:text-zinc-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/25"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 text-zinc-900 outline-none transition duration-300 placeholder:text-zinc-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/25"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 transition duration-300" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-950 py-3.5 text-sm font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:shadow-lg active:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500 transition duration-300">
            New here?{" "}
            <Link
              href="/signup"
              className="font-medium text-emerald-900 underline decoration-emerald-900/30 underline-offset-4 transition hover:text-emerald-800 hover:decoration-emerald-800/50"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
