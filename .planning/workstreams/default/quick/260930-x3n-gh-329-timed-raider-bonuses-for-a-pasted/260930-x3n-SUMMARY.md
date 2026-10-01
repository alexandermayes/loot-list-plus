---
phase: quick-260930-x3n
plan: 01
subsystem: scoring, loot-management
status: complete
tags: [raider-bonus, scoring, bulk-import, validation, gh-329]
requires: []
provides:
  - Timed, labelled, batched raider bonus entries (starts_at, label, batch_id) in guild_settings.single_raider_modifiers
  - isRaiderBonusEntryActive shared by computeScore and resolveActiveRaiderModifiers
  - domain/scoring/raider-bonus.ts (normalize, tidy, validate, batch edits, grouping, window, formatting, breakdown text)
  - domain/guild/roster-name-match.ts shared by raid tracking and the bulk modal
  - PUT /api/guild-settings 400 on malformed single_raider_modifiers
  - BulkRaiderBonusModal, RaiderBonusesCard, ScoreBreakdownModal raider bonus section
affects:
  - app/(app)/raid-tracking/_client.tsx (name parsing and matching now via shared module)
  - app/api/addon/* exports (inherit the start-date rule through resolveActiveRaiderModifiers; files unchanged)
tech-stack:
  added: []
  patterns:
    - Strict server validator plus lenient client normalizer for one JSONB shape
    - Save wiring extracted to a plain module (raider-bonus-save.ts) and tested with mocked fetch
key-files:
  created:
    - domain/scoring/raider-bonus.ts
    - domain/scoring/__tests__/raider-bonus.test.ts
    - domain/guild/roster-name-match.ts
    - domain/guild/__tests__/roster-name-match.test.ts
    - app/api/guild-settings/__tests__/route.test.ts
    - app/(app)/loot-management/components/raider-bonus-save.ts
    - app/(app)/loot-management/components/__tests__/raider-bonus-save.test.ts
    - app/(app)/loot-management/components/BulkRaiderBonusModal.tsx
    - app/(app)/loot-management/components/__tests__/BulkRaiderBonusModal.test.tsx
    - app/(app)/loot-management/components/RaiderBonusesCard.tsx
    - app/(app)/loot-management/components/__tests__/RaiderBonusesCard.test.tsx
    - app/components/__tests__/ScoreBreakdownModal.test.tsx
  modified:
    - domain/types.ts
    - domain/scoring/modifiers.ts
    - domain/scoring/attendance.ts
    - domain/scoring/explain.ts
    - domain/scoring/index.ts
    - domain/scoring/__tests__/engine.test.ts
    - app/api/guild-settings/route.ts
    - app/(app)/loot-management/components/PriorityListTab.tsx
    - app/(app)/raid-tracking/_client.tsx
    - app/components/ScoreBreakdownModal.tsx
decisions:
  - "PriorityListTab save wiring (persist with tidy, 400 message, rollback; batch save with one batch id, success toast, alias POST with C-17 on any failure) lives in raider-bonus-save.ts per plan-checker W1"
  - "Added countRosterMatches to roster-name-match.ts so the raid import's per-name preview counting (no dedupe, total = names.length, via splits matched from alias) is tested directly (W2)"
  - "C-17 alias notice uses the 'warning' notification type because the bonus itself saved"
  - "Tracer feedback gate passed on its automated verify (plan autonomous: true; orchestrator asked for all tasks)"
metrics:
  duration: 22min
  completed: 2026-10-01
  tasks: 3
  files: 22
actuals:
  tokens: 35700
  tasks: 3
  commits: 4
---

# Quick 260930-x3n Plan 01: GH #329 timed raider bonuses for a pasted list Summary

Officers can paste a raid list and give everyone matched one bonus for This week, Next week or custom dates, with a reason. Entries carry start dates, reasons and a shared batch id inside the existing JSONB, one inclusive-window rule drives both the web score and the addon export, and the server rejects malformed maps with a 400. Raiders see each bonus's reason and end date.

All work is in WT `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wtbonus` on `feat/329-timed-raider-bonuses` (base origin/main 4a085a4f). It is committed locally only: nothing pushed, no PR.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | 0df790ca | feat(scoring): timed raider bonuses with start dates, reasons and batches (#329) |
| 2 | dc211491 | feat(loot-management): add a timed bonus for a pasted list of raiders (#329) |
| fix | 904ef1b7 | style(scoring): drop em dashes from new module headers (#329) |
| 3 | e12d0b70 | feat(loot-management): group raider bonuses by batch and explain them to raiders (#329) |

Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (4 trailers, 4 commits).

## Verification

| Check | Baseline (origin/main 4a085a4f) | Final (e12d0b70) |
|-------|------|------|
| `npx vitest run` | 146 files / 2616 tests passed | 153 files / 2720 tests passed, 0 failed |
| `npx tsc --noEmit` | clean | clean |
| `eslint --max-warnings 0` on changed files | n/a | clean on 21 of 22 files. `app/(app)/raid-tracking/_client.tsx` has 9 warnings, the same set as on origin/main (see Deviations) |
| Em dash in added lines | n/a | none |
| Untouched: .planning, supabase, reset-season, master-sheet, app/api/addon | n/a | untouched |
| No isPro / PRO_FEATURES / hex literals in the new components | n/a | pass |
| Branch, trailers, clean tree | n/a | pass |

The flaky 5s timeout in `__tests__/quality-brand-token-parity.test.ts` did not show up in any run.

Parity note (W2): raid-tracking's `_client.tsx` has no tests of its own. Parity with the old import behaviour rests on the shared module's tests in `domain/guild/__tests__/roster-name-match.test.ts`: parseRosterNames formats, first-wins name and alias lookup, an alias outside the roster returning null, and countRosterMatches per-name counting (no dedupe, total equals names.length, `via` splitting matched from alias-matched). The raid-tracking component suites stay green.

## C-ID to file:line

Paths are relative to WT. M = `app/(app)/loot-management/components/BulkRaiderBonusModal.tsx`, C = `app/(app)/loot-management/components/RaiderBonusesCard.tsx`, S = `app/(app)/loot-management/components/raider-bonus-save.ts`, R = `domain/scoring/raider-bonus.ts`, B = `app/components/ScoreBreakdownModal.tsx`.

| C-ID | Location |
|------|----------|
| C-1 | C:135 |
| C-2 | M:200 |
| C-3 | M:202 |
| C-4 | M:207 (label); placeholder reused verbatim at M:72 |
| C-5 | M:282 (placeholder "+5 or -2" reused) |
| C-6 | M:296 label, M:304 placeholder, M:308 hint |
| C-7 | M:314 label, M:67-69 options |
| C-8 | M:189 ("{start} to {end}"), M:190 ("Until {date}") |
| C-9 | M:321 Starts, M:331 Ends |
| C-10 | M:193 end-before-start, M:194 end-in-past or missing |
| C-11 | M:218 matched, via alias and unmatched (reused wording) at M:219-220, M:221 picked, M:223 repeated |
| C-12 | M:238 |
| C-13 | M:257 "Skip", M:255 aria-label |
| C-14 | M:270 |
| C-15 | M:352 (plural helper at M:75); Cancel reused |
| C-16 | S:17 |
| C-17 | S:13 (reused save-failed toast at S:12) |
| C-18 | C:129 |
| C-19 | C:200 title, C:43 count |
| C-20 | C:209 aria-label, C:211 "Remove all" |
| C-21 | C:226 |
| C-22 | C:53 starts, C:56 ended (existing until/permanent at C:59/C:61) |
| C-23 | C:266 |
| C-24 | R:341 reason fallback, R:343 "until {date}", joined at R:346 |
| C-25 | B:202 title, B:203 subtitle, B:207 body |
| C-26 | B:68 |
| C-27 to C-34 | R:50 to R:57 (one constant per message, in order) |

## Deviations from Plan

### Auto-fixed Issues

**1. [W1, orchestrator] Save wiring extracted to raider-bonus-save.ts**
- **Found during:** Tasks 1 and 2
- **Issue:** The plan-checker asked for the save logic to be unit-testable with mocked fetch.
- **Fix:** Added `putRaiderModifiers`, `persistRaiderModifiers` (tidy, optimistic set, the server's 400 message, rollback) and `saveRaiderBonusBatch` (one batch id, the modal stays open on failure, the C-16 toast, then the alias POST with C-17 on any failure including a 403), with 13 tests. PriorityListTab calls them.
- **Consequence:** the plan's literal greps `tidyRaiderModifiers(` and `api/character-aliases` in PriorityListTab.tsx now match raider-bonus-save.ts instead. The behaviour is the same.
- **Files:** app/(app)/loot-management/components/raider-bonus-save.ts, its test, PriorityListTab.tsx
- **Commits:** 0df790ca, dc211491

**2. [W2] countRosterMatches added to the shared matcher**
- The raid import's `parseAttendancePreview` now returns `countRosterMatches(parseMRTNames(data), rosterMatcher)`, so its per-name counting is tested directly. Commit dc211491.

**3. [Rule 3] Lint-only cleanups so changed files pass `--max-warnings 0`**
- PriorityListTab.tsx: removed the unused `allRoles` import, changed `[_, rank]` to `[, rank]` (3 places), and added `eslint-disable-next-line` for two pre-existing exhaustive-deps warnings and one `<img>`, following patterns already used in app/. attendance.ts: removed the unused `ScoringConfig` type import. No behaviour change. Commit 0df790ca.

**4. [Rule 1] Em dashes in two new module header comments**
- `domain/scoring/raider-bonus.ts` and `domain/guild/roster-name-match.ts` header lines used an em dash. Replaced with a colon in follow-up commit 904ef1b7.

**5. [Rule 3] Guard-suite constraint on test queries**
- `__tests__/type-scale-floor.test.ts` bans the substring `LabelText` anywhere under app/, which rules out `getByLabelText`. The modal and card tests query by role instead (textbox, spinbutton, combobox). The date inputs, which have no ARIA role, are selected as `input[type="date"]` in order.

**6. Not fixed: 9 pre-existing eslint warnings in `app/(app)/raid-tracking/_client.tsx`**
- These are unused vars, exhaustive-deps and unused import warnings. Linting the origin/main copy gives exactly the same set. The plan says to keep this file's diff minimal and change no other logic, so they were left alone. The final gate's eslint step fails only on this file; the other 21 changed files are clean. Deferred.

**7. Tracer gate**
- Auto mode is off, but the plan is `autonomous: true` and the orchestrator asked for all tasks. The tracer's automated verify was re-run green before expansion, so no human-verify checkpoint was returned.

**8. Tracking files**
- Per orchestrator instruction ("only write the SUMMARY there"), STATE.md, ROADMAP.md, WINDOWS.md and deferred-items.md were not written. Nothing needed a stub entry.

## Open decisions OD-1 to OD-8 (as resolved)

- OD-1 (PC-1): inline "pick a raider" select plus "Remember this name" inside the bulk modal. AttendeeResolutionModal is not reused. Implemented.
- OD-2 (PC-2): This week stores starts_at null and expires_at at the current reset week's end. Implemented.
- OD-3 (PC-3): a picked raider is included even when Remember is unticked. Implemented and tested.
- OD-4 (PC-4): limits are UUID ids, 1000 raiders, 50 entries per raider, a 60-character trimmed reason, batch_id `^[A-Za-z0-9-]{8,64}$`, and any finite amount. Implemented. A non-string label returns C-32.
- OD-5 (PC-7): the default mismatch for `single_raider_overall_bonus` is left alone. Follow-up.
- OD-6 (PC-8): aliases need manage_members and bonuses need manage_settings. Unchanged, and an alias 403 shows C-17. Tested.
- OD-7 (PC-9): exports resolve bonuses at export time, so a Next week bonus shows in-game only in an export made on or after its start. Documented in the PR body.
- OD-8 (PC-6): master sheet popovers stay number-only. MasterSheetContent.tsx and the addon routes are untouched.

## Follow-ups

- `POST /api/character-aliases` does not check that character_id belongs to the guild (T-329-05).
- The Raider bonuses card PUTs the whole map, so the last write wins when two officers save at once (T-329-07).
- The `single_raider_overall_bonus` default differs: DB true, GET fallback true, DEFAULT_SETTINGS false (domain/scoring/defaults.ts:16).
- Master sheet hover popovers could show raider bonus reasons.
- Timezones (W3): the web uses the viewer's local date, and the addon and companion exports resolve bonuses on the server's date. Near midnight, a bonus can start or end up to a day apart between web and in-game. Reset weeks are anchored to whole local days, not WoW's reset hour.
- Pre-existing eslint warnings in raid-tracking `_client.tsx` (9).
- Manual (not a gate): screenshot the modal and card at 1440px and 390px before opening the PR.

## Threat Flags

None beyond the plan's threat model. T-329-01, 02, 03 and 04 are mitigated as planned: the validator, the size limits plus tidy-on-save, plain-text reasons with maxLength, and an alias 403 surfaced as C-17.

## PR body draft

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pr-x3n-body.md`

## Self-Check: PASSED

- All 12 created files exist in WT, and all 4 commits (0df790ca, dc211491, 904ef1b7, e12d0b70) are on feat/329-timed-raider-bonuses.

## Delivery (orchestrator, 2026-10-01)

- Orchestrator follow-up commit 6c6efadf: an unlabelled one-raider batch is titled "Bonus for 1 raider" (the singular of the signed-off C-19), with a card test.
- PR #334 squash-merged as dcdff9c3 after every CI check passed on 6c6efadf (the CI Test job is the clean full run the verification asked for). #329 closed by the merge, with a how-to comment for the Discord thread.
- Vercel production deploy succeeded. No migration.
- Accepted: the 9 pre-existing eslint warnings in app/(app)/raid-tracking/_client.tsx, which match origin/main exactly. CI runs eslint without --max-warnings.
- Still open: the visual check of the bulk modal and the card at desktop and phone widths, and a live officer check of the alias permission path (C-16 then C-17).
