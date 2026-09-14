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
        background: "#0A1228",
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
          border: "rgba(143, 182, 232, 0.25)",
        },
        surface: {
          DEFAULT: "#10162E",
          card: "#0D1633",
          glass: "rgba(255, 255, 255, 0.05)",
          hover: "rgba(255, 255, 255, 0.09)",
        },
        accent: {
          DEFAULT: "#8FB6E8",
          glow: "rgba(143, 182, 232, 0.25)",
          secondary: "#60A5FA",
          violet: "#A78BFA",
          indigo: "#6366F1",
          emerald: "#10B981",
        },
        glass: {
          border: "rgba(255, 255, 255, 0.22)",
          highlight: "rgba(255, 255, 255, 0.35)",
          shade: "rgba(4, 8, 20, 0.75)",
        }
      },
      fontFamily: {
        sans: ["var(--font-satoshi)", "-apple-system", "sans-serif"],
        display: ["var(--font-clash)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-smooth": "cubic-bezier(0.77, 0, 0.175, 1)",
        "drawer": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      boxShadow: {
        "glass": "0 24px 60px -15px rgba(4, 8, 20, 0.75)",
        "glass-inner": "inset 0 1px 0 0 rgba(255, 255, 255, 0.35), inset 0 0 24px 0 rgba(255, 255, 255, 0.06)",
        "ice-glow": "0 0 35px -5px rgba(143, 182, 232, 0.3)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 35s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
