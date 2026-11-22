/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#0B1220',
        panel: '#0E1525',
        line: '#1D2740',
        brand: {
          50: '#EEF3FF',
          100: '#D9E4FF',
          200: '#B8CCFF',
          300: '#8FAEFF',
          400: '#5F86FF',
          500: '#3462F4',
          600: '#234BDB',
          700: '#1C3BB4',
          800: '#1B348F',
          900: '#1B2F73',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)',
        float: '0 12px 32px rgba(16,24,40,.12)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { fadeIn: 'fadeIn .15s ease-out' },
    },
  },
  plugins: [],
};
