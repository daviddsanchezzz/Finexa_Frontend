/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.js',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#003cc5",
        secondary: "#27AE60",
        accent: "#F2C94C",
        purple: "#9B51E0",
        background: "#F9FAFB",
        text: "#1A1A1A",
        textSecondary: "#6B7280",
        border: "#E5E7EB",
        white: "#FFFFFF",
        error: "#E63946",
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
