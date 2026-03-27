"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Loader2, LogOut, MapPin, Plane, Radar, Settings } from "lucide-react";

import { useRerouteSession } from "@/components/reroute-session-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/trips", label: "Trips", icon: MapPin },
  { href: "/monitor", label: "Monitor", icon: Radar },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center justify-center gap-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[color:var(--primary-soft)] text-[color:var(--fg)] ring-1 ring-[color:var(--stroke)]"
                  : "text-[color:var(--subtle)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 opacity-80",
                  active && "text-[color:var(--primary)] opacity-100",
                )}
                aria-hidden
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, reload, logout } = useRerouteSession();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center gap-2 bg-zinc-950 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--primary)]" aria-hidden />
        Loading workspace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="text-sm font-medium text-[color:var(--primary)] underline underline-offset-2 hover:text-[color:var(--primary)]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userLabel = user.full_name?.trim() ? user.full_name : user.email;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[color:var(--bg)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--stroke)] bg-[color:var(--bg)]/95 backdrop-blur-md">
        <div className="mx-auto grid h-14 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
          <div className="flex items-center justify-start">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold tracking-tight text-[color:var(--fg)]"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg ring-1"
                style={{ background: "var(--primary-soft)", color: "var(--primary)", borderColor: "var(--primary-soft)" }}
              >
                <Plane className="h-4 w-4" aria-hidden />
              </span>
              <span>
                ReRoute<span style={{ color: "var(--primary)" }}>.AI</span>
              </span>
            </Link>
          </div>

          <nav className="overflow-x-auto" aria-label="Main">
            <NavLinks />
          </nav>

          <div className="flex items-center justify-end gap-2">
            <p className="hidden truncate text-xs text-[color:var(--subtle)] lg:block" title={user.email}>
              {userLabel}
            </p>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--subtle)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline"></span>
            </button>
          </div>
        </div>
      </header>

      <main className="rr-hero-sky min-h-0 flex-1 overflow-auto bg-[color:var(--bg)]">{children}</main>
    </div>
  );
}
