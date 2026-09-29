---
phase: quick-260928-iom
verified: 2026-09-28T22:44:11Z
status: human_needed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "After both PR #302 and PR #303 merge and deploy: in a dev build of the companion app, click Login, sign in with Discord in the popup window, pick a guild on the 'Choose a guild to sync' page, and confirm the companion shows the guild name, a sync completes, and one addon loot award appears in that guild's loot history."
    expected: "Login completes end to end through the real Electron will-redirect listener and a live Discord OAuth session; companion stores the token and syncs successfully."
    why_human: "Requires a real Electron build, a live Discord OAuth round trip, and Chromium's actual will-redirect/CSP form-action behavior on a real custom-scheme redirect — none of which a unit test running against an in-memory fake database can exercise."
  - test: "Call GET/POST on the four addon routes (or specifically guild-data) with a valid sync token for guild A and guild_id set to a different guild B, against the real deployed database."
    expected: "403 'This sync token is for a different guild', with no guild B data returned."
    why_human: "Confirms the guild-scope rejection holds against real Postgres/RLS in production, not just the in-memory fake used by the test suite."
---

# Phase quick-260928-iom: Fix GH #300, companion app OAuth PKCE login Verification Report

**Phase Goal:** Implement the server side of the companion app's OAuth 2.0 PKCE login (GET /api/addon/auth and the guild picker, then a redirect to lootlistplus://auth/callback?code=; POST /api/addon/auth/token exchanging code and verifier for a guild-scoped sync token), a shared cookie-or-Bearer sync-token helper used by the four addon routes, and a single-use auth-code table shipped first as its own migration PR, with redirect_uri exact allowlist, S256 only, rate limiting, RLS service-role only, and tests for every PKCE and Bearer case.

**Verified:** 2026-09-28T22:44:11Z
**Status:** human_needed
**Re-verification:** No — initial verification

