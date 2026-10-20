/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0b0f19',
          card: '#111827',
          cardAlt: '#162032',
          border: '#1f293d',
          borderHover: '#334155',
          blue: '#3b82f6',
          indigo: '#6366f1',
          cyan: '#38bdf8',
          textMuted: '#94a3b8',
          textSubtle: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
