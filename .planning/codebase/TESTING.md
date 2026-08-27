# Testing Patterns

**Analysis Date:** 2026-08-27

## Test Framework

**Runner:**
- Vitest 4.1.0
- Config: `vitest.config.ts`
- Global test API enabled (`globals: true` in config)

**Environment:**
- jsdom (DOM simulation for both component and logic tests)
- Setup file: `vitest.setup.ts`
- Registers @testing-library/jest-dom matchers globally

**Assertion Library:**
- Vitest built-in `expect()` API
- @testing-library/jest-dom matchers: `.toBeInTheDocument()`, `.toBeVisible()`, etc.

**Run Commands:**
```bash
npm run test                 # Run all tests once
npm run test:watch          # Watch mode for development
npm run typecheck           # Type checking alongside tests
npm run lint                # ESLint checking
```

## Test File Organization

**Location:**
- Co-located in `__tests__` subdirectories next to source files
- Example: `app/components/__tests__/ReserveItemPicker.test.tsx` alongside `app/components/ReserveItemPicker.tsx`
- Shared test fixtures: `domain/scoring/__tests__/fixtures.ts`

**Naming:**
- `{module}.test.ts` for pure logic/utility tests
- `{component}.test.tsx` for React component tests
- Fixtures in separate files or within test files

**Directory Structure:**
```
src/
  domain/scoring/
    __tests__/
      calculations.test.ts
      scoring.test.ts
      engine.test.ts
      donations.test.ts
      attendance.test.ts
      fixtures.ts           # Shared test helpers/data
    engine.ts
    calculations.ts
    modifiers.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest'

describe('functionName', () => {
  describe('specific behavior group', () => {
    it('should do X when Y', () => {
      expect(result).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty input', () => {
      expect(fn([])).toBe(0)
    })
  })
})
```

**Patterns:**
- Nested `describe()` blocks for logical grouping by behavior/scenario
- Edge cases in separate `describe` blocks
- Descriptive test names in present tense: "returns 0 for empty records", "adds another copy"
- One assertion per test when possible; multiple assertions acceptable for related conditions

**Setup/Teardown:**
```typescript
// In vitest.setup.ts
afterEach(() => {
  cleanup()  // React Testing Library cleanup
})
```

## Mocking

**Framework:** Vitest's `vi` API

**Patterns:**
```typescript
// Mock an entire module
vi.mock('@/lib/wowhead', () => ({ refreshWowheadTooltips: () => {} }))

// Create mock functions
const onReasonChange = vi.fn()
const onCancel = vi.fn()

// Track calls
await user.click(button)
expect(onCancel).toHaveBeenCalled()
```

**Inline Mocks for Supabase:**
Create chainable query builders instead of full mocks:
```typescript
function mockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return chain as unknown as SupabaseClient
}
```

**Table-Aware Mocks:**
For queries against different tables (permissions checks):
```typescript
function mockSupabase(tableResults: Record<string, { data: unknown; error?: unknown }>) {
  function builder(table: string) {
    const result = tableResults[table] ?? { data: null, error: null }
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      single: () => Promise.resolve(result),
      then: (resolve) => Promise.resolve(result).then(resolve),  // thenable
    }
    return chain
  }
  return { from: (table: string) => builder(table) } as unknown as SupabaseClient
}
```

**What to Mock:**
- External APIs and services (Supabase, Wowhead, Battle.net)
- Side effects (event tracking, DOM manipulation)
- Platform-specific modules (next/image, next/link)

**What NOT to Mock:**
- Internal pure functions (scoring calculations, filtering logic)
- Domain types and constants
- Test utilities and helpers

## Fixtures and Factories

**Test Data Factories:**
Lightweight factory functions create test objects with sensible defaults:
```typescript
// From domain/scoring/__tests__/fixtures.ts
export function attended(signedUp = false) {
  return { signed_up: signedUp, attended: true, no_call_no_show: false }
}

export function signedUpOnly() {
  return { signed_up: true, attended: false, no_call_no_show: false }
}

// In tests
const records = [attended(true), attended(false), signedUpOnly()]
```

**Preset Configurations:**
Fixture constants for common config scenarios:
```typescript
export const DEFAULT_PPR_SETTINGS = {
  attendance_type: 'points-per-raid' as const,
  signup_weight: 0.25,
  max_attendance_bonus: 4,
}

export const DEFAULT_LINEAR_SETTINGS = { ... }

// In tests
expect(calculateAttendanceScore(records, 3, DEFAULT_PPR_SETTINGS)).toBe(2.0)
```

