import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Side-effect import: registers @testing-library/jest-dom matchers on
// Vitest's `expect`, AND augments the global Assertion type so .toBeInTheDocument()
// etc. type-check.
import '@testing-library/jest-dom/vitest'

// Auto-unmount + clean the DOM between tests so leaked nodes from one test
// can't leak into the next. React Testing Library doesn't auto-register
// this with Vitest like it does with Jest.
afterEach(() => {
  cleanup()
})
