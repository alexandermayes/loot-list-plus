---
phase: 04-discovery-lists-and-score-split
plan: 19
subsystem: testing
tags: [copy-signoff, surface-sweep, reader-inventory, golden-locks, lua-parity, changelog, owner-checkpoint]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "Every Phase 4 plan (04-01 to 04-18, 04-20, 04-21): all user-facing copy in code, the need reader inventory entries, the changelog hook"
provides:
  - "Reader inventory test swept to the Phase 4 state (prio-list exclude, loot-items-query exclude plus branch, submit, bootstrap and loot-items notes)"
  - "Known-guild locks re-proved on the phase branch: golden fixtures, Lua exporter bytes, full suite"
  - "Surface sweep with a decision per surface for the Discovery lists launch (Hard Constraint 7)"
  - "DRAFT changelog entry for Discovery lists, presets and the score split, dated with a placeholder"
  - "Owner's recorded copy sign-off, 2026-11-11, and the Phase 4 DRAFT markers flipped in three commits grouped by PR"
affects: [04-PR-2, 04-PR-3, 04-PR-4, phase-05, ship-date-for-changelog]

actuals:
  tokens: 1700
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Sign-off flips are comment-only commits grouped by the PR their files ship in, so each cherry-picks onto its PR branch"
    - "The changelog entry keeps a placeholder date until the owner names the ship date, because the Discord updates cron posts the newest entry"

key-files:
  created: []
  modified:
    - lib/loot/__tests__/need-reader-inventory.test.ts
    - lib/updates-data.ts

key-decisions:
  - "Owner approved every string, the three preset knob tables and the changelog entry as built (no edits asked), 2026-11-11"
  - "Changelog keeps the placeholder date November 10, 2026 until the owner names the ship date"
  - "The four carried questions and the flagged items keep their built defaults (listed below) and are open as follow-ups"
  - "Two test describe titles that carried the DRAFT label were renamed with the markers, so the flip is not strictly comment-only"

requirements-completed: [DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11]

coverage:
  - id: D1
    description: "Need reader inventory reflects the Phase 4 state and the scan finds no unlisted reader"
    requirement: "DISC-10"
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/need-reader-inventory.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Known guilds unchanged: golden fixtures pass and the Lua exporter output is byte-identical on origin/main and on the branch"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring (385 tests)"
        status: pass
      - kind: other
        ref: "Lua exporter run on origin/main and on the branch, 6875 bytes each, cmp identical"
        status: pass
    human_judgment: false
  - id: D3
    description: "Surface sweep recorded with a decision per surface, and a DRAFT changelog entry at the top of lib/updates-data.ts"
    verification:
      - kind: unit
        ref: "app/__tests__/content-dates.test.ts"
        status: pass
    human_judgment: true
    rationale: "Whether each surface decision is right (privacy page, external posts, ship date) is the owner's call"
  - id: D4
    description: "Owner signed off the Phase 4 copy, the preset values and the changelog entry; DRAFT markers flipped"
    verification:
      - kind: other
        ref: "git diff origin/main...HEAD -U0 added lines containing DRAFT: none"
        status: pass
    human_judgment: true
    rationale: "The sign-off is the owner's words, recorded below; automation cannot judge whether the words are right"

duration: 12min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 19: Phase close, locks, surface sweep and copy sign-off Summary

**Reader inventory swept to the Phase 4 state, Known-guild golden and Lua locks re-proved (Lua exporter 6875 bytes identical), surface sweep and a placeholder-dated changelog entry recorded, and the owner's copy sign-off of 2026-11-11 written down with every Phase 4 DRAFT marker flipped.**

Copy signed off 2026-11-11 by the owner. The owner's words: "Copy signed off". No notes, no changes and no ship date were given, so every string, the three preset knob tables and the changelog entry stand as built; the changelog keeps its placeholder date (November 10, 2026) until the owner names the ship date. The four carried questions and the flagged items keep their built defaults (see "Defaults kept" below), so the owner can revisit them as follow-ups. The copy inventory shown at the checkpoint was kept outside the repo (sections 1 to 5: copy by surface, preset knob values, Phase 3 held strings, questions, differences from the UI-SPEC).

## Performance

- **Duration:** 12 min of agent execution in this final segment (Tasks 1 and 2 ran earlier; the owner checkpoint sits between them)
- **Completed:** 2026-11-11
- **Tasks:** 3 (tracer, auto, checkpoint:decision)
- **Files modified:** 24 outside `.planning` (the inventory test, the changelog, and the sign-off flips; `lib/updates-data.ts` is touched by two commits)

## Accomplishments

