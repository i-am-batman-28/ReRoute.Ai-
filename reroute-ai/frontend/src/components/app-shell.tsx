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
                  ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
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
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500/70" aria-hidden />
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
          className="text-sm font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
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
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 md:flex-row">
      <aside className="hidden shrink-0 border-b border-zinc-800 bg-zinc-950 light:border-zinc-200 light:bg-zinc-50 md:flex md:w-56 md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b border-zinc-800 px-4">
          <Link
            href="/dashboard"
            className="font-serif text-base font-semibold tracking-tight text-zinc-100 light:text-zinc-900"
            style={{ fontFamily: "var(--tg-playfair), Georgia, serif" }}
          >
            ReRoute <em className="not-italic text-emerald-400/90">AI</em>
          </Link>
          <ThemeToggle className="ml-auto" />
        </div>
        <nav className="flex-1 p-3" aria-label="Main">
          <NavLinks />
        </nav>
        <div className="border-t border-zinc-800 p-3">
          <p className="truncate px-1 text-xs text-zinc-500" title={user.email}>
            {userLabel}
          </p>
          <Link
            href="/settings"
            className="mt-1 block truncate rounded-lg px-3 py-1.5 text-left text-xs font-medium text-emerald-400/90 hover:bg-zinc-900 hover:text-emerald-300"
          >
            Account settings
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-2 light:border-zinc-200 light:bg-white md:hidden">
          <span className="shrink-0 font-semibold text-zinc-100 light:text-zinc-900">ReRoute AI</span>
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
                    active ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25" : "text-zinc-400",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-auto bg-zinc-950 light:bg-zinc-50">{children}</main>
      </div>
    </div>
  );
}
