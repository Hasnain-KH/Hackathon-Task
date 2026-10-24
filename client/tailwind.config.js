/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17233b',
        brand: '#4257d6',
      },
      boxShadow: {
        card: '0 18px 55px rgba(29, 43, 76, 0.08)',
      },
    },
  },
  plugins: [],
};
