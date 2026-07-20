"use client";

import { motion } from "framer-motion";

import { Panel } from "@/components/ui/Panel";
import { rise, stagger } from "@/components/ui/motion";

export type PagePlaceholderProps = {
  title: string;
  /** What this route will do once it is built. */
  body: string;
  /** The phase that fills it in — keeps the roadmap visible while clicking. */
  arriving: string;
  /** Components already built that this route will assemble. */
  reuses?: string[];
};

/**
 * Scaffold for a route that exists but has no content yet.
 *
 * It states what the page will become and which existing components it will
 * assemble, so clicking through the skeleton communicates the plan rather than
 * just proving the router works.
 */
export function PagePlaceholder({
  title,
  body,
  arriving,
  reuses = [],
}: PagePlaceholderProps) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-4 p-6"
    >
      <Panel title={title} subtitle={arriving}>
        <p className="font-sans text-sm leading-relaxed text-muted">{body}</p>

        {reuses.length > 0 && (
          <div className="mt-4 border-t border-edge pt-4">
            <h3 className="text-micro uppercase text-muted/70">Will assemble</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {reuses.map((name) => (
                <motion.li
                  key={name}
                  variants={rise}
                  className="rounded border border-edge bg-deep/60 px-2 py-1 text-meta text-muted"
                >
                  {name}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
