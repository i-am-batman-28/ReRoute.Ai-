"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Plane, MapPin } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const data = {
      user_name: formData.get("user_name"),
      user_email: formData.get("user_email"),
      message: formData.get("message"),
    };

    try {
      // Replace these with your actual EmailJS Service ID, Template ID, and Public Key
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID",
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID",
        data,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY"
      );
      setSuccessMsg("Message sent successfully! We will get back to you soon.");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error("EmailJS Error:", err);
      setErrorMsg("Failed to send the message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
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
            <Link href="/#features" className="transition hover:opacity-100" style={{ opacity: 0.75 }}>
              Features
            </Link>
            <Link href="/#pricing" className="transition hover:opacity-100" style={{ opacity: 0.75 }}>
              Pricing
            </Link>
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

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8">
          
          {/* Form Side */}
          <div className="flex flex-col justify-center rounded-2xl border p-6 sm:p-10 shadow-sm" style={{ borderColor: "var(--stroke)", background: "var(--surface-1)" }}>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--primary)" }}>Contact Us</h1>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Feel free to reach out for any inquiries or feedback. We are here to help!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <input
                  type="text"
                  name="user_name"
                  placeholder="Your Name"
                  required
                  className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--stroke)",
                    color: "var(--fg)",
                    boxShadow: "inset 0 2px 4px color-mix(in srgb, var(--shadow-strong) 10%, transparent)",
                  }}
                />
              </div>
              
              <div>
                <input
                  type="email"
                  name="user_email"
                  placeholder="Your Email"
                  required
                  className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--stroke)",
                    color: "var(--fg)",
                    boxShadow: "inset 0 2px 4px color-mix(in srgb, var(--shadow-strong) 10%, transparent)",
                  }}
                />
              </div>

              <div>
                <textarea
                  name="message"
                  placeholder="Your Message"
                  required
                  rows={5}
                  className="w-full resize-y rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--stroke)",
                    color: "var(--fg)",
                    boxShadow: "inset 0 2px 4px color-mix(in srgb, var(--shadow-strong) 10%, transparent)",
                  }}
                />
              </div>

              {successMsg && <p className="text-sm font-medium text-green-600 dark:text-green-400">{successMsg}</p>}
              {errorMsg && <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMsg}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-lg px-8 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>

          </div>

          {/* Map Side */}
          <div className="relative min-h-[400px] w-full overflow-hidden rounded-2xl border shadow-sm lg:h-full" style={{ borderColor: "var(--stroke)", background: "var(--surface-2)" }}>
            <iframe
              src="https://maps.google.com/maps?q=Sri+City,+Andhra+Pradesh,+India&t=&z=10&ie=UTF8&iwloc=&output=embed"
              style={{ border: 0, width: "100%", height: "100%" }}
              allowFullScreen={false}
              loading="lazy"
              title="Google Maps Location"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          
        </div>
      </div>
    </div>
  );
}
