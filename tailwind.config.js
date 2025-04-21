/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-primary': '#4A00E0',
        'game-secondary': '#8E2DE2',
        'game-accent': '#FFC107',
        'game-dark': '#1A1A2E',
        'game-light': '#F1F1F1',
      },
    },
  },
  plugins: [],
} 