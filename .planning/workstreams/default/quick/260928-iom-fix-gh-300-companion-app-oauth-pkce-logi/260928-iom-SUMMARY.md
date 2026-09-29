---
phase: quick-260928-iom
plan: 01
subsystem: database, api, frontend
tags: [postgres, supabase, migration, pkce, oauth, vitest, nextjs, electron]

requires: []
provides:
  - "public.addon_auth_codes table (service-role-only, single-use PKCE authorization codes, 60s expiry)"
  - "lib/addon/companion-auth.ts: PKCE authorize/consent/exchange helpers, officer-guild listing"
  - "lib/addon/sync-tokens.ts: shared cookie-or-Bearer guild-scoped auth gate for all four addon routes"
  - "GET/POST /api/addon/auth, POST /api/addon/auth/token: the companion's PKCE authorize/consent/exchange endpoints"
  - "/companion/authorize: the officer guild picker page"
affects:
  - app/api/addon/attendance/route.ts
  - app/api/addon/loot-award/route.ts
  - app/api/addon/guild-data/route.ts
  - app/api/addon/export-string/route.ts
  - app/api/addon/sync-token/route.ts
  - proxy.ts
  - next.config.ts

actuals:
  tokens: 28562
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Comment-stripped SQL shape-test pattern (stripComments, whitespace collapse, split on ';') reused from aq20-phase-backfill-migration.test.ts"
    - "PGlite in-memory behaviour proof against the real migration file, run from a scratchpad-only package (symlinked node_modules, no npm install)"
    - "Shared cookie-or-Bearer auth gate (authenticateAddonRequest + authorizeAddonGuild) kept at the exact module paths (@/utils/supabase/server, @/utils/supabase/service-role, @/utils/server-roles) the existing route tests already mock, so pre-existing tests keep intercepting through the new indirection with zero edits"
    - "Delete-and-return single-use token consumption (DELETE ... RETURNING in one statement) so a failed exchange burns the code exactly like a successful one (OD-03)"
    - "Recording fake Supabase client (lib/addon/__tests__/fake-addon-db.ts) with a `calls` log and insert/upsert-aware single()/maybeSingle(), extending the import-string test's inline fake into a reusable module"

key-files:
  created:
    - supabase/migrations/20260928180000_create_addon_auth_codes.sql
    - app/services/__tests__/addon-auth-codes-migration.test.ts
    - lib/addon/companion-auth.ts
    - lib/addon/sync-tokens.ts
    - lib/addon/__tests__/fake-addon-db.ts
    - lib/addon/__tests__/sync-tokens.test.ts
    - app/api/addon/auth/route.ts
    - app/api/addon/auth/token/route.ts
    - app/api/addon/auth/__tests__/pkce-flow.test.ts
    - app/api/addon/auth/__tests__/rate-limit.test.ts
    - app/companion/authorize/page.tsx
    - app/companion/authorize/GuildPicker.tsx
    - app/companion/authorize/__tests__/authorize-page.test.tsx
    - app/api/addon/__tests__/companion-bearer-routes.test.ts
  modified:
    - app/api/addon/attendance/route.ts
    - app/api/addon/loot-award/route.ts
    - app/api/addon/guild-data/route.ts
    - app/api/addon/export-string/route.ts
    - app/api/addon/sync-token/route.ts
    - proxy.ts
    - next.config.ts

key-decisions:
  - "Task 1 only (migration): this SUMMARY's frontmatter now covers the whole plan; see 'Task 1' section below for the migration-specific narrative and mutation-check detail."
  - "Forbidden-keyword shape-test check for DELETE narrowed to exclude the two required 'ON DELETE CASCADE' FK clauses (asserted exactly twice), since the plan's literal 'DELETE is absent' rule would otherwise conflict with the plan's own FK CASCADE requirement."
  - "guild-data and export-string diffs kept to the import lines, the two auth-check blocks, and (guild-data only) the stale sync-token doc comment, per the plan's diff caps (19 and 17 changed lines respectively, both under the 20/18 ceilings) to avoid re-touching #290's already-merged faction-alias code in the same files."
  - "sync-tokens.ts and companion-auth.ts import getAuthenticatedUser/createServiceRoleClient/verifyOfficerPermissions from the exact same module paths the four addon routes already used, so every pre-existing route test (loot-award, import-string, guild-data, export-string) kept passing unmodified after the routes were rewired onto the new shared gate."
  - "fake-addon-db.ts's single()/maybeSingle() were extended (beyond the plan's literal spec) to resolve an insert/upsert chained directly into a single-row read, matching real PostgREST's `.insert(x).select().single()` behavior, so the loot-award repudiation-trail test could assert the actual insert payload rather than a placeholder."