**Location:**
- Fixtures live alongside tests: `domain/scoring/__tests__/fixtures.ts`
- Can be imported by multiple test files in the same domain
- Named exports for each factory or constant

## React Component Testing

**Render Pattern:**
```typescript
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Component', () => {
  it('does something on click', async () => {
    const user = userEvent.setup()
    render(<Component {...props} />)
    
    await user.click(screen.getByRole('button', { name: /click me/i }))
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})
```

**Helper Harness:**
Create wrapper components for component under test:
```typescript
function Harness({
  allowDuplicates,
  max = 5,
  initial = [] as string[],
}: {
  allowDuplicates: boolean
  max?: number
  initial?: string[]
}) {
  const [ids, setIds] = useState<string[]>(initial)
  return (
    <ReserveItemPicker
      items={ITEMS}
      selectedIds={ids}
      onChange={setIds}
      maxSelections={max}
      allowDuplicates={allowDuplicates}
    />
  )
}

describe('ReserveItemPicker', () => {
  it('...', async () => {
    const user = userEvent.setup()
    render(<Harness allowDuplicates />)
    // ... test
  })
})
```

**Query Patterns:**
- `screen.getByRole()` preferred for accessibility
- `screen.getByText()` for text content
- `screen.queryByText()` to assert absence
- Helper functions for complex selectors: `getRow(name)` to find rows with aria attributes

## Coverage

**Requirements:**
- No enforced coverage targets found in config
- ~861 test cases across the codebase suggest comprehensive coverage
- Domain logic (scoring, permissions) heavily tested
- UI components tested for key interactions

**Observed Coverage Areas:**
- Scoring calculations: comprehensive fixture-based tests
- Permission logic: table-aware mocking with multiple scenarios
- Component interactions: click handlers, state changes, duplicates
- Loot filtering: mock Supabase queries with realistic data

## Test Types

**Unit Tests:**
- Scope: Single function or pure logic
- Examples: `calculateAttendanceScore()`, `getRankModifier()`, `buildTeamVisibility()`
- Approach: Test inputs/outputs with fixtures, no mocks of internal code
- Files: Most tests in `domain/` subdirectories

**Integration Tests:**
- Scope: Function calling other internal functions
- Examples: Scoring engine using multiple modifier functions
- Approach: Real composition of internal modules, mock external services
- Files: `engine.test.ts`, permissions logic

**Component Tests:**
- Scope: React component behavior
- Examples: `ReserveItemPicker.test.tsx`, modal interactions
- Approach: Render component, interact with userEvent, assert DOM state
- Files: `app/components/__tests__/`

**E2E Tests:**
- Not found in codebase
- Load testing via k6 and Artillery (load tests, not E2E)

## Common Patterns

**Async Testing:**
```typescript
it('fetches guild info for invite code preview', async () => {
  const res = await fetch(`/api/guild-invites/${inviteCode}`)
  if (res.ok) {
    const data = await res.json()
    if (data?.guild) {
      setGuildInfo(data)
    }
  }
})
```

**Error Case Testing:**
```typescript
it('returns error response for free guild', async () => {
  const sb = mockSupabase({ data: { subscription_tier: 'free' }, error: null })
  const result = await requirePro(sb, 'guild-1')
  expect(result.isPro).toBe(false)
  if (!result.isPro) {
    expect(result.error).toBeDefined()
    const body = await result.error.json()
    expect(body.error).toBe('This feature requires a Pro subscription')
    expect(result.error.status).toBe(403)
  }
})
```

**Regression Tests:**
- Reference issue numbers: `// regression for #120`
- Lock behavior before refactoring with golden fixtures
- Example: `LOOT_SCORE_FIXTURES` array locks scoring calculations

**Discriminated Union Testing:**
```typescript
// Type-safe assertion on discriminated union result
if (!result.isPro) {
  expect(result.error).toBeDefined()
  // TypeScript now knows result.error exists
}
```

## Testing Utilities

**@testing-library/react:**
- `render()` — mount component
- `screen` — query DOM with accessibility-first selectors
- `within()` — scope queries to a subtree
- `cleanup()` — auto-unmount after each test (registered in setup)

**@testing-library/user-event:**
- `userEvent.setup()` — initialize user interaction context
- `await user.click()` — simulate user clicks
- Event-based interactions (more realistic than `fireEvent`)

**Vitest API:**
- `describe()`, `it()` — test structure
- `expect()` — assertions
- `vi.mock()`, `vi.fn()`, `vi.spyOn()` — mocking

---

*Testing analysis: 2026-08-27*
