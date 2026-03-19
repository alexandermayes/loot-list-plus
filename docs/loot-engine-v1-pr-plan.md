# Loot Engine v1 PR Plan

## Status

- [x] **PR 1: vitest + golden tests** — DONE. 94 tests locking `utils/calculations.ts` behavior.
- [x] **PR 2: domain/ directory + bridges** — DONE. 17 files in `domain/`, 6 bridge files, all imports work.
- [x] **PR 3: `computeScore()` + `explainScore()`** — DONE. `engine.ts` (structured ScoreInput → ScoreResult), `explain.ts` (labeled breakdown). 20 new tests (114 total). Zero consumers changed.
- [x] **PR 4: `computeAttendance()` + `resolveStatus()`** — DONE. `attendance.ts` (windowing, dedup, fair/minimum_gate, retroactive attendance check). `resolveStatus()` for boolean→enum. 29 new tests (143 total). Documented overview divergence (no retroactive check). Zero consumers changed.
- [x] **PR 5: migrate master sheet** — DONE. First behavioral change. Import switched to `@/domain/scoring`. Both scoring blocks use `computeScore()`. `calculateAttendanceBatch` uses `computeAttendance()` per character (bulk queries preserved). 109 lines removed (1960→1851). Eligibility now from engine. 143 tests passing, build passing.
- [x] **PR 6: migrate overview** — DONE. FIXES PRIORITY BUG. `computeScore()` now includes `guild_item_priorities` lookup (was hardcoded 0). Attendance windowing replaced with `computeAttendance()`. Modifier display extracted from dummy `computeScore()` call. 143 tests passing.
- [x] **PR 7: migrate attendance page** — DONE. Personal + guild-wide scores use `computeAttendance()`. Removed ~40 lines of inline fair-mode windowing from guild-wide computation. Zero production consumers of `@/utils/calculations` remain — bridge is deletable.
- [x] **PR 8: delete bridges** — DONE. Updated 20 imports across 17 files (including 2 dynamic `import()` and 1 `require()`). Deleted 6 bridge files (`utils/calculations.ts`, `utils/roles.ts`, `utils/spec-role-mapping.ts`, `utils/phase-groups.ts`, `lib/bracket-validation.ts`, `lib/slot-normalization.ts`). Also fixed `utils/server-roles.ts` relative import. 143 tests passing, build passing.

---

## PR 3: Add `computeScore()` and `explainScore()`

**Goal:** The engine function that replaces 7 positional parameters with a structured input and returns both score and explanation.

**Files:**
```
NEW   domain/scoring/engine.ts
NEW   domain/scoring/explain.ts
NEW   domain/scoring/__tests__/engine.test.ts
MOD   domain/scoring/index.ts          (add exports)
MOD   domain/types.ts                  (add ScoreInput, ScoreResult, ScoreComponents, CharacterContext, ScoreExplanation)
```

**What it does:**
- `computeScore(input: ScoreInput): ScoreResult` — calls existing modifier functions internally, returns `{ total, components }`
- `explainScore(result, config): ScoreExplanation` — returns `{ total, lines: [{ label, value, detail }] }` for UI display

**What it doesn't do:**
- Doesn't touch any page component
- Doesn't change any existing function
- Doesn't replace any existing import

**Tests:**
- `computeScore` output matches `calculateLootScore` for shared fixtures (parity)
- `computeScore` preserves component breakdown
- `explainScore` omits zero-value lines
- `explainScore` includes all non-zero components

**Risk:** None. Pure additive code.

**Ships:** After PR 2. Independent of PR 4.

---

## PR 4: Add `computeAttendance()` and `resolveStatus()`

**Goal:** One function owns rolling window, raid-day filtering, date deduplication, new member mode, and attendance scoring. Replaces ~100 lines duplicated in 3 pages.

**Files:**
```
NEW   domain/scoring/attendance.ts
NEW   domain/scoring/__tests__/attendance.test.ts
MOD   domain/scoring/index.ts          (add exports)
MOD   domain/types.ts                  (add AttendanceInput, AttendanceResult, AttendanceStatus, RaidBreakdownEntry)
```

**What it does:**
- `computeAttendance(input: AttendanceInput): AttendanceResult` — takes raw events + records + config + raidDays + asOfDate, returns `{ score, raidsAttended, raidsInWindow, isEligible, breakdown }`
- `resolveStatus(booleans): AttendanceStatus` — converts 5 DB booleans into a single status enum (`attended | late | benched | no_show | signed_up | absent`)
- Includes `asOfDate` parameter for deterministic tests (no `new Date()` in test paths)

**What it doesn't do:**
- Doesn't touch any page component
- Doesn't query any database
- Doesn't replace any existing import

**Tests:**
- `computeAttendanceScore` parity (internal function matches `calculateAttendanceScore` for identical inputs)
- Window filtering (events outside window excluded)
- Raid-day filtering
- Date deduplication (prefers events with records)
- Fair mode (events before joinDate excluded)
- Minimum gate (isEligible false when raids < minimum)
- `resolveStatus` priority order (ncns > benched > late > attended > signed_up > absent)

**Risk:** Low. The only subtlety is matching the master sheet's deduplication logic exactly. Golden tests from PR 1 are the safety net.

**Ships:** After PR 2. Independent of PR 3. Can be developed in parallel with PR 3.

---

## PR 5: Migrate master sheet to engine

**Goal:** Master sheet uses `computeAttendance()` and `computeScore()` instead of inline logic. First real consumer. Deletes ~200 lines.

**Files:**
```
MOD   app/(app)/master-sheet/page.tsx   (~200 lines removed, ~40 lines added)
```

**What it does:**
- Replaces attendance batch calculation (lines 256-440) with `computeAttendance()` calls
- Replaces scoring loop (lines 819-868) with `computeScore()` calls
- Deletes the duplicate scoring block (lines 1434-1482)
- Data fetching (Supabase queries for attendance records, guild settings, BLP) stays in the page

**What it doesn't do:**
- Doesn't change data fetching patterns
- Doesn't change the rendering/display logic
- Doesn't touch any other page

**Tests:**
- No new unit tests (engine already tested in PR 3+4)
- Manual parity verification: compare scores for known characters before and after

**Risk:** Medium. First behavioral change. The engine must produce identical scores to the inline code it replaces. The golden tests from PR 1 and parity tests from PR 3-4 are the safety net.

**Ships:** After PR 3 + PR 4. This is the gate — if master sheet works, we proceed to other pages.

---

## Completed

All 8 PRs shipped. The loot engine v1 migration is complete. All scoring logic lives in `@/domain/scoring`, all loot utilities in `@/domain/loot`, all guild utilities in `@/domain/guild`, and all expansion utilities in `@/domain/expansion`. No bridge files remain.
