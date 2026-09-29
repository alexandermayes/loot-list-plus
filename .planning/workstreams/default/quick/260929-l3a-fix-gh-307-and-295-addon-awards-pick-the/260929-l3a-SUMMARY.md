---
phase: quick-260929-l3a
plan: 01
status: complete
subsystem: addon-awards
tags: [addon, companion, loot-history, raid-events, blp, gh-307, gh-295]
requires: [GH #277 guild-scoped lookup, GH #294 row builders, GH #313 loot_history guild-reference trigger]
provides:
  - "resolveGuildLootItem hints (boss, boss_tier, raid, deterministic fallback) with matched_by"
  - "toRaidNightDate, pickAwardRaidEvent, findAwardRaidEvent (find-only, guild-scoped, team-aware)"
  - "insertAddonAward (idempotent addon insert)"
  - "matchAwardSession (award to import-string attendance session)"
affects: [POST /api/addon/loot-award, POST /api/addon/import-string, companion syncNow, AddonImportDialog]
tech-stack:
  added: []
  patterns: [recording Supabase fakes, find-only raid-night matching, 23505 as already-recorded]
key-files:
  created:
    - lib/loot/addon-award-insert.ts
    - lib/loot/__tests__/addon-award-insert.test.ts
    - lib/addon/award-session.ts
    - lib/addon/__tests__/award-session.test.ts
    - utils/raid-events/__tests__/team-routing.test.ts
    - components/addon/__tests__/AddonImportDialog.test.tsx
  modified:
    - lib/loot/guild-scoped-lookup.ts
    - lib/loot/__tests__/guild-scoped-lookup.test.ts
    - app/api/addon/loot-award/route.ts
    - app/api/addon/loot-award/__tests__/route.test.ts
    - utils/raid-events/team-routing.ts
    - lib/loot/loot-history-rows.ts
    - lib/loot/__tests__/loot-history-rows.test.ts
    - app/api/addon/__tests__/companion-bearer-routes.test.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - companion/src/main/sync-engine.ts
    - components/addon/AddonImportDialog.tsx
decisions:
  - "OD-1: no matching raid night saves the award unlinked; awards never create or get rejected for a night"
  - "OD-4: PR says Refs #307 (not a closing keyword); addon/companion live-boss follow-up is #319"
  - "COPY-1 signed off and shipped: Loot awards row reads '{processed - n} imported, {n} already recorded' when n > 0"
  - "OD-2, OD-3, OD-5 to OD-8 accepted as recommended"
metrics:
  duration: "~18 min"
  completed: 2026-09-29
actuals:
  tokens: 36000
  tasks: 3
  commits: 5
---

# Quick 260929-l3a Plan 01: Addon awards pick the boss's tier and link to their raid night Summary

Addon and companion awards for items in two raid tiers are filed under the tier their boss (or the import string's live session) points to, every addon award is linked to the guild's own raid night for its date and team using the raid-tracking team rules, and re-sends are recorded once with a 200.

## PR

- **Draft PR #322:** https://github.com/alexandermayes/loot-list-plus/pull/322
- Base `main`, head `fix/307-295-addon-award-matching`, state OPEN, draft true.
- Body carries `Refs #307` and `Fixes #295` on their own lines (GitHub lists only #295 as a closing issue), no em dashes, ends with the Claude Code line, and says the companion change needs a companion app release. Follow-ups #319, #320 and #321 are under "Not in this PR".
- Worktree: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt307`, from origin/main 49c06c1c.

## Commits

| SHA | Message |
|---|---|
| 4f910f4a | fix(addon): file multi-tier awards under the boss's raid tier (#307) |
| d47756fe | fix(addon): link companion awards to their raid night and record re-sends once (#295) |
| 141603b2 | fix(addon): use the export's raid session for import-string awards (#307, #295) |
| 75419a9a | fix(companion): submit pending attendance before pending awards (#295) |
| 8af1c803 | feat(addon): show already recorded awards in the import results (#295) |

## Rules implemented

**Tier (#307), `resolveGuildLootItem(supabase, guildId, wowheadId, hints)`:** single-tier matches are unchanged (`single_tier`, same queries). Across tiers: the tier whose row has the boss (`boss`); else the one tier whose `Shared Boss Loot` / `Trash` row sits with that boss, via one roster query limited to the guild's own candidate tiers and compared in JS (`boss_tier`); else the live raid name (`raid`, import strings only); else the active expansion then lowest `raid_tier_id` (`fallback`, now deterministic). `Shared Boss Loot`, `Trash`, `Unknown` are never a boss signal. The loot-award route passes only `boss_name`.

**Raid night (#295), `findAwardRaidEvent`:** `raid_events` by `.eq('guild_id').eq('raid_date')`, team rules from `getGuildTeamRouting` via `pickAwardRaidEvent` (no-team: null-team night or the only night; teamed raider: own team's night or nothing; unteamed: the only night or nothing). Find-only, never creates. No night, ambiguity, no valid date or a lookup error saves unlinked (error logged with a constant first argument and `trackApiError`). `raid_events.raid_tier_id` is not used.

**Duplicates, `insertAddonAward`:** 23505 with character and night set is `already_recorded` with the existing id; an unmatched name gets a same-night, same-item, same-name pre-check; unlinked rows are not deduplicated. loot-award returns 200 `already_recorded: true` with no notify, analytics, funnel or BLP. A newly linked insert calls `recomputeBlpForItems`.

**Import strings:** attendance before awards; `matchAwardSession` gives each award its session's `raidDate` (exact across 00:00 UTC) and live boss / instance hints; the cached `lootItemId` is replaced only when `matched_by` is `boss`, `boss_tier` or `raid`; `awards.already_recorded` added and counted in processed, not errors; `recomputeBlpForEvents` kept plus `recomputeBlpForItems` for linked items.

**Companion:** `syncNow` submits attendance before awards (needs a companion release).

**COPY-1:** `AddonImportDialog` Loot awards row reads "12 imported, 3 already recorded" when n > 0; unchanged otherwise; older responses without the field are treated as 0.

## Verification (against baseline on origin/main)

| Check | Baseline | Final |
|---|---|---|
| `npx vitest run --maxWorkers=2` | 126 files, 2350 tests, 0 failures (see note) | 130 files, 2462 tests, 0 failures |
| `npx tsc --noEmit` | clean | clean |
| `npx tsc --noEmit -p tsconfig.json` in companion/ | clean | clean |
| eslint on all 17 touched non-companion files | n/a | clean (exit 0) |
| Companion tests | none exist | none exist |

Note: the raw baseline run reported 1 failure in `guild-scoped-lookup.test.ts` because a Task 1 edit landed while the baseline was running; the origin/main copy of that module and test passes 25/25 in isolation, so the effective baseline is clean. Outputs are in the scratchpad (`baseline307-*.txt`, `final307-*.txt`).

Per file: guild-scoped-lookup 59 (was 25), loot-award route 22 (was 11), import-string route 19 (was 9), loot-history-rows 23 (was 21), companion-bearer-routes 23 (mocks only), team-routing 27 (new), addon-award-insert 11 (new), award-session 14 (new), AddonImportDialog 3 (new).

`git diff --name-only origin/main...HEAD` lists only the files above; nothing under `supabase/`, no migration.

## Open decisions (surfaced in the PR)

- OD-1 save unlinked (user confirmed). OD-2 raider's team night, else only night. OD-3 UTC dates accepted for companion awards; import strings exact. OD-4 Refs #307, follow-up #319. OD-5 23505 and unmatched-name handling as above. OD-6 live-hint override only when hints decide. OD-7 no history backfill. OD-8 raid-tracking edit import now pre-fills linked addon awards; accepted.
- COPY status: COPY-1 signed off and implemented; no other copy changes.

## Deviations from Plan

1. **[User decision override] PR references.** The plan text and its automated verify grep for "Fixes #307"; per the user decision the PR uses "Refs #307" and "Fixes #295". The PR verification was adapted accordingly.
2. **[User decision override] COPY-1 in scope.** The plan said not to change `AddonImportDialog.tsx`; the signed-off COPY-1 was implemented in its own commit (8af1c803) with a new 3-test file. Files outside `files_modified`: `components/addon/AddonImportDialog.tsx`, `components/addon/__tests__/AddonImportDialog.test.tsx`.
3. **[Rule 3 - Blocking] import-string test mock.** `lib/addon/award-session.ts` imports `toRaidNightDate` from team-routing, which the import-string test mocks; the mock now passes the real `toRaidNightDate` through via `importOriginal`.
4. **Tracer gate.** Config has auto mode off, which would normally checkpoint after the tracer; the orchestrator instructed executing all 3 tasks, so the tracer verify was re-run green and execution continued.
5. **TDD commits.** Tasks 2 and 3 are `tdd="true"`; tests and code were written together and committed per task (no separate RED commits), as the orchestrator asked for atomic logical commits.
6. **Task 3 split into three commits** (import-string, companion, COPY-1) for atomicity.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-307-01 (roster query limited to guild tiers, JS compare), T-295-01 (guild_id filter, other-guild night test), T-295-02 (find-only, no cross-team link), T-295-03 (idempotent re-sends), T-295-04 (constant console first arguments) and T-295-05 (override only from guild-scoped lookup) are all mitigated and tested. Noted, unchanged: `getGuildTeamRouting` treats a failed `raid_team_members` query as "no teams" (pre-existing, shared with the attendance import).

## Self-Check: PASSED

- All created files exist in the worktree; all 5 commit SHAs are on `fix/307-295-addon-award-matching` and pushed; PR #322 is an open draft against main.
- Not done by design (per constraints): no docs commit, STATE.md and ROADMAP.md not updated, nothing merged, no `--admin`, no push to main, no force-push, no SQL against a real database.
