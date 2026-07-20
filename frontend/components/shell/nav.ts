/**
 * Single source of truth for navigation and per-route page headings, so the
 * sidebar and top bar can never disagree about where you are.
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
    href: "/",
    label: "Overview",
    title: "Overview",
    subtitle: "Live action feed, approvals, and feature ROI",
    glyph: "◈",
  },
  {
    href: "/design",
    label: "Design system",
    title: "Design System",
    subtitle: "Motion tokens and UI primitives",
    glyph: "◑",
  },
];

export function navItemFor(pathname: string): NavItem {
  return (
    NAV.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ??
    NAV.find((item) => item.href === pathname) ??
    NAV[0]
  );
}
