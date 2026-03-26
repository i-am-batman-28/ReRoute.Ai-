"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import type { RefreshSessionPublic } from "@/lib/api-types";
import {
  apiListSessions,
  apiPatchMe,
  apiRevokeAllSessions,
  apiRevokeSession,
  apiSetMePassword,
  apiUnlinkGoogle,
} from "@/lib/reroute-api";
import { clearStoredToken } from "@/lib/auth-token";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";
const labelClass = "block text-xs font-medium uppercase tracking-wide text-zinc-500";

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, reload } = useRerouteSession();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [sessions, setSessions] = useState<RefreshSessionPublic[] | null>(null);
  const [sessErr, setSessErr] = useState<string | null>(null);
  const [sessLoading, setSessLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkErr, setUnlinkErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setAvatarUrl(user.avatar_url ?? "");
  }, [user]);

  const loadSessions = useCallback(async () => {
    setSessErr(null);
    setSessLoading(true);
    try {
      const list = await apiListSessions();
      setSessions(list);
    } catch (e) {
      setSessErr(e instanceof Error ? e.message : "Could not load sessions");
      setSessions([]);
    } finally {
      setSessLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    setProfileLoading(true);
    try {
      await apiPatchMe({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await reload();
      setProfileMsg("Profile saved.");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProfileLoading(false);
    }
  }

  async function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (newPw.length < 8) {
      setPwErr("Password must be at least 8 characters");
      return;
    }
    if (newPw !== newPw2) {
      setPwErr("Passwords do not match");
      return;
    }
    setPwLoading(true);
    try {
      await apiSetMePassword(newPw);
      setNewPw("");
      setNewPw2("");
      await reload();
      setPwMsg("Password saved. You can sign in with email and password.");
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setPwLoading(false);
    }
  }

  async function onUnlinkGoogle() {
    setUnlinkErr(null);
    if (!window.confirm("Unlink Google from this account? You will rely on email/password to sign in.")) return;
    setUnlinkLoading(true);
    try {
      await apiUnlinkGoogle();
      await reload();
    } catch (err) {
      setUnlinkErr(err instanceof Error ? err.message : "Could not unlink");
    } finally {
      setUnlinkLoading(false);
    }
  }

  async function onRevokeSession(id: string) {
    setRevokingId(id);
    setSessErr(null);
    try {
      await apiRevokeSession(id);
      await loadSessions();
    } catch (e) {
      setSessErr(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  async function onRevokeAll() {
    if (!window.confirm("Sign out on all devices? You will need to sign in again on this browser too.")) return;
    setSessErr(null);
    try {
      await apiRevokeAllSessions();
      clearStoredToken();
      router.push("/login");
      router.refresh();
    } catch (e) {
      setSessErr(e instanceof Error ? e.message : "Could not revoke sessions");
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          ← Overview
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">Account settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Profile, sign-in methods, and active sessions.</p>
      </div>

      <section className="mb-8 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20">
        <h2 className="text-sm font-semibold text-zinc-100">Profile</h2>
        <p className="mt-1 text-xs text-zinc-500">Signed in as {user.email}</p>
        <form className="mt-4 space-y-4" onSubmit={onSaveProfile}>
          <div>
            <label htmlFor="settings-name" className={labelClass}>
              Display name
            </label>
            <input
              id="settings-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="settings-avatar" className={labelClass}>
              Avatar URL
            </label>
            <input
              id="settings-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className={inputClass}
              placeholder="https://…"
            />
          </div>
          {profileErr ? (
            <p className="text-sm text-red-400" role="alert">
              {profileErr}
            </p>
          ) : null}
          {profileMsg ? <p className="text-sm text-emerald-400">{profileMsg}</p> : null}
          <button
            type="submit"
            disabled={profileLoading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: "var(--stroke-strong)",
              background: "var(--surface-1)",
              color: "var(--fg)",
            }}
          >
            {profileLoading ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20">
        <h2 className="text-sm font-semibold text-zinc-100">Google</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {user.google_account_linked
            ? "Your account is linked to Google sign-in."
            : "Google is not linked. Use “Sign in with Google” on the login page to link when using the same email."}
        </p>
        {user.google_account_linked ? (
          <div className="mt-4">
            {unlinkErr ? (
              <p className="mb-2 text-sm text-red-400" role="alert">
                {unlinkErr}
              </p>
            ) : null}
            <button
              type="button"
              disabled={unlinkLoading}
              onClick={() => void onUnlinkGoogle()}
              className="rounded-lg border border-zinc-600 bg-zinc-950/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:opacity-50"
            >
              {unlinkLoading ? "Unlinking…" : "Unlink Google"}
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              You must have a password set first. If you only use Google, add a password in the section below.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mb-8 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20">
        <h2 className="text-sm font-semibold text-zinc-100">Password</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {user.google_account_linked
            ? "Add a password to sign in with email or to unlink Google."
            : "Set a password if you signed up with Google only, or use forgot-password from login if you lost yours."}
        </p>
        <form className="mt-4 space-y-4" onSubmit={onSetPassword}>
          <div>
            <label htmlFor="settings-pw" className={labelClass}>
              New password
            </label>
            <input
              id="settings-pw"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={inputClass}
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="settings-pw2" className={labelClass}>
              Confirm
            </label>
            <input
              id="settings-pw2"
              type="password"
              autoComplete="new-password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              className={inputClass}
              minLength={8}
            />
          </div>
          {pwErr ? (
            <p className="text-sm text-red-400" role="alert">
              {pwErr}
            </p>
          ) : null}
          {pwMsg ? <p className="text-sm text-emerald-400">{pwMsg}</p> : null}
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: "var(--stroke-strong)",
              background: "var(--surface-1)",
              color: "var(--fg)",
            }}
          >
            {pwLoading ? "Saving…" : "Save password"}
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          <Link href="/forgot-password" className="text-emerald-400/90 underline-offset-2 hover:underline">
            Forgot password? Email reset
          </Link>
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Sessions</h2>
            <p className="mt-1 text-xs text-zinc-500">Refresh tokens (devices/browsers). Revoke if you lose a device.</p>
          </div>
          <button
            type="button"
            onClick={() => void onRevokeAll()}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            style={{
              borderColor: "rgba(248,113,113,0.35)",
              background: "rgba(248,113,113,0.1)",
              color: "var(--danger)",
            }}
          >
            Sign out everywhere
          </button>
        </div>
        {sessErr ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {sessErr}
          </p>
        ) : null}
        {sessLoading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500/70" aria-hidden />
            Loading sessions…
          </div>
        ) : sessions && sessions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No session records found.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {sessions?.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-zinc-400">{s.id.slice(0, 8)}…</p>
                  <p className="text-xs text-zinc-500">
                    Created {formatDt(s.created_at)} · Expires {formatDt(s.expires_at)}
                    {s.remember_me ? " · Remember this device" : ""}
                    {s.revoked_at ? (
                      <span className="text-red-400/90"> · Revoked {formatDt(s.revoked_at)}</span>
                    ) : null}
                  </p>
                </div>
                {!s.revoked_at ? (
                  <button
                    type="button"
                    disabled={revokingId === s.id}
                    onClick={() => void onRevokeSession(s.id)}
                    className="shrink-0 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline disabled:opacity-50"
                  >
                    {revokingId === s.id ? "Revoking…" : "Revoke"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