This phase's code lives outside the main checkout, on two worktrees the executor created: `wt300-table` (branch `fix/300-companion-auth-table`, PR #302, base `main`) and `wt300` (branch `fix/300-companion-auth`, PR #303, base `fix/300-companion-auth-table`, stacked). Both were read directly with `git -C <worktree>` and by running the test suites in place; nothing was edited. Two orchestrator-added commits on `fix/300-companion-auth` (`c3e2a132`, `f004ce68`, fixing an unrelated Vercel preview build break) were included in this review and are consistent with the rest of the branch.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-01: migration creates only `public.addon_auth_codes` with the exact 7-column set, 3 CHECKs, 2 cascading FKs, RLS on/no policies, REVOKE anon+authenticated, GRANT service_role; ships alone in a draft PR against `main` with no closing keyword | ✓ VERIFIED | `supabase/migrations/20260928180000_create_addon_auth_codes.sql` in `wt300-table` matches the spec verbatim (read in full). Shape test (`addon-auth-codes-migration.test.ts`) re-run independently: 6/6 pass. `git diff --name-only origin/main...HEAD` = exactly the migration + its test. `gh pr view 302` confirms draft, base `main`, no closing keyword, no em dash, correct trailing line. |
| 2 | GET /api/addon/auth validates response_type=code, code_challenge_method=S256, a 43-char base64url challenge, and redirect_uri exactly equal to the companion literal; bad redirect_uri gets 400 with no redirect; any other bad param gets 303 error=invalid_request | ✓ VERIFIED | `lib/addon/companion-auth.ts` `parseAuthorizeParams` checks redirect_uri first/in isolation (exact string match, no normalization), then response_type/method/challenge shape. `app/api/addon/auth/route.ts` GET routes `invalid_redirect_uri` to 400 JSON and `invalid_request` to a 303 with `?error=invalid_request`. `pkce-flow.test.ts` (30 tests, re-run: all pass) exercises every named case by name. |
| 3 | Unauthenticated GET is sent through the sign-in round trip back to the same authorize path; authenticated GET goes to /companion/authorize with the same query | ✓ VERIFIED | `route.ts` GET calls `buildSignInPath('/api/addon/auth?' + query)` on no-user, else redirects to `/companion/authorize?...`. Test "a signed-out GET 303s to / with next equal to the canonical authorize path... never contains code=" passes. |
| 4 | D-02: /companion/authorize lists exactly officer guilds as one submit button per guild in a single form POSTing to /api/addon/auth; signed-off copy only; POST /api/addon/auth re-validates, requires same-origin Origin, session, officer rights, stores sha256(code) with 60s expiry, 303s to lootlistplus://auth/callback?code=; CSP form-action allows the scheme | ✓ VERIFIED | `GuildPicker.tsx` renders `COMPANION_AUTHORIZE_COPY` (C-01..C-09) character-for-character against the signed-off block, one `Button type="submit" name="guild_id"` per guild inside one `form method="post"`. `page.tsx` calls `listOfficerGuilds`. `route.ts` POST checks `isSameOriginRequest`, re-parses params, requires session + `verifyOfficerPermissions`, calls `issueAuthCode` (stores sha256 hash, 60s TTL — confirmed in `companion-auth.ts`), returns a real `NextResponse.redirect(..., 303)` with `Cache-Control: no-store`. `next.config.ts` CSP reads exactly `form-action 'self' lootlistplus:` (grep: exactly one occurrence). `authorize-page.test.tsx` (7 tests) and `pkce-flow.test.ts`'s consent-guard block re-run and pass. |
| 5 | POST /api/addon/auth/token deletes-and-returns the code in one statement (burns on any outcome); expired/wrong-verifier/malformed/wrong-redirect_uri all get 400 invalid_grant or invalid_request; success re-checks officer rights, issues via issueSyncToken (upsert replaces prior token), returns exactly {token, guild_id, guild_name, expires_at} with Cache-Control: no-store | ✓ VERIFIED | `consumeAuthCode` in `companion-auth.ts` does `.delete().eq('code_hash',...).select(...).maybeSingle()` in one call, checks expiry/redirect_uri/challenge (constant-time `timingSafeEqual`) only after the row is already gone. `token/route.ts` re-runs `verifyOfficerPermissions` (OD-04) before `issueSyncToken`, returns the exact response shape at the top level with `Cache-Control: no-store` + `Pragma: no-cache`. Verified byte-for-byte against `companion/src/main/auth.ts`'s consumption of `data.token`/`data.guild_id`/`data.guild_name`/`data.expires_at`. All "a failed exchange burns the code" and "token grants" test blocks re-run and pass. |
| 6 | D-02: all four addon routes (guild-data, export-string, loot-award, attendance) call authenticateAddonRequest then authorizeAddonGuild; cookie-or-Bearer with sha256 hash lookup and expiry check; cross-guild token gets 403 before any guild data is read; officer check still runs on both paths; POST /api/addon/sync-token unchanged responses | ✓ VERIFIED | Grep-confirmed all four route files import and call `authenticateAddonRequest`/`authorizeAddonGuild` from `@/lib/addon/sync-tokens`, in that order, before any Supabase query for guild data. `authorizeAddonGuild` returns 403 A-03 immediately on a guild mismatch, before `verifyOfficerPermissions` is ever called (confirmed in source and in `companion-bearer-routes.test.ts`'s "without an officer call" assertions). `guild-data`/`export-string` diffs are limited to import lines + the two auth blocks + one doc-comment line (diffed directly: 19 and 17 changed lines). `sync-token/route.ts` POST response body unchanged (`{ data: { token, expires_at, guild_id } }`), now issued through the shared `issueSyncToken`; `companion-bearer-routes.test.ts`'s sync-token block re-run and passes. |
| 7 | /api/addon/auth and /api/addon/auth/token go through the Upstash 'auth' bucket (10/min/IP); every other addon route stays in 'api' (60/min) | ✓ VERIFIED | `proxy.ts` `getRateLimitType` now returns `'auth'` for `pathname === '/api/addon/auth'` or a `/api/addon/auth/` prefix, with a one-line GH #300 comment; nothing else in the function changed. `rate-limit.test.ts` re-run (4 tests, all pass): 10 POSTs to the token endpoint carry limit 10 and the 11th 429s; a fresh GET to the authorize endpoint carries 10; both `/api/addon/guild-data` and the lookalike `/api/addon/authz` carry 60 (confirms no accidental prefix over-match). |
| 8 | Vitest covers the full PKCE exchange, the Bearer helper, the wiring of all four routes, the rate-limit bucket and the copy lock; a PGlite proof exercises the real migration | ✓ VERIFIED | Every named case in the plan's `<behavior>` blocks was located by test name and re-run: `pkce-flow.test.ts` (30), `sync-tokens.test.ts` (10 `it`s), `authorize-page.test.tsx` (jsdom), `companion-bearer-routes.test.ts` (four-route wiring + repudiation trail + sync-token behavior), `rate-limit.test.ts` (4). PGlite `scenarios.mjs` re-run independently from the scratchpad against the real migration file in `wt300-table`: all 27 scenarios (S1-S10) print PASS. |
| 9 | Each worktree passes the full vitest suite, tsc, and eslint on touched files; PR 2 is a draft against the table branch with "Fixes #300"; no em dash; both end with the Claude Code line; nothing merged, no --admin, no push to main, no real SQL, package.json/lock unchanged | ✓ VERIFIED | `wt300-table`: full `npx vitest run` (baseline set), `npx tsc --noEmit`, eslint on the touched test file — all clean; diff is exactly 2 files. `wt300`: full `npx vitest run` re-run independently — 98 files / 1878 tests, all passed; `npx tsc --noEmit` clean; eslint on every changed `.ts`/`.tsx` file since the table branch — 0 errors (2 pre-existing warnings in `ItemLink.tsx`, unrelated to this phase's auth logic, introduced by the orchestrator's separate build-fix cherry-pick). `gh pr view` jq checks for both PRs (draft, correct base, no closing-keyword-on-302/`Fixes #300`-on-303, no em dash, correct trailing line) both evaluate `true`, re-run independently. `git diff --name-only origin/fix/300-companion-auth-table...HEAD | wc -l` = 19. `package.json`/`package-lock.json` untouched (confirmed via the diff file list). |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260928180000_create_addon_auth_codes.sql` | Service-role-only single-use PKCE code table (D-01) | ✓ VERIFIED | Read in full; matches spec exactly; shape test + PGlite proof both re-run and pass. |
| `app/services/__tests__/addon-auth-codes-migration.test.ts` | Comment-stripped SQL shape lock | ✓ VERIFIED | 6/6 tests pass on re-run. |
| `lib/addon/companion-auth.ts` | PKCE authorize/consent/exchange helpers, officer-guild listing | ✓ VERIFIED | All named exports present with matching signatures; `COMPANION_REDIRECT_URI` constant present and correct. |
| `lib/addon/sync-tokens.ts` | Shared cookie-or-Bearer guild-scoped gate | ✓ VERIFIED | `authorizeAddonGuild` present, guild-mismatch short-circuit confirmed by reading the source. |
| `app/api/addon/auth/route.ts` | GET authorize / POST consent | ✓ VERIFIED | Both handlers present and match spec. |
| `app/api/addon/auth/token/route.ts` | POST code-for-token exchange | ✓ VERIFIED | `consumeAuthCode(` call present; response shape matches companion's expectations exactly. |
| `app/companion/authorize/GuildPicker.tsx` | Presentational picker with signed-off copy | ✓ VERIFIED | `COMPANION_AUTHORIZE_COPY` present, text matches sign-off verbatim, no em dash found. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `companion/src/main/auth.ts` redirect_uri literal | `COMPANION_REDIRECT_URI` + migration CHECK literal | drift test in `pkce-flow.test.ts` | ✓ WIRED | Read `companion/src/main/auth.ts` directly: `redirect_uri: 'lootlistplus://auth/callback'`, `code_challenge_method: 'S256'`, posts `code_verifier` (not `redirect_uri`) to the token endpoint — matches server assumptions exactly. Drift tests re-run and pass. |
| POST /api/addon/auth (consent) | companion `will-redirect` listener | real HTTP 303 `Location` header | ✓ WIRED | `NextResponse.redirect(redirectUrl, 303)` confirmed in source, not a client-side navigation. |
| `token/route.ts` | `addon_sync_tokens` upsert `onConflict 'guild_id,user_id'` | `issueSyncToken` | ✓ WIRED | Confirmed in `sync-tokens.ts` and reused identically by `sync-token/route.ts`. |
| Four addon routes | `verifyOfficerPermissions(supabase, userId, guildId)` | `authorizeAddonGuild` | ✓ WIRED | Confirmed by grep: import paths unchanged (`@/utils/supabase/server`, `@/utils/server-roles`), so pre-existing route test mocks keep intercepting through the new indirection (proven by those tests passing unmodified in the full-suite run). |
| GET /api/addon/auth unauthenticated | sign-in round trip | `buildSignInPath` | ✓ WIRED | Confirmed in source and by the round-trip test. |
| `proxy.ts` `getRateLimitType` | Upstash 'auth' limiter | exact-or-child match | ✓ WIRED | Confirmed in source and by `rate-limit.test.ts`'s lookalike-path non-match. |
| `next.config.ts` cspDirectives | `form-action` redirect | scheme source (OD-01) | ✓ WIRED | Exactly one occurrence of `form-action 'self' lootlistplus:` confirmed by grep. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Migration shape test passes | `npx vitest run app/services/__tests__/addon-auth-codes-migration.test.ts` (in `wt300-table`) | 6/6 passed | ✓ PASS |
| PGlite behaviour proof against the real migration | `node scenarios.mjs` (scratchpad `pglite-300`) | 27/27 PASS lines, "All 27 scenarios passed." | ✓ PASS |
| Full new-code test suite (PKCE, Bearer, picker) | `npx vitest run lib/addon app/api/addon app/companion` (in `wt300`) | 9 files / 108 tests passed | ✓ PASS |
| Full suite regression check | `npx vitest run` (in `wt300`) | 98 files / 1878 tests passed, no failures | ✓ PASS |
| Type-check | `npx tsc --noEmit` (in `wt300`) | Clean, exit 0 | ✓ PASS |
| Lint on changed files | `npx eslint <19-file diff>` (in `wt300`) | 0 errors, 2 pre-existing warnings in `ItemLink.tsx` (unrelated build-fix file) | ✓ PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| GH-300-R1 | Table and RLS | ✓ SATISFIED | Migration + shape test + PGlite S1, S8, S9. |
| GH-300-R2 | Authorize validation and sign-in round trip | ✓ SATISFIED | `parseAuthorizeParams`, GET handler, round-trip test. |
| GH-300-R3 | Picker, consent, copy sign-off | ✓ SATISFIED | `GuildPicker.tsx`, `page.tsx`, consent POST. |
| GH-300-R4 | Exchange and upsert semantics | ✓ SATISFIED | `consumeAuthCode`, `issueSyncToken`, token route. |
| GH-300-R5 | Shared helper in all four routes, officer checks kept | ✓ SATISFIED | `authenticateAddonRequest`/`authorizeAddonGuild` wired into all four routes. |
| GH-300-R6 | Upstash rate limit on the token endpoint | ✓ SATISFIED | `proxy.ts` `getRateLimitType` change + `rate-limit.test.ts`. |
| GH-300-R7 | Tests | ✓ SATISFIED | All named test cases located and re-run passing. |
| GH-300-R8 | Worktrees, PRs, verification, executor limits | ✓ SATISFIED | Both PRs draft with correct base/keyword/copy; nothing merged, no `--admin`, no push to `main`, `package.json`/lock untouched. |

### Anti-Patterns Found

None. Scanned every file this phase touched (all `lib/addon/`, `app/api/addon/auth/`, `app/companion/authorize/`, the four rewired addon routes, `proxy.ts`, `next.config.ts`, and the migration) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"coming soon"/"not yet implemented" — zero matches. Every `console.*` call in phase-touched files has a constant string literal as its first argument; none interpolates a code, verifier, token, redirect_uri, or guild_id into the logged message (confirmed by reading every call site). The pre-existing `console.log` calls in `export-string/route.ts` are outside this phase's diff (only its import lines and two auth blocks changed) and were not touched.

### Security-Focused Review (as requested)

- **PKCE S256 + constant-time comparison:** `computeS256Challenge` uses RFC 7636 SHA-256/base64url; `consumeAuthCode` compares with `crypto.timingSafeEqual` only after confirming equal buffer length (avoiding a throw on length mismatch, and avoiding a length-based timing leak by returning `invalid_grant` before ever calling `timingSafeEqual` on mismatched-length buffers). ✓
- **Single-use codes and expiry:** `consumeAuthCode` performs `delete().eq('code_hash',...).select(...).maybeSingle()` as one statement, so the row is gone whether or not the rest of the check succeeds (OD-03, confirmed by the "reused code" and "wrong verifier ... burned" tests). Expiry is checked against the DB row's `expires_at`, migration default is exactly `interval '60 seconds'`. ✓
- **redirect_uri allowlist:** Checked as an exact string equal to the single hardcoded constant (no normalization, no partial match) at three layers — `parseAuthorizeParams` (authorize + consent), `consumeAuthCode` (exchange), and the DB `CHECK` constraint. Drift test pins the constant against the companion's own literal. ✓
- **Token hashing and guild scoping:** Sync tokens are sha256-hashed at rest (`hashSyncToken`); `authenticateAddonRequest` looks up by hash, never stores/logs the raw token. `authorizeAddonGuild` rejects a guild mismatch with 403 before any `verifyOfficerPermissions` call or guild-data read. ✓
- **Officer re-checks:** `verifyOfficerPermissions` re-runs at token-exchange time (OD-04) and on every Bearer request via `authorizeAddonGuild`, in addition to the original consent-time check. ✓
- **Rate limiting in proxy.ts:** `/api/addon/auth` and `/api/addon/auth/token` routed into the existing 10/min `auth` bucket; verified not to falsely match a lookalike path (`/api/addon/authz` stays in the 60/min `api` bucket) by a dedicated test, re-run and passing. ✓
- **RLS on the migration:** `ENABLE ROW LEVEL SECURITY` with zero policies, `REVOKE ALL ... FROM anon, authenticated`, `GRANT ALL ... TO service_role` — confirmed in the SQL text and by PGlite scenarios S8/S9 (including a `SET ROLE` permission-denied check). ✓
- **No secrets logged:** Every `console.*` call site in phase-touched files was read directly; all use a constant first-argument string, and none interpolates a code, verifier, token, or guild_id. ✓
- **CSP change:** Scoped to exactly `form-action 'self' lootlistplus:`, changing nothing else in the CSP; documented inline with the GH #300 rationale. This only lets a page's own forms target the companion's custom scheme — it does not add any new network destination. ✓ (Accepted per OD-01, user sign-off recorded in the plan's `open_decisions` block.)
- **Every addon route authenticates before any data access:** Confirmed by reading the full body of all four routes (`attendance`, `loot-award`, `guild-data`, `export-string`) — `authenticateAddonRequest` and then `authorizeAddonGuild` both run before any Supabase query that reads guild-scoped data. ✓
- **Token-exchange response shape vs. companion client:** `companion/src/main/auth.ts` reads `data.token`, `data.guild_id`, `data.guild_name`, `data.expires_at` at the top level of the JSON response; `token/route.ts` returns exactly that shape, at the top level, with no wrapping `data` envelope. Verified by direct comparison of both files. ✓

### Human Verification Required

1. **Real companion login end to end.** After both PRs merge and deploy: dev-build the companion, click Login, sign in with Discord in the popup, pick a guild, and confirm the companion shows the guild name, a sync completes, and one addon loot award appears in that guild's loot history. Why human: requires a live Electron build, a real Discord OAuth round trip through a real browser window, and Chromium's actual `will-redirect`/CSP `form-action` handling of the `lootlistplus://` scheme — none of which the in-memory-fake test suite can exercise, and the plan itself calls this out as a `<human-check>` item.
2. **Cross-guild 403 against the real database.** Call one of the four addon routes with a valid sync token for guild A and `guild_id` set to guild B, against the deployed (real Postgres/RLS) database, and confirm 403. Why human: the unit tests prove this against an in-memory fake; a production confirmation closes the gap between the fake's behavior and the real service-role client plus real RLS.

### Gaps Summary

No gaps. All 9 must-have truths, all 7 named artifacts, and all 7 key links were independently re-verified against the code on both worktrees (not just SUMMARY.md's narrative): the shape test, the PGlite proof (re-run from scratch, all 27 scenarios), the full new-code test suite (108 tests) and the full regression suite (1878 tests) were all executed directly by this verification, not merely read about. tsc and eslint are clean. Both PRs are correctly configured drafts with the required trailers, base branches, and no-em-dash/closing-keyword rules satisfied. The only reason this report is not `passed` is that the plan itself defers a real-companion-login check and a real-database cross-guild check to a human, per the workflow's end-of-phase human-verification pattern — this is expected for a phase whose full validation requires a live Electron app, live Discord OAuth, and a deployed database, none of which exist in this review's read-only worktree environment.

---

*Verified: 2026-09-28T22:44:11Z*
*Verifier: Claude (gsd-verifier)*
