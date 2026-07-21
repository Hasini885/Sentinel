/**
 * Chart mark colours.
 *
 * These are FILL colours and are deliberately darker than the UI tokens of the
 * same hue. The bright tokens (--color-risk-*, --color-accent) are tuned for
 * text and small badges, where the test is text contrast; as large fills on the
 * dark surface they sit above the dark-mode lightness band and read as glowing
 * blocks. Every value below was chosen by running the palette validator against
 * the panel surface (#0C0E12), not by eye.
 *
 * Validator results (dark, surface #0C0E12):
 *
 *   Feature bars  #0891B2, #8B5CF6
 *     lightness PASS · chroma PASS · CVD ΔE 12.6 PASS · normal-vision 21.1 PASS
 *     · contrast PASS
 *
 *   Risk ramp     #059669, #D97706, #E11D48
 *     lightness PASS · chroma PASS · CVD ΔE 7.9 WARN · normal-vision 16.6 PASS
 *     · contrast PASS
 *
 * The risk ramp's CVD separation lands in the 6–8 floor band, which is legal
 * ONLY alongside secondary encoding. That is why RiskDistribution ships direct
 * labels, 2px surface gaps between segments, and a legend — those are load-
 * bearing for accessibility here, not decoration. Do not remove them.
 *
 * Re-run after any change:
 *   node scripts/validate_palette.js "<hex,…>" --mode dark --surface "#0C0E12"
 */

/** Surface the marks sit on — also the colour of the 2px gaps between them. */
export const CHART_SURFACE = "#0C0E12";

/** Feature spend bars. Violet marks a downgrade advisory, cyan is normal spend. */
export const MARK = {
  spend: "#0891B2",
  flagged: "#8B5CF6",
} as const;

/** Risk severity fills, ordered low → high. Reserved meaning; always labelled. */
export const RISK_FILL = {
  low: "#059669",
  medium: "#D97706",
  high: "#E11D48",
} as const;

/** De-emphasised hue for sparkline history; the latest column wears the accent. */
export const SPARK = {
  history: "#334155",
  latest: "#0891B2",
} as const;
