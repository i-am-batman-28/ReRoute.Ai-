import type { ReactNode } from "react";
import { Instrument_Sans, Instrument_Serif, Playfair_Display } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { RerouteSessionProvider } from "@/components/reroute-session-provider";
import { ChatWidget } from "@/components/chat/chat-widget";
import { NotificationBanner } from "@/components/notification-banner";

const playfair = Playfair_Display({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--tg-playfair",
});

const instrumentSans = Instrument_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--tg-instrument-sans",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--tg-instrument-serif",
});

export default function AppSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${instrumentSans.variable} ${instrumentSerif.variable} flex min-h-full flex-1 flex-col bg-zinc-950`}
      style={{ fontFamily: "var(--font-family-bauhuas-std-medium)", WebkitFontKerning: "auto" }}
    >
      <RerouteSessionProvider>
        <AppShell>{children}</AppShell>
        <NotificationBanner />
        <ChatWidget />
      </RerouteSessionProvider>
    </div>
  );
}
