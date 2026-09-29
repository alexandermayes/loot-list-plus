---
phase: 07-token-foundation
plan: 05
subsystem: design-system-tokens
tags: [tailwind, contrast, wcag, design-tokens, vitest, status-badge, alert, raid-tracking]

# Dependency graph
requires:
  - phase: 07-01
    provides: GO-AHEAD approval for the complete diff plan, satisfying ROADMAP Hard Constraint 2
  - phase: 07-02
    provides: The committed pre-phase-07 before baseline this plan's Task 3 human-check compares against
  - phase: 07-04
    provides: The shared WCAG contrast library (__tests__/design-tokens/contrast.ts), the token-contrast.test.ts suite this plan extends, and the lifted dark card family the standby non-regression assertions measure against
provides:
  - "--standby and --standby-foreground in both theme blocks, and colors.standby in tailwind.config.js as a full { DEFAULT, foreground } object so text-standby, bg-standby with an alpha, and border-l-standby all resolve"
  - "components/ui/status-badge.tsx and components/ui/alert.tsx render every variant from the semantic palette (--warning, --standby, --success, --destructive, --info, --accent, --muted), with zero Tailwind palette colour classes"
  - "The three duplicated orange-500 literals for the standby attendance state in raid tracking (cell-state.ts, RaidMemberList.tsx, _client.tsx) migrated onto --standby"
  - "__tests__/token-palette-literals.test.ts: the executable form of COLOR-06, scanning five files and failing loud (naming file and line) if a Tailwind palette colour class returns"
affects: [07-06-post-phase-review, phase-08-primitives, phase-10-color-migration, phase-12-design-md]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 4110
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Palette-literal guard as a cross-product regex (utility prefix x Tailwind hue name x standard shade, with optional variant prefix and alpha suffix) over an explicit file list rather than a directory walk, so the guard's scope is exactly the files this phase changed and cannot silently expand to files Phase 10 still owns"
    - "Guard non-vacuity proven inline during verification (temporary reintroduction of a palette literal, confirm the guard fails naming the file and line, restore) for every guarded file, matching the pattern 07-04 established for token-contrast assertions"

key-files:
  created:
    - __tests__/token-palette-literals.test.ts
  modified:
    - app/globals.css
    - tailwind.config.js
    - __tests__/token-contrast.test.ts
    - components/ui/status-badge.tsx
    - components/ui/alert.tsx
    - app/(app)/raid-tracking/components/cell-state.ts
    - app/(app)/raid-tracking/components/RaidMemberList.tsx
    - app/(app)/raid-tracking/_client.tsx
    - app/(app)/raid-tracking/components/__tests__/cell-state.test.ts

key-decisions:
  - "Shipped the standby value table exactly as planned: light --standby 38 92% 42% (#ce8509), dark --standby 38 92% 50% (#f59f0a), --standby-foreground 0 0% 4% (#0a0a0a) in both themes. No deviation from the plan's numbers."
  - "colors.standby in tailwind.config.js is a full { DEFAULT, foreground } object, not a bare property reference, because RaidMemberList.tsx's StatusPill consumes the token as both text and an alpha-modified background fill (text-standby bg-standby/15), which only a colour key resolves."
  - "Followed the OI-7 mapping exactly: pending and late onto --warning, needs_revision and benched onto --standby. approved, attended, rejected, no_show, draft, excused and signed_up were left untouched (already token-clean)."
  - "The palette-literal guard's file list is explicit (two files in Task 2, widened to five in Task 3) rather than a directory scan, matching the plan's own reasoning: the rest of the raid-tracking tree and the rest of the codebase still carry literals Phase 10 owns, and a directory scan would go red on work this phase is not doing."
  - "token-palette-literals.test.ts is a .test.ts file per the plan's exact filename, so the StatusBadge render assertion uses React.createElement instead of JSX (JSX syntax is not valid in a .ts file under this project's tsconfig)."

patterns-established:
  - "For a state-machine style class-string switch (getCellStyle), a five-distinct-borders assertion using a digit-excluding regex lookahead (border-l-(?!\\d)[\\w-]+) to separate the shared width utility (border-l-2) from the per-state colour utility, so 'every state resolves to a distinct colour' is asserted structurally rather than by five separate toContain checks that could each pass while two states silently shared a colour."

requirements-completed: []
# COLOR-06 is shared with sibling plan 07-06 in this phase (07-06 also
# declares it in its own frontmatter). gsd-tools requirements.ready-ids
# reports 0/1 ready — correct and expected, not a gap: it marks complete
# only once every plan declaring it has a SUMMARY.

