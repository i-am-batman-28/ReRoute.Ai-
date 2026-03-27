"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";

export function ContactSection() {
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
    <section
      id="contact"
      className="scroll-mt-20 border-t py-16 sm:py-24"
      style={{ borderColor: "var(--stroke)", background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-14 max-w-2xl text-center mx-auto sm:mb-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--fg)" }}>
            Contact Us
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Feel free to reach out for any inquiries, enterprise demo, or feedback. We are here to help!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8">
          
          {/* Form Side */}
          <div className="flex flex-col justify-center rounded-2xl border p-6 sm:p-10 shadow-sm" style={{ borderColor: "var(--stroke)", background: "var(--surface-1)" }}>
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
    </section>
  );
}
