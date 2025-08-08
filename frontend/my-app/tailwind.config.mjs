/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", 
    "./pages/**/*.{js,ts,jsx,tsx}", 
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      colors: {
        background: '#ffffff', // 커스텀 배경 지정
      }
    }
  },
  plugins: [],
}