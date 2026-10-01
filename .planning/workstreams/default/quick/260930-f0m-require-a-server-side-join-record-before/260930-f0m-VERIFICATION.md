---
phase: quick-260930-f0m
verified: 2026-09-30T23:59:00Z
status: human_needed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On a preview or staging deploy with a real Supabase project, sign in as a user with no characters, redeem an invite link, then create a first character from the create_character prompt (manual form, then separately with the Battle.net tab)."
    expected: "The character is added to the guild (201), with trial status when the guild starts new members as trial; adding a second character to the same guild from CharacterSelector works through the alt path."
    why_human: "Route tests use recording fakes and PGlite proves the SQL shapes; the PostgREST upsert with onConflict, the .is/.gt filters and the browser flow (CreateCharacterModal, BattlenetCharacterPickerModal) were not exercised end to end against a real Supabase instance."
  - test: "Same as above through the Discord join (guild-select, verified Discord user in the guild's server, no character), and as a guild creator with no character who creates the guild and then the first character."
    expected: "Discord: character added with the default role. Creator: character added as Guild Master."
    why_human: "End-to-end user flows across Discord OAuth and the app UI cannot be run in this environment."
  - test: "After the deploy, run the read-only A-1 count query from the SUMMARY once in the Supabase SQL editor with the migration and deploy timestamps."
    expected: "0 or a handful; any user counted is handled case by case (for example with a fresh invite)."
    why_human: "Depends on production data and deploy timing; must not be run by an agent."
---

# Quick Task 260930-f0m: Verification Report

**Goal:** A character is added to a guild only when the user created the guild, already has another active character in it, or holds an unused, unexpired server-side join record (written by the invite and Discord join routes, single use, 30 days); the guild_join_grants table is service-role only; users waiting to create their first character are backfilled; every legitimate join path keeps working.
**Verified:** 2026-09-30
**Status:** human_needed (all automated checks pass; end-to-end flows on a real Supabase instance remain)
**Re-verification:** No, initial verification

