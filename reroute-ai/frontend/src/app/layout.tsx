import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReRoute.AI",
  description: "Autonomous travel disruption assistant",
};

/**
 * Inline script injected before first paint to prevent FOUC.
 * Reads the saved theme preference from localStorage and adds the
 * correct class (.dark / .light) to <html> before React hydrates.
 */
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('reroute_theme');
    if (t === 'light') {
      document.documentElement.classList.add('light');
    } else {
      // Default dark — also matches system dark preference
      var prefersDark = !t && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (t === 'dark' || prefersDark) {
        document.documentElement.classList.add('dark');
      } else if (t === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Anti-FOUC script — runs synchronously before any paint */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ background: "var(--bg)", color: "var(--fg)", transition: "background 0.25s ease, color 0.25s ease" }}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
