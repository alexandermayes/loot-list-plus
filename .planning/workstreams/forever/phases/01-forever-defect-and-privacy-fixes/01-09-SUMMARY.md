---
phase: 01-forever-defect-and-privacy-fixes
plan: 09
subsystem: discord-bot
tags: [discord-bot, copy, em-dash, vitest, forever]

requires:
  - phase: 01-forever-defect-and-privacy-fixes
    provides: "plan 01-04 priorityEmbed item link (WOWHEAD_ITEM_URL, item_url fallback), left untouched"
provides:
  - "No /priority or /score embed title and no /priority raider line contains an em dash (proposed copy, owner sign-off pending)"
  - "The officer ops help-article review embed title carries no em dash; reviewEmbed is exported from discord-bot/help.js for tests"
  - "A test loop over every priorityReply (ranked, empty) and scoreReply (with and without team) embed asserts no U+2014 in title or description"
affects: [phase-07 REH-02 (owns the remaining bot em dashes and the full bot copy sheet), phase-01 shipping split (PR 6 holds for owner copy sign-off)]

actuals:
  tokens: 1900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Copy literals and their test assertions change together; non-ASCII characters are written with unicode escapes in tests"

key-files:
  created: []
  modified:
    - discord-bot/interactions.js
    - discord-bot/interactions.test.mjs
    - discord-bot/help.js
    - discord-bot/help.test.mjs

key-decisions:
  - "Colon replaces the em dash in /priority and /score titles; a middle dot (U+00B7, already used in the score footer) replaces it in the /priority raider line; parentheses replace it in the review title"
  - "The /priority footer stays exactly 'Sorted by loot list rank. Loot Scores are on the Master Sheet.' (Decision 10)"
  - "Em dashes outside the in-scope strings stay as the owner-accepted Phase 7 REH-02 deferrals (owner decision 3)"

patterns-established:
  - "No-em-dash loop test over every embed a reply builder can return"

requirements-completed: [FIX-03]

coverage:
  - id: D1
    description: "/priority titles (ranked and empty), the /priority raider line and the two /score titles contain no em dash, and the list-rank footer is unchanged"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "discord-bot/interactions.test.mjs#no em dash in /priority and /score replies (FIX-03, Hard Constraint 2)"
        status: pass
      - kind: unit
        ref: "discord-bot/interactions.test.mjs#priorityReply > returns the existing title and raider lines plus C-2 footer for an ok answer with raiders"
        status: pass
    human_judgment: false
  - id: D2
    description: "The officer ops review embed title is '🆕 New help article (pending review)' with no em dash"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "discord-bot/help.test.mjs#reviewEmbed > titles the officer review post without an em dash"
        status: pass
    human_judgment: false
  - id: D3
    description: "Plan 01-04's item link logic (WOWHEAD_ITEM_URL, item_url shape check, item_wowhead_id fallback) is intact and its tests pass unedited"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "discord-bot/interactions.test.mjs#priorityReply item link (FIX-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The replacement bot copy (colon titles, middle-dot raider-line separator, parenthesised review title) is approved by the owner"
    requirement: "FIX-03"
    verification: []
    human_judgment: true
    rationale: "Hard Constraint 2: user-facing copy needs owner sign-off before PR 6 merges; no automated check can approve wording"

duration: 4min
completed: 2026-10-13
status: complete
---

# Phase 01 Plan 09: Bot embed titles without em dashes Summary

**`/priority` and `/score` embed titles, the `/priority` raider line and the officer help-article review title no longer contain an em dash (colon, middle dot, parentheses), with a test loop guarding every reply embed; the new strings still need the owner's copy sign-off before PR 6 merges.**

## Performance

- **Duration:** 4 min (approximate; start time was not captured at spawn, end is the metadata step)
- **Started:** 2026-10-13T21:53Z (approximate)
- **Completed:** 2026-10-13T21:57Z
- **Tasks:** 2 (Task 1 tracer, Task 2)
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments

- A raider's `/priority` reply now reads "Top priority: ITEM" with raider lines like "#1 NAME (CLASS) · rank 40", and `/score` reads "NAME: Loot Score" or "NAME: Loot Score (TEAM)". `discord-bot/interactions.js` no longer contains U+2014 anywhere (the one code comment was changed too).
- The officer ops review post reads "🆕 New help article (pending review)", and `reviewEmbed` is exported so it can be tested.
- The `/priority` footer is byte-identical ("Sorted by loot list rank. Loot Scores are on the Master Sheet."), and plan 01-04's item link code and tests are untouched.

## Task Commits

1. **Task 1: Tracer: /priority and /score replies carry no em dash** - `85fc6eb9` (fix)
2. **Task 2: Officer ops review post carries no em dash** - `f9db035b` (fix)

**Plan metadata:** committed separately (docs: complete plan; SUMMARY first, then STATE/ROADMAP/REQUIREMENTS).

_Both tasks were `tdd="true"`: the updated assertions and new tests were written first and run red for the right reason (8 failures in interactions, `reviewEmbed is not a function` in help), then made green. The plan prescribes one commit per task, so there is no separate `test(...)` commit._

**Tracer feedback gate:** Task 1 was the tracer. Its `<verify>` (`npx vitest run discord-bot` plus the file-level em-dash check) passed after the commit. The interactive human-verify gate was passed under the standing approval from the orchestrator, and execution continued into Task 2. That approval does not cover the copy sign-off below.

