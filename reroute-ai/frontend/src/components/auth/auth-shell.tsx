import Image from "next/image";
import Link from "next/link";
import { Check, Plane } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme-toggle";

export const authInputClass = cn(
  "mt-2 w-full rounded-xl border px-4 py-3 text-sm shadow-inner outline-none transition",
  "placeholder:opacity-40",
  "focus:ring-2",
  // CSS vars drive the actual colors — see globals.css
  "[border-color:var(--stroke-strong)] [background:var(--surface-1)] [color:var(--fg)]",
  "[focus:border-color:var(--primary)] [focus:ring-color:var(--primary-soft)]",
);

export const authLabelClass =
  "block text-xs font-semibold uppercase tracking-[0.14em] [color:var(--subtle)]";

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
    <div
      className="flex min-h-dvh flex-col lg:flex-row"
      style={{ background: "var(--bg)", color: "var(--fg)" }}
    >
      {/* ── Brand panel (always dark — photo bg) ────────── */}
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
          {/* Dark overlay — always dark regardless of theme so photo is legible */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(8,16,30,0.90) 0%, rgba(8,16,30,0.72) 55%, rgba(10,30,70,0.50) 100%)",
            }}
            aria-hidden
          />
          {/* Ocean glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 0% 0%, rgba(79,174,255,0.18), transparent 55%)",
            }}
            aria-hidden
          />
          {/* Sunset glow bottom-right */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 100% 100%, rgba(255,140,66,0.12), transparent 60%)",
            }}
            aria-hidden
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-6 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-8 lg:justify-center lg:py-12">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5 font-semibold tracking-tight" style={{ color: "#ffffff" }}>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl ring-1"
              style={{
                background: "rgba(79,174,255,0.15)",
                color: "#7ec8ff",
                ringColor: "rgba(79,174,255,0.30)",
              }}
            >
              <Plane className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg">
              ReRoute<span style={{ color: "#7ec8ff" }}>.AI</span>
            </span>
          </Link>

          <div className="mt-8 lg:mt-14">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,140,66,0.90)" }}
            >
              Operations-grade
            </p>
            <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight tracking-tight sm:text-3xl" style={{ color: "#ffffff" }}>
              When disruption hits, move from chaos to a clear next step.
            </h2>
            <ul className="mt-8 space-y-4">
              {highlights.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-snug" style={{ color: "rgba(232,240,254,0.80)" }}>
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1"
                    style={{
                      background: "rgba(79,174,255,0.20)",
                      color: "#7ec8ff",
                    }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative z-10 hidden px-10 pb-8 text-xs lg:block" style={{ color: "rgba(232,240,254,0.40)" }}>
          Encrypted session · Same security model as your dashboard
        </p>
      </aside>

      {/* ── Form panel (adapts to theme) ────────────────── */}
      <main
        className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16"
        style={{ background: "var(--bg)" }}
      >
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-4 flex justify-end">
            <ThemeToggle />
          </div>
          <div
            className="rounded-2xl border p-8 shadow-2xl backdrop-blur-md sm:p-9"
            style={{
              borderColor: "var(--stroke)",
              background: "var(--surface-1)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--fg)" }}
            >
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {subtitle}
            </p>
            <div className="mt-8">{children}</div>
          </div>
          <div className="mt-8 text-center text-sm" style={{ color: "var(--subtle)" }}>
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
