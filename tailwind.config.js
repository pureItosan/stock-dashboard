/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        up: '#ef4444',
        down: '#22c55e',
        'up-bg': '#fef2f2',
        'down-bg': '#f0fdf4',
      },
    },
  },
  plugins: [],
}