coverage:
  - id: D1
    description: "--standby and --standby-foreground exist in both :root and .dark, colors.standby resolves as a full colour object so text-standby/bg-standby with an alpha/border-l-standby all work, and every contrast claim (a real 4.5:1 floor everywhere standby is a fill with text on it, and a strict improvement on the orange-500 literal everywhere standby is text, in both themes) is asserted and proven non-vacuous by a temporary revert that failed the exact named assertions before being restored"
    requirement: "COLOR-06"
    verification:
      - kind: unit
        ref: "__tests__/token-contrast.test.ts#standby token (COLOR-06)"
        status: pass
      - kind: other
        ref: "npx tsx __tests__/design-tokens/report.ts -> standby row now prints 7.716 (dark) / 3.003 (light) instead of absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "components/ui/status-badge.tsx and components/ui/alert.tsx contain zero Tailwind palette colour classes; the four badge entries and the one alert variant render from --warning/--standby exactly per the OI-7 mapping; all eleven badge labels are byte-identical, proven by an exact-string count and a diff scan requiring zero label: lines touched"
    requirement: "COLOR-06"
    verification:
      - kind: unit
        ref: "__tests__/token-palette-literals.test.ts#palette-literal guard (COLOR-06)"
        status: pass
      - kind: other
        ref: "grep -cE 'yellow-500|orange-500' components/ui/status-badge.tsx components/ui/alert.tsx | grep -v ':0$' | wc -l -> 0; grep -cE label-regex status-badge.tsx -> 11; git diff -- status-badge.tsx alert.tsx | grep label: -> 0 lines"
        status: pass
    human_judgment: false
  - id: D3
    description: "The three duplicated orange-500 standby literals in raid tracking (cell-state.ts:22, _client.tsx legend swatch, RaidMemberList.tsx StatusPill) all migrated to --standby; the five getCellStyle branches still resolve to five distinct left-border colour utilities; the sanctioned 2px coloured legend rails survive untouched (border-l-2 present on all five branches); the palette guard now covers all five files and is proven non-vacuous"
    requirement: "COLOR-06"
    verification:
      - kind: unit
        ref: "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts#getCellStyle"
        status: pass
      - kind: other
        ref: "grep -rcE 'yellow-500|orange-500' the three raid-tracking files | grep -v ':0$' | wc -l -> 0; grep -c border-l-2 cell-state.ts -> 5; grep -c Standby _client.tsx unchanged at 1 pre/post"
        status: pass
    human_judgment: false
  - id: D4
    description: "The rendered standby cell rail, legend swatch and member pill read as the same amber as each other across the raid-tracking page, at 1440 and 390, in both dark and light mode, distinct from the late yellow and the accent orange beside it, and a benched raider is not mistakable for a late one"
    verification: []
    human_judgment: true
    rationale: "The plan's Task 3 <human-check> is a visual review against the committed pre-phase-07 baseline, comparing dark and light mode at both breakpoints. Per this project's workflow.human_verify_mode=end-of-phase default, that check is deferred to the phase-level UAT rather than performed by this plan's executor (same handling as Plan 04's Task 3 density check). The mechanical proof (five distinct border-color utilities, contrast floors met and proven non-vacuous, the guard covering all five files) is complete and green; the visual judgment itself is outstanding and recorded in .planning/WINDOWS.md (entry 5) so it surfaces at ship time."

# Metrics
duration: 26min
completed: 2026-09-16
status: complete
---

# Phase 07 Plan 05: Standby Token and Status-Primitive Palette Migration Summary

**Added the `--standby` amber token (hue 38, between `--accent` at hue 30 and `--warning` at hue 45) to both themes, moved `status-badge.tsx` and `alert.tsx` off five Tailwind palette literals onto `--warning`/`--standby`, and migrated the three duplicated `orange-500` standby literals in raid tracking onto the new token, all guarded by a new 60-line palette-literal scanner that names the file and line on regression.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-16T19:09:xx (approx, per session start)
- **Completed:** 2026-09-16T19:35:xx (approx)
- **Tasks:** 3 (all complete)
- **Files modified:** 10 (1 created: `__tests__/token-palette-literals.test.ts`; 9 modified)

## Accomplishments

