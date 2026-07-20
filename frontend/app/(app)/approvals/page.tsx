import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <PagePlaceholder
      title="Approvals"
      arriving="Arriving in Phase M5"
      body="The decision queue. Actions that breached a policy at or above its threshold wait here for a human to approve or reject, with the payload and risk reasoning shown in full before you decide."
      reuses={["PendingApprovals", "RiskBadge", "Toast"]}
    />
  );
}