## Copy pending owner sign-off

Hard Constraint 2: these are PROPOSED strings; PR 6 must not merge until the owner approves or replaces them. A rejected string is a literal swap plus its test assertion.

| # | Where | Old | New |
|---|-------|-----|-----|
| 1 | `/priority` title (ranked and empty state) | `Top priority — ITEM` | `Top priority: ITEM` |
| 2 | `/priority` raider line | `` `#1` **NAME** *(CLASS)* — rank 40 `` | `` `#1` **NAME** *(CLASS)* · rank 40 `` (middle dot, U+00B7; owner decision 5) |
| 3 | `/score` title, no team | `NAME — Loot Score` | `NAME: Loot Score` |
| 4 | `/score` title, with team | `NAME — Loot Score (TEAM)` | `NAME: Loot Score (TEAM)` |
| 5 | Officer ops review post title | `🆕 New help article — pending review` | `🆕 New help article (pending review)` |

Unchanged on purpose: the `/priority` footer "Sorted by loot list rank. Loot Scores are on the Master Sheet." (Decision 10) and the `/score` footer "GUILD · LootList+".

## Phase 7 REH-02 hand-off

Remaining user-facing bot em dashes, left as-is by owner decision 3 (explicit exception to Hard Constraint 2 for Phase 1). Phase 7 REH-02 owns the full bot copy sheet and its automated em-dash test. The `/priority` raider line is NOT on this list (owner decision 5; fixed here). Line numbers are current as of commit `f9db035b`.

Owner-named:

- `discord-bot/feedback.js:327` - "Thanks — this ... is tracked as ..." reply
- `discord-bot/help.js:344` - auto-answer footer "Auto-answer — an officer will confirm ..."
- `discord-bot/help.js:352` - no-confident-answer reply ("... help you out — hang tight!")
- `discord-bot/commands.js:24` - `/help` command description "Ask a question — answered from ..."
- `discord-bot/digest.js:126` - feedback digest header "... digest — last 24h"

Found during planning, not in the owner's list, proposed for the same deferral (owner to confirm):

- `discord-bot/feedback.js:324` - possible-duplicate note appended to the tracked reply
- `discord-bot/help-review.js:94` - "Published by ... — now searchable via /help." confirmation
- `discord-bot/help.js:129` - snippet separator inside the help reply

Not user-facing, so outside the constraint: em dashes in code comments and console log lines (bot.js, closures.js, feedback.js, help.js, help-review.js, digest.js) and text sent only to the model or to GitHub (feedback.js:160, :170, :338; help.js:155). AI-drafted help article titles are data, not copy.

## Files Created/Modified

- `discord-bot/interactions.js` - `/score` and `/priority` titles, `/priority` raider-line separator, one code comment; link logic untouched
- `discord-bot/interactions.test.mjs` - three assertions moved to the new strings, empty-state title assertion, team-title case, and a four-embed no-em-dash loop
- `discord-bot/help.js` - review embed title; `reviewEmbed` added to `module.exports`
- `discord-bot/help.test.mjs` - `reviewEmbed` title test

## Decisions Made

See `key-decisions` above. Replacement characters follow the plan's proposals exactly. The Big Yikes voice skill (a guild-community voice guide, not specific to this product) was read; its "prefer a full stop over a dash" rule is consistent with the colon and middle-dot choices, and it set no rule that changes the proposed strings.

## Deviations from Plan

None - plan executed exactly as written.

Notes that are not deviations: the plan placed the old comment near line 193; it now sits at line 206 after plan 01-04's additions, so it was located by content. A `sed -i` call failed on macOS before any file was touched; the test edit was redone with a script and no work was lost.

## Issues Encountered

None.

## Verification Results

- `npx vitest run discord-bot`: 2 files, 40 tests pass (includes the no-em-dash loop, the team-title case, the `reviewEmbed` title test, and all nine plan 01-04 item link tests, unedited).
- `npx eslint discord-bot`: exit 0.
- `interactions.js` contains no U+2014 (check exits 0); the help.js review-title line check exits 0.
- Acceptance greps: `Top priority: ` 2, footer string 1, `WOWHEAD_ITEM_URL` 2, `reviewEmbed,` 1 in help.js.
- Remaining `—` characters in `discord-bot/*.js` are comments, log lines, model or GitHub text, or exactly the eight Phase 7 hand-off strings above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. T-09-01 (unapproved copy shipped) is open by design: the owner sign-off above gates PR 6. T-09-02 (markdown rendering) is covered by full-string test assertions; interpolated values render as before. T-09-03 (link integrity) is covered by plan 01-04's tests passing unedited. No new endpoint, auth path or schema change.

## Next Phase Readiness

- All code for the plan is committed. Shipping: PR 6 is its own `fix/...` branch PR, branched from `main` after PR 4 (plans 01-04 and 01-05) has merged. Do not merge it until the owner has approved or replaced the five strings above. Nothing else in the phase depends on this plan. Deploy is the bot only (Railway).
- The owner is also asked to confirm or reject the three "owner to confirm" Phase 7 deferrals.
- FIX-03 is marked complete for plan accounting; the copy half of its success criterion 4 is only verified once the owner signs off the copy (coverage D4, human judgment).

## Self-Check: PASSED

All four modified files are present on disk, both task commits (`85fc6eb9`, `f9db035b`) are found in git, and every acceptance criterion from both tasks plus the plan-level verification were re-run and pass as listed above.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*
