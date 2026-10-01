---
phase: quick-260930-x3n
verified: 2026-10-01T11:55:00Z
status: human_needed
score: 6/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Decide on the DELIVERY-R1 eslint clause. `npx eslint --max-warnings 0` fails only on app/(app)/raid-tracking/_client.tsx, with 9 warnings (5 unused vars, 4 exhaustive-deps)."
    expected: "Accept as pre-existing (add the suggested override) or ask for a cleanup commit. The verifier linted the origin/main copy of the file and got the same 9 rule+message pairs. CI runs plain `eslint` with no --max-warnings, so CI will not fail on these."
    why_human: "The must-have says --max-warnings 0 on every changed file. The plan also says to keep the _client.tsx diff minimal and change no other logic. Only the developer can pick which rule wins."
  - test: "Re-run the full `npx vitest run` once on a quiet machine, or let CI run it on the PR."
    expected: "0 failures. In the verifier's single full run (153 files, 2720 tests), 2 tests timed out at 5000ms while the machine's load average was 53 to 62: ScoreBreakdownModal.test.tsx (new) and SkipDayModal.test.tsx (not touched by this branch). Both pass when run alone (16 files, 257 tests green)."
    why_human: "The timeouts came from load on the machine, not from an assertion. A clean full run is needed before DELIVERY-R1's '0 failures' can be ticked."
  - test: "Visual check of the bulk modal and the Raider bonuses card at 1440px and 390px (the plan's own manual follow-up). Open Loot Management > Priorities with raider bonuses on, paste a list, pick Next week, save, then look at the batch row, the starts/ended marks and Clear ended bonuses."
    expected: "The layout wraps cleanly on mobile, the counts and name chips are readable, class colours show, and the batch row reads as one bonus."
    why_human: "Layout and visual quality cannot be checked with grep or jsdom."
  - test: "Run the bulk save end to end in the real app as an officer who has manage_settings but not manage_members, picking a raider for an unmatched name with Remember ticked."
    expected: "The bonus saves (C-16 toast), then the C-17 warning toast shows. The raider's dashboard Raider bonus tooltip lists the reason and end date once the start date arrives."
    why_human: "Needs a real Supabase session and the real permission checks. The unit tests cover this path only with a mocked fetch."
---

# Quick 260930-x3n: GH #329 timed raider bonuses for a pasted list. Verification Report

