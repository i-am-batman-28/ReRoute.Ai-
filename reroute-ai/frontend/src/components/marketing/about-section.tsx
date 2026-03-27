"use client";

import Image from "next/image";

export function AboutSection() {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-t py-16 sm:py-24"
      style={{ borderColor: "var(--stroke)", background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-14 max-w-2xl text-center mx-auto sm:mb-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--fg)" }}>
            About Us
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            We're building the future of autonomous disruption recovery.
          </p>
        </div>

        {/* Mission Block */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1 lg:pr-8">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--fg)" }}>
              Our Mission
            </h3>
            <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--muted)" }}>
              The travel industry is built on schedules, but schedules inevitably break. ReRoute.AI was founded on the belief that operators and travelers shouldn't have to scramble when flights are delayed or canceled. Our mission is to completely eliminate travel disruption chaos by providing instant, AI-ranked recovery paths, bridging the gap between operations centers and passengers in real-time.
            </p>
          </div>
          <div className="relative order-1 flex justify-center lg:order-2">
            <div 
              className="relative aspect-[4/3] w-full max-w-md overflow-hidden shadow-2xl transition duration-500 hover:scale-[1.02]"
              style={{ 
                background: "var(--surface-1)",
                borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%", // Organic blob shape
                boxShadow: "0 25px 50px -12px color-mix(in srgb, var(--shadow-strong) 40%, transparent)"
              }}
            >
              <Image
                src="/4k-plane-in-airport-uhj5vnu4c0t0j89v.jpg"
                alt="Our Mission"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>

        {/* Story Block */}
        <div className="mt-24 grid items-center gap-12 lg:mt-32 lg:grid-cols-2 lg:gap-16">
          <div className="relative flex justify-center lg:pl-4">
            <div 
              className="relative aspect-video w-full overflow-hidden shadow-2xl transition duration-500 hover:scale-[1.02]"
              style={{ 
                background: "var(--surface-2)",
                borderRadius: "2rem",
                boxShadow: "0 25px 50px -12px color-mix(in srgb, var(--shadow-strong) 40%, transparent)"
              }}
            >
              <Image
                src="/wp10448249.jpg"
                alt="Our Story"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
          <div className="lg:pl-8">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--fg)" }}>
              Our Story
            </h3>
            <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--muted)" }}>
              As frequent travelers and former travel operations leads, we lived through countless meltdowns firsthand. The tools available were reactive, manual, and disconnected from the real downstream impact. We built ReRoute.AI to be the calm in the storm—a centralized, intelligent workspace that evaluates every option and guides everyone to a confirmed plan before the chaos even starts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
