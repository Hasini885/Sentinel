/**
 * Inline line icons for the feature grid.
 *
 * Hand-written SVG rather than an icon package: six icons do not justify a
 * dependency, and inlining keeps them themeable with `currentColor` and out of
 * the bundle graph entirely.
 *
 * All share one grid — 24x24, 1.5 stroke, round caps — so they read as a set.
 */

type IconProps = { className?: string };

function Svg({ children, className = "" }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Interception — a shield catching something in flight. */
export function IconIntercept(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

/** Multi-factor scoring — three weighted bars. */
export function IconScore(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h11" />
      <path d="M4 12h7" />
      <path d="M4 17h14" />
      <circle cx="18" cy="7" r="1.6" />
      <circle cx="14" cy="12" r="1.6" />
      <circle cx="21" cy="17" r="1.6" />
    </Svg>
  );
}

/** Policy enforcement — a gate with a rule. */
export function IconPolicy(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <path d="M15.5 15.5l1.5 1.5 3-3" />
    </Svg>
  );
}

/** ROI tracking — value trending up. */
export function IconRoi(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7.5 15.5l3.5-4 3 2.5 4.5-6" />
      <path d="M18.5 8V5.5h-2.5" />
    </Svg>
  );
}

/** Auto-downgrade — routing down a tier. */
export function IconDowngrade(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4v9a3 3 0 003 3h9" />
      <path d="M15 13l3 3-3 3" />
      <circle cx="6" cy="4" r="1.4" />
    </Svg>
  );
}

/** Audit trail — an append-only ledger. */
export function IconAudit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14.5 3v4.5H19" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h4.5" />
    </Svg>
  );
}
