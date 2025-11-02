/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'noel-red': '#e4002b',
        'noel-dark': '#1a1a1a',
        'noel-off-white': '#f8f8f8',
        'noel-gold': '#ffd700',
        'noel-yellow': '#ffeb3b',
      },
      borderRadius: {
        'card': '1rem',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'card-elevated': '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}

