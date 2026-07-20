"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { signOutAction } from "@/app/actions/session";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/** First letters of the name, or the email's first character as a fallback. */
function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim();
  if (source) {
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function UserMenu({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { reduced } = useMotionPreference();
  const wrapper = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a menu that can only be dismissed by
  // clicking the trigger again is a trap for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        transition={spring.snappy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-edge bg-raised/60 py-1 pl-1 pr-2.5 transition-colors duration-fast hover:border-accent/50"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded border border-accent/40 bg-accent/15 font-display text-micro font-bold text-accent"
          aria-hidden
        >
          {initials(name, email)}
        </span>
        <span className="hidden max-w-[10rem] truncate font-sans text-meta text-muted sm:inline">
          {name || email || "Account"}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : spring.snappy}
          className="text-micro text-muted"
          aria-hidden
        >
          ▾
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={reduced ? { duration: 0 } : spring.snappy}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-edge bg-raised/95 shadow-raised backdrop-blur-sm"
          >
            <div className="border-b border-edge px-3.5 py-3">
              <p className="truncate font-sans text-sm font-medium text-ink">
                {name || "Signed in"}
              </p>
              {email && (
                <p className="mt-0.5 truncate font-mono text-micro text-muted">{email}</p>
              )}
            </div>

            {/* A server action, so signing out clears the httpOnly cookie on the
                server. A client-side "clear the token" would be theatre — the
                session cookie is not reachable from JavaScript by design. */}
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="w-full px-3.5 py-2.5 text-left font-sans text-sm text-muted transition-colors duration-fast hover:bg-risk-high/10 hover:text-risk-high"
              >
                Sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
