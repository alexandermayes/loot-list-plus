---
phase: quick-261001-tv5
verified: 2026-10-01T23:45:00Z
status: human_needed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Merge the migration-only PR (commit 2632b48f) with --admin, confirm the Deploy Migrations run is green, and only then merge the app PR (OD-4)"
    expected: "The migration applies in one go (no lock_timeout abort); old production code keeps recording awards; the app PR never runs against a schema without award_copy"
    why_human: "A deploy-order action on the live database; no SQL may be run against a real database from here"
  - test: "On the master sheet, award the same Qiraji Bindings twice to one raider on the current raid night"
    expected: "The second try shows 'Thrall already received Qiraji Bindings of Command on this raid night. Award another copy?' above the controls with the button 'Award another copy'; confirming records a second row; a forced per-item failure shows 'Failed to award: ...' instead of a success toast"
    why_human: "Visual placement and the end-to-end flow against real PostgREST; component tests use a stubbed fetch"
  - test: "Paste a Gargul export with one line repeated, then paste the same text in a fresh import"
    expected: "First import: two rows (copies 1 and 2). Second import: both lines reported as already having the item"
    why_human: "End-to-end through the raid-tracking UI and the real database"
  - test: "Import the same addon export string twice (one with two awards of one item to one raider at different times)"
    expected: "First import records two rows; the second reports both as already recorded"
    why_human: "End-to-end against real PostgREST; proven here only with unit fakes and a PGlite adapter"
---

# Quick task 261001-tv5: Second same-night award of one item, Verification Report

**Goal:** A raider can receive the same item twice on one raid night (master sheet after a confirm prompt, Gargul paste with repeated lines, addon export string with distinct awardedAt, companion when it sends awarded_at), while retries, re-imports, double submits and identical concurrent sends never create a second row. loot_history gains award_copy and source_award_key, the per-night unique index is swapped to include award_copy plus a unique (guild_id, source_award_key) index. The migration ships first as a migration-only PR and old app code keeps working against it. C-1 to C-4 verbatim.
**Verified:** 2026-10-01
**Status:** human_needed (all automated checks pass; only post-deploy and deploy-order checks remain)
**Re-verification:** No, initial verification
**Code under test:** worktree SCRATCH/wtaward, branch fix/second-same-night-award, 4 commits over origin/main 2d668d01 (origin/main unchanged after fetch), not pushed (no remote branch)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AWARD2-DB: columns, copy-aware index, key index, new indexes before the drop, no backfill, old code still gets 23505 | VERIFIED | Migration statements read: SET LOCAL lock_timeout '5s'; ADD COLUMN IF NOT EXISTS award_copy smallint NOT NULL DEFAULT 1 CHECK 1..10; ADD COLUMN IF NOT EXISTS source_award_key text CHECK null or len 1..200; CREATE UNIQUE INDEX IF NOT EXISTS idx_loot_history_unique_award_copy (5 cols, predicate identical to baseline line 2822); CREATE UNIQUE INDEX IF NOT EXISTS idx_loot_history_source_award_key; DROP INDEX IF EXISTS old; 2 COMMENTs. Shape test pins all 8 statements and order. PGlite P1 (old rows copy 1/null, indexes swapped, CHECKs, re-apply succeeds), P2 (plain old-style re-insert raises 23505), P3 (copy 2 ok, repeat 23505, 0/11/empty key 23514) re-run by me: 27/27 PASS |
| 2 | AWARD2-ADDON: two awards in one export give copies 1 and 2; re-import inserts nothing; second-only export gives copy 2; legacy unkeyed row absorbs one keyed award | VERIFIED | import-string processAward passes addonAwardKey(awardedAt, wowheadId, characterName) as sourceAwardKey; I1 to I4 assert exact inserted {award_copy, source_award_key}, already_recorded counts, no announcement/BLP on re-import, stamp payload exactly {source_award_key}. PGlite P5a to P5d through the real helper |
| 3 | AWARD2-ADDON concurrency: identical concurrent sends give one row, different concurrent sends give distinct copies | VERIFIED | PGlite P5e/P5f via Promise.all over the real insertAddonAward; my re-run trace shows real interleaving (second insert hit 23505, then found key / recomputed copy); final night holds copies 1 to 5 once each; row count 13 as predicted |
| 4 | AWARD2-WEB: modal shows C-1/C-2 instead of false success, confirm sends award_copy = next_award_copy, resend is duplicate and treated as success (A-1), other failures show 'Failed to award: {message}' | VERIFIED | ItemCandidateModal reads the body with readAwardResult (old code checked only res.ok: silent-success bug fixed). duplicate+number sets extraCopy and returns; duplicate+null shows C-3; duplicate without key or failed throws into the existing catch toast; duplicate on a request that carried award_copy falls through to success (A-1). Tests M1, M2, M2b, M3, M4, M5 pass; unmount before unstub in afterEach |
| 5 | AWARD2-GARGUL: repeated identical lines numbered 1, 2, 3 after team routing; a re-paste reports duplicates as today | VERIFIED | bulk POST calls assignAwardCopies after routeRecordsToTeamEvents and passes awardCopy to buildBulkAwardRow; B2 and B7 (routing onto one night gives 1 and 2). Both raid-tracking callers (_client.tsx ~1818, ~2073) send every parsed line with no client dedupe and map 'duplicate' to the unchanged messages; a re-paste numbers the same copies, which then 23505 |
| 6 | AWARD2-REASSIGN: PATCH moving a linked award sets the new raider's next free copy | VERIFIED | PATCH before-read now selects loot_item_id, raid_event_id, award_copy; sets sanitized.award_copy = nextAwardCopy(highest) when character changes on a linked row; cap or lookup failure leaves it out; award_copy is not client-writable (allowedFields unchanged). P1, P2, P2b, P3, P4 pass |
| 7 | AWARD2-COMPANION-READY: optional awarded_at gives the same key as the export string; absent or invalid is today's behavior | VERIFIED | loot-award passes addonAwardKey({awardedAt: body.awarded_at, wowheadId: wowhead_id, characterName: character_name}); invalid gives null so buildAddonAwardRow omits the key and the byte-identical keyless path runs. L1 asserts key 'addon:2026-09-20T20:00:00Z:20928:thrall' equals the import-string key; L2 to L4 pass; companion-bearer suite unchanged and green. Companion today sends only awarded_date (sync-engine.ts:289), so it stays keyless |
| 8 | D-09: BLP and master sheet received-copy skip unaffected | VERIFIED | recompute_blp_for_item (last body 20260721000001; later migrations only grants): award_events GROUP BY raid_event_id, winners SELECT DISTINCT raid_event_id, character_id. MasterSheetContent.tsx:834-930 counts history rows per character and wowhead id into pickReceivedEntries. All single-row loot_history reads use limit(1) or filter by id, so multiple copies cannot break a maybeSingle |
| 9 | COPY-R1: only C-1 to C-4, verbatim; no em dash | VERIFIED | C-1 and C-2 in the confirm panel, C-3 error toast, C-4 as INVALID_AWARD_COPY_ERROR, each character-for-character matching the signed-off block. New thrown helper messages are only logged (import dialog shows counts; loot-award returns 'Failed to record award'). Perl gate over git diff -U0 for U+2014, U+2013, &mdash;, &#8212;: exit 0 |
| 10 | DELIVERY-R1: commits only in WT with trailer, migration-only first commit, nothing pushed, nothing under .planning/, gates no worse than baseline | VERIFIED | 4 commits, all with the Claude Opus 5.5 trailer; commit 2632b48f touches exactly the migration and its shape test and no later commit touches them; no remote branch; 0 .planning paths; changed file set equals files_modified (17); tsc clean; eslint per file equals origin/main (ItemCandidateModal 0/2 both sides, all others and new files 0/0); full vitest see spot-checks |

