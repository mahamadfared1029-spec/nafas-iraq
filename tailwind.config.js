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
          // The 5 core Mesopotamian nature tokens requested:
          sand: "#F4EFE5",        // رمل فاتح - Page background
          ivory: "#FFFCF5",       // عاجي - Card surfaces & input fields
          silt: "#302D29",        // طمي داكن - Headings & primary text
          blue: "#28566E",        // أزرق الرافدين - Primary buttons, links, active navigation
          "blue-dark": "#1d4154",  // Deep blue hover
          "blue-light": "#366e8c", // Lighter blue accent
          misty: "#D8E8ED",       // أزرق ضبابي - Selected filter pills & informational alerts
          reed: "#C8B68D",        // قصب جاف - Dividers & subtle decorative details
          "reed-light": "#e4dac0",
          "reed-dark": "#aa9568",
          // Safety aliases so any legacy references seamlessly adapt:
          limestone: "#F4EFE5",
          midnight: "#302D29",
          clay: "#28566E",
          "clay-dark": "#1d4154",
          "clay-light": "#D8E8ED",
          dawn: "#D8E8ED",
          mist: "#C8B68D",
          "neutral-slate": "#4c4842",
        },
        status: {
          submitted: "#5E607A",
          review: "#B45309",
          verified: "#28566E",    // Mesopotamian Blue for verified
          progress: "#2563EB",
          resolved: "#28566E",    // Mesopotamian Blue for resolved (no green)
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
