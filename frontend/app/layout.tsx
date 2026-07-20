import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { MotionProvider } from "@/components/ui/MotionProvider";
import { ToastProvider } from "@/components/ui/Toast";

// Three faces, one job each:
//   Space Grotesk — headings and display. Geometric and technical without novelty.
//   Inter         — marketing prose. JetBrains Mono is unreadable in paragraphs.
//   JetBrains Mono— anything numeric: IDs, timestamps, costs, payloads.
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Sentinel — AI agent governance & ROI",
    template: "%s · Sentinel",
  },
  description:
    "Intercept, risk-score, and govern every action your AI agents take — with the cost and ROI attached.",
};

/**
 * Root layout holds only what is genuinely global: fonts and the two providers.
 *
 * Neither layout chrome lives here. The marketing and app route groups each own
 * their own shell, because a marketing header and an authenticated sidebar are
 * different structures, not variants of one.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}
      >
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
