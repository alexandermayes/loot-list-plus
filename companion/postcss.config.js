// The companion needs its own PostCSS config. Without one, vite walks up and
// finds the web app's postcss.config.js at the repo root, which resolves
// `tailwindcss` from the root node_modules — absent in CI, where only
// companion/ is installed. That failed the Windows release build.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
