"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

type Billing = "monthly" | "annual";

const ANNUAL_DISCOUNT_LABEL = "Save ~20%";

type Plan = {
  id: string;
  name: string;
  blurb: string;
  /** INR per month when billed monthly. */
  monthly: number;
  /** INR per month equivalent when billed annually (~20% off monthly × 12). */
  annualPerMonth: number;
  cta: string;
  href: string;
  featured?: boolean;
  footnote?: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "Evaluate ReRoute on real trips—clear limits, full product surface.",
    monthly: 0,
    annualPerMonth: 0,
    cta: "Create free account",
    href: "/signup?plan=starter",
    features: [
      "1 user · up to 2 active trips",
      "Dashboard, monitor & activity (14-day history)",
      "Email notifications",
      "Community & email support",
    ],
  },
  {
    id: "pro",
    name: "Operator",
    blurb: "For frequent travelers and ops owners who need speed when plans break.",
    monthly: 99,
    annualPerMonth: 79,
    cta: "Start Pro",
    href: "/signup?plan=pro",
    featured: true,
    footnote: "per user / month",
    features: [
      "Everything in Starter",
      "Up to 25 active trips & deeper monitoring",
      "90-day history & exports",
      "Priority recovery workflows",
      "Faster email support",
    ],
  },
  {
    id: "team",
    name: "Mission control",
    blurb: "Shared visibility for small teams—concierge, ops, and travel desks.",
    monthly: 299,
    annualPerMonth: 239,
    cta: "Start Team",
    href: "/signup?plan=team",
    footnote: "up to 5 seats included",
    features: [
      "Everything in Operator",
      "5 seats included (+ add-ons)",
      "Shared trip workspace & handoffs",
      "Higher limits across monitors & API",
      "Business-hours support with SLAs",
    ],
  },
];

function formatInr(n: number) {
  return n === 0 ? "0" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function PriceBlock({ plan, billing }: { plan: Plan; billing: Billing }) {
  const isFree = plan.monthly === 0;
  const perMonth = billing === "annual" ? plan.annualPerMonth : plan.monthly;

  if (isFree) {
    return (
      <div className="mt-6 flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">₹0</span>
        </div>
        <p className="text-sm text-zinc-500">Forever free · upgrade when you&apos;re ready</p>
      </div>
    );
  }

  const showStrike = billing === "annual" && plan.monthly !== plan.annualPerMonth;

  return (
    <div className="mt-6 flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        {showStrike ? (
          <span className="text-lg font-medium text-zinc-600 line-through">₹{formatInr(plan.monthly)}</span>
        ) : null}
        <span className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">₹{formatInr(perMonth)}</span>
        <span className="text-sm font-medium text-zinc-500">/mo</span>
      </div>
      <p className="text-sm text-zinc-500">
        {billing === "annual" ? (
          <>Billed annually · {plan.footnote ?? "per user / month"} · + GST as applicable</>
        ) : (
          <>
            {plan.footnote ?? "per user / month"} · switch to annual for {ANNUAL_DISCOUNT_LABEL.toLowerCase()} · + GST as
            applicable
          </>
        )}
      </p>
    </div>
  );
}

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <section id="pricing" className="scroll-mt-20 border-t border-zinc-800/80 bg-zinc-950 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">Pricing</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
            Plans that scale with disruption load.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Start free, move to Operator when you need depth, or run Mission control for a team. Enterprise options for
            programs and partners.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 sm:mt-12">
          <div
            className="inline-flex rounded-full border border-zinc-800/90 bg-zinc-900/60 p-1 shadow-inner shadow-black/20"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                billing === "monthly"
                  ? "bg-zinc-100 text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                billing === "annual"
                  ? "bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/25"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              Annual
            </button>
          </div>
          <p className="text-center text-xs font-medium text-emerald-400/90">{ANNUAL_DISCOUNT_LABEL} on annual billing</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 sm:p-8",
                plan.featured
                  ? "border-emerald-500/35 bg-gradient-to-b from-emerald-950/40 via-zinc-900/60 to-zinc-950 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/25 lg:-mt-1 lg:mb-1"
                  : "border-zinc-800/90 bg-zinc-900/40 shadow-sm shadow-black/25",
              )}
            >
              {plan.featured ? (
                <span className="absolute right-5 top-5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{plan.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{plan.blurb}</p>
              <PriceBlock plan={plan} billing={billing} />
              <Link
                href={plan.href}
                className={cn(
                  "mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition",
                  plan.featured
                    ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                    : "border border-zinc-700/90 bg-zinc-950/50 text-white hover:border-zinc-600 hover:bg-zinc-900/80",
                )}
              >
                {plan.cta}
              </Link>
              <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
                      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className="leading-snug text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <article className="mt-5 overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div className="max-w-xl">
            <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Enterprise</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Fleet programs, TMCs, and partners: SSO, audit-friendly workflows, custom SLAs, invoicing, and integrations.
              We&apos;ll align limits and security with how you operate.
            </p>
          </div>
          <Link
            href="mailto:sales@reroute.ai?subject=ReRoute%20Enterprise"
            className="mt-6 inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 sm:mt-0"
          >
            Contact sales
          </Link>
        </article>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-zinc-800/80 pt-8 text-center sm:mt-12">
          <p className="max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
            Cancel anytime on paid plans · No card required for Starter · Security & DPA details available on request
          </p>
          <p className="text-xs text-zinc-600">
            All amounts in INR · illustrative launch targets · taxes extra as applicable · prices may change.
          </p>
        </div>
      </div>
    </section>
  );
}
