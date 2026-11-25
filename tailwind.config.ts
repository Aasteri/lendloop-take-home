import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F1E8",
        ink: "#1C1915",
        moss: "#2C5A4A",
        "moss-dark": "#1E3F34",
        clay: "#B85C38",
        sand: "#E7DCC8",
        "sand-dark": "#D4C4A8",
        mist: "#F3EFE6",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28, 25, 21, 0.06), 0 12px 32px -16px rgba(28, 25, 21, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