- Task 1: Added `--standby: 38 92% 42%` / `--standby-foreground: 0 0% 4%` to `:root` and `--standby: 38 92% 50%` / `--standby-foreground: 0 0% 4%` to `.dark` in `app/globals.css`, and a full `colors.standby = { DEFAULT, foreground }` object in `tailwind.config.js`. Extended `__tests__/token-contrast.test.ts` with a `standby token (COLOR-06)` describe block (6 new assertions): both themes clear a real 4.5:1 floor everywhere standby is a fill with text on it, and standby measures strictly better than the `orange-500` literal it replaces (`#f97316`) on both the card and the page, in both themes. Computed and confirmed the plan's own value table exactly: dark standby vs card 7.716, vs page 9.434, foreground-on-standby 9.251 (dark) / 6.585 (light); light standby vs card 3.003, vs page 2.828 (both non-regression wins over orange-500's 5.884/7.195 dark and 2.803/2.640 light). Nothing consumed the token yet, so this commit changed no rendered pixel.
- Task 2: Moved the four palette-literal `statusConfig` entries in `components/ui/status-badge.tsx` (`pending`, `needs_revision`, `late`, `benched`) and the one palette-literal `warning` variant in `components/ui/alert.tsx` onto `--warning`/`--standby`, following the OI-7 mapping exactly. Created `__tests__/token-palette-literals.test.ts`: a cross-product regex (19 utility prefixes x 22 Tailwind hue names x 11 standard shades, with an optional variant prefix and alpha suffix) scanning an explicit two-file list, plus a component assertion that `pending` and `needs_revision` render different class strings with unchanged labels `Pending` and `Needs Revision`. All eleven badge labels remain byte-identical; only class strings changed.
- Task 3: Migrated the three duplicated `orange-500` standby literals in raid tracking — `cell-state.ts:22`, the `_client.tsx` legend swatch, and `RaidMemberList.tsx`'s `StatusPill` — onto `border-l-standby` / `text-standby bg-standby/15`. Updated `cell-state.test.ts`'s standby assertion to the token and added a five-distinct-borders assertion (using a digit-excluding lookahead to separate the shared `border-l-2` width utility from the per-state colour utility) that fails if any two of the five non-empty attendance states ever collapse onto the same border colour. Widened the palette guard's scan list from two files to five. The sanctioned 2px coloured legend rails (an audited exception to the craft floor's refuse-list entry, because they mirror the real 20px attendance cell states) were preserved exactly — `border-l-2` still appears on all five `getCellStyle` branches.
- Confirmed every guard and contrast assertion in this plan is non-vacuous: temporarily reverted dark `--standby` to `38 92% 30%` (four assertions failed by name, restored), temporarily restored a palette literal in `alert.tsx` (guard failed naming the file and line, restored), and temporarily restored `orange-500` in `cell-state.ts` (widened guard failed naming the file and line, restored).
- Final plan diff touches exactly the ten files in `07-05-PLAN.md`'s `files_modified` list, no more, no less (`git diff 77d6710b HEAD --name-only`).

## Full standby contrast table (measured against the committed values)

| pair | orange-500 (`#f97316`) | `--standby` | floor |
|------|------------------------:|------------:|-------|
| dark, text on lifted card | 5.884 | 7.716 | 4.5 |
| dark, text on page | 7.195 | 9.434 | 4.5 |
| light, text on white card | 2.803 | 3.003 | non-regression |
| light, text on cream page | 2.640 | 2.828 | non-regression |
| `--standby-foreground` on `--standby`, dark | n/a | 9.251 | 4.5 |
| `--standby-foreground` on `--standby`, light | n/a | 6.585 | 4.5 |

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the --standby token in both themes and expose it as a Tailwind colour** - `3342da80` (feat)
2. **Task 2: Take the two status primitives off the Tailwind palette** - `0c644a95` (refactor)
3. **Task 3: Migrate the three duplicated standby literals in raid tracking** - `81927d93` (refactor)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `app/globals.css` - new `--standby`/`--standby-foreground` in both `:root` and `.dark`
- `tailwind.config.js` - new `theme.extend.colors.standby` with `DEFAULT`/`foreground`
- `__tests__/token-contrast.test.ts` - new `standby token (COLOR-06)` describe block (6 assertions)
- `__tests__/token-palette-literals.test.ts` (new) - the executable form of COLOR-06, five-file scan
- `components/ui/status-badge.tsx` - four variant class strings moved onto `--warning`/`--standby`
- `components/ui/alert.tsx` - the warning variant moved onto `--warning`
- `app/(app)/raid-tracking/components/cell-state.ts` - standby branch's left-border literal moved onto the token
- `app/(app)/raid-tracking/components/RaidMemberList.tsx` - `StatusPill`'s standby branch moved onto the token
- `app/(app)/raid-tracking/_client.tsx` - the legend swatch's standby literal moved onto the token
- `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts` - standby expectation moved onto the token, plus a five-distinct-borders assertion

