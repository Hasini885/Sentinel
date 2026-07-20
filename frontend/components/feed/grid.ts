/**
 * Shared column template for the feed header and its rows.
 *
 * The feed is a list, not a <table>: expanding a row inside a table means a
 * second <tr> with a colSpan, which breaks both the layout animation and the
 * height transition. A grid gives the same column alignment with none of that.
 *
 * Responsive by necessity, not polish. The full seven columns need roughly
 * 480px before gaps; on a phone the console has ~330px, so the row was being
 * clipped rather than scrolled. Below `md` only time, action, risk and the
 * chevron are laid out — feature, tokens and cost move into the expanded
 * detail, where there is room for them.
 *
 * Header and rows must use the identical class string or the columns drift.
 */
export const GRID =
  "grid grid-cols-[4rem_minmax(0,1fr)_5rem_1rem] md:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,8rem)_4.5rem_5.5rem_1rem] gap-2 md:gap-3 text-data";

/** Applied to the cells that only exist at md and above. */
export const WIDE_ONLY = "hidden md:block";
