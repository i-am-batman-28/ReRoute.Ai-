import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plane } from "lucide-react";

import { PricingSection } from "@/components/marketing/pricing-section";
import { cn } from "@/lib/cn";

const featureTopRight = {
  title: "Monitor every itinerary",
  body: "See pending proposals and trip health across what you’re watching—without drowning in noise.",
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative flex min-h-[min(100dvh,920px)] flex-col overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/herobg-2.webp"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/65 to-zinc-950"
            aria-hidden
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" aria-hidden />
        </div>

        <header className="relative z-20 border-b border-white/5 bg-zinc-950/40 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25">
                <Plane className="h-4 w-4" aria-hidden />
              </span>
              <span>
                ReRoute<span className="text-emerald-400">.AI</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
              <a href="#features" className="transition hover:text-white">
                Features
              </a>
              <a href="#pricing" className="transition hover:text-white">
                Pricing
              </a>
              <Link href="/login" className="transition hover:text-white">
                Sign in
              </Link>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 backdrop-blur-sm transition hover:bg-white/10 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                Join free
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">
            Travel disruption intelligence
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-center text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
            ReRoute is central to{" "}
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              recovering your trip.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-zinc-400 sm:text-lg">
            When schedules break, you get ranked options, downstream impact, and a calm path to confirm—built for
            operators and travelers who can’t afford chaos.
          </p>

          <div id="sign-in" className="mt-10 flex w-full max-w-md flex-col items-center gap-4 scroll-mt-24 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex w-full min-h-[52px] items-center justify-center rounded-full bg-emerald-500 px-8 text-sm font-semibold text-zinc-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-400 sm:w-auto"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex w-full min-h-[52px] items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-8 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/25 hover:bg-zinc-900/60 sm:w-auto"
            >
              Create account
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            <a href="#pricing" className="text-emerald-400/90 hover:text-emerald-300">
              View pricing
            </a>
            <span className="text-zinc-600"> · </span>
            <a href="#features" className="text-emerald-400/90 hover:text-emerald-300">
              Explore features
            </a>
          </p>
        </div>
      </section>

      {/* Features — FlightAware-style asymmetric grid */}
      <section id="features" className="scroll-mt-20 border-t border-zinc-800/80 bg-zinc-950 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Built for when the schedule stops cooperating.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Everything you need to detect disruption, evaluate options, and move the trip forward—without tab overload.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <article className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/50 shadow-sm shadow-black/30 lg:row-span-2">
              <div className="shrink-0 p-6 sm:p-8">
                <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  AI-assisted recovery, grounded in your itinerary.
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                  Ranked rebook paths, confirmation flow, and compensation context—presented as a guided control room,
                  not a wall of widgets.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-6 inline-flex w-fit items-center gap-1 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
                >
                  Go to dashboard
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="flex min-h-0 flex-col overflow-hidden border-t border-zinc-800/80 bg-zinc-950 lg:flex-1 lg:min-h-0">
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-zinc-800/70 sm:aspect-[16/9]">
                  <Image
                    src="/983433.png"
                    alt="ReRoute dashboard and recovery flow"
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950 to-transparent"
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
                    className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950 to-transparent"
                    aria-hidden
                  />
                </div>
              </div>
            </article>

            <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/40 shadow-sm shadow-black/25">
              <div className="p-6 sm:p-7">
                <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{featureTopRight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{featureTopRight.body}</p>
                <Link
                  href={featureTopRight.href}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  {featureTopRight.cta}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="relative aspect-[2/1] w-full border-t border-zinc-800/80">
                <Image
                  src={featureTopRight.image}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </article>

            <article
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border border-emerald-500/25 p-6 shadow-lg shadow-emerald-950/40 sm:p-7",
                "bg-gradient-to-br from-emerald-600/90 via-emerald-700/85 to-zinc-950",
              )}
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl"
                aria-hidden
              />
              <h3 className="relative text-lg font-semibold tracking-tight text-white sm:text-xl">{featureBottomRight.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-emerald-50/90">{featureBottomRight.body}</p>
              <Link
                href={featureBottomRight.href}
                className="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline"
              >
                {featureBottomRight.cta}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
              <div className="relative mt-6 aspect-[2/1] w-full overflow-hidden rounded-xl border border-white/15">
                <Image
                  src={featureBottomRight.image}
                  alt=""
                  fill
                  className="object-cover object-center opacity-90"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent" aria-hidden />
              </div>
            </article>

            <article className="group relative col-span-full mt-1 grid overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/50 shadow-sm shadow-black/30 md:min-h-[280px] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:mt-0">
              <div className="relative order-2 aspect-[5/3] w-full border-t border-zinc-800/80 sm:aspect-[16/10] md:order-2 md:h-full md:min-h-[280px] md:border-l md:border-t-0 md:aspect-auto">
                <Image
                  src="/herobg-3.webp"
                  alt=""
                  fill
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-zinc-950/65 via-zinc-950/15 to-transparent md:from-zinc-950/50 md:via-transparent"
                  aria-hidden
                />
              </div>
              <div className="order-1 flex shrink-0 flex-col justify-center p-6 sm:p-8 md:order-1 md:justify-start md:pr-6">
                <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Your trips, one calm workspace.
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
                  Capture itinerary context once—legs, passengers, and signals stay aligned so monitoring and recovery
                  stay sharp when the schedule slips.
                </p>
                <Link
                  href="/trips"
                  className="mt-6 inline-flex w-fit items-center gap-1 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
                >
                  Open trips
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          </div>

          <div className="mt-6 border-t border-zinc-800/80 pt-6 sm:mt-8 sm:pt-7">
            <Link
              href="/trips"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              See all capabilities
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <PricingSection />

      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-zinc-500 sm:flex-row sm:text-left sm:px-6">
          <p>© {new Date().getFullYear()} ReRoute.AI · Autonomous travel disruption assistant</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-end">
            <a href="#pricing" className="hover:text-zinc-300">
              Pricing
            </a>
            <Link href="/signup" className="hover:text-zinc-300">
              Sign up
            </Link>
            <Link href="/login" className="hover:text-zinc-300">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
