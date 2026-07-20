/**
 * Shared column template for the feed header and its rows.
 *
 * The feed is a list, not a <table>: expanding a row inside a table means a
 * second <tr> with a colSpan, which breaks both the layout animation and the
 * height transition. A grid gives the same column alignment with none of that.
 *
 * Header and row must use the identical class string or the columns drift.
 */
export const GRID =
  "grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,8rem)_4.5rem_5.5rem_1rem] gap-3 text-data";
