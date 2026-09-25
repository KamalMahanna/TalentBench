import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // M3 semantic tokens (mirrors CSS vars for Tailwind usage)
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          high: "var(--surface-high)",
          purple: "var(--surface-purple)",
          blue: "var(--surface-blue)",
          peach: "var(--surface-peach)",
        },
        tonal: {
          lavender: "var(--tonal-lavender)",
          blue: "var(--tonal-blue)",
          peach: "var(--tonal-peach)",
        },
        ink: "var(--ink)",
        text: "var(--text)",
        muted: {
          DEFAULT: "var(--muted)",
          text: "var(--muted-text)",
        },
        outline: "var(--outline)",
        primary: {
          DEFAULT: "var(--primary)",
          deep: "var(--primary-deep)",
          on: "var(--on-primary)",
        },
        green: "var(--green)",
        success: "var(--success)",
        // Keep legacy names for dashboard pages that use them
        navy: {
          base: "#0A1228",
          surface: "#10162E",
          solid: "#0B1226",
          deep: "#060B18",
          card: "#0D1633",
        },
        ice: {
          light: "#EAF1FB",
          pure: "#F5F9FF",
          accent: "#8FB6E8",
          dim: "#7C91B4",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      transitionTimingFunction: {
        "standard": "cubic-bezier(0.2, 0, 0, 1)",
        "decelerate": "cubic-bezier(0, 0, 0, 1)",
        "accelerate": "cubic-bezier(0.3, 0, 1, 1)",
      },
      boxShadow: {
        "m3-1": "0 3px 8px rgba(108, 76, 220, 0.2)",
        "m3-2": "0 6px 13px rgba(108, 76, 220, 0.25)",
        "card": "0 14px 30px rgba(27, 26, 34, 0.08)",
        "window": "0 22px 55px rgba(27, 26, 34, 0.12)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 35s linear infinite",
        "fade-in": "fade-in 0.4s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
