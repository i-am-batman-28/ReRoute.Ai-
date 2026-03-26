import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const tones = {
  neutral: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/35 bg-red-500/10 text-red-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
} as const;

export type ChipTone = keyof typeof tones;

export function Chip({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: ChipTone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden /> : null}
      {children}
    </span>
  );
}
