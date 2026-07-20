"use client";

import { SectionTransition } from "@/components/ui/SectionTransition";

/**
 * Remounts on every marketing navigation, which is what makes the enter
 * animation fire. See SectionTransition for why this is enter-only in the App
 * Router.
 */
export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SectionTransition staggerChildren={false}>{children}</SectionTransition>;
}
