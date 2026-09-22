/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.js',
    './src/**/*.{js,jsx,ts,tsx}',
    // Datos SVG del mapa (~1 MB), sin clases de Tailwind. Sus cadenas largas
    // bloquean el extractor de clases y retrasan el arranque de Metro.
    '!./src/assets/worldMapPaths.ts',
  ],
  theme: {
    extend: {
      colors: {
        primary:       "var(--color-primary)",
        secondary:     "var(--color-secondary)",
        accent:        "var(--color-accent)",
        purple:        "var(--color-purple)",
        background:    "var(--color-background)",
        surface:       "var(--color-surface)",
        text:          "var(--color-text)",
        textSecondary: "var(--color-text-secondary)",
        border:        "var(--color-border)",       

        card:          "var(--color-card)",
        error:         "var(--color-error)",
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
