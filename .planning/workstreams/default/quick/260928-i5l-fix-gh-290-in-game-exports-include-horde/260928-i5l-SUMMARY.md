---
phase: quick-260928-i5l
plan: 01
subsystem: loot-domain, addon-api, reserve-ui
tags: [gh-290, faction-alias, gargul, addon-export, companion, wowhead-id]
status: complete
dependency-graph:
  requires:
    - phase: quick-260927-wbu
      provides: domain/loot/faction-item-aliases.ts (FACTION_ITEM_ALIASES, lookup helpers), extended here with export-direction helpers
  provides:
    - domain/loot/faction-item-aliases.ts (FACTION_ITEM_VARIANTS, factionVariantIds, withFactionVariants — export-direction mirroring)
    - domain/reserve/gargul-export.ts (buildGargulSoftReserves, buildGargulHardReserves — extracted, faction-variant-safe)
  affects:
    - app/api/addon/guild-data/route.ts
    - app/api/addon/export-string/route.ts
    - domain/loot/gargul-dft.ts
    - app/(app)/reserve/runs/[id]/_client.tsx
tech-stack:
  added: []
  patterns:
    - "Export-direction mirroring vs. resolution-direction lookup, kept as two separate helper families in the same file: wowheadIdCandidates/findByWowheadId/resolveByWowheadId (Horde -> Alliance, for resolving an inbound in-game id to a catalog row) stay untouched; withFactionVariants (both directions, for emitting a catalog row under a sibling id) is new and used only by exporters whose consumer has no linking of its own"
    - "Exact-rows-win mirroring: withFactionVariants computes the set of present wowhead_ids once over the whole input array, then never mirrors a variant id already in that set — a guild that hand-added the other faction's row is never duplicated or overwritten"
    - "Per-exporter mirror/no-mirror split locked by tests: the two LootList+ addon exports call withFactionVariants (their consumers, the companion and the Lua addon, key by exact wowhead_id with no linking of their own); the two Gargul exports never do (Gargul already links these ids and sums/lists across links, so mirroring there would double-count) — each behavior is asserted per exporter, not just documented"
key-files:
  created:
    - app/api/addon/guild-data/__tests__/route.test.ts
    - app/api/addon/export-string/__tests__/route.test.ts
  modified:
    - domain/loot/faction-item-aliases.ts
    - domain/loot/__tests__/faction-item-aliases.test.ts
    - app/api/addon/guild-data/route.ts
    - app/api/addon/export-string/route.ts
    - domain/loot/gargul-dft.ts
    - domain/loot/__tests__/gargul-dft.test.ts
    - domain/reserve/gargul-export.ts
    - domain/reserve/__tests__/gargul-export.test.ts
    - app/(app)/reserve/runs/[id]/_client.tsx
decisions:
  - "N-01 confirmed and filed as GH #300: the companion cannot authenticate against the two addon routes today (no /api/addon/auth/token exchange route, and both routes accept only the cookie session, never a Bearer sync token). The PR body states plainly that the addon-export half of this fix takes effect only once #300 is fixed, and that Gargul exports need no change since Gargul already links the faction ids natively."
  - "OD-01 (planner finding) shipped as its own droppable commit: GET /api/addon/guild-data selected loot_items.slot, a column that does not exist (the real column is item_slot, which export-string already selected correctly); the old select made PostgREST reject the whole loot_items query, so items was always [] and priorities was queried for zero ids."
  - "PR base and prior work confirmed live before touching code: git worktree add pulled HEAD to 3f57adc1, which is #294/PR #299 (addon award raid-tier fix, merged), one commit after d06516a1 (#277/PR #292, faction-item-aliases.ts). Both are on origin/main, so this PR's Horde-quest-head fix layers cleanly on top."
metrics:
  duration: ~50min
  completed: 2026-09-28
actuals:
  tokens: 13873
  tasks: 3
  commits: 4
---

# Phase quick-260928-i5l Plan 01: Fix GH #290 (in-game exports include Horde quest heads) Summary

Both LootList+ addon exports (`guild-data` for the companion, `export-string` for the addon) now mirror faction-variant quest-head rows under the sibling faction's `wowhead_id` via a new `withFactionVariants` helper, while the two Gargul exports (`gargul-dft.ts`, the extracted `gargul-export.ts` soft-reserve builders) are proven by new tests to never mirror, since Gargul already links these ids itself; also fixed a pre-existing bug (OD-01) where `guild-data` selected a nonexistent `loot_items` column and always returned zero items.

## PR

**#301** (draft): https://github.com/alexandermayes/loot-list-plus/pull/301
Branch: `fix/290-export-faction-aliases` (from `origin/main` at `3f57adc1`)
Base: `main`
Title: "fix: carry Horde quest head ids in addon exports (#290)"

## Commits

