import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      arriving="Arriving in Phase M5"
      body="The structured policy editor — one rule per action type, with a risk threshold and a block-or-approve outcome — alongside the per-feature auto-downgrade toggles that route expensive features to a cheaper model."
      reuses={["PolicyEditor", "AutoDowngradeToggle"]}
    />
  );
}
