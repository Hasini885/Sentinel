import type { AgentAction } from "@/lib/api";

/**
 * Trend series derived from the loaded action window.
 *
 * There is no time-series endpoint, and this phase may not add one, so the
 * sparklines are computed from the actions already on the client. That makes
 * them real data rather than decoration — but it also means they describe the
 * loaded window (the most recent N actions), NOT all time. Every caller labels
 * them that way; do not present these as lifetime trends.
 */

export type Bucket = {
  /** Bucket start, epoch ms. */
  t: number;
  count: number;
  blocked: number;
  costUsd: number;
};

export const BUCKET_COUNT = 12;

/**
 * Splits actions into equal time buckets spanning oldest → newest in the window.
 * Returns an empty array when there is not enough spread to say anything.
 */
export function bucketActions(actions: AgentAction[], buckets = BUCKET_COUNT): Bucket[] {
  if (actions.length < 2) return [];

  const times = actions.map((a) => new Date(a.timestamp).getTime()).filter(Number.isFinite);
  if (times.length < 2) return [];

  const min = Math.min(...times);
  const max = Math.max(...times);
  // All actions landed in the same instant — a time axis would be meaningless.
  if (max === min) return [];

  const span = max - min;
  const width = span / buckets;

  const out: Bucket[] = Array.from({ length: buckets }, (_, i) => ({
    t: min + i * width,
    count: 0,
    blocked: 0,
    costUsd: 0,
  }));

  for (const action of actions) {
    const t = new Date(action.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    // The newest action sits exactly on `max`, which would index past the end.
    const index = Math.min(buckets - 1, Math.floor((t - min) / width));
    const bucket = out[index];
    bucket.count += 1;
    if (action.status === "blocked") bucket.blocked += 1;
    bucket.costUsd += action.estimated_cost_usd;
  }

  return out;
}

/** Blocked share per bucket, 0–100. Empty buckets report 0 rather than NaN. */
export function blockedPctSeries(buckets: Bucket[]): number[] {
  return buckets.map((b) => (b.count === 0 ? 0 : (b.blocked / b.count) * 100));
}

export function countSeries(buckets: Bucket[]): number[] {
  return buckets.map((b) => b.count);
}

export function costSeries(buckets: Bucket[]): number[] {
  return buckets.map((b) => b.costUsd);
}

/**
 * Change between the first and second half of the window, as a signed percent.
 * Returns null when the earlier half is empty — "up from nothing" is not a
 * percentage worth showing.
 */
export function halfOverHalfDelta(series: number[]): number | null {
  if (series.length < 4) return null;
  const mid = Math.floor(series.length / 2);
  const earlier = series.slice(0, mid).reduce((a, b) => a + b, 0);
  const later = series.slice(mid).reduce((a, b) => a + b, 0);
  if (earlier === 0) return null;
  return ((later - earlier) / earlier) * 100;
}