- `f137bd66` — fix(addon): mirror faction-variant quest heads in the guild-data export (#290)
  - `domain/loot/faction-item-aliases.ts`, `domain/loot/__tests__/faction-item-aliases.test.ts`
  - `app/api/addon/guild-data/route.ts`, `app/api/addon/guild-data/__tests__/route.test.ts` (new)
- `d98daec7` — fix(addon): select loot_items.item_slot in guild-data (the slot column does not exist)
  - `app/api/addon/guild-data/route.ts`, `app/api/addon/guild-data/__tests__/route.test.ts`
- `4887ac28` — fix(addon): mirror faction-variant quest heads in the addon export string (#290)
  - `app/api/addon/export-string/route.ts`, `app/api/addon/export-string/__tests__/route.test.ts` (new)
- `f6cae73d` — test(gargul): lock no faction mirroring in Gargul exports and extract soft-reserve builders (#290)
  - `domain/loot/gargul-dft.ts`, `domain/loot/__tests__/gargul-dft.test.ts`
  - `domain/reserve/gargul-export.ts`, `domain/reserve/__tests__/gargul-export.test.ts`
  - `app/(app)/reserve/runs/[id]/_client.tsx`

All four commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Baseline

Worktree created at `wt290` from `origin/main` (`3f57adc1` — confirms both #292/PR #292 and #294/PR #299 already merged), `node_modules` symlinked from the main checkout. Baseline `npx vitest run`: **89 test files, 1760 tests, 0 failures.**

## RED failures observed before wiring

**Task 1 (guild-data mirror), against the unmodified route:**
```
mirrors every FACTION_ITEM_ALIASES pair into items and member ranked items
  AssertionError: expected [ ... ] to have a length of 5 but got 3
exact rows win: ... gets one entry per id, no mirror
  AssertionError: expected [ ... ] to have a length of 5 but got 4
```
Both failed because `items` had no mirrored rows yet (3 catalog rows, no 19002/18422 mirrors). After wrapping `items` and each member's `charItems` in `withFactionVariants`, both passed; the third test (OD-01) was written but marked `it.skip` for this commit (its RED/GREEN cycle belongs to the second commit).

**Task 1, commit 2 (OD-01), against the mirror-only route:**
```
OD-01: selects loot_items.item_slot ... and maps it to the output slot field
  AssertionError: expected [ 'id', 'name', 'wowhead_id', …(5) ] to include 'item_slot'
```
Failed because the select still named `slot`. After changing the select to `item_slot` and mapping `slot: item.item_slot`, it passed.

**Task 2 (export-string mirror), against the unmodified route:**
```
mirrors every FACTION_ITEM_ALIASES pair into payload.items and payload.members[].items
  AssertionError: expected [ ... ] to have a length of 5 but got 3
exact rows win: ... gets one entry per id, no mirror
  AssertionError: expected [ ... ] to have a length of 5 but got 4
```
Same shape as Task 1: no mirroring yet. After wrapping `items` and each `charItems` array in `buildExportPayload` with `withFactionVariants`, both passed, with `stats.items` unaffected (still `lootItems.length`, the pre-mirror catalog count).

## Per-exporter decision table (as implemented)

| Exporter | Mirror? | Verified by |
|---|---|---|
| `app/api/addon/guild-data/route.ts` | YES | `app/api/addon/guild-data/__tests__/route.test.ts` — every alias pair mirrored in `items` and `members[].items`, exact-rows-win case, OD-01 select/slot regression |
| `app/api/addon/export-string/route.ts` | YES | `app/api/addon/export-string/__tests__/route.test.ts` — same coverage against the decoded LLP1 payload; `stats.items` stays the catalog row count (3, then 4 with a hand-added row), not the mirrored count |
| `domain/loot/gargul-dft.ts` | NO | `domain/loot/__tests__/gargul-dft.test.ts` — for every alias pair, exactly one block under the id the guild's data holds, zero blocks under the sibling id, in both directions |
| `domain/reserve/gargul-export.ts` (`buildGargulSoftReserves`, `buildGargulHardReserves`) | NO | `domain/reserve/__tests__/gargul-export.test.ts` — a submission/hard-reserve on the Alliance-head uuid yields items/entries under only that id, for every alias pair, plus an encode/decode round trip that confirms exactly one item id per reservation survives |
| companion/, addon/ | No code change | Confirmed by scope: `git diff --name-only origin/main...HEAD` touches none of `companion/`, `addon/` |

Gargul evidence (cited in code comments and the PR body): `Data/ItemLinks.lua` (native id links), `Utils/Items.lua` (`GL:getLinkedItemsForID`), `Classes/TMB.lua` (`TMB:byItemID` checksum includes the id), `Classes/SoftRes.lua` (`SoftRes:byItemID`, `SoftRes:playerReservesOnItem`).

## OD-01 status: kept, shipped as its own commit

`GET /api/addon/guild-data` selected `loot_items.slot`, a column `loot_items` does not have (the real column is `item_slot`, matching what `export-string` already selected). The bad select made PostgREST reject the whole `loot_items` query, so `items` was always `[]` and the downstream `item_priorities` query ran with zero ids. Fixed in commit `d98daec7`, kept separate from the mirror commit so it can be reverted independently if the user wants it filed as its own issue instead (noted in the PR body's "Also fixed" section).

## Final verification

- `npx vitest run` (full suite): **91 test files, 1783 tests, 0 failures** (baseline 89/1760 — 2 new route-test files, 23 new tests, no regressions). One rerun of the full suite hit a single flaky `ERR_INVALID_URL` unhandled-rejection error from an unrelated test (`app/(app)/reserve/components/CreateReserveRunModal.tsx`, not in this PR's file list); a rerun of the full suite and an isolated run of that file's test both passed cleanly with 0 errors — not a defect introduced by this PR. No `--maxWorkers` flag was needed; the host was not observed to time out workers.
- `npx tsc --noEmit`: 0 errors.
- `npx eslint` on the 11 touched files: **0 errors, 6 pre-existing warnings**, all on `app/(app)/reserve/runs/[id]/_client.tsx` (unused `useGuildContext` import, three `react-hooks/exhaustive-deps` warnings, one `<img>` LCP warning) — confirmed identical (same warning text, only line numbers shifted) against `git show origin/main:app/(app)/reserve/runs/[id]/_client.tsx` piped through `eslint --stdin`.
- `git diff --name-only origin/main...HEAD` lists exactly the 11 files in the plan's `files_modified`. The excluded-path check (`supabase companion addon lib/loot app/api/addon/loot-award app/api/addon/import-string app/api/loot-history package.json package-lock.json`) is empty.
- Branch pushed: `origin/fix/290-export-faction-aliases`. Draft PR #301 opened against `main`, verified via `gh pr view --json`: `[isDraft, baseRefName, headRefName, containsFixes290, noEmDash, endsWithClaudeLine]` = `[true, "main", "fix/290-export-faction-aliases", true, true, true]`.
- No merge, no `--admin`, no push to `main`, no SQL against a database.

## Deviations from Plan

None — plan executed exactly as written, including the locked user decisions (OD-01 shipped as its own commit; N-01 filed as GH #300 and referenced by number in the PR body; #294/PR #299 and #292 confirmed already on `origin/main` before starting, and the worktree was based on current `origin/main` at `3f57adc1`).

## Issues Encountered

One flaky unhandled-rejection error (`ERR_INVALID_URL` in an unrelated reserve-run-modal test) surfaced on one of three full-suite runs during Task 3 verification; not reproducible on rerun, not in this PR's file list, treated as host-load flake per CLAUDE.md guidance rather than a regression to chase.

## User Setup Required

None — no external service configuration required. The mirroring fix has no live effect on the companion sync path until GH #300 (missing `/api/addon/auth/token` exchange route) is separately fixed; that is documented in the PR body's "Worth knowing" section, not something this PR can or should resolve.

## Next Phase Readiness

- PR #301 is open, draft, targeting `main`, ready for review.
- Follow-up GH #300 is the blocker for the companion sync path to actually exercise this fix in production; the export-string path (regenerated on demand from the guild admin page) is unaffected by #300 and works today once this PR merges.
- No other blockers identified.

## Known Stubs

None.

## Threat Flags

None. Every threat in the plan's threat register (T-290-01 through T-290-04, T-290-SC) was mitigated exactly as planned: no-mirror Gargul tests (T-290-01), exact-rows-win plus never-mutates-input tests (T-290-02), payload-size and dependency-diff checks (T-290-04, T-290-SC) all pass; T-290-03 (information disclosure) was accepted per the plan with no new query, table, or cross-guild data introduced.

## Self-Check: PASSED

- `domain/loot/faction-item-aliases.ts` (modified) — FOUND
- `domain/loot/__tests__/faction-item-aliases.test.ts` (modified) — FOUND
- `app/api/addon/guild-data/route.ts` (modified) — FOUND
- `app/api/addon/guild-data/__tests__/route.test.ts` (new) — FOUND
- `app/api/addon/export-string/route.ts` (modified) — FOUND
- `app/api/addon/export-string/__tests__/route.test.ts` (new) — FOUND
- `domain/loot/gargul-dft.ts` (modified) — FOUND
- `domain/loot/__tests__/gargul-dft.test.ts` (modified) — FOUND
- `domain/reserve/gargul-export.ts` (modified) — FOUND
- `domain/reserve/__tests__/gargul-export.test.ts` (modified) — FOUND
- `app/(app)/reserve/runs/[id]/_client.tsx` (modified) — FOUND
- Commit `f137bd66` — FOUND in `git log --oneline --all`
- Commit `d98daec7` — FOUND in `git log --oneline --all`
- Commit `4887ac28` — FOUND in `git log --oneline --all`
- Commit `f6cae73d` — FOUND in `git log --oneline --all`
- Branch `origin/fix/290-export-faction-aliases` — FOUND on GitHub, up to date with `f6cae73d`
- PR #301 — FOUND, draft, base `main`, head `fix/290-export-faction-aliases`

---
*Phase: quick-260928-i5l*
*Completed: 2026-09-28*
