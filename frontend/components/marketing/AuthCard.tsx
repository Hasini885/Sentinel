"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import type { FormState } from "@/app/actions/auth";
import { rise, spring, stagger } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export type AuthCardProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  pendingLabel: string;
  footer: React.ReactNode;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Signup collects a name; login does not. */
  withName?: boolean;
  /** Where to return after a successful login, carried through the form. */
  from?: string;
  /** Shown above the form — e.g. "you were signed out". */
  notice?: string;
};

function Field({
  label,
  type,
  name,
  placeholder,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  type: string;
  name: string;
  placeholder: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
}) {
  const { pending } = useFormStatus();
  const errorId = `${name}-error`;

  return (
    <motion.div variants={rise} className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-sans text-sm text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={pending}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-md border bg-deep/70 px-3 py-2 font-sans text-sm text-ink outline-none transition-colors duration-fast placeholder:text-muted/50 disabled:opacity-60 ${
          error
            ? "border-risk-high/60 focus:border-risk-high"
            : "border-edge focus:border-accent/60"
        }`}
      />
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden font-sans text-xs text-risk-high"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && (
        <p className="font-sans text-xs text-muted/60">{hint}</p>
      )}
    </motion.div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  const { reduced } = useMotionPreference();

  return (
    <motion.button
      variants={rise}
      type="submit"
      disabled={pending}
      whileHover={reduced || pending ? undefined : { y: -1 }}
      whileTap={pending ? undefined : { scale: 0.98 }}
      transition={spring.snappy}
      className="mt-1 flex items-center justify-center gap-2 rounded-md border border-accent/50 bg-accent/15 px-4 py-2.5 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && !reduced && (
        <motion.span
          className="h-3 w-3 rounded-full border border-current border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      )}
      {pending ? pendingLabel : label}
    </motion.button>
  );
}

export function AuthCard({
  title,
  subtitle,
  submitLabel,
  pendingLabel,
  footer,
  action,
  withName = false,
  from,
  notice,
}: AuthCardProps) {
  const [state, formAction] = useFormState(action, {});

  return (
    <div className="mx-auto flex min-h-[76vh] max-w-md flex-col justify-center px-6 py-16">
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

        {notice && (
          <motion.p
            variants={rise}
            className="mt-5 rounded-md border border-edge bg-raised/60 px-3 py-2 font-sans text-xs text-muted"
          >
            {notice}
          </motion.p>
        )}

        <form action={formAction} className="mt-5 flex flex-col gap-4">
          {from && <input type="hidden" name="from" value={from} />}

          {withName && (
            <Field
              label="Name"
              type="text"
              name="name"
              placeholder="Ada Lovelace"
              autoComplete="name"
              error={state.fieldErrors?.name}
            />
          )}
          <Field
            label="Email"
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={state.fieldErrors?.email}
          />
          <Field
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete={withName ? "new-password" : "current-password"}
            error={state.fieldErrors?.password}
            hint={withName ? "At least 8 characters." : undefined}
          />

          <AnimatePresence initial={false}>
            {state.error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-md border border-risk-high/40 bg-risk-high/10 px-3 py-2 font-sans text-xs text-risk-high"
              >
                {state.error}
              </motion.p>
            )}
          </AnimatePresence>

          <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        </form>

        <motion.p variants={rise} className="mt-5 font-sans text-sm text-muted">
          {footer}
        </motion.p>
      </motion.div>
    </div>
  );
}
