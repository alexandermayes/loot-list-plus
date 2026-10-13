---
phase: quick-261013-jd2
plan: 01
subsystem: loot-submissions, scoring
tags: [gh-357, submit-route, copy-limits, scoring-defaults]
status: complete
requirements: [GH357-01, GH357-02]
key-files:
  modified:
    - app/api/loot-submissions/submit/route.ts
    - app/api/loot-submissions/submit/__tests__/route.test.ts
    - domain/scoring/defaults.ts
    - domain/scoring/__tests__/calculations.test.ts
branch: fix/357-copy-limit-tiers
commits:
  - 17f84288
  - a328af36
completed: 2026-10-13
---

# Quick 261013-jd2: GH #357 copy-limit rows and scoring default Summary

The submit route now validates only the rows the loot list page can show (rows from turned-off raid tiers are skipped), and the scoring default for `single_raider_overall_bonus` matches the database.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 | 17f84288 | fix(submit): skip rows from turned-off raid tiers in copy-limit and bracket checks (GH #357) |
| 2 | a328af36 | fix(scoring): default single_raider_overall_bonus to true to match guild_settings (GH #357) |

## What changed

- `route.ts`: the existing `loot_submission_items` select now embeds `raid_tier:raid_tiers(is_guild_active)` inside `loot_items(...)` (no extra query). A `checkedRows` filter drops a row only when its tier flag is strictly `false`; it handles both the object and one-element-array join shapes, and missing or null metadata keeps the row. `checkedRows` feeds both `validateBracketRules` and `validateItemCopyLimits`. Audit log and analytics `item_count` now use `itemRows.length` (every saved row, unchanged). Header doc step 5 updated.
- `route.test.ts`: recording `selectArg` on the fake client, a `withTier` helper, and a new `describe('tiers the guild turned off (GH #357)')` block with five tests (object shape skipped, active tier still 422, array shape skipped, null tier still 422, select string contains the embed and is read once).
- `defaults.ts`: `single_raider_overall_bonus: true` with a comment citing the DB default, the settings GET fallback and GH #357.
- `calculations.test.ts`: `getDefaultSettings` test pins the new default.

## Verification

- RED confirmed before each change (route: 3 failing of 15; scoring: 1 failing).
- `npx vitest run app/api/loot-submissions/submit domain/loot domain/scoring app/components/__tests__/ScoreBreakdownModal.test.tsx`: 26 files, 574 tests passed.
- `npx vitest run app/api/loot-submissions/submit domain/loot` after Task 1: 17 files, 215 tests passed.
- `npm run typecheck`: clean.
- `npx eslint` on the four touched files: clean.
- `git log --oneline origin/main..HEAD`: exactly two commits; `git diff --stat origin/main..HEAD` lists only the four code and test files, no `.planning/` paths.

## Deviations from Plan

None. Plan executed as written. `gsd-tools` and `execute-plan.md` were unavailable in the worktree as the plan noted, so no estimate calibration or STATE/ROADMAP updates were run.

## Follow-ups

- `raid_roles_overall_bonus_priority` in `domain/scoring/defaults.ts` has the same split: domain default `false` versus the database column default `true`. Left unchanged as out of scope; a candidate for a separate fix.

## Self-Check: PASSED

Both commits exist on `fix/357-copy-limit-tiers`; the four modified files are present.
