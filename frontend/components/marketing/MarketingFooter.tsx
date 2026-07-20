import Link from "next/link";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how", label: "How it works" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    heading: "App",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/actions", label: "Live actions" },
      { href: "/analytics", label: "Analytics" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Get started" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-edge/60 bg-panel/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/40 bg-gradient-to-br from-accent/20 to-transparent font-display text-xs font-bold text-accent"
                aria-hidden
              >
                ◈
              </span>
              <span className="font-display text-sm font-bold tracking-[0.18em] text-ink">
                SENTINEL
              </span>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-muted">
              Governance and ROI for AI agents. Every action intercepted, risk-scored,
              and policy-checked before it runs.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-micro uppercase text-muted/70">{column.heading}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-sans text-sm text-muted transition-colors duration-fast hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-edge/60 pt-6 font-sans text-xs text-muted/60">
          Sentinel — a governance layer for autonomous agents.
        </p>
      </div>
    </footer>
  );
}