**Score:** 10/10 truths verified (0 present but behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| supabase/migrations/20261001120000_allow_second_same_night_award.sql | columns, two indexes, drop | VERIFIED | Only file with prefix 20261001; no open PR adds a migration |
| app/services/__tests__/second-same-night-award-migration.test.ts | shape lock | VERIFIED | Fixed prior timestamp 20260930100000, 8-statement order, predicate equality with the baseline, forbidden-keyword scan |
| domain/loot/award-copies.ts | 5 exports, zero imports | VERIFIED | Imported by bulk route, modal and addon helper (relative path) |
| lib/loot/addon-award-insert.ts | addonAwardKey, keyed path, keyless unchanged | VERIFIED | Diff shows only comment lines removed; keyless queries untouched |
| app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx | prompt and failure toast tests | VERIFIED | M1 to M5 plus M2b |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| import-string processAward | addonAwardKey / insertAddonAward | sourceAwardKey on built row | WIRED |
| loot-award route | addonAwardKey | body.awarded_at | WIRED |
| bulk POST | assignAwardCopies / nextAwardCopy | after routeRecordsToTeamEvents; 23505 answered with next_award_copy | WIRED |
| ItemCandidateModal handleAward | readAwardResult | duplicate opens C-1; confirm re-sends award_copy | WIRED |
| migration | #313 trigger | trigger is UPDATE OF six reference columns; stamping touches only source_award_key | WIRED (PGlite P4: copy 2 cross-guild insert still 23514; stamp on inactive raider's row succeeds; control re-point still 23514) |

### Migration safety (checked independently)

- Old code against the new schema: no upsert/onConflict on loot_history anywhere in app code; no SQL function inserts into loot_history. Old inserts omit award_copy, get 1, and a same-night repeat hits idx_loot_history_unique_award_copy (PGlite P2), so the old bulk route's 'duplicate' mapping and the old addon helper's already_recorded (P7) behave as today.
- deploy-migrations.sh sends the whole file as one Management API query (implicit transaction): SET LOCAL holds for the file, CONCURRENTLY is correctly absent, a lock_timeout abort rolls back and the version is not recorded (the INSERT into schema_migrations runs only after success), so the next deploy re-runs it. IF NOT EXISTS / IF EXISTS forms make a partial re-run finish; PGlite confirms re-applying the file succeeds.
- Ordering: both CREATE UNIQUE INDEX precede the DROP; existing rows satisfy the old 4-column rule, so they cannot violate the 5-column one.

### Keyed addon path (checked independently)

- Key format 'addon:' + awardedAt + ':' + wowheadId + ':' + lower(trim(name)), regex matches the addon's GetTimestamp '!%Y-%m-%dT%H:%M:%SZ'; null for bad timestamp, non-positive or non-number id, empty name, >200 chars.
- Loop: key lookup, then on a linked night claim of one unkeyed row (same character_id, or null character with matching normalized name) guarded by source_award_key IS NULL; a lost race or claim 23505 loops; else insert at highest+1 (1 if unlinked or unmatched name), 23505 loops; MAX_ATTEMPTS 3 then throw; cap 10 throws. Each keyed award claims at most one row and each row can be claimed once.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New and changed tests (10 files) | npx vitest run (migration shape, award-copies, addon insert, rows, import-string, loot-award, companion-bearer, function grants, bulk, modal) | 10 files, 205 tests passed | PASS |
| PGlite proof | tsx scenarios-tv5.mts (real baseline statements, real 20260929180000, real new migration and real helper from WT) | exit 0, 27/27 PASS, 0 FAIL, row count 13 | PASS |
| Type check | npx tsc --noEmit | exit 0, no output | PASS |
| eslint per changed file vs origin/main (stdin of origin/main blob) | npx eslint -f json | every file equal to baseline; new files 0/0 | PASS |
| Full suite | npx vitest run (once) | 162 files / 2860 tests; 13 tests in 9 files failed, 12 of them "Test timed out in 5000ms" while tsc and eslint ran concurrently on a loaded machine; the 13th was M2 in the new modal test, a cascade of M1's timeout | see re-run |
| Re-run of the 9 timed-out files alone | npx vitest run <9 files> | 9 files, 209 tests passed | PASS |
| Modal test stability | 3 consecutive solo runs | 6/6 each, about 0.6 s of test time | PASS |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| AWARD2-DB | SATISFIED | Truth 1 |
| AWARD2-ADDON | SATISFIED | Truths 2, 3 |
| AWARD2-WEB | SATISFIED | Truth 4 |
| AWARD2-GARGUL | SATISFIED | Truth 5 |
| AWARD2-REASSIGN | SATISFIED | Truth 6 |
| AWARD2-COMPANION-READY | SATISFIED | Truth 7 |
| COPY-R1 | SATISFIED | Truth 9 |
| DELIVERY-R1 | SATISFIED | Truth 10 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx | M1/M2 | When M1 times out under load, its in-flight handleAward finishes after unmount and calls the module-level showNotification mock during M2 (beforeEach mockReset already ran), so M2 fails too | Info | Test robustness only; passes reliably alone. Could await pending work or reset the mock in afterEach after cleanup |
| app/api/loot-history/bulk/__tests__/route.test.ts | B7 | mockImplementation on routeRecordsToTeamEvents persists past the test (clearAllMocks does not reset implementations) | Info | Harmless today (last POST test); order-dependent |
| app/api/loot-history/bulk/route.ts | POST | 11 or more implicit identical items in one request would be numbered 11+ and fail the CHECK as a generic per-item error rather than C-3 | Info | Unrealistic for a Gargul paste; no data risk |
| app/api/loot-history/bulk/route.ts | PATCH | Audit newData now includes award_copy when the reassign sets it | Info | Accurate and arguably useful; oldData unchanged as the SUMMARY says |

No TBD/FIXME/XXX/TODO/HACK markers, no console.* added, no stubs.

### Human Verification Required

1. **Deploy order (OD-4).** Merge the migration-only PR first with --admin, confirm Deploy Migrations is green, then merge the app PR. Expected: old code unaffected in the window. Why human: live database action.
2. **Master sheet second copy.** Award the same Bindings twice to one raider. Expected: C-1 notice and C-2 button, then two rows; a failure shows the error toast. Why human: visual and real PostgREST.
3. **Gargul repeated line.** Paste with a repeated line, then paste again fresh. Expected: two rows, then both reported as already having the item. Why human: end-to-end UI and database.
4. **Addon export twice.** Expected: second import all already recorded. Why human: real PostgREST rather than fakes and the PGlite adapter.

### Gaps Summary

No gaps. Every must-have holds in the code, is wired, and is exercised by tests that I re-ran (unit, component and a PGlite proof driving the real helper and the real migration). The SUMMARY's claims matched what I found, including the commit split, file set, eslint parity and PGlite 27/27. The only full-suite failures were 5-second timeouts under load from my own concurrent tsc and eslint runs; every one of those files passes alone. What remains is the deploy order and the post-deploy checks listed in the plan.

---

_Verified: 2026-10-01_
_Verifier: Claude (gsd-verifier)_
