/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        background: "#0b0b0c",
        foreground: "#ffffff",
        muted: "#808080",
        accent: "#003322",
        highlight: "#b89a93",
        card: "#060607",
        border: "rgb(255 255 255 / 0.12)"
      },
      letterSpacing: { display: "0.14em" }
    }
  },
  plugins: []
};
