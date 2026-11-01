/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#F8FAFC',
          900: '#1E293B',
        },
      },
    },
  },
  plugins: [],
};
