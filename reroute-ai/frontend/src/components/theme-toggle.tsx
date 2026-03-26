"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      title="Toggle theme"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/80 text-zinc-200 transition hover:bg-zinc-800",
        "light:border-zinc-300 light:bg-white light:text-zinc-700 light:hover:bg-zinc-100",
        className,
      )}
    >
      <Sun className="theme-toggle-sun h-4 w-4" aria-hidden />
      <Moon className="theme-toggle-moon h-4 w-4" aria-hidden />
    </button>
  );
}
