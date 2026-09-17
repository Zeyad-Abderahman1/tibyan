/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/design-system/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        tibyan: {
          navy: "var(--tibyan-navy, #0B3D3D)",
          teal: "var(--tibyan-teal, #1F6E68)",
          gold: "var(--tibyan-gold, #C59B27)",
          "gold-hover": "var(--tibyan-gold-hover, #B38728)"
        }
      },
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
        inter: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};
