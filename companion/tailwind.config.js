/** @type {import('tailwindcss').Config} */
// Scoped to the companion's own renderer. Previously there was no config here,
// so Tailwind fell through to the web app's at the repo root, whose content
// globs (./app, ./components, ./src relative to that file) match nothing in
// this package — the renderer's classes were never scanned and the build
// emitted a stylesheet with no utilities in it.
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
