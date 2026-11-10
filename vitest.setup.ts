import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

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

// waitFor and findBy* default to 1 s. The shared Modal unmounts 150 ms after
// close, which fits easily alone but not on a loaded CI runner, where the
// ForeverAnnouncementModal close test crossed 1 s twice on 2026-11-10.
// A longer ceiling changes nothing for a passing assertion.
configure({ asyncUtilTimeout: 4000 })
