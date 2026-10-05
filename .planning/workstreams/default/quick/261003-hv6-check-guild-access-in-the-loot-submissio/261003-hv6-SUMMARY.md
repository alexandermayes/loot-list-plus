---
phase: quick-261003-hv6
plan: 01
subsystem: api
tags: [supabase, rls, service-role, loot-submissions, next-route-handler, vitest, pglite]

requires: []
provides:
  - "GET and POST /api/loot-submissions/item-counts now scope counts to lists in guilds where the caller holds an active membership, matching the rule loot_submission_items_select already applies to the caller's own session"
  - "Input validation (COPY C-1, a 2000-id limit) ahead of any database client"
  - "Fail-closed error handling: a characters, memberships or loot_submissions lookup error returns 500 with no counts (closes former follow-up FU-2)"
affects: [loot-submissions, api-security]

actuals:
  tokens: 7310
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Guild-scoped service-role lookup before a count/read step, mirroring the findInvalidCharacterIds/findInvalidRaidEventIds pattern in lib/loot/guild-award-refs.ts (throw-on-error, chunked in() queries, UUID shape pre-filter)"

key-files:
  created:
    - app/api/loot-submissions/item-counts/__tests__/route.test.ts
  modified:
    - app/api/loot-submissions/item-counts/route.ts

key-decisions:
  - "OD-1 resolved option A (user, 2026-10-03): a list is readable by any active member of its guild, the same rule the loot_submission_items_select RLS policy already applies to the caller's own session. No manage_submissions check added (every caller of this route today is already an officer on the one page that calls it)."
  - "OD-2 resolved option A (user, 2026-10-03): requests are capped at 2000 distinct ids (ITEM_COUNTS_MAX_IDS), counted after de-duplication and before the UUID filter; over-limit requests get 400 with no database client created."
  - "C-1 copy approved as drafted (2026-10-03): \"ids must be a list of up to 2000 loot list ids\"."
  - "Orchestrator amendment (D-05, 2026-10-03): the item-count loop now fails closed -- a loot_submission_items query error throws and the handler returns 500 'Internal server error' instead of returning partial counts. This closes the former follow-up FU-2; a dedicated route test covers it."

requirements-completed: [HV6-R1, HV6-R2, HV6-R3, DELIVERY-R1]

coverage:
  - id: D1
    description: "A caller gets item counts only for lists in guilds where they hold an active membership; lists in another guild, an inactive-membership guild, unknown ids and non-UUID strings are left out of the response"
    requirement: "HV6-R1"
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/item-counts/__tests__/route.test.ts (allowed, other guild, inactive membership, multi-guild, mixed, no membership)"
        status: pass
      - kind: other
        ref: "SP/pglite-hv6/scenarios-hv6.mjs HV6-1 to HV6-10 (PGlite parity proof, scratchpad only)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Malformed and over-limit requests are refused with a 400 before any database client is created; lookup errors fail closed with a 500 and no partial counts"
    requirement: "HV6-R2"
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/item-counts/__tests__/route.test.ts (malformed POST, empty POST, limit, chunking, errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sibling routes under app/api/loot-submissions/ were checked for the same gap; none needed a change"
    requirement: "HV6-R3"
    verification: []
    human_judgment: true
    rationale: "A manual code read of every sibling route's own-guild/ownership checks (D-08 below); no automated test can prove the absence of a gap across unrelated files."
  - id: D4
    description: "Full regression, no em dashes, local commits only, PR body draft"
    requirement: "DELIVERY-R1"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite), npx tsc --noEmit, npx eslint --max-warnings 0 app/api/loot-submissions/item-counts"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-10-03
status: complete
---

# Phase quick-261003-hv6: Check guild access in the loot submission item-counts route Summary

**The /api/loot-submissions/item-counts route now counts only lists in guilds where the caller is an active member -- the same rule the database already applies to reading a list's items -- instead of returning counts for any list id in any guild to any signed-in user.**

## Performance

- **Duration:** 45 min
- **Tasks:** 2/2
- **Files touched:** 2 (route.ts rewritten, route.test.ts created)

## Commits

| Hash | Message |
|------|---------|
| `7ac7e70d` | fix(loot-lists): item-counts only returns counts for lists in the caller's guilds |

Full trailer on the commit: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Made in the scratchpad worktree `wthv6` on branch `fix/item-counts-guild-access`, based on `origin/main` at `f475b60e`. Not pushed; no PR opened; no upstream configured.

## Open Decisions Applied

