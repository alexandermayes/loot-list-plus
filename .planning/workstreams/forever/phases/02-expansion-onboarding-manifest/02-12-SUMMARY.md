---
phase: 02-expansion-onboarding-manifest
plan: 12
subsystem: ui
tags: [raid-icons, forever, expansions, vitest, source-scan]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "getGuildGame and GameVersion in domain/expansion/game.ts (D-04, a guild is one game version)"
provides:
  - "Game-scoped icon lookup: optional game parameter on getRaidIcon and getRaidIconLarge, FOREVER_RAID_ICON neutral icon"
  - "Six guild tier surfaces pass the guild's game to the icon lookup (overview, loot list x2 sites, master sheet phase pills, loot submissions, expansion manager, expansion detail toggles)"
  - "Call-site inventory test (findRaidIconCalls) with a self-checking allowlist of the six surfaces plan 02-13 wires"
affects: [02-03, 02-13]

actuals:
  tokens: 5579
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Source-scan inventory test with a floor, synthetic self-checks and a self-checking allowlist that forces removal when a file is wired"
    - "Forever path never reads the name map, so colliding Classic/TBC raid names cannot leak art"

key-files:
  created:
    - utils/__tests__/raidIcons.test.ts
  modified:
    - utils/raidIcons.ts
    - app/(app)/overview/components/DashboardContent.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - app/(app)/master-sheet/components/MasterSheetContent.tsx
    - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
    - app/(app)/guild-settings/components/ExpansionManager.tsx
    - app/(app)/expansions/[expansionId]/_client.tsx

key-decisions:
  - "Neutral Forever icon is the existing inv_misc_questionmark; a Forever-specific icon is a one-line change to FOREVER_RAID_ICON"
  - "getRaidShorthand left unchanged: abbreviations are labels, not art, and are right for the Forever raids too"
  - "Expansion detail page takes a required game prop through PhaseCard into CompactRaidToggle rather than reading context in the leaf"

patterns-established:
  - "Raid icon calls under app/ must pass the game; exceptions live on GAMELESS_CALL_ALLOWLIST until 02-13 empties it"

requirements-completed: [EXPN-01]

coverage:
  - id: D1
    description: "A Forever tier never resolves to Classic or TBC raid art; getRaidIcon and getRaidIconLarge return the neutral icon for game 'forever' without reading the name map, and Classic-line names resolve exactly as before"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "utils/__tests__/raidIcons.test.ts#getRaidIcon and getRaidIconLarge: Forever scoping"
        status: pass
      - kind: unit
        ref: "utils/__tests__/raidIcons.test.ts#getRaidIcon and getRaidIconLarge: Classic line is unchanged"
        status: pass
    human_judgment: false
  - id: D2
    description: "Six guild tier surfaces pass the guild's game to the icon lookup"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "utils/__tests__/raidIcons.test.ts#raid icon call-site inventory under app/ every call outside the allowlist passes the game"
        status: pass
      - kind: other
        ref: "npm run typecheck (required game prop on CompactRaidToggle and PhaseCard)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Remaining game-less call sites are explicit and self-checking until plan 02-13 wires them"
    verification:
      - kind: unit
        ref: "utils/__tests__/raidIcons.test.ts#raid icon call-site inventory under app/ every allowlisted file exists, holds calls, and holds only game-less calls"
        status: pass
    human_judgment: false
  - id: D4
    description: "The PR adds or changes no user-facing string and no raid or boss list, so it can merge on code review without copy sign-off"
    verification: []
    human_judgment: true
    rationale: "Absence of copy changes is a review judgment; no test asserts it. The diff touches only icon call arguments, one prop, one import and tests."

duration: 44h 26m wall-clock (includes the wait for tracer checkpoint approval; active work well under an hour)
completed: 2026-10-16
status: complete
---

# Phase 02 Plan 12: Raid icons resolve by game plus name Summary

**Game-scoped raid icon lookup (optional `game` parameter, neutral `FOREVER_RAID_ICON` for Forever) wired into six guild tier surfaces, with a source-scan inventory test whose self-checking allowlist hands the last six game-less surfaces to plan 02-13.**

## Performance

- **Duration:** 44h 26m wall-clock, dominated by the tracer checkpoint wait
- **Started:** 2026-10-14T21:49:00Z
- **Completed:** 2026-10-16T18:15:09Z
- **Tasks:** 3 of 3
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- `getRaidIcon(name, game?)` and `getRaidIconLarge(name, game?)` return the neutral icon for `'forever'` without indexing the name map, so a Forever "Onyxia's Lair" or "Hyjal Summit" cannot show Classic or TBC art, and prototype-pollution names are inert on that path (T-02-12-01, T-02-12-02). Omitted game or `'classic'` resolves exactly as before.
- Overview, loot list (both sites), master sheet phase pills, loot submissions, expansion manager and expansion detail raid toggles all pass the guild's game.
- `findRaidIconCalls` inventories every non-test call under `app/`: 15 calls found (7 wired here, 8 on the allowlist), above the plan's floor of 13. Any new game-less call fails the test, and wiring an allowlisted file fails it until the file leaves the list.

