"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Loader2, LogOut, MapPin, Radar, Settings } from "lucide-react";

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
    <ul className="flex flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
  const pathname = usePathname();
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
    <div className="flex min-h-screen flex-1 flex-col bg-[color:var(--bg)] md:flex-row">
      <aside className="hidden shrink-0 border-b border-[color:var(--stroke)] bg-[color:var(--bg)] md:flex md:w-56 md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b border-[color:var(--stroke)] px-4">
          <Link
            href="/dashboard"
            className="font-serif text-base font-semibold tracking-tight text-[color:var(--fg)]"
            style={{ fontFamily: "var(--tg-playfair), Georgia, serif" }}
          >
            ReRoute <em className="not-italic text-[color:var(--primary)]">AI</em>
          </Link>
          <ThemeToggle className="ml-auto" />
        </div>
        <nav className="flex-1 p-3" aria-label="Main">
          <NavLinks />
        </nav>
        <div className="border-t border-[color:var(--stroke)] p-3">
          <p className="truncate px-1 text-xs text-[color:var(--subtle)]" title={user.email}>
            {userLabel}
          </p>
          <Link
            href="/settings"
            className="mt-1 block truncate rounded-lg px-3 py-1.5 text-left text-xs font-medium text-[color:var(--primary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--primary-strong)]"
          >
            Account settings
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--subtle)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--fg)]"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-[color:var(--stroke)] bg-[color:var(--bg)] px-3 py-2 md:hidden">
          <span className="shrink-0 font-semibold text-[color:var(--fg)]">ReRoute AI</span>
          <ThemeToggle />
          <nav className="flex flex-1 justify-end gap-1 overflow-x-auto" aria-label="Main">
            {nav.map(({ href, label }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium",
                    active
                      ? "bg-[color:var(--primary-soft)] text-[color:var(--fg)] ring-1 ring-[color:var(--stroke)]"
                      : "text-[color:var(--subtle)]",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="rr-hero-sky min-h-0 flex-1 overflow-auto bg-[color:var(--bg)]">{children}</main>
      </div>
    </div>
  );
}
