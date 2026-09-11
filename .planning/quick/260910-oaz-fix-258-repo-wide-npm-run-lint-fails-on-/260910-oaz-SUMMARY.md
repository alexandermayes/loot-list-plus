---
phase: quick-260910-oaz
plan: 01
subsystem: infra
tags: [eslint, eslint-config-next, nextjs, vitest, api-route, isr]

requires: []
provides:
  - A scoped eslint.config.mjs so npm run lint no longer aborts on untracked .cjs agent tooling scripts
  - A build-safe /api/guild-count route that no longer executes at static-generation time
  - vitest coverage for /api/guild-count locking in its force-dynamic export, response shape, cache header, and error handling
affects: [lint, ci, api-guild-count, landing-hero]

actuals:
  tokens: 1704
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "force-dynamic + response Cache-Control header replaces ISR revalidate export when a route reads nothing from the request but still needs build-time safety (mirrors /api/landing-stats)"
    - "eslint flat config: scope error-level rule blocks to eslint-config-next's own plugin-registration files glob so ratchet blocks never outrun what the upstream config actually registers"

key-files:
  created:
    - app/api/guild-count/__tests__/route.test.ts
  modified:
    - eslint.config.mjs
    - app/api/guild-count/route.ts

key-decisions:
  - "Squashed the TDD RED test commit and GREEN implementation commit for Task 2 into one commit, per the plan's own <done> instruction and its verification step 6 (git log --oneline -2 must show exactly two commits, one per issue)"
  - "Build gate could not be exercised as the blocking gate: npm run build fails on the unrelated, pre-existing /about page (regular Supabase client, not the service-role client touched here), so typecheck plus the new vitest suite serve as the blocking gates per the plan's stated fallback"

patterns-established:
  - "Ratchet blocks in eslint.config.mjs that set rule severity to error/warn must carry a files glob mirrored from the plugin's own registration, not rely on falling through to global scope"

requirements-completed: [GH-258, GH-257]

coverage:
  - id: D1
    description: "npm run lint exits 0 with untracked local agent tooling dirs (.claude, .codex, .gsd, .agents) present on disk"
    requirement: GH-258
    verification:
      - kind: other
        ref: "npm run lint (exit 0, 0 errors, 397 warnings)"
        status: pass
      - kind: other
        ref: "npx eslint eslint.config.mjs (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/api/guild-count is build-safe: force-dynamic export, no ISR revalidate binding, { guilds, raiders, loot } body preserved, one hour Cache-Control header, generic 500 on failure"
    requirement: GH-257
    verification:
      - kind: unit
        ref: "app/api/guild-count/__tests__/route.test.ts (5/5 tests pass)"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "npm run build could not be run to completion in this sandbox as the fully proving gate (fails on an unrelated pre-existing /about page issue); a human still needs to confirm npm run build finishes on a machine without the unrelated /about blocker, and that the landing hero counter renders real numbers against a dev server, per the plan's own human-check."

duration: 25min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-oaz: Fix repo-wide npm run lint and npm run build failures Summary

**Scoped the react-hooks eslint ratchet to eslint-config-next's own plugin-registration glob and ignored local agent tooling dirs (GH-258); swapped /api/guild-count's ISR export for force-dynamic plus a Cache-Control header so Next.js never prerenders it at build time (GH-257), with new vitest coverage locking in the route contract.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-10T17:35:00Z (approx, from first read)
- **Completed:** 2026-09-10T18:00:00Z (approx)
- **Tasks:** 2 completed
- **Files modified:** 3 (1 config file, 1 route file, 1 new test file)

## Accomplishments

- `npm run lint` now exits 0 from the repo root with `.claude`, `.codex`, `.gsd`, and `.agents` present on disk as untracked directories (they were previously linted and aborted the whole run with a react-hooks plugin resolution error on their `.cjs` scripts).
- The react-hooks error-level rule block now carries `files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"]`, copied verbatim from the glob eslint-config-next uses to register the plugin, so CI enforcement on real source files is unchanged and the block stays correct even if a `.cjs` file is tracked again later.
- `/api/guild-count/route.ts` no longer exports an ISR `revalidate` window. It now exports `dynamic = 'force-dynamic'`, wraps the handler in try/catch (matching `/api/landing-stats`), and carries `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` on the success response so the one hour cache intent survives at the CDN instead of at build time.
- `app/api/guild-count/__tests__/route.test.ts` is new: 5 tests covering the `dynamic` export, the absence of a `revalidate` binding, the `{ guilds, raiders, loot }` body shape and its exact table-to-key mapping, the `Cache-Control` header, and the 500-on-throw edge case. All 5 pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scope the react-hooks ratchet and ignore local agent tooling dirs (GH-258)** - `43688d2` (fix)
2. **Task 2: Make /api/guild-count build-safe and cover it with vitest (GH-257)** - `3cf9a3b` (fix, includes the test file written first per TDD)

