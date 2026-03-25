import type { ReactNode } from "react";
import { Instrument_Sans, Instrument_Serif, Playfair_Display } from "next/font/google";

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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${playfair.variable} ${instrumentSans.variable} ${instrumentSerif.variable} min-h-full`}>
      {children}
    </div>
  );
}
