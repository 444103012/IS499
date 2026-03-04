/**
 * PostCSS Configuration
 * ---------------------
 * PostCSS processes CSS after you write it. Here we use two plugins:
 * - tailwindcss: expands Tailwind directives (@tailwind base, etc.) and utility classes
 * - autoprefixer: adds vendor prefixes (e.g. -webkit-) for better browser support
 * Create React App runs this automatically when you build or start the dev server.
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