**Goal:** Officers can give a time-limited bonus to a pasted list of raiders. Entries gain starts_at, label and batch_id, count only inside their date window (score and addon/companion export), with a bulk modal, a batch-grouped list, server validation, raider-facing explanations, signed-off copy C-1 to C-34 used verbatim, and existing bonuses still working.
**Verified:** 2026-10-01
**Status:** human_needed
**Re-verification:** No, this is the first verification.
**Code under test:** worktree `.../scratchpad/wtbonus`, branch `feat/329-timed-raider-bonuses`, 4 commits over merge-base 4a085a4f (0df790ca, dc211491, 904ef1b7, e12d0b70). Not pushed (`git ls-remote` shows no remote branch). The working tree is clean.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GH-329-R1: entries carry optional starts_at, label and batch_id in the existing JSONB. One inclusive predicate is shared by getRaiderBonus and resolveActiveRaiderModifiers, and legacy entries score as before | VERIFIED | `isRaiderBonusEntryActive` (modifiers.ts) is called by `getActiveRaiderBonusEntries`, which feeds `getRaiderBonus`, and by `resolveActiveRaiderModifiers`. Both ends are inclusive. With no asOfDate, any dated entry is inactive. The verifier compared the old and new predicates over a grid (expires_at null, absent, before, on and after; asOfDate undefined or each day) and found 0 mismatches. The engine.test.ts diff adds 94 lines and removes 0, and it passes. A legacy flat number now gives 0 instead of throwing. No migration and no supabase/ change. |
| 2 | GH-329-R2: "Add for many raiders" opens a paste modal with live matched / via alias / unmatched counts. Parsing and matching come from the shared module that raid tracking also uses. One amount, one reason, and This week / Next week / Custom dates | VERIFIED | BulkRaiderBonusModal.tsx imports parseRosterNames, createRosterMatcher and matchRosterNames from `@/domain/guild/roster-name-match`. `_client.tsx` imports parseRosterNames, createRosterMatcher, countRosterMatches and nameSimilarity from the same module. Line-by-line parity with origin/main: parseRosterNames has the same body as the old parseMRTNames. The matcher gives the same first-wins results for name and alias as the old `.find` chain (spot-checked on samples, including a duplicate alias and an alias pointing outside the roster). countRosterMatches gives the same per-name counts as the old parseAttendancePreview. The BulkRaiderBonusModal tests cover the preview, the durations ("Oct 6 to Oct 12", "Until Oct 5") and custom-date errors (10 tests, all green). |
| 3 | GH-329-R3: one batch_id per paste. Unmatched names are skipped or picked, with an alias saved through POST /api/character-aliases. The list is grouped by batch with Remove all and per-raider remove. Upcoming entries show starts, ended entries show ended, and Clear ended bonuses works | VERIFIED | `saveRaiderBonusBatch` calls `addRaiderBonusBatch(..., crypto.randomUUID())`, so every new entry shares one id; a test asserts the same `batch_id` on both raiders. The alias POST goes out after the bonus saves. A 403, a 500 or a network failure each give `notify('warning', C-17)` and the bonus is kept (it.each test). RaiderBonusesCard uses groupRaiderBonuses, removeRaiderBonusBatch, removeRaiderBonusEntry and tidyRaiderModifiers (9 tests, all green). |
| 4 | GH-329-R4: new fields survive saves, ended entries are tidied on save, PUT validates with a clear 400 and no write, a valid map is stored sanitised, and payloads without the field are untouched | VERIFIED | `persistRaiderModifiers` sends `tidyRaiderModifiers(next, today)`. Tidy only drops entries where `expires_at < today`; future-dated entries are kept (spot-check: start 2026-11-01 with an end, and start with no end, both kept). The route calls `validateRaiderModifiers` only when `'single_raider_modifiers' in sanitizedSettings`, returns `{ error }` with 400, and otherwise stores `checked.value`. Route tests (5) show no update or insert on rejection. Legacy shapes: entries with no expires_at come back with `expires_at: null`; empty labels and null optional fields are left out. The server rejects a flat number with C-27, but the only caller (raider-bonus-save.ts) sends a normalised map, and no other PUT caller sends this field (checked LootSettingsContent and GuildSettingsContent). Raider keys are character ids, which are `uuid` in the baseline schema, so stored keys pass the UUID check. |
| 5 | GH-329-R5: the breakdown detail lists each active entry's reason, signed amount and end date. ScoreBreakdownModal has a Raider bonus section and the formula part when the setting is on. No Pro gate, and bonuses survive season reset | VERIFIED | explain.ts uses `getActiveRaiderBonusEntries` and `describeRaiderBonusEntries` when it has the full input. DashboardContent passes a full ScoreInput (itemRank, character.characterId, config, asOfDate: todayStr) and shows `line.detail` as plain text in InfoTooltip. The engine tests assert the exact string "Full enchants: +2 until Oct 12. Officer bonus: +5". In ScoreBreakdownModal, the section and " + Raider Bonus" show only when `single_raider_overall_bonus === true`. Its only caller, MasterSheetContent, loads `guild_settings` with `select('*')`, so the field is there. No isPro or PRO_FEATURES. reset-season/route.ts has no reference to guild_settings and is unchanged. |
| 6 | GH-329-R6: applies to every item guild-wide, with no scoping fields | VERIFIED | The entry type adds only starts_at, label and batch_id. No item, tier or team field and no scoping logic. The engine applies raiderBonus the same way it did before. |
| 7 | DELIVERY-R1: at least 3 commits with the trailer, nothing pushed, no planning docs in the worktree, no em dashes. Full vitest has 0 failures and at least 147 files. tsc is clean and `eslint --max-warnings 0` passes on every changed file | UNCERTAIN (human decision) | Met: 4 commits with 4 trailers, not pushed, `.planning` and `supabase` untouched, no em or en dashes in added lines, `tsc --noEmit` exits 0, and eslint `--max-warnings 0` passes on 21 of 22 changed files. Not met as written: (a) `_client.tsx` has 9 warnings, identical to the origin/main copy (verifier diff: IDENTICAL); (b) the verifier's full run had 2 failures out of 2720 tests across 153 files, both 5s timeouts at load average 53 to 62, and both pass alone. See Human Verification. |

