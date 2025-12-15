/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#f2f7fa',100:'#dbeaf2',200:'#b7d5e5',300:'#8fbdd5',
          400:'#6aa3c1',500:'#3a7ca5',600:'#326d92',700:'#2a5e7e',
          800:'#234e68',900:'#1b3c50', DEFAULT:'#3a7ca5'
        },
        status: {
          pass: "#34D399",       // emerald-400
          fail: "#FB7185",       // rose-400
          regression: "#FBBF24", // amber-400
          empty: "#eef1f5",
        },
      },
    },
  },
  plugins: [],
};