- Task 1 (tracer): the need reader inventory test now reads the Phase 4 state: the prio-list entry is `exclude` (GET drops need-row priorities, POST refuses them), `lib/loot-items-query.ts` is `exclude` plus `branch` for `includeNeeds` on all-Discovery groups, the submit, bootstrap and loot-items notes name the budget, eligibility and need list scope paths, and the guard marker no longer names the deleted hold predicate.
- Locks for Known guilds, run on the branch and again after the sign-off flips: golden fixtures plus `domain/scoring` 385 tests pass; the Lua exporter output is 6875 bytes on origin/main and 6875 bytes on the branch, `cmp` identical; `npm test` 320 files, 6422 tests; typecheck exit 0; lint 0 errors (375 warnings, none new errors).
- Task 2: a DRAFT changelog entry with three items (feature "Discovery lists for WoW Forever", feature "Loot style presets", improvement "Standing and interest on every score") at the top of `lib/updates-data.ts`; `app/__tests__/content-dates.test.ts` passes (19 tests); no em or en dash in the file.
- Task 3: the owner approved the copy as written; the DRAFT markers that Phase 4 introduced are now signed-off notes dated 2026-11-11, in three comment-level commits grouped by the PR the files ship in.

## Task Commits

1. **Task 1 (tracer): reader inventory sweep and locks** - `7bdfe038` (test)
2. **Task 2: DRAFT changelog entry and sweep table** - `852ef3fa` (feat)
3. **Task 3: owner sign-off, markers flipped** - three commits:
   - PR 2 files: `6ee4cfec` (docs) - 12 files: need-budget, need-eligibility, need-questions, explain, loot-style-presets, ScoreBreakdownModal, NeedQuestionFlow, NeedQuestionSheet and the tests beside them
   - PR 3 files: `fe96311c` (docs) - 10 files: expansions `_client.tsx`, SetYourFiveSendRow and its test, set-your-five, NeedPicker, NeedPickerRow, SetYourFiveLinkEntry, BudgetLine, need-lines, `lib/updates-data.ts`
   - PR 4 files: `9fe5795f` (docs) - `app/components/LootStylePicker.tsx`

**Plan metadata:** recorded in the `docs(04-19)` commit that carries this file, STATE.md, ROADMAP.md and REQUIREMENTS.md.

## Surface sweep (Hard Constraint 7)

