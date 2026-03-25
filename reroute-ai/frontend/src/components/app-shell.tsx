"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname === "/dashboard";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!hideChrome ? (
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              ReRoute.AI
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
      ) : null}
      <main className="flex-1">{children}</main>
    </div>
  );
}
