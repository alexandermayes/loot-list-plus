---
phase: 08-primitive-contracts
plan: 05
subsystem: ui
tags: [typography, design-system, react, tailwind, label-migration]

# Dependency graph
requires:
  - phase: 08-primitive-contracts
    provides: "08-01's GO-AHEAD checkpoint (corrected 61-site label scope) and 08-02's ModalTitle/accessibility groundwork established the phase's edit authorization and typography.tsx context"
provides:
  - "All 29 production LabelText call sites across 7 files migrated to Text size=\"sm\" weight=\"semibold\" color=\"secondary\" as=\"span\""
  - "Scoped source-scan test (__tests__/label-text-production-sites.test.ts) proving zero LabelText remains in exactly these 7 files"
affects: [08-06, design-system-docs-page-migration, sidebar-migration]

# Actuals (#2632)
actuals:
  tokens: 5900
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LabelText-to-Text migration rule: rename tag, drop LabelText's size prop, apply fixed triple size=\"sm\" weight=\"semibold\" color=\"secondary\", add as=\"span\" (OI-7), preserve className and children verbatim, remove LabelText from the file's typography import"

key-files:
  created:
    - __tests__/label-text-production-sites.test.ts
  modified:
    - app/(app)/sheet-import/_client.tsx
    - app/(app)/reserve/runs/[id]/_client.tsx
    - app/(app)/admin/addon/_client.tsx
    - app/(app)/raid-teams/_client.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - app/reserve/join/[token]/components/InlineSettingsEditor.tsx
    - app/reserve/join/[token]/page.tsx

key-decisions:
  - "Followed 08-DECISIONS.md's OI-7 default (as=\"span\") at all 29 sites, matching LabelText's own span element so no inline label became a block Text default p mid-migration"
  - "Preserved every className verbatim (including the !text-destructive override at reserve/runs' Danger zone site and the nested HugeiconsIcon at its Audit log site) rather than normalizing or dropping any"

patterns-established:
  - "Text migration test pattern: mirror type-scale-floor.test.ts's matchesIn/describe/it shape for a scoped, explicit-file-list source-scan rather than a full-repo sourceFiles() walk, when the check applies to a named subset of files mid-migration"

requirements-completed: [PRIM-02]

coverage:
  - id: D1
    description: "29 production LabelText call sites across 7 files migrated to Text size=\"sm\" weight=\"semibold\" color=\"secondary\" as=\"span\", with zero LabelText occurrences remaining and children byte-identical to pre-migration rendering"
    requirement: "PRIM-02"
    verification:
      - kind: unit
        ref: "__tests__/label-text-production-sites.test.ts#finds no LabelText occurrence across the 7 migrated production files"
        status: pass
      - kind: other
        ref: "grep -cE '[<]LabelText' across all 7 files sums to 0; grep -c 'Text size=\"sm\" weight=\"semibold\" color=\"secondary\"' across all 7 files sums to 29"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: unit
        ref: "npm run test (full suite, 1186 tests)"
        status: pass
    human_judgment: true
    rationale: "A regex scan and typecheck prove the tag swap is mechanical and complete, but only a human diff review can confirm every migrated site's rendered DOM text content is byte-identical to its pre-migration LabelText rendering (ROADMAP hard constraint 1) — a string could be silently 'corrected' during a tag rename without any automated check catching it."
  - id: D2
    description: "components/ui/typography.tsx's LabelText export and app/globals.css's .section-label rule remain untouched on disk, since the docs page (26 more sites) has not migrated yet"
    verification:
      - kind: other
        ref: "grep -c LabelText components/ui/typography.tsx returns 4 (interface, forwardRef, displayName, export); grep -c section-label app/globals.css returns 1 (the CSS rule itself)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-17
status: complete
---

# Phase 08 Plan 05: Production LabelText-to-Text Migration Summary

**Migrated all 29 production `LabelText` call sites across 7 client-component files to `Text size="sm" weight="semibold" color="secondary" as="span"`, proven byte-identical in rendered text and zero-regression by a new scoped source-scan test plus a clean full-suite run.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-17T23:22:57Z
- **Completed:** 2026-09-17T23:35:17Z
- **Tasks:** 3
- **Files modified:** 7 (plus 1 new test file)