patterns-established:
  - "Shape-test forbidden-keyword checks for DDL-only migrations must special-case 'ON DELETE CASCADE' when FKs are required, rather than banning the bare word DELETE."
  - "A shared auth-gate module that re-exports the same underlying auth primitives (rather than wrapping them behind a new mock surface) lets pre-existing route tests continue to intercept the real calls with zero test-file edits, even after every call site is rewired onto the new gate."

requirements-completed: [GH-300-R1, GH-300-R2, GH-300-R3, GH-300-R4, GH-300-R5, GH-300-R6, GH-300-R7, GH-300-R8]

duration: 130min
completed: 2026-09-28
status: complete
---

# Phase quick-260928-iom Plan 01: Fix GH #300, companion app OAuth PKCE login Summary

**The companion desktop app's OAuth 2.0 PKCE login now works end to end: a single-use, 60-second, hashed authorization code table (migration, PR #302), a PKCE authorize/consent/exchange endpoint pair, an officer guild picker page, and a shared cookie-or-Bearer guild-scoped gate now wired into all four addon routes (guild-data, export-string, loot-award, attendance), shipped as draft PR #303 stacked on #302.**

## Performance

- **Duration:** ~130 min across all three tasks (~25 min Task 1, ~90 min Tasks 2-3, ~15 min PR/summary wrap-up)
- **Tasks:** 3 of 3
- **Files created:** 14
- **Files modified:** 7

## PRs

### PR 1 (migration, D-01)

- **Number:** #302
- **URL:** https://github.com/alexandermayes/loot-list-plus/pull/302
- **Branch:** `fix/300-companion-auth-table` (base `main`)
- **State:** DRAFT, migration-only, no closing keyword for #300 (says "Part of #300")
- **Worktree:** `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt300-table`

### PR 2 (login flow, D-02)

- **Number:** #303
- **URL:** https://github.com/alexandermayes/loot-list-plus/pull/303
- **Branch:** `fix/300-companion-auth` (base `fix/300-companion-auth-table`)
- **State:** DRAFT, `Fixes #300`
- **Worktree:** `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt300`

## SHAs

