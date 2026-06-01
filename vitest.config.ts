import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    // jsdom for component tests; pure-logic tests under domain/utils still
    // pass in jsdom (no Node-only APIs used). Small (<200ms) overhead on
    // the full suite, in exchange for a single, simple config. If perf
    // becomes a concern later, split via vitest workspaces.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