Code checked in WT `scratchpad/wtjr`, branch `fix/guild-join-records`, 5 local commits over origin/main 678806b7 (00d5658a, da622c32, c8bc0d9e, f3528f9b, 509c32ae). No SQL was run against a real database and .env.local was not read.

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | F0M-R1: guild_join_grants is service-role only (RLS on, no policies, no privilege for PUBLIC, anon, authenticated; 42501 for every client statement; service role upserts, reads, consumes) | VERIFIED | Migration lines 51-77: CREATE TABLE with the six columns and five named constraints, index, ENABLE RLS, `REVOKE ALL ... FROM PUBLIC, "anon", "authenticated"`, `GRANT ALL ... TO "service_role"`, COMMENT; no policy, function or trigger. Re-ran PGlite (real baseline objects, function catalog, 20260930000000 to 000300 applied first): control (a) shows the default privileges would grant anon/authenticated; c1 to c7, d1 to d3 (42501 for anon and signed-in SELECT, INSERT, UPDATE, DELETE), e1 to e5 (RLS second layer), f (service-role upsert, lookup, consume 1 then 0, reset, expiry) all PASS. |
| 2 | F0M-R2: invite and Discord no-character branches write the record before setting the active guild; on write failure 500 with the existing text and no other write | VERIFIED | `app/api/guild-invites/[code]/route.ts` and `app/api/discord-guilds/join/route.ts`: `recordGuildJoinGrant(serviceSupabase, { userId, guildId, source })` is the first write in the no-character branch, before the user_active_characters upsert; error returns 500 "Couldn't join guild. Try again or contact an officer." (text already present twice in each route on origin/main) before the upsert, trackEvent and funnel. Route tests assert order and the failure case. The only earlier write in the invite route is the redeem_invite_code use, which D-06 accepts. |
| 3 | F0M-R3: POST /api/characters/[id]/guilds adds or reactivates only for creator, member (other character) or record holder; 403 otherwise; 409, 404, 500 unchanged | VERIFIED | Route lines 153-173: 409 for an active membership, then `resolveGuildJoinAccess(..., excludeCharacterId: id)`, 403 'You are not a member of this guild' before any write; lookup errors throw into the existing catch (500). Helper `domain/guild/join-grants.ts` checks created_by, then other characters' active memberships (A-3 early return when the list is empty), then an unconsumed, unexpired record. Route tests drive the real helper through the service-role fake (no mock of join-grants): 403 cases, record, alt, creator (insert and reactivation), 409, 404, lookup-error 500, insert-failure 500. |
| 4 | F0M-R4: the Battle.net import with a guildId checks before any Battle.net request or write; 403 on failure; unchanged without guildId | VERIFIED | Import route: `createServiceRoleClient()` moved up; `resolveGuildJoinAccess` runs right after the version check and before `battlenetFetch`. The only call before it is `getBattlenetAccount`, a read of battlenet_accounts (lib/battlenet.ts). Tests: 403 and lookup-error 500 with `battlenetFetch` not called and no writes; no guildId runs no check; needs_spec runs the check and writes nothing. |
| 5 | F0M-R5: consume after every successful membership write that leaves the user active; nothing on failure; not in "Already a member" | VERIFIED | `consumeGuildJoinGrant` call sites: characters route after reactivation and insert error checks; invite route after reactivation and insert error checks; Discord route after reactivation and insert error checks (not in the "Already a member" branch); import route in the `else` of the upsert error. Route tests assert consume after writes and no consume on failure; PGlite f shows the consume UPDATE affects 1 row then 0. A-2 non-atomic note is in the helper doc comment and the SUMMARY. |
| 6 | F0M-R6 (OD-1): backfill for every user in the no-character state, no age window, idempotent, never reopens a consumed record | VERIFIED | Migration lines 80-98 match D-15 exactly (active_character_id IS NULL, created_by IS DISTINCT FROM, no character with class_id, no active membership in that guild, ON CONFLICT DO NOTHING, no updated_at window). PGlite h1 to h5: exactly P1, P2 (400 days old), P3; none for R, M, N, C, A, Z, K. i1 to i4: re-applying the whole file adds no row and leaves P1 consumed. |
| 7 | F0M-R7 (OD-3): trial fields only when access is via 'grant' and the guild has new_members_start_as_trial | VERIFIED | Characters route (insert and reactivation) and import upsert add membership_status 'trial' and trial_started_at only for `via === 'grant'` with the setting true. Tests cover grant on/off and creator/member with trial on (no fields). |
| 8 | DELIVERY-R1: PGlite 0 FAIL, full vitest and tsc exit 0, eslint clean, wording gates, local commits only | VERIFIED | Re-ran here: PGlite full 93 PASS / 0 FAIL (exit 0); tracer-only copy 57 PASS / 0 FAIL; parse 7 statements plus rollback, 0 failed; full vitest 146 files, 2616 tests, exit 0; `npx tsc --noEmit` exit 0 with no output; eslint --max-warnings 0 on changed files exit 0. Added lines and commit messages: no em dash or en dash, no match for a wider vocabulary list; trailer on 5/5 commits; no .planning path in the diff; clean tree; no upstream and no remote branch contains HEAD. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

## Amendments

| Item | Status | Evidence |
|------|--------|----------|
| A-1 no post-deploy re-run; read-only count query instead | Implemented | SUMMARY says not to re-run the backfill and gives a SELECT count(*) query with the plan's conditions plus "no join grant" and an updated_at window. The same query (a1-count-query.sql) runs in PGlite (n1 count 1, n2 count 0 after a record exists). |
| A-2 non-atomic check and consume documented | Implemented | Helper doc comment on consumeGuildJoinGrant; SUMMARY decisions and access-rule section. |
| A-3 no `.in()` with an empty list | Implemented | `if (otherCharacterIds.length > 0)` guard; two unit tests ("skips the membership lookup ..."). |
| A-4 Task 1 split into two commits | Implemented | 00d5658a and da622c32. |

## Membership write scan (independent)

