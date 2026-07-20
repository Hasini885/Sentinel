/**
 * Single source of truth for app navigation and per-route page headings, so the
 * sidebar and top bar can never disagree about where you are.
 *
 * App routes only — the marketing header keeps its own short link list, since
 * the two navigations answer different questions ("where in the product am I"
 * vs "what is this product").
 */
export type NavItem = {
  href: string;
  label: string;
  /** Shown as the page heading in the top bar. */
  title: string;
  subtitle: string;
  /** Single glyph used as the icon — keeps the sidebar dependency-free. */
  glyph: string;
};

export const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    title: "Dashboard",
    subtitle: "Summary stats and highlights across every area",
    glyph: "◈",
  },
  {
    href: "/actions",
    label: "Actions",
    title: "Live Actions",
    subtitle: "Every intercepted tool call, scored and policy-checked",
    glyph: "≡",
  },
  {
    href: "/analytics",
    label: "Analytics",
    title: "Analytics",
    subtitle: "Cost and ROI per feature, with downgrade suggestions",
    glyph: "◑",
  },
  {
    href: "/approvals",
    label: "Approvals",
    title: "Approvals",
    subtitle: "Actions held for a human decision",
    glyph: "⌸",
  },
  {
    href: "/settings",
    label: "Settings",
    title: "Settings",
    subtitle: "Policy rules and per-feature model routing",
    glyph: "⚙",
  },
  {
    href: "/design",
    label: "Design system",
    title: "Design System",
    subtitle: "Motion tokens and UI primitives",
    glyph: "◐",
  },
];

/** Longest matching prefix wins, so nested routes keep their parent's heading. */
export function navItemFor(pathname: string): NavItem {
  const matches = NAV.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return (
    matches.sort((a, b) => b.href.length - a.href.length)[0] ?? NAV[0]
  );
}
