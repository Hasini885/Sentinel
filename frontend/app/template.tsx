"use client";

import { SectionTransition } from "@/components/ui/SectionTransition";

/**
 * Next.js remounts a template on every navigation (unlike a layout, which
 * persists). That remount is what makes the route-enter animation fire — see
 * the note in SectionTransition about why enter-only is the right call in the
 * App Router.
 *
 * `staggerChildren` is off here because each page decides its own cascade;
 * turning it on at this level would fight page-level stagger containers.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <SectionTransition staggerChildren={false} className="h-full">
      {children}
    </SectionTransition>
  );
}
