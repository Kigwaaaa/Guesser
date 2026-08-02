import type { Config } from "tailwindcss";

// Keep the game's spotlight accent available as a named utility across the UI.
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F1224",
        foreground: "#F5F3FF",
        accent: "#7C3AED",
      },
    },
  },
  plugins: [],
};
export default config;