## Decisions Made

- Shipped the plan's exact standby value table with no deviation.
- `colors.standby` is a full `{ DEFAULT, foreground }` object, required because `RaidMemberList.tsx` consumes the token as both text and an alpha-modified background fill.
- The palette guard's scanned files are explicit, not directory-walked, matching the plan's own scope-limit reasoning.

## Deviations from Plan

None - plan executed exactly as written. The one implementation judgment call left to discretion by the plan (the exact shape of the five-distinct-borders assertion, and using `React.createElement` instead of JSX in the `.test.ts` guard file since the plan names that file with a `.ts`, not `.tsx`, extension) was resolved in-scope and is recorded under key-decisions and patterns-established above rather than as a deviation, since nothing in the plan's text was contradicted or added to.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required by this plan.

## Next Phase Readiness

- Task 3's `<human-check>` (visual review of the standby cell rail, legend swatch and member pill in dark mode at 1440/390 and in light mode, against the committed pre-phase-07 baseline) has not yet been performed — per this project's `workflow.human_verify_mode=end-of-phase` default, it is deferred to the phase-level UAT, matching Plan 04's handling of its own Task 3 density check. Recorded in `.planning/WINDOWS.md` (entry 5) so it surfaces at `/gsd-ship` time. The mechanical proof (five distinct border-color utilities, all contrast floors met and proven non-vacuous, the guard covering all five files) is complete and green.
- COLOR-06 is not yet marked complete in REQUIREMENTS.md: `requirements.ready-ids` reports `0/1 ready` because sibling plan 07-06 in this phase also declares it and has not yet produced a SUMMARY. It will mark complete the moment 07-06 finishes.
- Plan 06 (close-out) can now capture the matching after-baseline and the final fixed-order contrast record with `--standby` reporting real numbers instead of `absent`.
- No blockers remain for Phase 07 execution to continue with Plan 06.

---
*Phase: 07-token-foundation*
*Completed: 2026-09-16*

## Self-Check: PASSED

Verified the created file exists on disk: `__tests__/token-palette-literals.test.ts`. Verified all three commits (`3342da80`, `0c644a95`, `81927d93`) appear in `git log --oneline --all`. Re-ran every automated acceptance criterion from all three tasks: Task 1 - `grep -c -- '--standby: 38 92% 42%' app/globals.css` -> 1, `grep -c -- '--standby: 38 92% 50%' app/globals.css` -> 1, `grep -c -- '--standby-foreground: 0 0% 4%' app/globals.css` -> 2, the `node -e` config-shape check -> `ok`, `npx vitest run __tests__/token-contrast.test.ts` -> 31/31 passing (6 new), `npx tsx __tests__/design-tokens/report.ts` -> standby row prints 7.716/3.003 instead of absent, `git diff HEAD~2 --name-only` (Task 1 alone) -> exactly `app/globals.css`, `tailwind.config.js`, `__tests__/token-contrast.test.ts`; Task 2 - `grep -cE 'yellow-500|orange-500' components/ui/status-badge.tsx components/ui/alert.tsx | grep -v ':0$' | wc -l` -> 0, `grep -c 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' status-badge.tsx` -> 2, `grep -c 'bg-standby/10 text-standby border-standby/20 hover:bg-standby/20' status-badge.tsx` -> 2, `grep -c 'bg-warning/10 border-warning/30 text-warning' alert.tsx` -> 1, all 11 labels present, 0 label lines touched in diff; Task 3 - `grep -rcE 'yellow-500|orange-500'` across the three raid-tracking files -> 0, `border-l-standby` present once each in `cell-state.ts` and `_client.tsx`, `text-standby bg-standby/15` present once in `RaidMemberList.tsx`, `border-l-2` count in `cell-state.ts` -> 5, `border-l-standby` in `cell-state.test.ts` -> 1, `Standby` count in `_client.tsx` unchanged pre/post at 1. `npx vitest run __tests__/token-palette-literals.test.ts __tests__/token-contrast.test.ts "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` -> 57/57 passing. `npm run lint` (0 errors, 397 pre-existing warnings), `npm run typecheck` (exit 0), `npm run test` (1176/1176 passing) all exit 0 on the final state. Full plan diff (`git diff 77d6710b HEAD --name-only`) touches exactly the 10 files in the plan's `files_modified` list, no more, no less. Every non-vacuity temporary-revert check (dark `--standby` regression, `alert.tsx` literal restoration, `cell-state.ts` literal restoration) was run and confirmed to fail the expected assertion before being restored.