Every file in app/, lib/, utils/, scripts/, domain/, discord-bot/, companion/ and supabase/functions with a write to character_guild_memberships:

| Path | Write | Classification |
|------|-------|----------------|
| POST /api/characters/[id]/guilds | insert, reactivation | New rule enforced |
| POST /api/battlenet/characters/import | upsert | New rule enforced |
| POST /api/guild-invites/[code] | insert, reactivation | Invite (redeem_invite_code), consumes |
| POST /api/discord-guilds/join | insert, reactivation | Discord verification, consumes |
| POST /api/guilds | Guild Master insert for a new guild | Creator |
| /api/guild-members (PUT, DELETE), trial-status, cron auto-promote-trials, guilds/transfer-ownership, guild-roles | role, status or is_active false | Officer, creator or cron; never adds a membership |
| /api/guilds/leave | is_active false | Own rows |
| scripts/* (9 files) | various | Dev service-role scripts |

No migration SQL inserts or updates character_guild_memberships (grep over supabase/migrations), and 20260930000100 refuses INSERT and reactivation from anon and authenticated sessions. The function-grants ratchet test (`finds nothing unrevoked in any migration later than this one`) passes and scans the new file.

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| supabase/migrations/20260930100000_create_guild_join_grants.sql | VERIFIED | 7 statements in D-01 order; unique timestamp after 20260930000300; header has Background, Table, Access, Backfill, Rollback |
| domain/guild/join-grants.ts | VERIFIED | Exports per D-08; not in the domain barrels; constant log and error messages |
| app/services/__tests__/guild-join-grants-migration.test.ts | VERIFIED | 9 shape tests pass |
| Four route files and their tests | VERIFIED | 83 tests across the 7 new or changed test files pass |
| SP/pglite-f0m/scenarios-f0m.mjs (+ scenarios-f0m-full.mjs) | VERIFIED | Reads the real migration file from WT; scratchpad only |

## Key Links

| From | To | Via | Status |
|------|----|-----|--------|
| Invite and Discord no-character branches | guild_join_grants | recordGuildJoinGrant before the user_active_characters upsert | WIRED |
| Characters route and import | created_by, memberships, guild_join_grants | resolveGuildJoinAccess before any membership write | WIRED |
| Every successful membership write in the four routes | guild_join_grants.consumed_at | consumeGuildJoinGrant | WIRED |
| anon and authenticated | guild_join_grants | REVOKE ALL plus RLS with no policies | WIRED (PGlite c, d, e) |

## Copy

No new user-facing text. Added response strings are 'You are not a member of this guild' (existing in app/api/user/active-guild/route.ts) and "Couldn't join guild. Try again or contact an officer." (existing in both join routes); lookup errors fall to the existing 'Internal server error'.

## Anti-Patterns and Notes

| File | Note | Severity |
|------|------|----------|
| changed files | No TBD, FIXME or XXX markers in added lines | none |
| SUMMARY | States the parse check covered the A-1 query; parse-f0m.mjs itself does not parse it (the line was appended to the output separately). The A-1 query is executed in PGlite (n1, n2), which is stronger evidence | Info |
| app/api/guild-invites/[code]/route.ts | An unused guild read was removed (no response change) | Info |
| Behaviour note | A user who joined without a character is not in the member list, so an officer cannot remove them before their first character; their record stays usable for its 30 days. Consistent with the plan | Info |

## Human Verification Required

1. **Invite join without a character, then first character** (manual form and Battle.net tab) on a preview deploy with real Supabase. Expected: added to the guild, trial when the guild uses trial; an alt can be added afterwards.
2. **Discord join without a character, and creator without a character.** Expected: Discord user added with the default role; creator added as Guild Master.
3. **After the deploy, run the A-1 read-only count query once.** Expected: 0 or a handful.

## Gaps Summary

No gaps. All eight must-haves and the four amendments are implemented and backed by passing tests and PGlite runs re-executed during this verification. The remaining items are end-to-end checks on a real Supabase instance and the post-deploy count query.

---

_Verified: 2026-09-30_
_Verifier: Claude (gsd-verifier)_
