import Image from "next/image";
import Link from "next/link";
import { Check, Plane } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme-toggle";

export const authInputClass = cn(
  "mt-2 w-full rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20",
  "placeholder:text-zinc-500 outline-none transition",
  "focus:border-emerald-500/45 focus:ring-2 focus:ring-emerald-500/20",
);

export const authLabelClass = "block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

const highlights = [
  "Ranked rebook paths from live itinerary context",
  "Downstream ripple — hotels, meetings, connections",
  "Guided steps so you confirm with confidence",
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 light:bg-zinc-100 lg:flex-row">
      {/* Brand panel */}
      <aside className="relative flex min-h-[38vh] flex-col justify-between overflow-hidden lg:min-h-dvh lg:w-[min(44%,520px)] lg:shrink-0 xl:w-[min(42%,560px)]">
        <div className="absolute inset-0">
          <Image
            src="/herobg-3.webp"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/88 via-zinc-950/70 to-emerald-950/50" aria-hidden />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_0%_0%,rgba(16,185,129,0.18),transparent_55%)]"
            aria-hidden
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-6 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-8 lg:justify-center lg:py-12">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5 font-semibold tracking-tight text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <Plane className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg">
              ReRoute<span className="text-emerald-400">.AI</span>
            </span>
          </Link>

          <div className="mt-8 lg:mt-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Operations-grade</p>
            <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              When disruption hits, move from chaos to a clear next step.
            </h2>
            <ul className="mt-8 space-y-4">
              {highlights.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-snug text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative z-10 hidden px-10 pb-8 text-xs text-zinc-500 lg:block">
          Encrypted session · Same security model as your dashboard
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-4 flex justify-end">
            <ThemeToggle />
          </div>
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-8 shadow-2xl shadow-black/30 backdrop-blur-md ring-1 ring-white/[0.04] sm:p-9">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
          <div className="mt-8 text-center text-sm text-zinc-500">{footer}</div>
        </div>
      </main>
    </div>
  );
}
