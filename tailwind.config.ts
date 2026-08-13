import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink:         "#0F0508",
        "black-plum":"#1A0A14",
        damson:      "#3D1428",
        "velvet-wine":"#6B2A48",
        brass:       "#C4A373",
        ivory:       "#F5EDE0",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        body:    ["Cormorant Garamond", "Georgia", "serif"],
      },
      letterSpacing: {
        display: "0.05em",
        wide:    "0.12em",
        widest:  "0.22em",
      },
      fontSize: {
        "display-xl": ["clamp(2.8rem, 6vw, 5rem)", { lineHeight: "1.1", letterSpacing: "0.05em" }],
        "display-lg": ["clamp(2rem, 4vw, 3.25rem)",  { lineHeight: "1.15", letterSpacing: "0.05em" }],
      },
    },
  },
  plugins: [],
};

export default config;