- **OD-1 (who may get a list's item count): Option A**, as D-01 -- any active member of the list's guild. This is exactly the rule `loot_submission_items_select` already applies, so the route returns nothing a caller's own session could not already read. The officer loot lists page (the only caller) always passes.
- **OD-2 (id limit per request): Option A**, as D-04 -- at most 2000 distinct ids after de-duplication, otherwise 400.
- **C-1 copy (signed off as drafted):** `"ids must be a list of up to 2000 loot list ids"`.

## Access Rule and Request/Response Contract

- **401:** No session returns `{ error: 'Unauthorized' }`; no database client is created.
- **Validation (before any database client):**
  - POST: a body that is not JSON, is `null`, is an array, is not an object, or whose `ids` field is present but not an array of strings, returns 400 with C-1.
  - An absent or `null` `ids` (GET with no `ids` query param, or POST with `ids` absent/`null`) returns 200 `{}`.
  - Empty strings are dropped and ids are de-duplicated in first-seen order; zero ids remaining returns 200 `{}`.
  - More than 2000 distinct non-empty ids (counted before the UUID filter) returns 400 with C-1, for both GET and POST.
  - The service-role client is created only once at least one well-formed UUID remains among the normalized ids; a request whose only ids are non-UUID strings returns 200 `{}` without creating a client.
- **Filtering, not refusal:** From the validated ids, only well-formed UUIDs are queried. `findReadableListIds` looks up the caller's own characters, then their active (`is_active = true`) guild memberships, then restricts the requested ids to `loot_submissions` rows whose `guild_id` is one of those active guilds (queried in chunks of 100). Ids of another guild, an inactive-membership guild, unknown ids and non-UUID strings are all simply absent from the response, exactly like a list with no live items -- the response never reveals whether such an id exists.
- **Counting (unchanged in behavior, now fails closed):** `getItemCounts` still counts only live items (`removed_at is null`), in batches of 100 submission ids, paginated in pages of 1000 ordered by `id`. Per the orchestrator's D-05 amendment, a query error in this loop now throws instead of silently ending the batch, so the handler returns 500 with no counts rather than a partial result.
- **Errors:** Any error from the characters, `character_guild_memberships`, or `loot_submissions` lookups returns 500 `{ error: 'Internal server error' }` with no counts and no `loot_submission_items` query. Every `console.error` call keeps a constant first argument (CodeQL tainted-format-string rule).
- **Unchanged:** Response shape (`Record<string, number>`), the loot lists page (`LootSubmissionsContent.tsx`), and no migration was needed.

## Route Tests

`app/api/loot-submissions/item-counts/__tests__/route.test.ts` -- 30 test cases (including 4 `it.each` groups) using a recording fake Supabase client (characters, `character_guild_memberships`, `loot_submissions`, `loot_submission_items`):

- 401 gate for GET and POST (no database call).
- Allowed request returning counts for readable lists only, with the exact query shape asserted (`in('guild_id', ...)`, `in('id', ...)`, `is('removed_at', null)`).
- Other-guild and inactive-membership requests return `{}` with no `loot_submission_items` call.
- Multi-guild request spanning two of the caller's active guilds.
- Mixed request (allowed, other-guild, inactive, unknown, non-UUID, duplicate) returns only the one readable id.
- GET with a comma-separated query string, a trailing empty entry, no `ids` param, and an empty `ids` param.
- 6 malformed POST body shapes (400 with C-1, no database client).
- 4 empty-result POST body shapes (200 `{}`, no database client).
- Limit: 2001 distinct ids (400) for both GET and POST; 2001 copies of one id (accepted, distinct count 1).
- Chunking: 150 distinct unknown ids split into two `loot_submissions` lookups of 100 and 50.
- No membership: a user with only an inactive membership, and a user with no characters, both get `{}` with no `loot_submissions` call.
- 3 lookup-error cases (characters, memberships, `loot_submissions`) each return 500 with no `loot_submission_items` call.
- Pagination: 1001 live items on one list counted across two `range` pages (0-999, 1000-1999).

All 30 pass. `npx tsc --noEmit` and `npx eslint --max-warnings 0 app/api/loot-submissions/item-counts` both exit 0.

## PGlite Parity Proof

Scratchpad-only, never committed: `SP/pglite-hv6/scenarios-hv6.mjs`, run via `node pglite-all/run.mjs --wt wthv6 pglite-hv6/scenarios-hv6.mjs`.

- **HV6-1 to HV6-7:** for each of the 7 seeded users (O_A, R1, R2, GONE, RB, GM_A, GM_B), the D-01 rule's counts (computed as the service role) exactly equal the counts that user's own signed-in session reads from `loot_submission_items` under RLS.
- **HV6-8 to HV6-10:** anchoring checks confirming the equality above is not vacuously empty (R1's view covers all four guild-A fixture lists with the expected per-list counts; RB's view covers guild B's one list; GONE and GM_A both read nothing).
- **Result:** `PASS 10 FAIL 0`. Output saved at `SP/pglite-hv6/run-output-hv6.txt`.
- **HV6-INFO line (not a check, for follow-up FU-1):** GONE's own session reads 4 `public.loot_submissions` rows today (matches the planner's prior probe of 4 exactly), via the `loot_submissions` SELECT policy that accepts any membership row (active or not) rather than only an active one.

## Baseline vs. Final Regression

| Check | Baseline (f475b60e) | Final (after this change) |
|---|---|---|
| `npx vitest run` (full suite) | 1 test file FAILED: `__tests__/quality-brand-token-parity.test.ts` (5000ms timeout under load; pre-existing and known-flaky per orchestrator notes), 175/176 files otherwise passed, 3145/3146 tests passed | 177/177 files passed, 3176/3176 tests passed (the previously-flaky file passed clean on this run) |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx eslint --max-warnings 0 app/api/loot-submissions/item-counts` | exit 0 (no tests existed yet) | exit 0 |
| `sh SP/new-fails.sh` gate | n/a | **PASS** -- 0 new FAIL lines, errors did not rise (0 to 0), test file total rose 176 to 177 (the new route test file); no FLAKY line needed since the final run had zero FAIL lines |

No new failures were introduced by this change. The text gate (no em dash in added lines, in commit messages, or in the PR body) passed.

## PR Body Draft

`SP/pr-body-hv6.md` -- neutral wording, no exploit detail, FU-1 kept out (per instruction); ends with the exact line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Sibling Route Scan (D-08, HV6-R3)

Every other route under `app/api/loot-submissions/` was checked at `f475b60e` and found to already scope its reads or writes correctly:

- `pending-count` calls `verifyPermission(manage_submissions)` on `guild_id` before its cached count.
- `needs-resubmit-count` counts only the caller's own characters' lists.
- `statuses` and `GET /api/loot-submissions` check that the caller owns `character_id` before reading, and return only that character's lists.
- `submit` checks ownership.
- `review` and `revert` check `manage_submissions` on the list's own guild.
- `delete` checks `manage_submissions` on `guild_id` and filters every read and delete by `guild_id`.
- `remove-item` reads the list filtered by `guild_id`, then allows the owner or `manage_submissions` on that guild.

None of these had the item-counts gap (an unchecked service-role read keyed only on caller-supplied ids), so no change was needed to any sibling route in this task.

## Follow-ups (neutral wording, tracked without public detail)

- **FU-1:** One `loot_submissions` SELECT policy ("Guild members can view guild submissions") accepts any membership row rather than only an active one, so a caller whose guild membership has gone inactive can still read that guild's list metadata (not item contents) via that separate policy. Out of scope for this app-only fix since it needs a migration; recorded here as a candidate for a separate quick task.
- **FU-2:** ~~The count loop ends quietly on a query error and can return partial counts.~~ Resolved in this task per the orchestrator's D-05 amendment: a count query error now throws and the handler returns 500 with no counts.
- **FU-3:** The GET handler has no caller in the current codebase (only `LootSubmissionsContent.tsx`'s POST calls are used) and could be removed in a future cleanup.
- **FU-4:** `statuses` and `GET /api/loot-submissions` accept a `guild_id` parameter they do not check against the caller's access, though in practice they only ever return the caller's own lists regardless of what `guild_id` is passed.

## Deviations from Plan

### Auto-fixed Issues

None beyond the orchestrator-amendment deviation below -- the plan executed as written for Task 1 and Task 2.

### Orchestrator Amendment Applied

**[Orchestrator amendment - D-05 fail-closed count loop]**
- **Found during:** Plan review, before Task 1 execution (recorded in the plan's COPY section).
- **Change:** The plan's original D-05 text said "The count loop keeps its current behaviour (an error ends the loop for that batch)." The orchestrator amended this before execution: a `loot_submission_items` query error now throws inside `getItemCounts`, so the handler's try/catch returns 500 `'Internal server error'` with no counts, instead of silently returning a partial count map. This closes what would otherwise have been follow-up FU-2.
- **Files modified:** `app/api/loot-submissions/item-counts/route.ts` (the `getItemCounts` function), `app/api/loot-submissions/item-counts/__tests__/route.test.ts` (a dedicated "loot_submissions lookup errors" test, plus the characters/memberships error tests).
- **Commit:** `7ac7e70d`.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## Self-Check: PASSED

- FOUND: `app/api/loot-submissions/item-counts/route.ts` (modified, confirmed via `git diff --name-only f475b60e...HEAD`)
- FOUND: `app/api/loot-submissions/item-counts/__tests__/route.test.ts` (created, confirmed via `git diff --name-only f475b60e...HEAD`)
- FOUND: commit `7ac7e70d` (confirmed via `git log --oneline -5` in `wthv6`)
- FOUND: `SP/pglite-hv6/scenarios-hv6.mjs` and `SP/pglite-hv6/run-output-hv6.txt` (scratchpad, not committed, confirmed present on disk)
- FOUND: `SP/pr-body-hv6.md` (scratchpad, not committed, confirmed present on disk, non-empty, no em dash)
