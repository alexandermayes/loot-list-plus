---
phase: 01-forever-defect-and-privacy-fixes
plan: 05
subsystem: api
tags: [nextjs, supabase, typescript, typed-client, scan-test, vitest, companion, bot]

requires:
  - phase: 01-forever-defect-and-privacy-fixes
    provides: "plan 01-02 createTypedServiceRoleClient and TypedServiceClient; plans 01-02, 01-07 and 01-04 moved guild-data, export-string, bot/priority and bot/score onto it"
provides:
  - "All ten route.ts files under app/api/addon and app/api/bot create their client with createTypedServiceRoleClient"
  - "import-string helper parameters typed TypedServiceClient instead of ReturnType of the untyped factory"
  - "utils/supabase/__tests__/typed-client-usage.test.ts: scan guard that fails if any addon or bot route imports or calls the untyped service-role factory"
affects: [phase-01 shipping split (PR 4, same fix branch as plan 01-04), future addon and bot routes (must use the typed factory), 01-09]

actuals:
  tokens: 3200
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Scan test over route files with a test-local matcher (findUntypedClientUse) and a synthetic non-vacuity self-check"
    - "Factory swap only: the typed factory delegates to the untyped one, so existing vi.mock of the untyped module in addon tests keeps working"

key-files:
  created:
    - utils/supabase/__tests__/typed-client-usage.test.ts
  modified:
    - app/api/addon/loot-award/route.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/sync-token/route.ts
    - app/api/addon/attendance/route.ts
    - app/api/addon/auth/route.ts
    - app/api/addon/auth/token/route.ts

key-decisions:
  - "No narrowing, casts or guards were needed: the six routes compiled cleanly on the typed client (research spike A confirmed), so no runtime behaviour changed"
  - "Scan matches the exact specifier @/utils/supabase/service-role and the call createServiceRoleClient(, so the typed module path never false-positives"
  - "lib/addon/sync-tokens.ts keeps the untyped factory: it is a library, not a route (accepted debt per the plan)"

patterns-established:
  - "Addon and bot routes must call createTypedServiceRoleClient; the scan test enforces it for every route.ts under app/api/addon and app/api/bot"

requirements-completed: [FIX-06]

coverage:
  - id: D1
    description: "All ten addon and bot routes use the typed service-role client, so a nonexistent table or filter column in any of them fails npm run typecheck"
    requirement: "FIX-06"
    verification:
      - kind: other
        ref: "npx tsc --noEmit (ignoring .next/) reports 0 errors; grep -rl createTypedServiceRoleClient() over app/api/addon and app/api/bot route.ts prints 10"
        status: pass
      - kind: unit
        ref: "utils/supabase/__tests__/typed-service-role.test.ts (three @ts-expect-error guards from plan 01-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A scan test fails if any route.ts under app/api/addon or app/api/bot imports or calls the untyped factory, and it is not vacuous"
    requirement: "FIX-06"
    verification:
      - kind: unit
        ref: "utils/supabase/__tests__/typed-client-usage.test.ts#file-count floor, no-violation, synthetic violating and clean snippets"
        status: pass
    human_judgment: false
  - id: D3
    description: "Companion sign-in, token, sync, award, attendance and import behaviour is unchanged: addon suites pass with no edits to expected values"
    requirement: "FIX-06"
    verification:
      - kind: unit
        ref: "npx vitest run app/api/addon app/api/bot lib/addon utils/supabase (16 files, 332 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Typed-client protection covers nonexistent table names and filter columns, not nonexistent columns inside a .select() string (edge probe E-17)"
    requirement: "FIX-06"
    verification: []
    human_judgment: true
    rationale: "E-17 is left as a flagged assumption by the plan: a bad column inside a select string surfaces only where the returned row is consumed, so a human reviewer should confirm that residual risk is acceptable"

duration: 6min
completed: 2026-10-13
status: complete
---

# Phase 01 Plan 05: Typed service-role client on every addon and bot route Summary

**All ten addon and bot routes now create their Supabase client with `createTypedServiceRoleClient`, so a misspelled table or filter column in any of them fails `npm run typecheck`, and a scan test fails the build if a route goes back to the untyped factory.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-13T21:48:00Z
- **Completed:** 2026-10-13T21:54:00Z
- **Tasks:** 2 (the second as RED, then GREEN)
- **Files modified:** 7 (6 routes, 1 new test)

## Accomplishments

