import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plane } from "lucide-react";

import { PricingSection } from "@/components/marketing/pricing-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

const featureTopRight = {
  title: "Monitor every itinerary",
  body: "See pending proposals and trip health across what you're watching—without drowning in noise.",
  href: "/monitor",
  cta: "View monitor",
  image: "/4k-plane-in-airport-uhj5vnu4c0t0j89v.jpg",
} as const;

const featureBottomRight = {
  title: "Real-time disruption intelligence",
  body: "From delay to downstream ripple—hotels, meetings, and connections summarized so you can act fast.",
  href: "/activity",
  cta: "See activity",
  image: "/wp4956785.jpg",
} as const;

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      {/* Hero */}
      <section className="relative flex min-h-[min(88dvh,820px)] flex-col overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/herobg-2.webp"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Adaptive overlay — dark in dark mode, lighter in light mode */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 88%, transparent) 0%, color-mix(in srgb, var(--bg) 60%, transparent) 50%, var(--bg) 100%)",
            }}
            aria-hidden
          />
          {/* Sky radial glow */}
          <div className="absolute inset-0 rr-hero-sky" aria-hidden />
        </div>

        {/* Navbar */}
        <header
          className="relative z-20 border-b backdrop-blur-md"
          style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--bg) 60%, transparent)" }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" style={{ color: "var(--fg)" }}>
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

            {/* Nav links */}
            <nav className="hidden items-center gap-8 text-sm font-medium md:flex" style={{ color: "var(--muted)" }}>
              <a href="#features" className="transition hover:opacity-100" style={{ opacity: 0.75 }}>
                Features
              </a>
              <a href="#pricing" className="transition hover:opacity-100" style={{ opacity: 0.75 }}>
                Pricing
              </a>
              <Link href="/contact" className="transition hover:opacity-100" style={{ opacity: 0.75 }}>
                Contact Us
              </Link>
            </nav>

            {/* CTA buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle className="hidden sm:inline-flex" />
              <Link
                href="/login"
                className="hidden rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:opacity-90 sm:inline-flex"
                style={{
                  borderColor: "var(--stroke-strong)",
                  background: "var(--surface-1)",
                  color: "var(--fg)",
                }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition hover:opacity-90"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  boxShadow: "0 4px 18px color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              >
                Join free
              </Link>
            </div>
          </div>
        </header>

        {/* Hero body */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <p
            className="text-center text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--accent)" }}
          >
            Travel disruption intelligence
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-center text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl" style={{ color: "var(--fg)" }}>
            ReRoute is central to{" "}
            <span
              style={{
                background: "linear-gradient(90deg, var(--primary), var(--primary-strong))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              recovering your trip.
            </span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed sm:text-lg"
            style={{ color: "var(--muted)" }}
          >
            When schedules break, you get ranked options, downstream impact, and a calm path to confirm built for
            operators and travelers who can't afford chaos.
          </p>

          <div id="sign-in" className="mt-10 flex w-full max-w-md flex-col items-center gap-4 scroll-mt-24 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex w-full min-h-[52px] items-center justify-center rounded-full px-8 text-sm font-semibold shadow-xl transition hover:opacity-90 sm:w-auto"
              style={{
                background: "var(--primary)",
                color: "#fff",
                boxShadow: "0 8px 28px color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex w-full min-h-[52px] items-center justify-center rounded-full border px-8 text-sm font-semibold backdrop-blur-md transition hover:opacity-90 sm:w-auto"
              style={{
                borderColor: "var(--stroke-strong)",
                background: "var(--surface-1)",
                color: "var(--fg)",
              }}
            >
              Create account
            </Link>
          </div>
          <p className="mt-6 text-center text-sm" style={{ color: "var(--subtle)" }}>
            <a href="#pricing" style={{ color: "var(--primary)" }} className="hover:opacity-80 transition">
              View pricing
            </a>
            <span style={{ color: "var(--stroke-strong)" }}> · </span>
            <a href="#features" style={{ color: "var(--primary)" }} className="hover:opacity-80 transition">
              Explore features
            </a>
          </p>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-20 border-t py-16 sm:py-24"
        style={{ borderColor: "var(--stroke)", background: "var(--bg)" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--fg)" }}>
              Built for when the schedule stops cooperating.
            </h2>
            <p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: "var(--muted)" }}>
              Everything you need to detect disruption, evaluate options, and move the trip forward—without tab overload.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {/* Feature left — tall card */}
            <article
              className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm lg:row-span-2"
              style={{
                borderColor: "var(--stroke)",
                background: "var(--surface-1)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              <div className="shrink-0 p-6 sm:p-8">
                <h3 className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: "var(--fg)" }}>
                  AI-assisted recovery, grounded in your itinerary.
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Ranked rebook paths, confirmation flow, and compensation context—presented as a guided control room,
                  not a wall of widgets.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-6 inline-flex w-fit items-center gap-1 text-sm font-semibold transition hover:opacity-80"
                  style={{ color: "var(--primary)" }}
                >
                  Go to dashboard
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div
                className="flex min-h-0 flex-col overflow-hidden border-t lg:flex-1 lg:min-h-0"
                style={{ borderColor: "var(--stroke)", background: "color-mix(in srgb, var(--bg) 70%, transparent)" }}
              >
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b sm:aspect-[16/9]" style={{ borderColor: "var(--stroke)" }}>
                  <Image
                    src="/983433.png"
                    alt="ReRoute dashboard and recovery flow"
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-20"
                    style={{ background: "linear-gradient(to top, var(--bg), transparent)" }}
                    aria-hidden
                  />
                </div>
                <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden sm:aspect-[3/2] lg:aspect-auto lg:min-h-[200px] lg:flex-1">
                  <Image
                    src="/133822.jpg"
                    alt="Travel and itinerary context"
                    fill
                    className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-20"
                    style={{ background: "linear-gradient(to top, var(--bg), transparent)" }}
                    aria-hidden
              />
            </div>
              </div>
            </article>

            {/* Feature top-right */}
            <article
              className="flex flex-col overflow-hidden rounded-2xl border shadow-sm"
              style={{ borderColor: "var(--stroke)", background: "var(--surface-1)", boxShadow: "var(--shadow-1)" }}
            >
              <div className="p-6 sm:p-7">
                <h3 className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: "var(--fg)" }}>{featureTopRight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{featureTopRight.body}</p>
                <Link
                  href={featureTopRight.href}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80"
                  style={{ color: "var(--primary)" }}
                >
                  {featureTopRight.cta}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="relative aspect-[2/1] w-full border-t" style={{ borderColor: "var(--stroke)" }}>
                <Image
                  src={featureTopRight.image}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            </article>

            {/* Feature bottom-right */}
            <article
              className="relative flex flex-col overflow-hidden rounded-2xl border p-6 sm:p-7"
              style={{
                borderColor: "var(--stroke)",
                background: "var(--surface-1)",
              }}
            >
              <h3 className="relative text-lg font-semibold tracking-tight sm:text-xl" style={{ color: "var(--fg)" }}>{featureBottomRight.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{featureBottomRight.body}</p>
              <Link
                href={featureBottomRight.href}
                className="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80"
                style={{ color: "var(--primary)" }}
              >
                {featureBottomRight.cta}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
              <div className="relative mt-6 aspect-[2/1] w-full overflow-hidden rounded-xl border" style={{ borderColor: "var(--stroke)" }}>
                <Image
                  src={featureBottomRight.image}
                  alt=""
                  fill
                  className="object-cover object-center opacity-90"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </article>

            {/* Full-width feature */}
            <article
              className="group relative col-span-full mt-1 grid overflow-hidden rounded-2xl border shadow-sm md:min-h-[280px] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:mt-0"
              style={{ borderColor: "var(--stroke)", background: "var(--surface-1)", boxShadow: "var(--shadow-1)" }}
            >
              <div className="relative order-2 aspect-[5/3] w-full border-t sm:aspect-[16/10] md:order-2 md:h-full md:min-h-[280px] md:border-l md:border-t-0 md:aspect-auto" style={{ borderColor: "var(--stroke)" }}>
                <Image
                  src="/herobg-3.webp"
                  alt=""
                  fill
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to right, color-mix(in srgb, var(--bg) 65%, transparent) 0%, color-mix(in srgb, var(--bg) 15%, transparent) 40%, transparent 100%)",
                  }}
                  aria-hidden
                />
              </div>
              <div className="order-1 flex shrink-0 flex-col justify-center p-6 sm:p-8 md:order-1 md:justify-start md:pr-6">
                <h3 className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: "var(--fg)" }}>
                  Your trips, one calm workspace.
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Capture itinerary context once—legs, passengers, and signals stay aligned so monitoring and recovery
                  stay sharp when the schedule slips.
                </p>
                <Link
                  href="/trips"
                  className="mt-6 inline-flex w-fit items-center gap-1 text-sm font-semibold transition hover:opacity-80"
                  style={{ color: "var(--primary)" }}
                >
                  Open trips
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          </div>

          <div className="mt-6 border-t pt-6 sm:mt-8 sm:pt-7" style={{ borderColor: "var(--stroke)" }}>
            <Link
              href="/trips"
              className="inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80"
              style={{ color: "var(--primary)" }}
            >
              See all capabilities
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: "var(--stroke)", background: "var(--bg)" }}>
        <div
          className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs sm:flex-row sm:text-left sm:px-6"
          style={{ color: "var(--subtle)" }}
        >
          <p>© {new Date().getFullYear()} ReRoute.AI · Autonomous travel disruption assistant</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-end">
            <a href="#pricing" className="hover:opacity-100 transition" style={{ opacity: 0.7 }}>
              Pricing
            </a>
            <Link href="/signup" className="hover:opacity-100 transition" style={{ opacity: 0.7 }}>
              Sign up
            </Link>
            <Link href="/contact" className="hover:opacity-100 transition" style={{ opacity: 0.7 }}>
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