- Base (origin/main at PR 1's worktree creation): `e9fda0b73a285dd4209ec583893ba70e6972e1d9` (confirmed ancestor of the plan's referenced `3f57adc1`; #290/PR #301 already merged, per orchestrator update)
- PR 1 worktree created from `origin/fix/300-companion-auth-table` (`3f23282c`, itself based on the same `e9fda0b7`), per the orchestrator's explicit base instruction for PR 2's worktree.

### PR 1 commits

1. `3f23282c` — `feat(db): add addon_auth_codes table for companion app login (#300)`

### PR 2 commits (Tasks 2-3, in order)

1. `87d8807c` — `feat(addon): add PKCE and sync-token helpers for companion login (#300)`
2. `7ce31700` — `feat(addon): wire the PKCE authorize/token endpoints and attendance route (#300)`
3. `1e010ffb` — `feat(addon): add the companion guild picker and allow its CSP redirect (#300)`
4. `4586dd67` — `feat(addon): wire loot-award, guild-data and export-string onto the shared guild gate (#300)`
5. `75e3592b` — `feat(addon): reuse issueSyncToken, rate-limit the companion auth bucket, and test the wiring (#300)`

No plan-metadata commit was made in either worktree (per orchestrator constraint: do not commit docs artifacts, STATE.md, or ROADMAP.md).

## Task 1: PR 1, addon_auth_codes migration

- Created `supabase/migrations/20260928180000_create_addon_auth_codes.sql`: 6 statements (CREATE TABLE, CREATE INDEX, ENABLE ROW LEVEL SECURITY, REVOKE, GRANT, COMMENT), the 7-column set from D-01, 3 CHECK constraints (code_hash hex-64, code_challenge base64url-43, redirect_uri exact literal), 2 cascading FKs (`auth.users`, `public.guilds`), a 60-second `expires_at` default, RLS on with no policies, and `anon`/`authenticated` revoked in favor of `service_role`.
- Created `app/services/__tests__/addon-auth-codes-migration.test.ts` (6 tests), following the `aq20-phase-backfill-migration.test.ts` shape-test pattern.
- Ran the 4 required mutants against the shape test; all 4 failed the test as required, then were discarded (never committed).
- Wrote a PGlite behaviour proof (`scenarios.mjs`, scratchpad-only at `SCR/pglite-300`) exercising the real migration file with 27 checks across scenarios S1-S10, all PASS.
- Pushed `fix/300-companion-auth-table` and opened draft PR #302 against `main`.

### Mutation check (4/4 caught, not committed)

| # | Mutant | Failing test(s) |
|---|--------|-----------------|
| 1 | Dropped `ENABLE ROW LEVEL SECURITY` statement | statement-order and RLS/grant tests |
| 2 | Changed 60 seconds to 600 seconds | column-set/constraint/default tests |
| 3 | Changed redirect literal to `lootlistplus://auth/callback/` | constraint and redirect-literal tests |
| 4 | Added a `CREATE POLICY` statement | statement-order and RLS/grant tests |

### PGlite scenario results (S1-S10, 27 checks, all PASS)

S1 idempotent apply; S2 app-shaped row insert plus default expiry; S3 three bad redirect_uri values rejected; S4 four bad challenge shapes rejected; S5 bad/duplicate code_hash rejected; S6 delete-and-return single-use semantics; S7 FK rejection plus cascading deletes; S8 RLS on, zero policies; S9 anon/authenticated denied, service_role allowed; S10 code-consume-then-token-upsert round trip.

Full output: `SCR/pglite-300/output.txt` (scratchpad, not committed).

## Task 2 (tracer): authorize, picker, consent, token, Bearer on attendance

Implemented and committed in worktree `wt300` (branch `fix/300-companion-auth`, based on `fix/300-companion-auth-table`):

- `lib/addon/companion-auth.ts`: `COMPANION_REDIRECT_URI`, `AUTH_CODE_TTL_SECONDS`, `parseAuthorizeParams`, `isValidCodeVerifier`, `computeS256Challenge`, `isSameOriginRequest`, `issueAuthCode`, `consumeAuthCode` (constant-time challenge comparison via `timingSafeEqual`, delete-and-return burns the code on any outcome), `listOfficerGuilds`.
- `lib/addon/sync-tokens.ts`: `SYNC_TOKEN_DEFAULT_DAYS`, `hashSyncToken`, `issueSyncToken` (byte-for-byte reproduction of the original sync-token route's generation/expiry/upsert), `AddonPrincipal`, `authenticateAddonRequest`, `authorizeAddonGuild` (guild-scope check runs before any officer call on a cross-guild sync token).
- `GET`/`POST /api/addon/auth`: validates every parameter (redirect_uri checked in isolation per OD-02), sends the browser through the sign-in round trip or straight to the picker, and issues a single-use code on consent (same-origin required, OD-06) with a real 303 to `lootlistplus://auth/callback`.
- `POST /api/addon/auth/token`: burns the code first, re-checks officer rights (OD-04), and issues a guild-scoped sync token, returning exactly `{token, guild_id, guild_name, expires_at}` with `Cache-Control: no-store`.
- `/companion/authorize` (`page.tsx` + `GuildPicker.tsx`): lists only the guilds where the signed-in user has officer rights, one submit button per guild in a single form, using the signed-off `COMPANION_AUTHORIZE_COPY` exactly.
- `app/api/addon/attendance/route.ts` rewired onto `authenticateAddonRequest` + `authorizeAddonGuild` as the tracer route.
- `next.config.ts` CSP `form-action` changed to `'self' lootlistplus:` (OD-01).
- Tests: `lib/addon/__tests__/fake-addon-db.ts` (recording fake, not a test file), `lib/addon/__tests__/sync-tokens.test.ts` (13 tests), `app/api/addon/auth/__tests__/pkce-flow.test.ts` (30 tests covering every named PKCE/consent/token/e2e/drift behavior), `app/companion/authorize/__tests__/authorize-page.test.tsx` (7 tests, jsdom).

## Task 3 (expansion): remaining routes, sync-token reuse, rate limit, PR 2

- `loot-award`, `guild-data`, `export-string` rewired onto the shared `authenticateAddonRequest` + `authorizeAddonGuild` gate. `guild-data`/`export-string` diffs limited to the import lines, the two auth-check blocks, and (guild-data only) the stale sync-token doc comment: 19 and 17 changed lines respectively, both under the plan's 20/18 caps.
- `loot-award`'s `awarded_by` and the analytics `userId` now come from `access.userId` (the authenticated principal), not a cookie-only `user.id`.
- `app/api/addon/sync-token/route.ts` POST now issues through the same `issueSyncToken`; response shape (`{ data: { token, expires_at, guild_id } }`) and upsert semantics unchanged; DELETE untouched.
- `proxy.ts`: `/api/addon/auth` and `/api/addon/auth/token` now route into the existing `auth` Upstash bucket (10/min per IP), verified not to falsely match a lookalike path (`/api/addon/authz`).
- Tests: `app/api/addon/__tests__/companion-bearer-routes.test.ts` (23 tests: the guild-scope/officer gate proven identically across all four routes, the loot-award repudiation trail, and the sync-token route's unchanged behavior including its error path) and `app/api/addon/auth/__tests__/rate-limit.test.ts` (4 tests: the 10/min boundary, a fresh-IP GET, and the lookalike-path non-match).
- N-02 conflict preview: per the orchestrator's explicit update, #290 (PR #301) is already merged into `main` and `fix/290-export-faction-aliases` is deleted, so the merge-tree preview against that branch was skipped (documented in the PR body). `guild-data`/`export-string`'s existing tests, including #290's own, pass unmodified.
- Wrote PR body (`SCR/pr300-body.md`) and opened draft PR #303 against `fix/300-companion-auth-table` with `Fixes #300`.

## Baseline vs. post-change test counts

| | Test files | Tests |
|---|---|---|
| Baseline (origin/main, before Task 1) | 91 | 1783 |
| After Task 1 (PR 1 worktree) | 92 | 1789 |
| After Task 2 (PR 2 worktree, tracer) | 95 | 1845 |
| After Task 3 (PR 2 worktree, final) | 97 | 1872 |

Delta across Tasks 2-3: +5 test files, +83 tests, no regressions elsewhere. Task 2 added `pkce-flow.test.ts` (30 tests), `sync-tokens.test.ts` (13 tests) and `authorize-page.test.tsx` (7 tests) for +56 tests (1789 to 1845); Task 3 added `companion-bearer-routes.test.ts` (23 tests) and `rate-limit.test.ts` (4 tests) for +27 tests (1845 to 1872). `fake-addon-db.ts` is a shared test helper, not a `.test.ts` file, so it contributes no tests of its own.

## Verification

### PR 1 (worktree `wt300-table`)

- `npx vitest run app/services/__tests__/addon-auth-codes-migration.test.ts` — 6/6 passed
- `npx vitest run --maxWorkers=2` (full suite) — 92 files / 1789 tests, all passed
- `npx tsc --noEmit` — clean
- `npx eslint app/services/__tests__/addon-auth-codes-migration.test.ts` — clean
- `git diff --name-only origin/main...HEAD` — exactly the two expected files
- PGlite scenario script exits 0

### PR 2 (worktree `wt300`)

- `npx vitest run --maxWorkers=2` (full suite) — 97 files / 1872 tests, all passed
- `npx tsc --noEmit` — clean, no errors
- `npx eslint` on every file changed since `fix/300-companion-auth-table` (19 files) — clean, no errors or warnings
- `git diff --name-only origin/fix/300-companion-auth-table...HEAD` — exactly 19 files, matching the plan's `files_modified` list for PR 2
- `guild-data`/`export-string` diff sizes: 19 and 17 changed lines (caps: 20, 18)
- Commit trailer count matches commit count (5 commits, 5 trailer lines)
- `next.config.ts` CSP `form-action` directive appears exactly once, reading `form-action 'self' lootlistplus:`
- `gh pr view fix/300-companion-auth --json isDraft,baseRefName,title,body` verification: draft, base `fix/300-companion-auth-table`, body contains `Fixes #300`, no em dash, ends with the Claude Code line — all true

## Decisions Made

- The plan's literal instruction that "DELETE... are absent" from the migration shape test's forbidden-keyword list would fail against the plan's own required `ON DELETE CASCADE` FK clauses. Fixed by narrowing the check to assert bare `DELETE` occurrences equal exactly the count of `ON DELETE CASCADE` occurrences.
- `sync-tokens.ts` and `companion-auth.ts` deliberately import their Supabase/auth primitives from the exact same module paths the four addon routes already imported them from, so mocking those paths in existing test files kept intercepting calls made indirectly through the new shared gate, with zero edits to `loot-award`'s, `import-string`'s, `guild-data`'s, or `export-string`'s pre-existing test files.
- `fake-addon-db.ts`'s `single()`/`maybeSingle()` were extended beyond the plan's literal description to resolve an insert or upsert chained directly into a single-row read (matching real PostgREST's `.insert(x).select().single()` behavior), and a `calls` log was added recording every `.from()` invocation's filters and insert/upsert payload. This was necessary to assert `loot-award`'s `awarded_by` column directly against the Bearer token's user id (the plan's named repudiation-trail test), rather than inferring it indirectly.
- N-02's merge-tree conflict preview against `fix/290-export-faction-aliases` was skipped per the orchestrator's explicit instruction (that PR is merged and its branch deleted); this is documented as a deviation from the plan's literal step 7 in Task 3's action list, with the reason recorded in PR 2's body instead of a live merge-tree diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed the shape test's forbidden-DELETE check to not fire on required `ON DELETE CASCADE` clauses**
- **Found during:** Task 1, writing `addon-auth-codes-migration.test.ts`
- **Issue:** The plan's spec lists `DELETE` among forbidden keywords that must be "absent," but the migration is required to carry two `ON DELETE CASCADE` FK clauses, which contain the substring `DELETE`.
- **Fix:** The forbidden-keyword loop no longer includes bare `DELETE`; a separate assertion counts bare `DELETE` occurrences and requires them to equal the count of `ON DELETE CASCADE` occurrences (exactly 2).
- **Files modified:** `app/services/__tests__/addon-auth-codes-migration.test.ts` (test file only)
- **Commit:** `3f23282c`

**2. [Rule 3 - Blocking] Extended fake-addon-db's single()/maybeSingle() to resolve chained insert/upsert reads**
- **Found during:** Task 3, writing the loot-award repudiation-trail test in `companion-bearer-routes.test.ts`
- **Issue:** The plan's fake-db spec did not explicitly describe insert/upsert-then-single() resolution, and without it `loot-award`'s `.insert(...).select('id').single()` call would resolve against an unrelated (empty) row set, making the repudiation-trail assertion impossible to write correctly.
- **Fix:** Added a shared `resolveOne()` helper used by both `single()` and `maybeSingle()` that checks for a pending insert/upsert payload before falling back to a plain filtered read, and added a `calls` log so tests can inspect the exact payload sent to `insert()`/`upsert()`.
- **Files modified:** `lib/addon/__tests__/fake-addon-db.ts` (test helper only; not production code)
- **Verification:** All fake-db-dependent tests (pkce-flow, sync-tokens, authorize-page, companion-bearer-routes) pass; the loot-award repudiation-trail test directly asserts `awarded_by` on the recorded insert payload.
- **Commit:** `87d8807c` (initial version), `75e3592b` (this extension)

**3. [Deviation, documented not auto-resolved] N-02 merge-tree preview against `fix/290-export-faction-aliases` skipped**
- **Found during:** Task 3, step 7 of the action list
- **Issue:** The plan instructs running `git merge-tree` against `fix/290-export-faction-aliases` if it still exists on origin, but the orchestrator's update states that branch is deleted (PR #301 already merged into `main`).
- **Resolution:** Skipped the live merge-tree check per the orchestrator's explicit instruction; documented the situation and its rationale directly in PR 2's body instead of a computed diff, and verified by inspection that `guild-data`/`export-string`'s existing tests (including #290's own) pass unmodified against this PR's changes.
- **Files modified:** none (documentation only, in the PR body, not committed to the repo)

---

**Total deviations:** 3 (2 auto-fixed per Rules 1/3, 1 documented plan-instruction skip per an explicit orchestrator update)
**Impact on plan:** No scope creep. All three are either internal test-authoring corrections or a documented adaptation to a fact the orchestrator supplied that the plan's static analysis (written before #290 merged) could not have known.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

- PR #302 (migration) needs the user's `--admin` merge, since a migration-only PR triggers CI's branch-protection gate on this repo. It auto-deploys roughly 12 seconds after merge.
- After #302 deploys, PR #303 needs to be retargeted from `fix/300-companion-auth-table` to `main`, then merged normally (also documented in PR #303's body).
- After both PRs are merged and deployed, the user should run the manual end-to-end check documented in PR #303's body: dev-build the companion, click Login, sign in with Discord, pick a guild, and confirm sync plus one loot award land; then confirm a 403 when the same token is used against a different guild's `guild_id`.

This executor did not merge either PR, did not use `--admin`, did not push to `main`, and did not run SQL against a real database.

## Next Phase Readiness

Both PRs are draft and ready for the user's review and merge sequence. No further plan tasks remain for GH #300.

## Self-Check: PASSED

All 12 files listed in PR 2's `key-files` (plus the migration and its shape test from PR 1) were verified to exist on disk in their respective worktrees, and all 6 commit hashes (1 in `wt300-table`, 5 in `wt300`) were verified present via `git log --oneline --all`. No missing items.

---
*Phase: quick-260928-iom*
*Completed: 2026-09-28*