**Score:** 6/7 truths verified. 0 are present but behavior-unverified. 1 is uncertain and needs a human decision.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `domain/scoring/raider-bonus.ts` | normalize, tidy, validate, batch edits, grouping, window, formatting, describe | VERIFIED | 347 lines, all interface functions exported through `domain/scoring/index.ts`. |
| `domain/scoring/modifiers.ts` | shared predicate | VERIFIED | `isRaiderBonusEntryActive` is used in 2 places, plus getActiveRaiderBonusEntries. |
| `domain/scoring/attendance.ts` | getNextResetWeek | VERIFIED | Uses setDate local arithmetic and reuses currentResetWeekEnd. |
| `domain/guild/roster-name-match.ts` | shared parser and matcher | VERIFIED | Imported by `_client.tsx` and BulkRaiderBonusModal. Not added to the barrel (PC-5). |
| `app/api/guild-settings/route.ts` | 400 on a malformed map, sanitised store | VERIFIED | 12 lines added, placed between the "No valid settings" check and the write. |
| `BulkRaiderBonusModal.tsx` | bulk modal | VERIFIED | Lazy-loaded in PriorityListTab and mounted only while `bulkOpen`. |
| `RaiderBonusesCard.tsx` | grouped card | VERIFIED | Rendered by PriorityListTab when raiderBonusEnabled is on, with `onPersist={persistRaiderMods}`. |
| `app/components/ScoreBreakdownModal.tsx` | Raider bonus section | VERIFIED | Gated on single_raider_overall_bonus. |
| `raider-bonus-save.ts` (added beyond the plan, W1) | testable save wiring | VERIFIED | Holds the tidy and alias-POST logic that the plan's literal greps expected in PriorityListTab. The behaviour is the same. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| PriorityListTab persistRaiderMods | PUT /api/guild-settings, then validateRaiderModifiers | `persistRaiderModifiers`, which runs `tidyRaiderModifiers(` and then `putRaiderModifiers`; the 400 body error becomes the toast | WIRED (through raider-bonus-save.ts) |
| computeScore | getRaiderBonus, then isRaiderBonusEntryActive | engine is unchanged and passes asOfDate | WIRED |
| addon export-string and guild-data (unchanged) | resolveActiveRaiderModifiers, then isRaiderBonusEntryActive | same predicate | WIRED |
| BulkRaiderBonusModal and raid-tracking `_client.tsx` | roster-name-match | imports | WIRED |
| explainScore raiderBonus line | getActiveRaiderBonusEntries and describeRaiderBonusEntries | full ScoreInput from DashboardContent | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| RaiderBonusesCard | raiderMods | GET /api/guild-settings, then normalizeRaiderModifiers | yes | FLOWING |
| BulkRaiderBonusModal | aliases | `supabase.from('character_aliases').select('alias_name, character_id').eq('guild_id', ...)` | yes | FLOWING |
| Dashboard Raider bonus tooltip | line.detail | explainScore with the full input, from guild_settings config | yes | FLOWING |
| ScoreBreakdownModal | single_raider_overall_bonus | MasterSheetContent `guild_settings select('*')` | yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New and changed test files, plus the addon suites and the two timed-out files | `npx vitest run <16 files>` | 16 files, 257 tests passed | PASS |
| Full suite (run once) | `npx vitest run` | 151 of 153 files passed; 2718 of 2720 tests passed; 2 timeouts at 5000ms under load | ? see Human Verification |
| Type check | `npx tsc --noEmit` | exit 0 | PASS |
| Lint on changed files except `_client.tsx` | `npx eslint --max-warnings 0 ...` | exit 0 | PASS |
| `_client.tsx` lint parity with origin/main | eslint JSON on old and new copies, then diff | IDENTICAL (9 warnings) | PASS (parity) |
| Legacy predicate parity, flat number, normalize, validate, tidy, resolve, parser and matcher parity | `npx tsx scratchpad/x3n-check.ts` | 0 mismatches. Tidy keeps future entries. Validate fills expires_at null. resolve excludes upcoming entries and skips a non-array value | PASS |

