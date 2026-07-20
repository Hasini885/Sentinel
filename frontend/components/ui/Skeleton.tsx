/**
 * Loading placeholders.
 *
 * The shimmer is a CSS animation rather than a Framer Motion one: it is a
 * looping decorative sweep on potentially dozens of elements at once, and
 * a background-position keyframe stays on the compositor for free. Reserve
 * Framer Motion for animation that responds to state.
 *
 * `.shimmer` and its reduced-motion fallback (a flat fill) live in globals.css.
 */

export type SkeletonProps = {
  /** Tailwind width class or arbitrary value, e.g. "w-24" or "w-[70%]". */
  width?: string;
  /** Tailwind height class. @default "h-3" */
  height?: string;
  className?: string;
};

/** A single shimmering bar. Compose these for bespoke placeholder shapes. */
export function Skeleton({ width = "w-full", height = "h-3", className = "" }: SkeletonProps) {
  return <div className={`shimmer rounded ${width} ${height} ${className}`} aria-hidden />;
}

/** Placeholder for the action feed and other row-based lists. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-hidden aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton width="w-16" />
          <Skeleton width="flex-1" />
          <Skeleton width="w-12" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for horizontal bar charts — mirrors the ROI panel's shape. */
export function SkeletonChart() {
  return (
    <div className="space-y-3 p-4" aria-hidden aria-busy="true">
      {[80, 55, 35, 20].map((width, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton width="w-24" />
          <div className="shimmer h-5 rounded" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Placeholder for a KPI tile.
 *
 * The shape deliberately mirrors StatTile's real layout — label, value,
 * sparkline band, hint — because a skeleton that is shorter than what replaces
 * it causes the whole dashboard to jump when data lands. Keep these in sync:
 * if StatTile gains or loses a row, this must follow.
 */
export function SkeletonStat() {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden aria-busy="true">
      <Skeleton width="w-20" height="h-2.5" />
      <Skeleton width="w-28" height="h-7" />
      <Skeleton width="w-24" height="h-6" />
      <Skeleton width="w-16" height="h-2.5" />
    </div>
  );
}
