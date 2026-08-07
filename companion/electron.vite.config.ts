import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// electron-vite builds the three processes separately. Without this file it
// falls back to its layout convention, which never matched this project — the
// preload script lived under src/main/, so it was never emitted as a preload
// entry and `npm run build` produced nothing runnable.
//
// Outputs land in out/{main,preload,renderer}, which is what package.json's
// `main` field and the __dirname-relative paths in src/main/index.ts expect.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
})