_Note: Task 2 carries `tdd="true"`. The test file was written first and run to confirm 4 of 5 assertions failed against the pre-existing ISR implementation (RED), then the route was rewritten to pass all 5 (GREEN). Per the plan's own `<done>` instruction and its verification step 6 (exactly two commits total, one per GitHub issue), the RED and GREEN steps were combined into the single commit above rather than left as separate `test(...)`/`feat(...)` commits._

## Files Created/Modified

- `eslint.config.mjs` - Added 4 entries to `globalIgnores` for local agent tooling dirs, and added a `files` glob to the react-hooks error-level rule block
- `app/api/guild-count/route.ts` - Swapped ISR `revalidate` export for `dynamic = 'force-dynamic'`, added try/catch, added `Cache-Control` header, added JSDoc referencing GH-257
- `app/api/guild-count/__tests__/route.test.ts` - New vitest suite (`@vitest-environment node` docblock, 5 tests)

## Decisions Made

- Combined the TDD RED and GREEN steps into one commit for Task 2 (see Task Commits note above) to match the plan's explicit two-total-commits verification target, overriding the generic executor default of separate `test(...)`/`feat(...)` commits.
- Did not attempt to fix the unrelated `/about` page build failure encountered while running the `npm run build` gate. That page uses the regular (non-service-role) Supabase client and is out of scope for this plan's two GH issues; per the scope-boundary rule, out-of-scope failures are documented, not fixed.

## Deviations from Plan

None beyond the commit-squashing decision above, which is a process choice within the plan's own stated verification target, not a scope change. No auto-fixes were needed under Rules 1-3; both tasks executed as specified.

## Issues Encountered

`npm run build` could not reach completion in this sandbox as a fully proving gate. It compiled successfully, passed TypeScript, and got through "Generating static pages" for 70 of 142 pages with **no mention of `/api/guild-count` in the failure output** (confirming the route itself is no longer the build-time failure point it was before this fix). The build then failed prerendering `/about`, which throws `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!`, a different client (the regular `@supabase/ssr` client, not `createServiceRoleClient()`) on a page untouched by this plan's changes. This is a pre-existing issue outside the scope of GH-257 and GH-258, and per the plan's explicit fallback instruction, `npm run typecheck` (pass) and `npx vitest run app/api/guild-count` (5/5 pass) serve as the blocking gates instead. The plan's `<human-check>` line (confirming `npm run build` finishes locally with no Supabase env vars, and that the landing hero counter renders real numbers against a dev server) is recorded as outstanding for the user to verify on a machine without the unrelated `/about` blocker.

## Verification Results

- `npm run lint`: **exit 0**, 0 errors, 397 warnings (same warning count as before this change; the 4 agent-tooling-dir grep checks and the files-glob grep check all matched their required counts)
- `npx eslint eslint.config.mjs`: exit 0
- `npx vitest run app/api/guild-count`: 5/5 tests pass
- `npm run typecheck`: passes with no errors
- `npm run build`: does not complete, fails on unrelated pre-existing `/about` page issue (see Issues Encountered); `/api/guild-count` itself no longer appears in the build failure output
- `git log --oneline -2`: exactly two commits, `3cf9a3b` (#257) and `43688d2` (#258), each touching only its own files (verified via `git diff <parent> <commit> --stat`)
- `git status --short`: no unintended changes to `.env.example`, `.env.local`, `.gitignore`, `utils/supabase/service-role.ts`, or `vitest.config.ts`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `// @vitest-environment node` docblock was needed and used, exactly as anticipated in the plan (jsdom does not provide the web `Response`/`Request` globals `next/server` relies on).
- Both GH-258 and GH-257 are resolved for the two behaviors this plan targeted. The user should still confirm, on a machine without the unrelated `/about` Supabase-client issue, that `npm run build` completes end to end and that the landing hero counter renders real numbers against a dev server.
- The `/about` page build failure (regular `@supabase/ssr` client construction failing at prerender time with no Supabase env vars) is a separate, pre-existing issue not covered by this plan and may warrant its own quick task or GitHub issue.

## Self-Check: PASSED

- FOUND: eslint.config.mjs
- FOUND: app/api/guild-count/route.ts
- FOUND: app/api/guild-count/__tests__/route.test.ts
- FOUND: .planning/quick/260910-oaz-fix-258-repo-wide-npm-run-lint-fails-on-/260910-oaz-SUMMARY.md
- FOUND commit: 43688d2
- FOUND commit: 3cf9a3b

---
*Phase: quick-260910-oaz*
*Completed: 2026-09-10*
