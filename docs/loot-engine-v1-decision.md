# Loot Engine v1 Decision Doc

## Goal

Centralize loot ranking logic so rankings are consistent, testable, and explainable.

Today, loot scores are computed in 3 page components (`master-sheet/page.tsx`, `overview/page.tsx`, `attendance/page.tsx`) with slightly different logic. The overview page hardcodes `priorityBonus = 0`, producing different scores than the master sheet for the same character+item. Attendance windowing (~100 lines) is reimplemented in each page. There are no tests.

After this refactor, one module computes scores. All pages call it. Tests lock the behavior. The engine returns both the score and a human-readable explanation.

## Source of Truth

**`domain/scoring/`** is the single source of truth for loot ranking going forward.

Specifically:
- `domain/scoring/engine.ts` → `computeScore(input): ScoreResult` — the one function that computes a loot score
- `domain/scoring/attendance.ts` → `computeAttendance(input): AttendanceResult` — owns rolling window, raid-day filtering, dedup, and scoring
- `domain/scoring/explain.ts` → `explainScore(result, config): ScoreExplanation` — returns why a score is what it is

These are pure functions. No React, no Supabase, no I/O. They run in browser, Node, and can be ported to Lua for the addon.

## In Scope

- **Extract scoring computation** from 3 page components into `domain/scoring/engine.ts`
- **Extract attendance windowing** from 3 page components into `domain/scoring/attendance.ts`
- **Standardize inputs/outputs** — structured `ScoreInput`/`ScoreResult` replaces 7 positional parameters
- **Add explanation output** — engine returns labeled score breakdown for UI display
- **Add tests** — golden tests lock current behavior, parity tests verify migration
- **Fix the overview priority bug** — overview will use the same `computeScore()` as master sheet, which naturally includes priority bonus
- **Add `resolveStatus()`** — single function to convert 5 attendance booleans into a status enum, replacing 3 inline implementations

## Out of Scope

- Full attendance system rewrite (excused absences, `points_override`, `status` column migration)
- Admin page refactoring
- `GuildContext` split (Auth/Guild/Expansion contexts)
- DB schema changes (`loot_history.expansion_id`, `blp_tracking.expansion_id`)
- Reworking API routes or data access patterns
- Server-side bracket validation (separate PR track, independent of engine)
- `guild_members` legacy table deprecation
- Expansion-specific cleanup unless required for engine correctness

## First Migration Target

**Master sheet** (`app/(app)/master-sheet/page.tsx`).

Why:
- It's the canonical scoring view — if it's correct, everything else should match
- It has the most complete scoring logic (all 7 components including priority bonus)
- It has the largest block of duplicated code (~185 lines of attendance windowing + 2 identical scoring loops)
- It's officer-facing, so visual regression is immediately noticed by the people who care most

## What Stays Where It Is (For Now)

- **API routes** — data fetching stays in route handlers. The engine doesn't do I/O.
- **`LootListContext.tsx`** — auto-save, ranking state management, BIS import all stay. Only the bracket validation call path changes later (separate PR).
- **`utils/server-roles.ts`** — permission logic stays. It has I/O (Supabase), which violates the domain purity rule.
- **Bridge files** — `utils/calculations.ts` etc. remain as re-exports until all consumers are migrated.
- **Page-level data fetching** — Supabase queries for attendance records, guild settings, BLP data stay in page components. The engine receives pre-fetched data.

## Risks Accepted for v1

1. **Overview priority bug fix changes visible scores.** After migration, overview shows higher scores for items with officer-set priorities. This is correct behavior but will be noticed. Document in changelog.

2. **Per-character attendance computation vs batch.** The current master sheet batch-computes attendance for all characters in one pass. The engine computes per-character. We accept slightly more iterations in exchange for code clarity, as long as the data query remains batched.

3. **Lua addon is not auto-synced.** `ScoreEngine.lua` remains a manual port. We add parity test fixtures but don't auto-generate Lua code. Accepted until addon usage grows.

4. **Bridge files create temporary import indirection.** Every import through a bridge adds one hop. We accept this for the migration period (~2-4 weeks). Bridges are deleted once all consumers are updated.

## Success Criteria

- Same ranking output before and after migration (verified by golden tests + manual comparison)
- Rankings match across master sheet, overview, and attendance page for the same character+item
- Overview page includes priority bonus in scores (bug fixed)
- Score logic is testable without rendering any UI component
- `explainScore()` returns a breakdown that matches what the UI currently shows manually
- Master sheet is ~200 lines shorter after migration
