---
phase: 01-forever-defect-and-privacy-fixes
plan: 03
subsystem: api
tags: [wowhead, discord, nextjs, typescript, vitest, forever]

requires:
  - phase: none
    provides: first phase of the forever workstream
provides:
  - "domain/expansion/wowhead.ts: import-free, client-safe single home for the expansion-to-Wowhead map (getWowheadDomain moved, wowheadItemUrl new)"
  - "Loot announcements, the post-raid summary and the reserve Copy for Discord text link Forever items to https://www.wowhead.com/forever/item=<wowhead_id>"
  - "lib/discord-raid-summary.ts: pure formatRaidSummaryLootLine, applied per row with Array.map"
  - "notifyLootAward resolves the active expansion name in its own try/catch and still posts (returns true) when the lookup fails"
affects: [01-04 bot replies (imports wowheadItemUrl), phase-02 (also edits domain/expansion/index.ts), phase-01 shipping split (PR 2)]

actuals:
  tokens: 4100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One import-free domain module for URL building, shared by client components and server code"
    - "Non-Forever link policy is one parameter (nonForeverDomain) of one pure helper, so era-correct links later are a one-line change per call site"
    - "Formatter lives in lib/ because a Next.js route file may only export handlers and route config"

key-files:
  created:
    - domain/expansion/wowhead.ts
    - domain/expansion/__tests__/wowhead.test.ts
    - lib/discord-raid-summary.ts
    - lib/__tests__/discord-raid-summary.test.ts
    - lib/__tests__/discord-loot-announcements.test.ts
  modified:
    - app/components/ItemLink.tsx
    - lib/discord-loot-announcements.ts
    - app/api/discord/post-raid-summary/route.ts
    - app/reserve/join/[token]/page.tsx
    - domain/expansion/index.ts

key-decisions:
  - "Owner decision 2 (2026-10-13): Forever-only. Every non-Forever guild keeps the exact link it had (announcements and reserve copy retail /item=, raid summary /classic/item=)"
  - "wowheadItemUrl matches the stored expansion name exactly via getWowheadDomain; null, undefined, unknown and near-miss names ('forever', 'WoW Forever') keep the caller's existing link"
  - "Expansion lookup in notifyLootAward is wrapped in its own try/catch with constant log first arguments (T-03-02, T-03-04), so a failed lookup never blocks the announcement"
  - "Reserve Copy for Discord link included (open question 6): run.expansion_name was already on the page"

patterns-established:
  - "wowheadItemUrl(expansionName, wowheadId, nonForeverDomain = null): the only way Discord-facing and copied item links are built"

requirements-completed: [FIX-03]

coverage:
  - id: D1
    description: "A Forever guild's loot announcement links each item to wowhead.com/forever; other guilds keep the retail link; a failed or missing expansion lookup still posts and returns true; an item with no wowhead_id stays plain bold text"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "lib/__tests__/discord-loot-announcements.test.ts"
        status: pass
      - kind: unit
        ref: "domain/expansion/__tests__/wowhead.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "The post-raid summary links Forever loot lines to wowhead.com/forever, keeps /classic/ for everyone else, keeps row order, and renders plain text when there is no wowhead_id"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "lib/__tests__/discord-raid-summary.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The reserve join page Copy for Discord text links a Forever run's items to wowhead.com/forever and keeps retail links for other runs"
    requirement: "FIX-03"
    verification:
      - kind: other
        ref: "grep -c \"wowheadItemUrl(run.expansion_name, item.wowhead_id)\" app/reserve/join/[token]/page.tsx (prints 1); npx tsc --noEmit (0 errors); helper covered by domain/expansion/__tests__/wowhead.test.ts"
        status: pass
    human_judgment: true
    rationale: "The page has no component test; the one-line call site is verified by grep and typecheck only, and the copied clipboard text is worth one manual look on a Forever reserve run"
  - id: D4
    description: "The in-app ItemLink behaves exactly as before and getWowheadDomain stays importable from app/components/ItemLink"
    verification:
      - kind: unit
        ref: "app/components/__tests__/ItemLink.test.ts (unchanged, passes)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-10-13
status: complete
---

# Phase 01 Plan 03: Forever Wowhead Links in Discord Summary

**One import-free `wowheadItemUrl` helper now makes loot announcements, the post-raid summary and the reserve Copy for Discord text link Forever items to `wowhead.com/forever`, while every other guild's links stay byte-identical.**

## Performance

- **Duration:** 5 min (approximate; start time was not captured at spawn, end is the Task 2 commit)
- **Started:** 2026-10-13T21:21Z (approximate)
- **Completed:** 2026-10-13T21:24:38Z (Task 2 commit)
- **Tasks:** 2
- **Files modified:** 10 (5 created, 5 modified)

## Accomplishments

- `domain/expansion/wowhead.ts` is the single home for the 13-entry expansion-to-Wowhead map. `ItemLink` imports and re-exports `getWowheadDomain`, so its test passes unchanged.
- `notifyLootAward` reads the guild's active expansion name (own try/catch, constant log strings) and builds links with `wowheadItemUrl(expansionName, wowheadId)`. A lookup error, a missing row or a guild with no active expansion keeps the retail link and still posts.
- The post-raid summary route reads `current_phase, name`, and maps loot rows through the pure `formatRaidSummaryLootLine`, which passes `'classic'` so non-Forever summaries keep today's link.
- The reserve page Copy for Discord text builds each line with `wowheadItemUrl(run.expansion_name, item.wowhead_id)`.

