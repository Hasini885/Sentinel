export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-edge" />
          <div className="h-3 flex-1 animate-pulse rounded bg-edge" />
          <div className="h-3 w-12 animate-pulse rounded bg-edge" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="space-y-3 p-4" aria-hidden>
      {[80, 55, 35, 20].map((width, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-24 animate-pulse rounded bg-edge" />
          <div
            className="h-5 animate-pulse rounded bg-edge"
            style={{ width: `${width}%` }}
          />
        </div>
      ))}
    </div>
  );
}
