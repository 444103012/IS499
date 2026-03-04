

/** @type {import('tailwindcss').Config} */
module.exports = {
  
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      
      colors: {
        'storelaunch-green': '#1FAE77',
        'storelaunch-deep-green': '#0C7A5C',
        'storelaunch-teal': '#0E8F96',
        'storelaunch-dark': '#0A3C5A',
        'storelaunch-bg': '#FFFFFF',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
