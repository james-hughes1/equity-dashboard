/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0d1117",
          card: "#161b22",
          border: "#30363d",
        },
        primary: "#00cc96",
        secondary: "#636efa",
        success: "#00ff00",
        danger: "#ff0000",
        warning: "#ffa500",
      },
    },
  },
  plugins: [],
};