### Probe Execution

No probes declared. Step 7c does not apply.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GH-329-R1 | SATISFIED | Truth 1 |
| GH-329-R2 | SATISFIED | Truth 2 |
| GH-329-R3 | SATISFIED | Truth 3 |
| GH-329-R4 | SATISFIED | Truth 4 |
| GH-329-R5 | SATISFIED | Truth 5 |
| GH-329-R6 | SATISFIED | Truth 6 |
| DELIVERY-R1 | NEEDS HUMAN | Truth 7 |

### Copy Audit (C-1 to C-34)

The verifier pulled every added string literal and JSX text from non-test files in `git diff 4a085a4f..HEAD`, including multi-line JSX text. Every user-facing string maps to a C-id or to an existing string that was reused or moved:
- C-1 through C-34 all appear verbatim. Exact matches were checked for C-3, C-6 (placeholder and hint), C-10 (both), C-12, C-17, C-18, C-24 (Officer bonus / Officer penalty / ": " / " until " / joined with ". "), C-25 body, C-26, and C-27 to C-34.
- Reused existing strings: the ImportModal placeholder (byte-identical to ImportModal.tsx:102), "+5 or -2", "Cancel", "Amount", "Raider", "Duration", "Permanent", "permanent", "until {date}", "This week (until {date})", "Select a raider...", "No raider bonuses yet. Add one above.", "Saving...", "Unknown raider", "Remove bonus/penalty for {name}", "Couldn't save the raider bonus. Check your connection and try again.", and "Officer-assigned modifier for this raider".
- No unmapped user-facing text was found. Console and internal strings (`HTTP ${status}`, "Error saving ...") are not user-facing.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (all changed files) | none | TBD, FIXME or XXX | none | none |
| RaiderBonusesCard.tsx, BulkRaiderBonusModal.tsx | none | hex, rgb or hsl literals, `text-[`, `bg-[` | none | The only `#` matches are "#329" in comments. Class colour is set inline only when color_hex exists. |
| RaiderBonusesCard.tsx | 200 | C-19 title reads "Bonus for 1 raiders" for an unlabelled one-raider batch | Info | This is the signed-off copy used verbatim; C-19 defines a singular form only for the count. Optional copy follow-up. |
| RaiderBonusesCard.tsx | 205-229 | Remove all, per-raider remove and Clear ended stay enabled while saving | Info | Same as the old card's remove buttons. Saves are whole-map PUTs (T-329-07, already a follow-up). |
| `_client.tsx` | n/a | 9 eslint warnings | Warning | Pre-existing and identical to origin/main. CI lint has no --max-warnings, so it will not block. |

### Human Verification Required

1. **DELIVERY-R1 eslint clause:** decide whether the 9 pre-existing `_client.tsx` warnings are acceptable. If they are, add this to the frontmatter:
   ```yaml
   overrides:
     - must_have: "DELIVERY-R1: ... eslint --max-warnings 0 passes on every changed file"
       reason: "app/(app)/raid-tracking/_client.tsx carries 9 warnings identical to origin/main; the plan required a minimal diff in that file; CI lint does not use --max-warnings"
       accepted_by: "{name}"
       accepted_at: "{ISO timestamp}"
   ```
2. **Clean full vitest run:** re-run on a quiet machine or rely on PR CI. Expect 0 failures.
3. **Visual check** of the modal and card at 1440px and 390px.
4. **Real-app bulk save** as an officer without manage_members: the C-16 toast, then the C-17 toast, then the raider's tooltip shows the reason and end date.

### Gaps Summary

No blocking gaps. All six feature requirements are in the code, wired, and covered by passing tests. The verifier checked the key risks itself: the shared inclusive predicate, legacy-shape compatibility on load, save and validation, tidy keeping future entries, raid-import parsing and matching parity with origin/main, one batch_id per paste, C-17 on alias failure, verbatim copy, no em dashes, no colour literals, and the files that had to stay untouched. The open items are a policy call on pre-existing lint warnings, a clean full-suite run (the verifier's run had 2 timeouts caused by machine load), and the usual visual and live-session checks.

---

_Verified: 2026-10-01_
_Verifier: Claude (gsd-verifier)_
