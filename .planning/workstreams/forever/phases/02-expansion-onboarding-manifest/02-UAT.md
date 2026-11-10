---
status: complete
phase: 02-expansion-onboarding-manifest
source: [02-VERIFICATION.md]
started: 2026-10-19T17:29:11Z
updated: 2026-10-19T19:31:56Z
---

## Current Test

[testing complete]

## Tests

### 1. Run the Refresh wago snapshot workflow once via workflow_dispatch after the branch is on main
expected: Run is green. Either (a) it commits a real snapshot to data/expansions/forever/reference/wago.json (build, fetchedAt and sha256 non-null, non-empty DungeonEncounter, Map and ItemSparse tables) and opens one PR from chore/refresh-wago-snapshot, or (b) wago is in outage and the run exits green with a notice. If a PR opens, run npm test locally before merging (the bot PR does not trigger CI). Any boss wago now lists must be promoted in the same PR (D-15). This is the SC5 snapshot half: the committed wago.json is the D-14 placeholder, and it also confirms the research assumptions about the wago endpoint, build list shape and CSV headers (A4, A7).
result: pass

### 2. Owner signs off the setup guide "Your raids" copy and placement (plan 02-11) before that PR merges
expected: Owner approves or edits the heading "Your raids", the badge "Unconfirmed", the note "Boss names are confirmed when the raid opens.", the empty-raid line "Bosses to be announced", the "Raids open Dec 9" / "Opens <date>" lines, the "<n>-player" size label, and the placement after the steps list. Only the string constants at the top of SetupGuide.tsx and their test assertions change if the wording changes.
result: pass

### 3. Owner runs npm run sync:forever (dry run) then npm run sync:forever -- --apply against the real database after deploy
expected: The dry run lists, per existing Forever expansion row, the missing tiers (Barrow Deeps, Hyjal Summit, Onyxia's Lair) and writes nothing. --apply inserts only the missing tiers; a second --apply run inserts nothing. The final duplicate-name report lists any pre-existing duplicate tier names without touching them.
result: pass

### 4. Create a new Forever guild and open the overview setup guide; also open a Classic guild's setup guide
expected: The Forever guild gets three raid tiers (Barrow Deeps, Hyjal Summit, Onyxia's Lair, in that order, all active and visible, phase 1). The "Your raids" section lists 8 Barrow Deeps bosses each with an Unconfirmed badge, Hyjal Summit with "Bosses to be announced", and Onyxia with an Unconfirmed badge; raid tiers show the neutral icon, never Classic or TBC raid art. The Classic guild shows no raid list and its tier icons are unchanged.
result: pass

### 5. Owner supplies Forever boss names for Barrow Deeps and Hyjal Summit (due 2026-10-21, Decision 26)
expected: Names land as one-line manifest edits. Any growth of the provisional set (Hyjal has none today) goes through a reviewed PROVISIONAL_CEILING edit in the same PR (D-15). Also answer the open question in the manifest header: is "Well of Sorrow" a boss or a place?
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
