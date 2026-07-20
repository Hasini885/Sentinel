import type { Config } from "tailwindcss";

// "Cold Ops" — near-black slate, cold cyan accent. Green/amber/red are reserved
// exclusively for risk severity, so the accent never competes with them.
//
// Every colour and radius resolves to a CSS variable declared in app/globals.css.
// The `rgb(var(--x) / <alpha-value>)` form is what keeps Tailwind's alpha
// modifiers (`bg-panel/80`, `border-accent/40`) working against variables.
const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: "rgb(var(--color-deep) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        raised: "rgb(var(--color-raised) / <alpha-value>)",
        edge: "rgb(var(--color-edge) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        risk: {
          low: "rgb(var(--color-risk-low) / <alpha-value>)",
          medium: "rgb(var(--color-risk-medium) / <alpha-value>)",
          high: "rgb(var(--color-risk-high) / <alpha-value>)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        // Marketing prose. Overrides Tailwind's default `font-sans` stack —
        // without this mapping `font-sans` silently falls back to system-ui and
        // the loaded Inter is never actually applied to anything.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      // Type scale. The dashboard lives in the 10–13px range for data density;
      // `micro`/`meta` cover the uppercase tracking-wide labels used everywhere.
      fontSize: {
        micro: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.12em" }],
        meta: ["0.6875rem", { lineHeight: "1rem" }],
        data: ["0.75rem", { lineHeight: "1.125rem" }],
        stat: ["1.5rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        hero: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
      },
      // Elevation ladder — panels, drawers, and the accent glow used on hover.
      boxShadow: {
        panel: "0 8px 24px rgb(0 0 0 / 0.25)",
        raised: "0 14px 38px rgb(0 0 0 / 0.35)",
        drawer: "-24px 0 48px rgb(0 0 0 / 0.45)",
        glow: "0 0 18px rgb(var(--color-accent) / 0.22)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        entrance: "cubic-bezier(0, 0, 0, 1)",
        exit: "cubic-bezier(0.3, 0, 1, 1)",
      },
      transitionDuration: {
        instant: "120ms",
        fast: "180ms",
        base: "280ms",
        slow: "450ms",
      },
    },
  },
  plugins: [],
};
export default config;