| Surface | Decision |
|---------|----------|
| Site | The changelog entry is the one site change. The changelog, the updates page, the landing line and the sitemap lastmod all read the newest entry, so the placeholder date flows to all four until the owner names the ship date. |
| Schema | No public schema doc changes. The migration (`need_lists`, `guild_settings.loot_style`) shipped in PR 1 (#506), merged and deployed. |
| Discord | The updates cron posts the newest entry after merge, so the changelog entry merges only now that the copy is signed off, and only with the real ship date. Set your 5 adds an officer-sent message (channel post plus direct messages, counts only, one send per guild per hour). |
| GitHub | PR bodies describe each PR (map below). README unchanged unless the owner asks. |
| Legal | `app/privacy/page.tsx` describes Discord OAuth but does not say the app sends Discord direct messages. DMs already exist (officer notifications, resubmit reminders, trial notices) and Set your 5 adds one more. A pre-existing gap; nothing changed, the owner decides on a privacy page update (flagged item, stands as built). |
| External posts | The owner's call. None drafted here. |

## Defaults kept (open for the owner to revisit)

The four questions carried to the sign-off, each keeping the built behaviour:

1. **Set your 5 opt-out:** no member opt-out ships (D-30). Members with direct messages closed are skipped quietly; the send is officer-only behind a confirm.
2. **"Change my 5" reopen timing:** the audited reopen runs at save, not at confirm, so a raider who confirms and walks away leaves the approved list untouched.
3. **UI-09, Fine-tune at creation:** a collapsed, read-only "What this sets" list; the 20 knobs stay in Loot system settings.
4. **D-28 wording:** "all N raids" when a need is ranked in every tier the list covers, otherwise the tier names; a one-tier list shows the tier name.

Flagged items that stand as built:

- Standing part order follows the locked example (bad luck protection before officer bonus): attendance, guild rank, role, officer priority, bad luck protection, officer bonus, trial penalty, bank donations.
- No stat hint is drawn in the question sheet (only the class's top armour carries "Your armour"; most weapon and trinket slots show the neutral target icon).
- A sent-back list keeps the officer note visible instead of switching to the "You changed your 5" sentence.
- "All N raids" is taken from the list's own need rows, so a tier whose sheet is not open yet makes every need name the visible tiers.
- The privacy page is unchanged (see Legal row above).
- Optional owner action (A9): run the addon repo's `gen_web_fixtures.mts` once after the score split, in case it serialises whole ScoreResult objects.
- Changelog date: placeholder November 10, 2026, to be set to the ship date before the changelog PR merges.

## Decisions Made

- Approve as written: every string, the preset names, lines, summaries and knob values (reward_attendance equals what a new guild gets today), and the changelog entry stand. A later copy change is a code edit inside the change map, not a migration.
- Flip only markers that Phase 4 added (found with `git diff origin/main...HEAD`), never the older ones on main.
- Keep the flips in three commits by PR so the orchestrator can cherry-pick each onto its branch.

## Deviations from Plan

**1. [Dash scan] One em dash found in a pre-existing comment**
- **Found during:** Task 1 (dash scan over lines the phase added)
- **Issue:** `app/api/master-sheet/visibility/route.ts` has one em dash inside a code comment. It is not user-facing and predates this plan's changes.
- **Fix:** Left alone (out of scope; no user-facing string of the phase contains an em or en dash).

**2. [Sign-off flip] Two test names carried the marker**
- **Found during:** Task 3
- **Issue:** `domain/loot/__tests__/need-budget.test.ts` and `domain/loot/__tests__/need-eligibility.test.ts` had `DRAFT` inside a `describe` title, not a comment, so the flip renames two describe blocks.
- **Fix:** Renamed to "copy signed off 2026-11-11, 04-19". Assertions untouched; `npm test` passes after the change.
- **Committed in:** `6ee4cfec`

**3. [Change-map gaps] Copy the map did not list**
- **Found during:** Task 3 inventory
- **Issue:** The five `SET_YOUR_FIVE_*` error constants live in `domain/loot/set-your-five.ts` (a Next route file may export only handlers), not in the route; the slot, armour and stat labels and slot group names (`domain/loot/need-questions.ts`), the candidate modal Standing tooltip and "Officer bonus ({detail})" line (`ItemCandidateModal.tsx`) and the guild-settings `loot_style` API error were DRAFT copy the map omitted.
- **Fix:** Included in the inventory the owner signed off. Only the files that carried a marker needed a flip.

**4. [Older markers outside the phase] Left as they are**
- `app/api/loot-submissions/reopen/route.ts`, `domain/loot/prio-violations.ts`, `app/components/BisImportModal.tsx` and the fallback string in `app/contexts/LootListContext.tsx` (line 767) carry DRAFT markers that predate Phase 4 on main. They are not part of this sign-off and still read "held for owner sign-off".

**Total deviations:** 4 (none changed behaviour; 1 test-title rename). **Impact:** none on the locks; the sign-off record is complete.

## Issues Encountered

None blocking. The `git diff origin/main...HEAD` check after the flips lists no added line containing DRAFT.

## Human checks the phase leaves open

Collected from the plan SUMMARYs; none is a code gap, each needs a real browser, device or account:

- Need picker at 320px and 375px: layout, no horizontal scroll, the footer never covering row 5, the longest need sentence, 200% zoom, the 60-second fill (04-11, DISC-02 edge probe); the question sheet tile grid, the bottom sheet slide and safe-area on a real phone (04-10).
- Keyboard and screen-reader passes on the picker and the question flow (04-11, 04-10, 04-20).
- The three themes, including light and dark for Loot system settings and the Create a guild modal at 343px and 1024px (04-16).
- The signed-out Set your 5 link round trip on a phone, and the Overview card and tiles at 343px (04-13, 04-07, 04-18).
- Classic guild unchanged: a visual look at a Classic guild's score and list screens (Hard Constraint 4 is proved by the golden and Lua locks; this is the human backstop).
- Preset picker at 343px and 768px: the radio staying on the first line when the line wraps, three columns at 768px and wider (04-16).
- The 288px popover sentence with all eight standing parts and the score tiles at 343px (04-12, 04-14).
- A 300 character officer note on a rejected list at 320px and 375px, and the approve-then-Change-my-5 flow on a throwaway Discovery guild (04-20).
- List mode row at 320px on a Forever guild, including a triggered 409 sentence (04-17).
- A real send from a staging guild: the link button renders, the channel post and a direct message arrive, a member with DMs closed is skipped, and the officer row reads right at 320px (04-18).

## PR map

| PR | Contents | State |
|----|----------|-------|
| PR 1 #506 | Migration only (`20261111120000_need_lists.sql`, five files) | Merged and deployed (Deploy Migrations run 42969511761) |
| PR 2 #507 | Need primitives: budget, eligibility, questions, score split, presets, modal and question flow | Open and gated; merges now that the copy is signed off (flip commit `6ee4cfec`) |
| PR 3 #509 | Discovery lists surfaces, Set your 5, changelog; stacked on PR 2 | Open and gated; merges after PR 2, with the real ship date set in `lib/updates-data.ts` (flip commit `fe96311c`) |
| PR 4 #508 | Preset picker (creation and settings); stacked on PR 2 | Open and gated; merges after PR 2 (flip commit `9fe5795f`) |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 is complete once the three flip commits are cherry-picked onto their PR branches and PR 2, PR 3 and PR 4 merge. Before PR 3 merges, set the real ship date in `lib/updates-data.ts` (the Discord updates cron posts the newest entry after merge).
- The human checks above and the four carried questions are follow-ups, none blocking the merge.

---
*Phase: 04-discovery-lists-and-score-split*
*Completed: 2026-11-11*

## Self-Check: PASSED