## Task Commits

1. **Task 1: Tracer, game-aware lookup plus overview phase pill (TDD)**
   - `2736f5b8` (test, RED)
   - `ed363aa4` (feat, GREEN)
2. **Task 2: Five more tier surfaces pass the guild's game** - `976dca3f` (feat)
3. **Task 3: Call-site inventory with allowlist** - `658c4277` (test)

**Plan metadata:** recorded in the docs commit that follows this file.

## Files Created/Modified

- `utils/raidIcons.ts` - optional `game` parameter, exported `FOREVER_RAID_ICON`, type-only import of `GameVersion`
- `utils/__tests__/raidIcons.test.ts` - Forever scoping and Classic-unchanged cases, run-payload composition case, `findRaidIconCalls` with synthetic self-checks, `GAMELESS_CALL_ALLOWLIST` and the inventory (21 tests)
- `app/(app)/overview/components/DashboardContent.tsx` - phase pill passes `getGuildGame(activeGuild)`
- `app/(app)/loot-list/components/LootListContent.tsx` - both sites pass the existing `guildGame`
- `app/(app)/master-sheet/components/MasterSheetContent.tsx` - phase pill passes `getGuildGame(activeGuild)`
- `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx` - imports `getGuildGame`, passes it
- `app/(app)/guild-settings/components/ExpansionManager.tsx` - passes `getGuildGame(activeGuild)`
- `app/(app)/expansions/[expansionId]/_client.tsx` - required `game: GameVersion` prop on `CompactRaidToggle` and `PhaseCard`, supplied from `ExpansionDetailPage`

## Decisions Made

- Neutral icon stays the question-mark icon; swapping in Forever art later is a one-line constant change.
- `getRaidShorthand` is untouched (labels, not art).
- The inventory reader counts non-empty top-level comma segments, so a trailing comma does not inflate the count.

## Deviations from Plan

### Auto-fixed Issues

None. The live call-site count matched the plan (8 allowlisted calls in 6 files, 7 wired calls, 15 total against a floor of 13), so no number needed adjusting and nothing was loosened.

### Process notes

- **Task 3 has no separate RED commit.** The production wiring (Task 2) had to exist before the allowlist could be accurate, so the inventory test passed on first run and a true RED was not possible. Instead the test was mutation-checked: unwiring `ExpansionManager.tsx` produced an offender failure, and wiring `RaidTierHeader.tsx` (allowlisted) produced a "remove it from the allowlist" failure. Both mutations were reverted and the suite is green at 21/21.
- **Start/end times include the tracer checkpoint wait**, so the recorded duration overstates active work.

**Total deviations:** 0 auto-fixed. **Impact on plan:** none.

## Issues Encountered

None in the plan's scope. Pre-existing noise, not touched:

- The untracked stray copy `loot-list-plus-wt-355/` contributes failing tests that are not this plan's (2 files and 4 tests in the plan-scoped run; 5 files and 6 tests in the full run). They are copies, outside this plan's files.
- `__tests__/quality-brand-token-parity.test.ts` timed out at 5s in the full-suite run under load; it passes alone (6/6).
- Lint on touched files: 0 errors, pre-existing warnings only. Typecheck is clean for all repo code (errors exist only under `loot-list-plus-wt-355/` and `.next/dev/types/validator.ts`).

## Verification Run

- `CI=true npx vitest run utils/__tests__/raidIcons.test.ts "app/(app)/overview" "app/(app)/reserve" "app/(app)/master-sheet" "app/(app)/loot-submissions" app/services/__tests__/expansionSeeder-golden.test.ts`: every repo test passes; the only failures are 4 tests under `loot-list-plus-wt-355/`.
- `CI=true npx vitest run` (full): 7811 passed, 7 failed (6 under `loot-list-plus-wt-355/`, 1 timeout that passes in isolation).
- Acceptance greps for Task 2 print 2, 1, 1, 1, 1 as required; `FOREVER_RAID_ICON` appears at least twice; `utils/bossImages.ts` unchanged.
- `npx eslint` on the touched files: 0 errors.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

Ready for plan 02-13, which wires the six allowlisted surfaces (reserve run list, reserve run detail, create-run modal, public join page, its OG image, master sheet tier header) and removes each from `GAMELESS_CALL_ALLOWLIST` in the same commit. `app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx` still mocks `getRaidIcon` with a one-argument signature, which stays valid until 02-13 forwards the game. Plan 02-03 can open its PR once this one has merged.

## Self-Check: PASSED

- FOUND: `utils/__tests__/raidIcons.test.ts`, `utils/raidIcons.ts`, and the six app files listed above
- FOUND commits: `2736f5b8`, `ed363aa4`, `976dca3f`, `658c4277`
- Re-ran acceptance criteria and plan verification after the last commit (see Verification Run)

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-16*