- The companion's award and import writes (`loot-award`, `import-string`) compile against the generated schema; the three `import-string` helpers take `TypedServiceClient`.
- `sync-token` (two call sites), `attendance`, `auth` and `auth/token` moved to the typed factory. With plans 01-02, 01-07 and 01-04 that makes ten of ten routes typed.
- New scan test `utils/supabase/__tests__/typed-client-usage.test.ts` walks every `route.ts` under `app/api/addon` and `app/api/bot` and fails if any imports `@/utils/supabase/service-role` or calls `createServiceRoleClient(`.
- No runtime change. Not one addon or bot test file was edited, and the auth suites (`pkce-flow`, `companion-bearer-routes`) pass unchanged, which is the T-05-02 mitigation.

## Task Commits

1. **Task 1 (tracer): Companion award and import writes go through the typed client** - `362e6e50` (fix)
2. **Task 2 RED: Failing scan test** - `96650eeb` (test). It failed naming exactly the four routes still on the untyped factory (sync-token, attendance, auth, auth/token), which is itself a real-world non-vacuity proof.
3. **Task 2 GREEN: Remaining four routes on the typed client** - `dbe5d189` (fix)

**Plan metadata:** recorded in the following docs commit (docs: complete plan)

**Tracer gate:** the tracer's `<verify>` (addon suites plus typecheck) passed after commit `362e6e50`; the gate was passed under the user's standing approval for this phase, and no stop was made.

## Files Created/Modified

- `utils/supabase/__tests__/typed-client-usage.test.ts` - scan guard with test-local `findUntypedClientUse`, file-count floor (at least 10), zero-violation check, and synthetic violating and clean snippets
- `app/api/addon/loot-award/route.ts` - typed factory
- `app/api/addon/import-string/route.ts` - typed factory, three helper parameters `TypedServiceClient`
- `app/api/addon/sync-token/route.ts` - typed factory at both call sites
- `app/api/addon/attendance/route.ts` - typed factory
- `app/api/addon/auth/route.ts` - typed factory
- `app/api/addon/auth/token/route.ts` - typed factory

## Decisions Made

- No casts or narrowing were needed anywhere; research spike A held. No payload, write shape or default was touched (prohibition honoured).
- The matcher keys on the exact untyped specifier and the `createServiceRoleClient(` call text, so `createTypedServiceRoleClient(` and the typed module path are never flagged.
- `lib/addon/sync-tokens.ts` stays on the untyped factory (library, not a route; accepted debt, recorded in plan 01-02).

## Deviations from Plan

None - plan executed exactly as written. TDD was run as RED then GREEN commits for Task 2 (the plan marks it `tdd="true"`).

## Verification Results

- Acceptance greps: `createTypedServiceRoleClient()` is 1 in `loot-award`, 1 in `import-string`, 2 in `sync-token`; 10 route files across `app/api/addon` and `app/api/bot`; `supabase: TypedServiceClient` is 3 in `import-string`.
- `npx vitest run app/api/addon app/api/bot lib/addon utils/supabase`: 16 files, 332 tests, all pass. `git diff --stat` over the addon, bot and `lib/addon` test paths prints nothing.
- `npx tsc --noEmit` (ignoring `.next/`): 0 errors.
- `npx eslint app/api/addon utils/supabase`: exit 0 (two pre-existing unused-variable warnings in `utils/supabase/__tests__/paginate.test.ts`, not from this plan).
- **Scan-test non-vacuity check on a real route:** with a scratch backup, the typed import in `app/api/addon/attendance/route.ts` was temporarily swapped back to the untyped import. The scan test failed with `app/api/addon/attendance/route.ts: imports the untyped module @/utils/supabase/service-role`. The file was restored from the backup (diff is the intended two-line switch) and the test passes again.

## What success criterion 3 does and does not cover

Roadmap success criterion 3 covers nonexistent **table names** (and nonexistent filter columns passed to `.eq` and similar filters). It does **not** cover a nonexistent column inside a `.select('...')` string. That is flagged assumption E-17 and is left for human review: such a column only surfaces where the returned row is used, so consumers should use typed rows without `as` casts to keep the protection.

## Issues Encountered

None. One tooling slip: the first `sed -i` call used GNU syntax on macOS and failed before changing anything; it was rerun with BSD syntax.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file access or schema change; only the factory call changed. T-05-01 is mitigated by the scan test plus the typed client, and T-05-02 by the unedited auth suites passing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-09 (discord-bot only) is independent of this plan.
- Shipping: this is PR 4 of the phase, on the same `fix/...` branch as plan 01-04, after PR 3 has merged. It must not ship ahead of 01-04 or 01-07, because the scan test needs all ten routes typed.
- E-17 is routed to the verifier for human review.

## Self-Check: PASSED

- FOUND: utils/supabase/__tests__/typed-client-usage.test.ts
- FOUND commits: 362e6e50, 96650eeb, dbe5d189
- All acceptance criteria re-run and passing (see Verification Results)

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*
