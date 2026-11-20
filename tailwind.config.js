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
          // Exact Master Spec Tokens
          ink: "#222238",             // حبر ليلي / Ink
          walnut: "#6B463B",          // جوزي بلاد الرافدين / Walnut
          purple: "#62467D",          // بنفسجي أوركيد / Purple
          lilac: "#B797D0",           // ليلكي أوركيد / Lilac
          copper: "#C66F50",          // نحاسي بلاد الرافدين / Copper
          cream: "#F7F1E7",           // كريمي دافئ / Cream

          // Revised Master Palette: Mesopotamian Earth & Orchid Atmosphere
          midnight: "#222238",        // Deep mineral violet-black for text & deep anchors
          walnut: "#6B463B",          // Warm elegant Mesopotamian Walnut brown
          "walnut-dark": "#52342B",   // Deeper walnut for active/hover
          "walnut-light": "#8A5E51",  // Soft walnut accent
          orchid: "#62467D",          // Deep Orchid Purple for distinctive features & active states
          "orchid-dark": "#4C3562",   // Deep orchid hover
          "orchid-light": "#7E5E9D",  // Soft orchid accent
          lavender: "#B797D0",        // Orchid Lavender for delicate highlights & badge tags
          clay: "#C66F50",            // Mesopotamian Clay signature copper accent
          "clay-dark": "#A65339",     // Darker clay
          limestone: "#F7F1E7",       // Warm comfortable neutral foundation
          mist: "#D6E2E6",            // River mist supporting surface
          dawn: "#AAB7F0",            // Dawn air atmospheric accent
          
          // Semantic & Component mappings
          sand: "#F7F1E7",            // Base page background
          ivory: "#FFFFFF",           // Card surfaces & input backgrounds
          silt: "#222238",            // Primary text & headings
          blue: "#62467D",            // Primary active brand color (Orchid Purple)
          "blue-dark": "#4C3562",
          "blue-light": "#B797D0",
          misty: "#F0EBF5",           // Soft lavender-mist background for pills/alerts
          reed: "#BCAAA4",            // Soft warm border accent
        },
        pin: {
          planting: "#16A34A",        // Green pin: Tree-planting campaigns (تشجير)
          cleanup: "#2563EB",         // Blue pin: Cleanup campaigns (تنظيف)
          pollution: "#C66F50",       // Copper/orange pin: Pollution & waste reports (بلاغ تلوث)
          activity: "#62467D",        // Purple pin: Eco & community activities (نشاط بيئي)
        },
        status: {
          submitted: "#5E607A",
          review: "#D97706",
          verified: "#62467D",
          progress: "#2563EB",
          resolved: "#16A34A",
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
        "sway-subtle": "sway 4s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.94" },
          "50%": { transform: "scale(1.03)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        sway: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(3deg)" },
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
