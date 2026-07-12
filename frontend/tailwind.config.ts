import type { Config } from "tailwindcss";

// "Cold Ops" — near-black slate, cold cyan accent. Green/amber/red are reserved
// exclusively for risk severity, so the accent never competes with them.
const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: "#0A0C10",
        panel: "#12161C",
        raised: "#171C24",
        edge: "#1F2630",
        ink: "#E6EDF3",
        muted: "#7D8894",
        accent: "#22D3EE",
        risk: {
          low: "#34D399",
          medium: "#F59E0B",
          high: "#F43F5E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
