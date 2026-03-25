"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UserPlus } from "lucide-react";

import { Grainient } from "@/components/ui/grainient";
import { getApiBase } from "@/lib/api-base";
import { setStoredToken } from "@/lib/auth-token";

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

      const loginRes = await fetch(`${getApiBase()}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = (await loginRes.json().catch(() => ({}))) as { access_token?: string };
      if (!loginRes.ok || !loginData.access_token) {
        setError("Account created — please log in.");
        router.push("/");
        return;
      }
      setStoredToken(loginData.access_token);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Grainient />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-[380px] rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur-xl ring-1 ring-emerald-950/[0.04] sm:p-10">
          <h1 className="flex items-center justify-center gap-2 text-center text-xl font-semibold text-zinc-900">
            <UserPlus className="h-6 w-6 text-emerald-700" aria-hidden />
            Create account
          </h1>
          <p className="mt-1 text-center text-sm text-zinc-500">ReRoute.AI</p>

          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700">
                Full name <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 text-zinc-900 outline-none transition duration-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/25"
              />
            </div>
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
                className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 text-zinc-900 outline-none transition duration-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/25"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password <span className="font-normal text-zinc-400">(min 8 characters)</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3 text-zinc-900 outline-none transition duration-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/25"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-950 py-3.5 text-sm font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:shadow-lg active:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Creating…" : "Sign up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/"
              className="font-medium text-emerald-900 underline decoration-emerald-900/30 underline-offset-4 hover:text-emerald-800"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
