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
  monthly: number;
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
          <span className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: "var(--fg)" }}>
            ₹0
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--subtle)" }}>
          Forever free · upgrade when you&apos;re ready
        </p>
      </div>
    );
  }

  const showStrike = billing === "annual" && plan.monthly !== plan.annualPerMonth;

  return (
    <div className="mt-6 flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        {showStrike ? (
          <span className="text-lg font-medium line-through" style={{ color: "var(--subtle)" }}>
            ₹{formatInr(plan.monthly)}
          </span>
        ) : null}
        <span className="text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: "var(--fg)" }}>
          ₹{formatInr(perMonth)}
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--subtle)" }}>
          /mo
        </span>
      </div>
      <p className="text-sm" style={{ color: "var(--subtle)" }}>
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
    <section
      id="pricing"
      className="scroll-mt-20 border-t py-16 sm:py-24"
      style={{ borderColor: "var(--stroke)", background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--accent)" }}
          >
            Pricing
          </p>
          <h2
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
            style={{ color: "var(--fg)" }}
          >
            Plans that scale with disruption load.
          </h2>
          <p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: "var(--muted)" }}>
            Start free, move to Operator when you need depth, or run Mission control for a team. Enterprise options for
            programs and partners.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 sm:mt-12">
          <div
            className="inline-flex rounded-full border p-1 shadow-inner"
            style={{
              borderColor: "var(--stroke)",
              background: "var(--surface-1)",
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.15)",
            }}
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
              )}
              style={
                billing === "monthly"
                  ? { background: "var(--fg)", color: "var(--bg)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                  : { color: "var(--muted)" }
              }
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
              )}
              style={
                billing === "annual"
                  ? {
                      background: "var(--primary)",
                      color: "#fff",
                      boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              Annual
            </button>
          </div>
          <p className="text-center text-xs font-medium" style={{ color: "var(--primary)" }}>
            {ANNUAL_DISCOUNT_LABEL} on annual billing
          </p>
        </div>

        {/* Plan cards */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className="relative flex flex-col rounded-2xl border p-6 sm:p-8"
              style={
                plan.featured
                  ? {
                      borderColor: "var(--stroke)",
                      background: "var(--surface-1)",
                      boxShadow: "var(--shadow-1)",
                      marginTop: "-4px",
                      marginBottom: "4px",
                    }
                  : {
                      borderColor: "var(--stroke)",
                      background: "var(--surface-1)",
                      boxShadow: "var(--shadow-1)",
                    }
              }
            >
              {plan.featured ? (
                <span
                  className="absolute right-5 top-5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-[var(--primary-soft)]"
                  style={{
                    background: "var(--primary-soft)",
                    color: "var(--primary)",
                  }}
                >
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: "var(--fg)" }}>
                {plan.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {plan.blurb}
              </p>
              <PriceBlock plan={plan} billing={billing} />
              <Link
                href={plan.href}
                className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:opacity-90"
                style={
                  plan.featured
                    ? {
                        background: "var(--primary)",
                        color: "#fff",
                        boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent)",
                      }
                    : {
                        borderColor: "var(--stroke-strong)",
                        border: "1px solid",
                        background: "var(--surface-0)",
                        color: "var(--fg)",
                      }
                }
              >
                {plan.cta}
              </Link>
              <ul className="mt-8 flex flex-col gap-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1"
                      style={{
                        background: "var(--primary-soft)",
                        color: "var(--primary)",
                      }}
                    >
                      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span className="leading-snug" style={{ color: "var(--muted)" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Enterprise banner */}
        <article
          className="mt-5 overflow-hidden rounded-2xl border p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8"
          style={{ borderColor: "var(--stroke)", background: "var(--surface-1)", boxShadow: "var(--shadow-1)" }}
        >
          <div className="max-w-xl">
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: "var(--fg)" }}>
              Enterprise
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Fleet programs, TMCs, and partners: SSO, audit-friendly workflows, custom SLAs, invoicing, and integrations.
              We&apos;ll align limits and security with how you operate.
            </p>
          </div>
          <Link
            href="/contact"
            className="mt-6 inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full border px-6 text-sm font-semibold transition hover:opacity-90 sm:mt-0"
            style={{
              borderColor: "var(--stroke-strong)",
              background: "var(--surface-1)",
              color: "var(--fg)",
            }}
          >
            Contact sales
          </Link>
        </article>

        {/* Legal footnote */}
        <div className="mt-10 flex flex-col items-center gap-2 border-t pt-8 text-center sm:mt-12" style={{ borderColor: "var(--stroke)" }}>
          <p className="max-w-2xl text-xs leading-relaxed sm:text-sm" style={{ color: "var(--subtle)" }}>
            Cancel anytime on paid plans · No card required for Starter · Security & DPA details available on request
          </p>
          <p className="text-xs" style={{ color: "var(--subtle)", opacity: 0.65 }}>
            All amounts in INR · illustrative launch targets · taxes extra as applicable · prices may change.
          </p>
        </div>
      </div>
    </section>
  );
}
