/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nafas: {
          midnight: "#222238",
          clay: "#C66F50",
          "clay-dark": "#A65339",
          "clay-light": "#DF8C6E",
          dawn: "#AAB7F0",
          mist: "#D6E2E6",
          limestone: "#F7F1E7",
          "neutral-slate": "#47465F",
          sand: "#EAE0D0",
          terracotta: "#B2583B",
        },
        status: {
          submitted: "#5E607A",
          review: "#D97706",
          verified: "#0D9488",
          progress: "#2563EB",
          resolved: "#15803D",
          rejected: "#DC2626",
          duplicate: "#6B7280",
        },
        hazard: {
          warning: "#DC2626",
          bg: "#FEF2F2",
          border: "#FCA5A5",
        }
      },
      fontFamily: {
        arabic: ["'IBM Plex Sans Arabic'", "'Tajawal'", "system-ui", "sans-serif"],
        latin: ["'Manrope'", "'Inter'", "system-ui", "sans-serif"],
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float-gentle": "float 5s ease-in-out infinite",
        "flow-line": "flowLine 12s linear infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.92" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        flowLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        }
      },
    },
  },
  plugins: [],
};