## Exported signatures (plan 01-04 consumes the first)

```ts
// domain/expansion/wowhead.ts (also re-exported from the domain/expansion barrel)
export function getWowheadDomain(expansionName: string | undefined | null): string | null
export function wowheadItemUrl(
  expansionName: string | null | undefined,
  wowheadId: number,
  nonForeverDomain: string | null = null
): string
//  Forever (domain === 'forever')  -> https://www.wowhead.com/forever/item=<id>
//  else nonForeverDomain set       -> https://www.wowhead.com/<nonForeverDomain>/item=<id>
//  else                            -> https://www.wowhead.com/item=<id>

// lib/discord-raid-summary.ts
export function formatRaidSummaryLootLine(args: {
  itemName: string | null
  wowheadId: number | null
  characterName: string
  expansionName: string | null
}): string
```

Plan 01-04 should import from the module path `@/domain/expansion/wowhead` (or the barrel on the server).

## Task Commits

1. **Task 1: Tracer, a Forever guild's loot announcement links to wowhead.com/forever** - `c117e240` (fix)
2. **Task 2: Forever links in the post-raid summary and the reserve Discord copy** - `d6f49d19` (fix)

**Plan metadata:** committed separately (docs: complete plan; SUMMARY first, then STATE/ROADMAP).

_Both tasks were `tdd="true"`. Tests were written first and run red for the right reason (missing module; Forever announcement still retail), then made green. Each task is one commit, as the plan prescribes one commit per task, so there are no separate `test(...)` commits._

**Tracer feedback gate:** Task 1 was the tracer. Its `<verify>` passed (50 tests across domain/expansion, the announcement test and ItemLink). The interactive human-verify gate was passed under the standing approval from the orchestrator, and execution continued straight into Task 2.

## Files Created/Modified

- `domain/expansion/wowhead.ts` - map, `getWowheadDomain` (moved verbatim), `wowheadItemUrl` (new); no imports
- `domain/expansion/__tests__/wowhead.test.ts` - domain cases, Forever, retail fallback, caller domain, near-miss names
- `domain/expansion/index.ts` - added `export * from './wowhead'`
- `app/components/ItemLink.tsx` - map and function removed, imports and re-exports `getWowheadDomain`; href unchanged
- `lib/discord-loot-announcements.ts` - guild select adds `active_expansion_id`; guarded expansion name lookup; `wowheadLink` takes the expansion name
- `lib/__tests__/discord-loot-announcements.test.ts` - Forever link, MoP unchanged, lookup error, missing row, no active expansion, no wowhead_id
- `lib/discord-raid-summary.ts` - `formatRaidSummaryLootLine`
- `lib/__tests__/discord-raid-summary.test.ts` - Forever, MoP and null expansion, no id, Unknown Item, input order
- `app/api/discord/post-raid-summary/route.ts` - reads expansion `name`, maps rows through the formatter
- `app/reserve/join/[token]/page.tsx` - Copy for Discord uses `wowheadItemUrl`

## Decisions Made

- Followed owner decision 2 (Forever-only) exactly; the helper keeps the era map, so era-correct links remain a one-line opt-in per call site.
- Kept the `console.error` first arguments constant (`'[loot-announce] expansion lookup failed'`) so the CodeQL tainted-format-string rule stays quiet.

## Deviations from Plan

None - plan executed exactly as written.

## Deferred Items (owner decision 2, not planned in this phase)

- **Era-correct Wowhead links** (`classic`, `tbc`, `wotlk`, `cata`, `mop-classic`) for older expansions' Discord and copied links. Opt-in follow-up: pass `getWowheadDomain(expansionName)` as the third argument at each call site (announcements and reserve copy currently pass nothing).
- **Raid summary `/classic/` domain** is already wrong for TBC to MoP guilds today. Unchanged here by design; it is part of the same follow-up.

## Issues Encountered

None. Pre-existing eslint warnings in `ItemLink.tsx` and the reserve page (`set-state-in-effect`, `no-img-element`, `exhaustive-deps`) are untouched and out of scope; eslint exits 0 with 0 errors.

## Known Stubs

None.

## Assumption carried forward

- A3: `https://www.wowhead.com/forever/item=<id>` is the correct public URL per the milestone brief; it was not live-checked because live Wowhead fetches are forbidden (Hard Constraint 5). If wrong, the fix is one line in `wowheadItemUrl`.

## Notes for later plans and phases

- **Phase 2 barrel rebase:** Phase 2 also edits `domain/expansion/index.ts`. Whichever PR lands second should rebase and keep both export lines (`export * from './wowhead'` plus Phase 2's addition).
- **Shipping:** this plan is PR 2 of the phase and must merge before PR 4 (plans 01-04 and 01-05), because 01-04 imports `wowheadItemUrl`.
- **FIX-03 stays Pending in REQUIREMENTS.md** until plan 01-04 (bot replies and em dash titles) finishes; the shared-ID gate (`requirements.ready-ids`) reported 0 of 1 ready.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 01-04: `wowheadItemUrl` is exported and tested.
- Manual look suggested (coverage D3): copy a Forever reserve run's Discord text and confirm the links open Forever item pages.

## Self-Check: PASSED

- All five created files exist on disk.
- Commits `c117e240` and `d6f49d19` exist.
- All acceptance criteria from both tasks re-run and pass; plan-level verification (253 tests in `domain/expansion`, `lib/__tests__`, `ItemLink`; `tsc` 0 errors; eslint 0 errors) passes.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*
