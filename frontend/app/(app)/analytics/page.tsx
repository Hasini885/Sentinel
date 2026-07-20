import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <PagePlaceholder
      title="Analytics"
      arriving="Arriving in Phase M4"
      body="Cost and ROI per feature, the risk distribution across all actions, and the backend's downgrade suggestions — with the animated bars, sparklines and proportional charts built in Phase F3."
      reuses={["FeatureRoiChart", "RiskDistribution", "Sparkline", "StatTile"]}
    />
  );
}
