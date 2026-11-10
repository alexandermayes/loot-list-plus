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
    // CI runners share cores with the build and lint jobs, and today's
    // default (5 s) was hit by tests that take well under a second alone:
    // the brand token parity scan and the modal close transition. A larger
    // ceiling costs nothing on a passing run and stops load from failing a
    // green branch.
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
