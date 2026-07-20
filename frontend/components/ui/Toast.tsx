"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export type ToastTone = "info" | "success" | "warn" | "danger";

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
};

const TONE: Record<ToastTone, { border: string; dot: string; glyph: string }> = {
  info: { border: "border-accent/40", dot: "bg-accent", glyph: "◈" },
  success: { border: "border-risk-low/40", dot: "bg-risk-low", glyph: "✓" },
  warn: { border: "border-risk-medium/40", dot: "bg-risk-medium", glyph: "!" },
  danger: { border: "border-risk-high/40", dot: "bg-risk-high", glyph: "×" },
};

const DISMISS_MS = 4200;
const MAX_VISIBLE = 4;

type ToastApi = { push: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastApi>({ push: () => {} });

/** Fire a toast from anywhere under ToastProvider. */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  // Timers are cleared on dismissal so a fast burst cannot leak them.
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current++;
      // Cap the stack: a burst of actions should not bury the screen.
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_MS),
      );
    },
    [dismiss],
  );

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const { reduced } = useMotionPreference();

  return (
    <div
      // aria-live so a screen reader announces toasts without moving focus.
      // Toasts never carry the only copy of information — they narrate changes
      // that are also visible in the feed or the panel they came from.
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout={!reduced}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18 } }}
              transition={reduced ? { duration: 0 } : spring.drawer}
              onClick={() => onDismiss(toast.id)}
              role={toast.tone === "danger" ? "alert" : "status"}
              className={`pointer-events-auto cursor-pointer rounded-lg border ${tone.border} bg-raised/95 px-3.5 py-2.5 shadow-raised backdrop-blur-sm`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${tone.dot} text-[9px] font-bold text-deep`}
                  aria-hidden
                >
                  {tone.glyph}
                </span>
                <div className="min-w-0">
                  <p className="text-data font-medium text-ink">{toast.title}</p>
                  {toast.detail && (
                    <p className="mt-0.5 text-meta leading-snug text-muted">{toast.detail}</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
