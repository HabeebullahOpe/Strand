/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        strand: {
          bg: '#0A0E14',
          panel: '#121820',
          text: '#E8EDF2',
          muted: '#5C6B7A',
          a: '#00E5A0',
          t: '#FF5470',
          c: '#4FA8FF',
          g: '#FFD23F',
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}