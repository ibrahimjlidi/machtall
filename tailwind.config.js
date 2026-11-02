/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: '#2E7D32',
        leaf: '#E8F5E9',
        earth: '#8D6E63',
        sun: '#F9A825',
      },
      fontFamily: { cairo: ['Cairo', 'sans-serif'] },
      boxShadow: {
        soft: '0 8px 28px rgba(34, 72, 39, 0.07)',
        card: '0 2px 12px rgba(32, 54, 35, 0.06)',
      },
    },
  },
  plugins: [],
};
