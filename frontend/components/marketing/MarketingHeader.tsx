"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

// Kept in step with the sections the landing page actually renders — a nav
// link to an anchor that does not exist just scrolls nowhere.
const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
];

/**
 * Public site header.
 *
 * Deliberately lighter than the app's top bar: translucent, no data, no status.
 * The visual language is shared but the structure is not — a marketing header
 * orients a stranger, an app top bar orients an operator.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const { reduced } = useMotionPreference();
  const onAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <motion.header
      initial={reduced ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={spring.soft}
      className="sticky top-0 z-40 border-b border-edge/60 bg-deep/70 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-[100rem] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center" aria-hidden>
            {!reduced && (
              <motion.span
                className="absolute -inset-1 rounded-xl opacity-60 blur-[6px]"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgb(58 231 255 / 0), rgb(58 231 255 / 0.55), rgb(58 231 255 / 0))",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-gradient-to-br from-accent/20 to-transparent font-display text-sm font-bold text-accent">
              ◈
            </span>
          </span>
          <span className="font-display text-base font-bold tracking-[0.18em] text-ink">
            SENTINEL
          </span>
        </Link>

        {!onAuthPage && (
          <nav aria-label="Marketing" className="hidden items-center gap-7 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm text-muted transition-colors duration-fast hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 font-sans text-sm text-muted transition-colors duration-fast hover:text-ink"
          >
            Log in
          </Link>
          <motion.span whileHover={reduced ? undefined : { y: -1 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/signup"
              className="block rounded-md border border-accent/50 bg-accent/15 px-3.5 py-1.5 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25 hover:shadow-glow"
            >
              Get started
            </Link>
          </motion.span>
        </div>
      </div>
    </motion.header>
  );
}
