import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Live Actions" };

export default function ActionsPage() {
  return (
    <PagePlaceholder
      title="Live Actions"
      arriving="Arriving in Phase M3"
      body="The full-height action feed: every intercepted tool call streaming in over the WebSocket, with status and risk filters, expandable multi-factor risk breakdowns, and a link into each action's audit trail."
      reuses={["ActionFeed", "ActionRow", "FactorBars", "FeedFilters", "AuditDrawer"]}
    />
  );
}
