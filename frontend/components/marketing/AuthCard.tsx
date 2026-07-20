"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { rise, spring, stagger } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export type AuthCardProps = {
  title: string;
  subtitle: string;
  /** Text on the submit button. */
  submitLabel: string;
  footer: React.ReactNode;
  /** Extra fields above email/password, e.g. a name field on signup. */
  children?: React.ReactNode;
};

function Field({
  label,
  type,
  name,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  name: string;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <motion.label variants={rise} className="flex flex-col gap-1.5">
      <span className="font-sans text-sm text-muted">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled
        className="rounded-md border border-edge bg-deep/70 px-3 py-2 font-sans text-sm text-ink outline-none transition-colors duration-fast placeholder:text-muted/50 focus:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </motion.label>
  );
}

/**
 * Shared shell for /login and /signup.
 *
 * The form is inert in M1 — inputs are disabled and there is no submit handler,
 * with a banner saying so. A form that looks functional but silently does
 * nothing is worse than one that admits it is a placeholder, particularly for
 * a credential form where a user might type a real password into it.
 */
export function AuthCard({
  title,
  subtitle,
  submitLabel,
  footer,
  children,
}: AuthCardProps) {
  const { reduced } = useMotionPreference();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="rounded-xl border border-edge bg-panel/80 p-7 shadow-panel"
      >
        <motion.h1 variants={rise} className="font-display text-xl font-bold text-ink">
          {title}
        </motion.h1>
        <motion.p variants={rise} className="mt-1.5 font-sans text-sm text-muted">
          {subtitle}
        </motion.p>

        <motion.p
          variants={rise}
          className="mt-5 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 font-sans text-xs leading-relaxed text-accent"
        >
          Placeholder — this form is not wired up yet. Sign-in lands in the auth phase,
          using a server-side session cookie.
        </motion.p>

        <form className="mt-5 flex flex-col gap-4" aria-disabled>
          {children}
          <Field
            label="Email"
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <motion.button
            variants={rise}
            type="button"
            disabled
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={spring.snappy}
            className="mt-1 rounded-md border border-accent/50 bg-accent/15 px-4 py-2.5 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </motion.button>
        </form>

        <motion.p variants={rise} className="mt-5 font-sans text-sm text-muted">
          {footer}
        </motion.p>

        <motion.p variants={rise} className="mt-3 font-sans text-xs text-muted/70">
          Meanwhile the app is open —{" "}
          <Link href="/dashboard" className="text-accent hover:underline">
            go straight to the dashboard
          </Link>
          .
        </motion.p>
      </motion.div>
    </div>
  );
}