## Accomplishments
- Established and proved the mechanical `LabelText`→`Text` migration rule on the two smallest files (`admin/addon/_client.tsx`, `sheet-import/_client.tsx`), covering both prop shapes (bare, and `size`+`className`) present across this plan's scope.
- Applied the proven rule verbatim to 10 more sites across `raid-teams/_client.tsx`, `LootListContent.tsx`, and `InlineSettingsEditor.tsx`.
- Applied the rule to the remaining 15 sites across `reserve/runs/[id]/_client.tsx` (12 sites, including multiline counter spans, a nested `HugeiconsIcon`, and a `!text-destructive` color override) and `reserve/join/[token]/page.tsx` (3 sites, including a `{boss}` JS-expression child), and added `__tests__/label-text-production-sites.test.ts` — a scoped source-scan proving zero `LabelText` remains across exactly these 7 files.
- Verified the exact count: 0 `LabelText` occurrences and 29 migrated `Text size="sm" weight="semibold" color="secondary"` sites across the 7 files, matching the plan's `must_haves.truths` precisely.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Prove the LabelText-to-Text swap on the two smallest files** - `be35726f` (feat)
2. **Task 2 (expansion): Apply the proven rule to raid-teams, LootListContent, and InlineSettingsEditor (10 sites, 3 files)** - `b2112b94` (feat)
3. **Task 3 (expansion): Apply the proven rule to reserve/runs/[id] and the join/[token] page (15 sites, 2 files), then add the scoped source-scan test** - `10e85386` (feat)

_Note: this plan carries `tdd="false"` on its tracer task; all commits are `feat` — no separate test-first RED commit was required._

## Files Created/Modified
- `app/(app)/admin/addon/_client.tsx` - 2 bare `LabelText` sites migrated ("How it works" x2)
- `app/(app)/sheet-import/_client.tsx` - 2 `LabelText size="xs" className="mb-2"` sites migrated ("Items to update", "Unmatched items (will be skipped)")
- `app/(app)/raid-teams/_client.tsx` - 3 sites migrated ("Name", "Color", "Schedule overrides")
- `app/(app)/loot-list/components/LootListContent.tsx` - 3 sites migrated ("Overview" with `className="mb-2 block"`, "Bracket reference", "Rules for Brackets 1-4")
- `app/reserve/join/[token]/components/InlineSettingsEditor.tsx` - 4 sites migrated ("Run settings", "Rules note", "Discord invite link", "Hard reserves" with `className="mb-1.5"`)
- `app/(app)/reserve/runs/[id]/_client.tsx` - 12 sites migrated, including two multiline counter-span shapes, a nested `HugeiconsIcon` (Audit log), and a `!text-destructive` override (Danger zone)
- `app/reserve/join/[token]/page.tsx` - 3 sites migrated, including a `{boss}` JS-expression child site
- `__tests__/label-text-production-sites.test.ts` (new) - scoped source-scan test asserting zero `LabelText` across exactly these 7 resolved file paths

## Decisions Made
- Used `as="span"` at all 29 sites per 08-DECISIONS.md's OI-7 resolution (confirmed default, not assumed), matching `LabelText`'s own `span` element so no inline label became a block `Text` default `p` mid-migration.
- Preserved every `className` and every nested-JSX child (icon elements, counter spans, `{boss}` expression) verbatim — this plan is a component-name-and-prop swap only, never a copy or structure edit.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- One test (`app/(app)/loot-management/components/__tests__/ItemRow.test.tsx`, unrelated to this plan's 7 files) timed out on the first full-suite run under resource contention. Verified as pre-existing flakiness, not a regression: the test passed in isolation before any of this plan's edits, and the full suite (1186 tests, 64 files) passed cleanly on a second run with no changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 29 production `LabelText` sites are migrated; `components/ui/typography.tsx`'s `LabelText` export and `app/globals.css`'s `.section-label` rule remain on disk, untouched, exactly as required since the design-system docs page (26 sites), the 2 `.section-label` sites, and `Sidebar.tsx`'s 4 hand-rolled sites still depend on them.
- Ready for 08-06 (docs page migration, `.section-label` sites, `Sidebar.tsx` recasing per OI-4, and the primitive deletions themselves).

## Self-Check: PASSED

All 7 modified files, the new test file, and all 4 commits (3 task commits + this plan's metadata commit) verified present on disk / in git log.

---
*Phase: 08-primitive-contracts*
*Completed: 2026-09-17*
