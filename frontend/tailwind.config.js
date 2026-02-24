/**
 * Tailwind CSS Configuration
 * --------------------------
 * Tailwind is a utility-first CSS framework. This file tells Tailwind which
 * files to scan for class names and defines custom theme values (colors, fonts)
 * used across the app. Custom colors like storelaunch-green are used in className
 * as e.g. "bg-storelaunch-green" or "text-storelaunch-dark".
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Only classes found in these files are included in the final CSS (smaller bundle)
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Brand colors used throughout the app (e.g. bg-storelaunch-green)
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
