# Coding Conventions

**Analysis Date:** 2026-08-27

## Naming Patterns

**Files:**
- kebab-case for multi-word files: `raid-team.ts`, `apply-team-filter.ts`, `feature-flags.ts`
- Single words lowercase: `types.ts`, `index.ts`
- React components: PascalCase: `LoginPage.tsx`, `ReserveItemPicker.tsx`, `ItemLink.tsx`
- Test files: `filename.test.ts` or `filename.test.tsx` in `__tests__` subdirectories

**Functions:**
- camelCase for all functions: `calculateLootScore()`, `getRankModifier()`, `refreshAccessToken()`
- Exported helper functions: `attended()`, `signedUp()` as factory helpers in test fixtures
- Hook functions: `useFeatureFlag()`, `useFeatureFlagPayload()` with `use` prefix

**Variables:**
- camelCase for local variables: `inviteCode`, `guildInfo`, `joinError`
- UPPER_SNAKE_CASE for constants: `DEFAULT_PPR_SETTINGS`, `ARMOR_TYPE_CLASSES`, `ROLE_POSITIONS`
- State variables: `const [user, setUser]` (React convention)
- Descriptive names for object keys: `signed_up`, `no_call_no_show`, `spec_id` (database column style with underscores)

**Types:**
- PascalCase for interfaces and types: `LoginPageProps`, `ReserveItem`, `ScoreInput`, `ScoreResult`
- Suffix conventions: `Props` for component props, `Config` for configuration, `Result` for return types
- Use `import type` for TypeScript-only imports: `import type { ScoringConfig, RaiderBonusEntry }`
- Union types for status/state: `'pro' | 'free'`, `'primary' | 'secondary'`

## Code Style

**Formatting:**
- No explicit formatter configured (eslint only)
- Consistent indentation implied to be 2 spaces
- JSDoc comments above functions with parameter and return descriptions
- Trailing commas in multi-line objects and arrays

**Linting:**
- ESLint 9.x used (eslint-config-next)
- No separate .eslintrc config file; relies on Next.js default rules
- `npm run lint` runs eslint; `npm run typecheck` runs TypeScript checking
- TypeScript strict mode enabled in `tsconfig.json`

**Line Length:**
- No strict enforced limit observed; pragmatic use of line breaks for readability

## Import Organization

**Order:**
1. External packages/node modules: `import { useState } from 'react'`, `import Link from 'next/link'`
2. Third-party UI/component libraries: `import { Button } from '@/components/ui/button'`
3. Internal @/ path imports: `import { calculateLootScore } from '@/domain/scoring'`
4. Type imports from internal modules: `import type { ScoringConfig } from '@/domain/types'`

**Path Aliases:**
- Single `@/` alias mapping to project root via `tsconfig.json`
- Eliminates relative imports like `../../../` throughout the codebase
- Example: `import { buildTeamVisibility } from '@/domain/loot/apply-team-filter'`

**Barrel Files:**
- Used for domain exports: `domain/scoring/index.ts` re-exports functions from submodules
- Allows importing from module level: `import { calculateLootScore } from '@/domain/scoring'`

## Error Handling

**Patterns:**
- Explicit error messages with context: `throw new Error(`Token exchange failed: ${response.status} ${text}`)`
- HTTP response status checks before processing: `if (res.ok)` or `if (response.status === 401)`
- Status code and message included in error context for debugging
- Try-catch blocks in async initialization functions (e.g., invite code fetching in LoginPage)
- Empty catch blocks acceptable for non-critical operations: `catch {}` when side-effect failures are ignored

**Result Objects:**
- Functions return structured objects with status info: `{ isPro: boolean, error?: Response }` for permission checks
- Error details in discriminated unions: `if (!result.isPro) { expect(result.error) }`
- Supabase errors checked in `{ data, error }` tuple pattern: `if (error) { ... }`

**Validation:**
- Input validation in scorer functions with guards: `if (!config.guild_rank_bonuses_enabled) return 0`
- Config merging: `const config = { ...DEFAULT_SETTINGS, ...settings }`
- Optional parameters with defaults: `function getRankModifier(role: string, settings: Partial<ScoringConfig> = {})`

## Logging

**Framework:** console methods (no dedicated logger library)

**Patterns:**
- Debug/info typically suppressed in production
- PostHog analytics for user behavior: `trackClientEvent('discord_oauth_started', { source_page: ... })`
- Server-side logging not extensively seen in sampled files; likely handled by hosting platform

## Comments

**When to Comment:**
- Algorithm explanations with formulas: `// raid 1: 1.0 (attended+signup), raid 2: 0.75 (attended)`
- Edge cases and regression references: `// regression for #120`, `// #165`
- State machine transitions and flags
- Why a choice was made over alternatives (not what the code does)

**JSDoc/TSDoc:**
- Used extensively for function documentation in domain and utility modules
- Includes parameter descriptions and behavior notes
- Example:
  ```typescript
  /**
   * Get role modifier from settings.
   * Accepts a single role or array of roles (for dual-role specs like Feral Druid).
   * When multiple roles match, returns the highest bonus.
   */
  export function getRoleModifier(roles: string | string[] | null, settings: Partial<ScoringConfig> = {}): number
  ```

**Module Comments:**
- File headers documenting module purpose: `// Loot Engine — single entry point for loot score computation.`
- Visible at top of domain logic files

## Function Design

**Size:**
- Small, focused functions (30-50 lines typical)
- Larger functions break responsibilities into helper functions
- Engine/core logic consolidated in entry point functions like `computeScore()`

**Parameters:**
- Named parameters preferred: destructuring when passing multiple options
- Config objects merged with defaults rather than many positional parameters
- Optional parameters use default values: `(role: string, settings: Partial<ScoringConfig> = {})`
- Builder pattern for complex mocks in tests: chainable `.select().eq().then()`

**Return Values:**
- Single responsibility: return what the function name promises
- Structured returns for multiple values: `{ bonus: number, matchedRole: string | null }`
- `null` for "not found" cases; falsy checks used appropriately
- Async functions return Promises of result objects or data

## Module Design

**Exports:**
- Named exports for functions and types: `export function calculateLootScore(...)`
- Type exports with `export type` or `export interface`
- Default exports for React components: `export default function LoginPage(...)`
- Index files re-export submodule exports for public API

**File Structure by Purpose:**
- Domain logic: `domain/scoring/`, `domain/guild/` — pure functions, no dependencies
- Utilities: `utils/` — helpers like `feature-flags.ts`, `date.ts`, `cache.ts`
- Library adapters: `lib/` — Supabase, Battle.net, Wowhead integration
- Components: `app/components/` (client) and `components/ui/` (shared UI primitives)
- Scripts: `scripts/` — one-off data migration and seeding tools

**Patterns:**
- Settings/config objects with sensible defaults, merged at call time
- Pure functions preferred for domain logic (scoring, permissions, filtering)
- Client components marked with `'use client'` directive
- Lazy evaluation of complex conditions (short-circuit with `||` and `&&`)

---

*Convention analysis: 2026-08-27*
