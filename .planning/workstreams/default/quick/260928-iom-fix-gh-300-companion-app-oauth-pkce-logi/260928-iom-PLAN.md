---
phase: quick-260928-iom
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # PR 1: worktree wt300-table, branch fix/300-companion-auth-table, base main (D-01, ships first)
  - supabase/migrations/20260928180000_create_addon_auth_codes.sql
  - app/services/__tests__/addon-auth-codes-migration.test.ts
  # PR 2: worktree wt300, branch fix/300-companion-auth, base fix/300-companion-auth-table
  - lib/addon/companion-auth.ts
  - lib/addon/sync-tokens.ts
  - lib/addon/__tests__/fake-addon-db.ts
  - lib/addon/__tests__/sync-tokens.test.ts
  - app/api/addon/auth/route.ts
  - app/api/addon/auth/token/route.ts
  - app/api/addon/auth/__tests__/pkce-flow.test.ts
  - app/companion/authorize/page.tsx
  - app/companion/authorize/GuildPicker.tsx
  - app/companion/authorize/__tests__/authorize-page.test.tsx
  - app/api/addon/attendance/route.ts
  - next.config.ts
  - app/api/addon/loot-award/route.ts
  - app/api/addon/guild-data/route.ts
  - app/api/addon/export-string/route.ts
  - app/api/addon/sync-token/route.ts
  - proxy.ts
  - app/api/addon/__tests__/companion-bearer-routes.test.ts
  - app/api/addon/auth/__tests__/rate-limit.test.ts
autonomous: true
requirements:
  - GH-300-R1
  - GH-300-R2
  - GH-300-R3
  - GH-300-R4
  - GH-300-R5
  - GH-300-R6
  - GH-300-R7
  - GH-300-R8

estimate:
  # estimate-calibration (--ws default): factor 1, applied false, 0 samples,
  # confidence low, so tokens equals raw_tokens. Above workflow.smart_zone_tokens
  # (100000): advisory only. Quick mode caps the plan at 3 tasks, so the
  # tracer (Task 2) carries every layer and Task 3 is mechanical wiring.
  tokens: 120000
  raw_tokens: 120000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-01: supabase/migrations/20260928180000_create_addon_auth_codes.sql creates only public.addon_auth_codes: code_hash (text primary key, 64 lowercase hex), code_challenge (text, 43 base64url chars), user_id (uuid, FK auth.users ON DELETE CASCADE), guild_id (uuid, FK public.guilds ON DELETE CASCADE), redirect_uri (text, CHECK equal to 'lootlistplus://auth/callback'), expires_at (timestamptz, default now() + interval '60 seconds'), created_at. RLS is enabled with no policies, anon and authenticated are revoked, service_role is granted. It ships alone in a DRAFT PR on fix/300-companion-auth-table against main, whose title and body carry no closing keyword for #300 (GH-300-R1)."
    - "GET /api/addon/auth accepts exactly one each of response_type=code, code_challenge_method=S256, a 43-char base64url code_challenge and redirect_uri exactly equal to lootlistplus://auth/callback. A missing, repeated or different redirect_uri gets a 400 and is never redirected to. Any other bad parameter, including code_challenge_method=plain or a missing method or challenge, gets a 303 to lootlistplus://auth/callback?error=invalid_request and no code is issued (GH-300-R2)."
    - "An unauthenticated GET /api/addon/auth is sent 303 to buildSignInPath('/api/addon/auth?' + canonical query). The existing sign-in page and /auth/callback (resolvePostAuthRedirect) bring the user back to that exact path. An authenticated GET is sent 303 to /companion/authorize with the same canonical query (GH-300-R2)."
    - "D-02: /companion/authorize lists exactly the guilds where verifyOfficerPermissions passes for the signed-in user, as one submit Button per guild in a single form that POSTs to /api/addon/auth with the canonical query. Its user-facing text is exactly the signed-off COPY block. POST /api/addon/auth re-validates every parameter, requires a same-origin Origin header, a session and officer rights on the chosen guild, stores sha256(code) with a 60-second expiry, and answers with an HTTP 303 to lootlistplus://auth/callback?code=<code>. CSP form-action allows the lootlistplus: scheme so that redirect is not a CSP violation (GH-300-R3)."
    - "POST /api/addon/auth/token deletes the code row by hash and reads it back in one statement, so a code works once and any failed attempt burns it. Expired codes, a verifier whose S256 does not equal the stored challenge (a plain-method verifier included), a malformed verifier, and a redirect_uri that differs from the stored one all get 400 {error:'invalid_grant'} or {error:'invalid_request'}. On success it re-checks officer rights, issues the token through issueSyncToken (upsert on guild_id,user_id, which replaces that user's previous token for the guild), and returns exactly {token, guild_id, guild_name, expires_at} with Cache-Control: no-store (GH-300-R4)."
    - "D-02: /api/addon/guild-data, /api/addon/export-string, /api/addon/loot-award and /api/addon/attendance all call authenticateAddonRequest then authorizeAddonGuild. These accept a cookie session or an Authorization Bearer sync token (sha256 hash lookup in addon_sync_tokens, expiry check). A token whose guild differs from the request's guild_id gets a 403 before any guild data is read, and verifyOfficerPermissions(supabase, userId, guildId) still runs on both paths. POST /api/addon/sync-token issues through the same issueSyncToken and its responses are unchanged (GH-300-R5)."
    - "Requests to /api/addon/auth and /api/addon/auth/token go through the existing Upstash limiter in proxy.ts in the 'auth' bucket (10 per minute per IP). Every other addon route stays in the 'api' bucket (60 per minute) (GH-300-R6)."
    - "Vitest covers the whole PKCE exchange (good, wrong verifier, expired, reused code, wrong redirect_uri, plain method), the Bearer helper (valid, expired, wrong guild, replaced token, missing header, cookie still works), the wiring of all four routes, the rate-limit bucket and the copy lock. A PGlite scratchpad proof exercises the real migration (GH-300-R7)."
    - "Each worktree passes the full vitest suite, npx tsc --noEmit and eslint on its touched files. PR 2 is a DRAFT against fix/300-companion-auth-table whose body contains 'Fixes #300'. Neither PR body has an em dash, and both end with the Claude Code line. Nothing is merged, --admin is not used, nothing is pushed to main, no SQL runs against a real database, and package.json and package-lock.json are unchanged (GH-300-R8)."
  artifacts:
    - path: "supabase/migrations/20260928180000_create_addon_auth_codes.sql"
      provides: "Service-role-only single-use PKCE authorization code table (D-01)"
      contains: "addon_auth_codes"
    - path: "app/services/__tests__/addon-auth-codes-migration.test.ts"
      provides: "Comment-stripped SQL shape lock for the migration"
      contains: "20260928180000_create_addon_auth_codes.sql"
    - path: "lib/addon/companion-auth.ts"
      provides: "COMPANION_REDIRECT_URI, AUTH_CODE_TTL_SECONDS, parseAuthorizeParams, isValidCodeVerifier, computeS256Challenge, isSameOriginRequest, issueAuthCode, consumeAuthCode, listOfficerGuilds"
      contains: "export const COMPANION_REDIRECT_URI = 'lootlistplus://auth/callback'"
    - path: "lib/addon/sync-tokens.ts"
      provides: "SYNC_TOKEN_DEFAULT_DAYS, hashSyncToken, issueSyncToken, authenticateAddonRequest, authorizeAddonGuild (the shared cookie-or-Bearer helper)"
      contains: "export async function authorizeAddonGuild"
    - path: "app/api/addon/auth/route.ts"
      provides: "GET authorize (validate, sign-in round trip, send to picker) and POST consent (issue code, 303 to the companion)"
      contains: "export async function POST"
    - path: "app/api/addon/auth/token/route.ts"
      provides: "POST code-for-token exchange"
      contains: "consumeAuthCode("
    - path: "app/companion/authorize/GuildPicker.tsx"
      provides: "Presentational guild picker holding COMPANION_AUTHORIZE_COPY (signed-off copy)"
      contains: "COMPANION_AUTHORIZE_COPY"
  key_links:
    - from: "companion/src/main/auth.ts redirect_uri literal"
      to: "lib/addon/companion-auth.ts COMPANION_REDIRECT_URI and the migration's redirect_uri CHECK literal"
      via: "drift test in pkce-flow.test.ts reads both files and compares them to the constant"
      pattern: "lootlistplus://auth/callback"
    - from: "POST /api/addon/auth (consent form)"
      to: "companion AuthManager.startLogin will-redirect listener"
      via: "a real HTTP 303 Location header. Electron's will-redirect fires only on server-side redirects, so no client navigation, meta refresh or server-action redirect"
      pattern: "NextResponse.redirect\\("
    - from: "app/api/addon/auth/token/route.ts"
      to: "addon_sync_tokens upsert onConflict 'guild_id,user_id'"
      via: "issueSyncToken in lib/addon/sync-tokens.ts, the same function POST /api/addon/sync-token now calls"
      pattern: "onConflict: 'guild_id,user_id'"
    - from: "four addon routes"
      to: "verifyOfficerPermissions(supabase, userId, guildId)"
      via: "authorizeAddonGuild keeps the exact call shape and the '@/utils/supabase/server' / '@/utils/server-roles' import paths, so existing route tests (loot-award, import-string, and #290's new guild-data/export-string tests) still intercept them"
      pattern: "authorizeAddonGuild\\(supabase, auth.principal"
    - from: "GET /api/addon/auth unauthenticated"
      to: "app/page.tsx LoginPage then app/auth/callback/route.js resolvePostAuthRedirect"
      via: "buildSignInPath from lib/post-auth-redirect.ts (isSafeNextPath accepts the same-origin /api/addon/auth?... path)"
      pattern: "buildSignInPath\\("
    - from: "proxy.ts getRateLimitType"
      to: "Upstash 'auth' limiter"
      via: "exact-or-child match on /api/addon/auth"
      pattern: "/api/addon/auth"
    - from: "next.config.ts cspDirectives"
      to: "form-action redirect to lootlistplus://"
      via: "scheme source added to form-action (OD-01)"
      pattern: "form-action 'self' lootlistplus:"
---

<objective>
Fix GH #300: the companion desktop app cannot log in or sync. The server side of its OAuth 2.0 PKCE flow (companion/src/main/auth.ts on origin/main, unchanged by this plan) was never built, and the four addon routes it calls only accept the browser session cookie.

Deliver it as two stacked draft PRs:
1. PR 1 (per D-01, ships first, own PR): a migration that creates the unused, service-role-only table public.addon_auth_codes for single-use, 60-second, hashed authorization codes. It comes with a SQL-shape test and a PGlite behaviour proof.
2. PR 2 (based on PR 1's branch): the authorize endpoint with sign-in round trip, the officer guild picker page (per D-02, the token is scoped to the one guild picked), the code-for-token exchange (it reuses the sync-token upsert), a shared cookie-or-Bearer helper that all four addon routes use (guild scope plus the existing officer checks), rate limiting on the auth endpoints, and the tests the user listed.

Purpose: an officer clicks Login in the companion, signs in with Discord if needed, picks a guild, and the companion syncs that guild and only that guild.
Output: branches fix/300-companion-auth-table and fix/300-companion-auth, each with a DRAFT PR. Only PR 2 says "Fixes #300".
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md

Names used below (the shell does not keep variables between Bash calls, so spell the full paths in commands):
- REPO = /Users/alexander.mayes/Code/personal/loot-list-plus (main checkout, on docs/273-debug-resolved; planning docs only)
- SCR = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad
- WT_TABLE = SCR/wt300-table (new worktree, new branch fix/300-companion-auth-table from origin/main)
- WT = SCR/wt300 (new worktree, new branch fix/300-companion-auth from fix/300-companion-auth-table)
- PGL = SCR/pglite-300 (scratchpad-only PGlite harness)
Every repo-relative path in a task is relative to that task's worktree.

Repo-state rules (orchestrator facts):
- The user's local main has diverged and is checked out in another session's worktree. Do NOT read application code from REPO's working tree, and do NOT edit or commit code in REPO. Read source from the worktrees, or with git -C REPO show origin/main:<path>. Prefix every command with cd <worktree> && or use git -C <worktree>.
- Symlink REPO/node_modules into each worktree. Do not run npm install or npm ci in any worktree, and do not change package.json or package-lock.json.
- PR fix/290-export-faction-aliases (worktree SCR/wt290, owned by another session) edits app/api/addon/guild-data/route.ts and app/api/addon/export-string/route.ts and adds route tests for both. In those two routes, change ONLY the auth import lines, the two auth blocks and the one stale "sync token (future)" doc line. Do not create files under app/api/addon/guild-data/__tests__ or app/api/addon/export-string/__tests__ (they would add/add-conflict with #290). Never touch SCR/wt290.
- Do NOT merge, do NOT use --admin, do NOT push to main, and do NOT run SQL against any real database (local PGlite in PGL is allowed).
- Every commit message ends with the trailer line: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
- The first argument to every console.* call is a constant string literal. Never interpolate request-derived values (codes, verifiers, tokens, redirect_uri, guild_id) into it, because CodeQL blocks tainted format strings. Never log raw codes, verifiers or tokens at all.
- Route files export only HTTP handlers (Next rejects other exports from route.ts and non-page exports from page.tsx). Put helpers in lib/addon/.

Facts verified at plan time against origin/main 3f57adc1 (PR #299 merged). No need to re-check:
- companion/src/main/auth.ts: opens `${apiUrl}/api/addon/auth?` + URLSearchParams({ response_type: 'code', code_challenge, code_challenge_method: 'S256', redirect_uri: 'lootlistplus://auth/callback' }). verifier = randomBytes(32).toString('base64url') (43 chars), challenge = sha256(verifier) as base64url (43 chars). It listens ONLY to webContents 'will-redirect' for URLs starting with lootlistplus://auth/callback, reads the code or error query param, then POSTs JSON { code, code_verifier } (no redirect_uri) to `${apiUrl}/api/addon/auth/token`. It checks only res.ok, then reads data.token, data.guild_id, data.guild_name and data.expires_at at the top level (not under data.data).
- companion/src/main/api-client.ts sends Authorization: Bearer <token> with guild_id as a query param (guild-data, export-string) or in the JSON body (loot-award, attendance).
- app/api/addon/sync-token/route.ts POST: getAuthenticatedUser, then verifyOfficerPermissions(service, user.id, guild_id), rawToken = randomBytes(32).toString('hex'), token_hash = sha256 hex, expiresAt = new Date() with setDate(getDate() + (expires_days || 30)), then upsert({ guild_id, user_id, token_hash, expires_at }, { onConflict: 'guild_id,user_id' }). On error: console.error('Failed to create sync token:', upsertError) and 500 { error: 'Failed to create token' }. Success: { data: { token, expires_at, guild_id } }. Nothing on the web calls it today.
- addon_sync_tokens (baseline lines 1286-1297): id, guild_id, user_id, token_hash text, expires_at timestamptz NOT NULL, last_used_at, created_at. UNIQUE (guild_id, user_id), index on token_hash, FKs cascade, RLS on with own-row SELECT/DELETE policies.
- The four routes all start with: const { user, error: authError } = await getAuthenticatedUser(); 401 { error: 'Unauthorized' } when missing; parse guild_id (query for guild-data/export-string, JSON body for loot-award/attendance); 400 if missing; supabase = createServiceRoleClient(); then the "// Verify officer permissions" block with verifyOfficerPermissions(supabase, user.id, guildId) and 403 { error: 'Officer permissions required' }. Imports are on lines 2 (getAuthenticatedUser from '@/utils/supabase/server') and 4 (verifyOfficerPermissions from '@/utils/server-roles'), or lines 3 and 5 in export-string. Auth blocks: guild-data 22-25 and 34-38, export-string 22-25 and 34-38, loot-award 32-35 and 48-52 (user.id also used at lines 100 and 116), attendance 29-32 and 45-49. guild-data line 18 reads " * Auth: Session cookie or sync token (future)".
- utils/server-roles.ts verifyOfficerPermissions(serviceSupabase, userId, guildId) returns { hasPermission, role?, position?, error? }. It returns early "No characters found" when the user has no characters, uses role positions from guild_roles, and falls back to guilds.created_by only when the user has characters. isGuildCreator is exported too.
- guilds columns: id, name (NOT NULL), realm (nullable), faction, created_by, ... character_guild_memberships has character_id, guild_id, role, is_active. characters has id, user_id.
- lib/post-auth-redirect.ts (no imports): isSafeNextPath, resolvePostAuthRedirect({ next, hasMemberships }), buildSignInPath(pathWithSearch) which returns '/?next=' + encodeURIComponent(path) for safe paths. app/page.tsx renders LoginPage with nextParam. LoginPage sends Discord OAuth to /auth/callback?next=<encoded>. app/auth/callback/route.js redirects to resolvePostAuthRedirect(...) (a safe next when the user has memberships). LoginPage treats a next containing "code=" as a guild invite, so the canonical query must never contain the substring "code=" (it does not: the keys are response_type, code_challenge, code_challenge_method, redirect_uri).
- proxy.ts: page paths that are not public get session-gated and redirect to '/?next=' + pathname (the query string is dropped). /api paths skip the session gate and go through rate limiting. getRateLimitType(pathname) is a non-exported function returning 'admin' | 'auth' | 'feedback' | 'api'. It returns 'auth' when pathname starts with '/auth' or includes '/verify-discord'. Limits: auth 10 per minute, api 60 per minute, keyed `${type}:${ip}` from x-forwarded-for. Upstash is used when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, otherwise an in-memory fallback is used outside production. Responses carry an X-RateLimit-Limit header, and 429 when blocked.
- next.config.ts cspDirectives line 44-45: the comment "// Restrict form submissions to same origin" then "form-action 'self'". Chromium (and so Electron) applies form-action to redirects that follow a form submission.
- lib/public-routes.ts does not list /companion, so proxy.ts session-gates /companion/authorize. That is intended.
- Existing patterns to copy: app/api/addon/import-string/__tests__/route.test.ts and app/api/addon/loot-award/__tests__/route.test.ts. Both use the // @vitest-environment node header, vi.mock of '@/utils/supabase/service-role', '@/utils/supabase/server' ({ getAuthenticatedUser }), '@/utils/server-roles' ({ verifyOfficerPermissions }), '@/utils/analytics/server', '@/utils/blp/recompute', '@/utils/raid-events/team-routing' and next/server's after, plus a chainable, thenable, recording fake client. app/services/__tests__/aq20-phase-backfill-migration.test.ts is the migration-shape pattern (stripComments, whitespace collapse, split on ';').
- The latest migration on origin/main is 20260927120000_backfill_aq20_raid_tier_phase.sql. Unmerged PR #298 uses 20260928120000. The CI note in CLAUDE.md says migration-only PRs need an --admin merge (by the user) and migrations auto-deploy about 12 seconds after merge.
- SCR/pglite-289/node_modules already contains @electric-sql/pglite 0.5.x (used in quick task 260928-fr8). Reuse it by symlink. No install is needed.
- Design system (.agents/skills/source-command-design-system): use Button (never a raw button), Heading level, Text (color="muted" etc.), Card, and semantic colour tokens only (no hex/rgb/hsl literals or arbitrary colour classes). Plain ul/li and layout divs are fine.
</context>

<copy_signoff>
Status: SIGNED OFF (2026-09-28). The user approved C-01 to C-09 and A-01 to A-04 exactly as written below, with no edits. OD-01 (add lootlistplus: to CSP form-action) is also approved.

The executor ships these strings exactly as signed off, character for character, and adds no other user-facing text to the page. They live in one exported constant, COMPANION_AUTHORIZE_COPY, in app/companion/authorize/GuildPicker.tsx, and authorize-page.test.tsx locks them. None contains an em dash.

| ID | Where | Text |
|----|-------|------|
| C-01 | Browser and window title (page metadata, same separator as the sign-in page title) | Connect the companion app ∙ LootList+ |
| C-02 | Heading, guild list | Choose a guild to sync |
| C-03 | Intro, guild list | The LootList+ companion app will sync loot lists, priorities, loot awards and attendance for the guild you choose. It can't reach your other guilds. |
| C-04 | Label above the guild buttons | Guilds where you're an officer |
| C-05 | Fine print under the guild buttons | This connection lasts 30 days. Choosing a guild replaces any earlier companion connection you made for it. To cancel, close this window. |
| C-06 | Heading, no guilds | No guilds to connect |
| C-07 | Body, no guilds | The companion app needs officer access, and you aren't an officer in any guild yet. Ask your guild master to promote you, then log in again from the companion app. |
| C-08 | Heading, bad or incomplete login link | This login link doesn't work |
| C-09 | Body, bad or incomplete login link | Start the login again from the LootList+ companion app. |

Not copy (data): each guild button shows the guild's name, with its realm as secondary text when the guild has one. The "30" in C-05 is rendered from SYNC_TOKEN_DEFAULT_DAYS, so the sentence cannot drift from the real token lifetime.

API messages the companion or its login window may display (part of the same sign-off, lower stakes):

| ID | When | Text |
|----|------|------|
| A-01 | 401, the Bearer header is not a well-formed or known sync token | Invalid sync token |
| A-02 | 401, the sync token has expired | Sync token expired. Log in again from the companion app. |
| A-03 | 403, the token belongs to a different guild than the request's guild_id | This sync token is for a different guild |
| A-04 | 400 JSON from GET /api/addon/auth when redirect_uri is missing or not allowed (shown raw in the login window) | { "error": "invalid_request", "error_description": "redirect_uri is not allowed" } |

Existing messages kept as they are: Unauthorized, Officer permissions required. The OAuth error codes invalid_request, invalid_grant and server_error are protocol values, not prose.
</copy_signoff>

<open_decisions>
## OD-01 (NEEDS USER OK, default applied: include): add the lootlistplus: scheme to CSP form-action
The guild picker is a plain form POST that the server answers with a 303 to lootlistplus://auth/callback?code=... Chromium, and so the companion's Electron window, applies the CSP form-action directive to redirects that follow a form submission. With today's "form-action 'self'" that redirect is a CSP violation. The code would probably still reach the companion, because Electron's will-redirect throttle runs before Chromium's form-submission check, but that relies on Chromium internals nobody can test here. The fix changes next.config.ts to "form-action 'self' lootlistplus:". This lets any page's forms target only that custom scheme, which carries no data off the machine. Alternatives rejected: a state-changing GET link per guild (needs its own CSRF token, and Next <Link> prefetch would issue codes), or a client-side navigation (Electron fires will-navigate, not will-redirect, so the companion would miss the code).

## OD-02 (planner default): error redirect vs 400 on the authorize endpoint
Per RFC 6749 4.1.2.1 and RFC 7636 4.4.1: when redirect_uri is valid but another parameter is bad (plain method, missing method, missing or malformed challenge, wrong response_type), the server answers 303 lootlistplus://auth/callback?error=invalid_request, so the companion closes its window and reports the failure at once. When redirect_uri itself is missing, repeated or not the exact allowed value, the server answers 400 JSON (A-04) and never redirects.

## OD-03 (planner default, within D-01): a failed exchange burns the code
The token endpoint deletes the row by hash first, then checks expiry, redirect_uri and the verifier. A wrong verifier therefore consumes the code, which blocks guessing. The companion never retries an exchange, so honest users are unaffected.

## OD-04 (planner default): officer status is re-checked at exchange and on every request
The token endpoint re-runs verifyOfficerPermissions before issuing, and every Bearer request re-runs it through authorizeAddonGuild. A demoted officer's token stops working at once, without being revoked.

## OD-05 (planner default): rate-limit bucket
/api/addon/auth and /api/addon/auth/token move from the 'api' bucket (60 per minute per IP) to the existing 'auth' bucket (10 per minute per IP, shared with /auth/*). One login uses about 4 requests from that bucket (callback, authorize GET, consent POST, token).

## OD-06 (planner default): CSRF on the consent POST
POST /api/addon/auth requires an Origin header whose host equals the first x-forwarded-host value, else the host header, else the request URL's host (the same rule Next uses for server actions). Otherwise it returns 403. SameSite=Lax session cookies and CSP form-action already block cross-site posts. This is defence in depth.

## N-01 (informational): merge order and migration timestamps
Merge PR 1 first (the user merges it with --admin). Wait for the auto-deploy, then retarget PR 2 to main and merge it. If PR 2 deployed without the table, the authorize POST and token routes would return 500 while everything else kept working. If PR 1 merges before #298, #298's 20260928120000 file sorts before an already-applied migration, so supabase db push would need --include-all, or #298 would need a newer timestamp. Both PR bodies say this.

## N-02 (informational): expected conflict with fix/290-export-faction-aliases
Both PRs edit the import block of guild-data and export-string. Git will probably report a small conflict there. To resolve it, keep both sets of imports. Task 3 runs git merge-tree against that branch, if it exists on origin, and reports the real result in PR 2's body. #290's new route tests mock getAuthenticatedUser and verifyOfficerPermissions at the same module paths the new helper imports, and requests without an Authorization header take the cookie path, so those tests keep passing after both merge.

## N-03 (out of scope, listed in PR 2's body): companion logout does not revoke its server token (it expires after 30 days or when replaced). /api/addon/import-string stays cookie-only (the companion does not call it). addon_sync_tokens.last_used_at is not updated. No companion/ or addon/ code changes.
</open_decisions>

<source_audit>
| Source | Item | Covered by |
|--------|------|-----------|
| GOAL | Companion can authenticate and sync (GH #300) | Tasks 1-3 |
| CONTEXT | D-01 new migration table (code hash, challenge, user, guild, redirect_uri, 60s expiry, single use), migration first in its own PR | Task 1 (table, PR 1), Task 2 (delete-on-exchange) |
| CONTEXT | D-02 officer guild picker, token scoped to the chosen guild, every addon route rejects another guild_id | Task 2 (picker, consent, token, attendance), Task 3 (other three routes) |
| REQ | GH-300-R1 table and RLS | Task 1 |
| REQ | GH-300-R2 authorize validation and sign-in round trip | Task 2 |
| REQ | GH-300-R3 picker, consent, copy sign-off | Task 2 |
| REQ | GH-300-R4 exchange and upsert semantics | Task 2 |
| REQ | GH-300-R5 shared helper in all four routes, officer checks kept | Task 2 (helper, attendance), Task 3 (loot-award, guild-data, export-string, sync-token) |
| REQ | GH-300-R6 Upstash rate limit on the token endpoint | Task 3 |
| REQ | GH-300-R7 tests | Tasks 1-3 |
| REQ | GH-300-R8 worktrees, PRs, verification, executor limits | Tasks 1-3 |
RESEARCH: none (quick mode). Deferred: none.
</source_audit>

<tasks>

<task type="auto">
  <name>Task 1: PR 1 (per D-01): addon_auth_codes migration, shape test, PGlite proof, draft PR against main</name>
  <files>supabase/migrations/20260928180000_create_addon_auth_codes.sql, app/services/__tests__/addon-auth-codes-migration.test.ts</files>
  <read_first>git -C REPO show origin/main:supabase/migrations/20260827000000_guild_funnel_milestones.sql (service-role-only pattern); git -C REPO show origin/main:supabase/migrations/20260826000000_guild_subscriptions.sql (constraint naming); git -C REPO show origin/main:app/services/__tests__/aq20-phase-backfill-migration.test.ts (shape-test pattern); git -C REPO show origin/main:supabase/migrations/README.md (rules)</read_first>
  <action>
Setup:
1. Run git -C REPO fetch origin. Confirm origin/main contains 3f57adc1 and that no file in origin/main:supabase/migrations has a timestamp at or after 20260928180000. If one does, stop and report.
2. Run git -C REPO worktree add -b fix/300-companion-auth-table WT_TABLE origin/main, then ln -s REPO/node_modules WT_TABLE/node_modules.
3. Baseline: cd WT_TABLE && npx vitest run. Record the pass/fail counts and any failing files for the SUMMARY. Later "full suite passes" means no failures beyond this baseline set.

Migration (per D-01). Create supabase/migrations/20260928180000_create_addon_auth_codes.sql. Start with a -- header that says: GH #300; this table holds single-use OAuth 2.0 PKCE authorization codes for the companion desktop app; only the service role reads or writes it (the /api/addon/auth routes in the follow-up PR); rows hold a sha256 hash of the code, never the code; a code is deleted when it is exchanged and expires 60 seconds after it is issued; nothing uses the table until the follow-up PR merges. Then write exactly these six statements, in this order, with quoted identifiers in the baseline's style:
- CREATE TABLE IF NOT EXISTS "public"."addon_auth_codes" with the columns code_hash text NOT NULL, code_challenge text NOT NULL, user_id uuid NOT NULL, guild_id uuid NOT NULL, redirect_uri text NOT NULL, expires_at timestamptz DEFAULT (now() + interval '60 seconds') NOT NULL, and created_at timestamptz DEFAULT now() NOT NULL. Add these named constraints: addon_auth_codes_pkey PRIMARY KEY (code_hash); addon_auth_codes_code_hash_check CHECK (code_hash ~ '^[0-9a-f]{64}$'); addon_auth_codes_code_challenge_check CHECK (code_challenge ~ '^[A-Za-z0-9_-]{43}$') (the only shape an S256 challenge can have; plain is never accepted); addon_auth_codes_redirect_uri_check CHECK (redirect_uri = 'lootlistplus://auth/callback'); addon_auth_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES "auth"."users"("id") ON DELETE CASCADE; addon_auth_codes_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES "public"."guilds"("id") ON DELETE CASCADE.
- CREATE INDEX IF NOT EXISTS "idx_addon_auth_codes_expires_at" ON "public"."addon_auth_codes" ("expires_at") (for the expired-row cleanup the code PR runs on each issue).
- A "-- Service-role only: RLS on with no policies." comment, then ALTER TABLE "public"."addon_auth_codes" ENABLE ROW LEVEL SECURITY.
- REVOKE ALL ON TABLE "public"."addon_auth_codes" FROM "anon", "authenticated" (defence in depth over Supabase's default grants).
- GRANT ALL ON TABLE "public"."addon_auth_codes" TO "service_role".
- COMMENT ON TABLE "public"."addon_auth_codes" IS a one-sentence description. The comment text contains no semicolon and no two consecutive hyphens.
The migration has no policies, functions, triggers, DROP, DML, or references to any other table beyond the two FK targets. It must stay idempotent (a second apply is a no-op).

Shape test. Create app/services/__tests__/addon-auth-codes-migration.test.ts, following aq20-phase-backfill-migration.test.ts (same stripComments approach, whitespace collapse, split on ';'). Assert:
(a) the file exists, and its 14-digit timestamp is greater than every other migration timestamp in supabase/migrations and greater than 20260928120000 (pending PR #298);
(b) there are exactly 6 statements, in the order above;
(c) the CREATE TABLE column set is exactly {code_hash, code_challenge, user_id, guild_id, redirect_uri, expires_at, created_at}, with the stated types, and every column is NOT NULL;
(d) the primary key is on code_hash, and the three CHECKs, the two FKs with ON DELETE CASCADE and the 60-second expires_at default each appear exactly once, matched with regexes;
(e) the redirect_uri CHECK literal is exactly lootlistplus://auth/callback;
(f) ENABLE ROW LEVEL SECURITY is present; CREATE POLICY, DISABLE ROW LEVEL SECURITY, DROP, DELETE, UPDATE, INSERT, TRUNCATE, SECURITY DEFINER and CREATE FUNCTION are absent; the REVOKE names both anon and authenticated.
Mutation check (do not commit the mutants): apply each of these to a temporary copy of the migration, point the test at it through a MIGRATION_FILE_OVERRIDE env var read only by this test, confirm the test fails, then restore: (1) drop the ENABLE ROW LEVEL SECURITY statement, (2) change 60 seconds to 600 seconds, (3) change the redirect literal to lootlistplus://auth/callback/, (4) add a CREATE POLICY. Record the four failures in the SUMMARY. If you would rather not add the env override, run the mutants by editing the real file in place and restoring it with git checkout. Either way, the committed test must still point at the real file.

PGlite proof (scratchpad only, not committed). Create PGL and symlink SCR/pglite-289/node_modules into PGL/node_modules. Do not run npm install. Write PGL/scenarios.mjs that loads PGlite, runs a stub (CREATE SCHEMA auth; auth.users(id uuid primary key); public.guilds(id uuid primary key default gen_random_uuid(), name text not null); roles anon and authenticated NOLOGIN; role service_role NOLOGIN BYPASSRLS), and applies the migration text read from WT_TABLE. Check each of these, exiting non-zero on the first failure:
- S1: the migration applies, and applies again cleanly.
- S2: an app-shaped row (sha256 hex of a random code, the S256 challenge of a random 43-char verifier computed with node crypto, user, guild, the exact redirect_uri, explicit expires_at) inserts. A row that omits expires_at gets now() plus 60 seconds, within 2 seconds.
- S3: redirect_uri values 'lootlistplus://auth/callback/', 'https://evil.example/cb' and 'LOOTLISTPLUS://auth/callback' are each rejected.
- S4: 42-char and 44-char challenges, and challenges containing '=' or '+', are rejected.
- S5: a non-hex or 63-char code_hash is rejected, and a duplicate code_hash is rejected.
- S6: DELETE FROM public.addon_auth_codes WHERE code_hash = $1 RETURNING user_id, guild_id, code_challenge, redirect_uri, expires_at returns the row once, and zero rows the second time.
- S7: an unknown guild_id is rejected by the FK, deleting the guild deletes its codes, and deleting the auth.users row deletes its codes.
- S8: pg_class.relrowsecurity is true for the table, and pg_policies has zero rows for it.
- S9: has_table_privilege is false for anon and authenticated for SELECT, INSERT and DELETE, and true for service_role. If PGlite supports SET ROLE, also show that a SELECT as anon errors.
- S10 round trip: create addon_sync_tokens from the baseline DDL (baseline lines 1286-1297 plus UNIQUE (guild_id, user_id)). Consume a code as in S6. Upsert a token hash with INSERT ... ON CONFLICT (guild_id, user_id) DO UPDATE SET token_hash, expires_at. Upsert a second hash for the same pair. The first hash now finds 0 rows and the second finds 1 row with expires_at in the future.
Print one PASS line per scenario and write the output to PGL/output.txt.

Verify, commit, PR:
- cd WT_TABLE && npx tsc --noEmit && npx eslint app/services/__tests__/addon-auth-codes-migration.test.ts && npx vitest run (full suite, against the baseline).
- Make one commit with both files: "feat(db): add addon_auth_codes table for companion app login (#300)". The body explains D-01 (single-use hashed PKCE codes, 60-second expiry, service role only, unused until the follow-up PR) and ends with the trailer.
- git -C WT_TABLE push -u origin fix/300-companion-auth-table.
- Write the PR body to SCR/pr300-table-body.md (not in any repo). It covers: what the table is and why it ships first and unused (D-01); the column list and constraints; RLS on with no policies plus the REVOKE; the shape test and the mutation check; the S1-S10 PGlite results; merge notes (a migration-only PR needs the user's --admin merge, it auto-deploys about 12 seconds after merge, it is safe to deploy alone, and the N-01 note about #298's timestamp); and "Part of #300. The follow-up PR wires the login flow." It has no em dash (U+2014) and no closing keyword (fix, fixes, close, closes, resolve, resolves) before #300. The last line is exactly: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
- gh pr create --draft --base main --head fix/300-companion-auth-table --title "feat(db): add addon_auth_codes table for companion app login (#300)" --body-file SCR/pr300-table-body.md. Record the PR number for Task 3.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt300-table && npx vitest run app/services/__tests__/addon-auth-codes-migration.test.ts && npx tsc --noEmit && npx eslint app/services/__tests__/addon-auth-codes-migration.test.ts && test "$(git diff --name-only origin/main...HEAD | tr '\n' ' ')" = "app/services/__tests__/addon-auth-codes-migration.test.ts supabase/migrations/20260928180000_create_addon_auth_codes.sql " && test "$(git log origin/main..HEAD --format=%H | wc -l | tr -d ' ')" = "$(git log origin/main..HEAD --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" && node /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-300/scenarios.mjs && gh pr view fix/300-companion-auth-table --json isDraft,baseRefName,title,body --jq '[.isDraft, (.baseRefName == "main"), ((.title + " " + .body) | test("(?i)(fix(e[sd])?|close[sd]?|resolve[sd]?) #300") | not), ((.title + .body) | contains("—") | not), (.body | rtrimstr("\n") | endswith("🤖 Generated with [Claude Code](https://claude.com/claude-code)"))] | all' | grep -qx true</automated>
  </verify>
  <done>WT_TABLE is on fix/300-companion-auth-table with exactly two changed files in one trailer-bearing commit. The shape test passes, and each of the four mutants made it fail. PGlite S1-S10 all print PASS. The full suite, tsc and eslint pass against the baseline. The branch is pushed, and a DRAFT PR against main exists with no closing keyword for #300, no em dash, and the Claude Code last line. Its number is recorded. Nothing is merged and no real database was touched.</done>
</task>

<task type="tracer" tdd="true">
  <name>Task 2 (tracer, per D-01 and D-02): one end-to-end companion login: authorize, picker, consent, token, Bearer on /api/addon/attendance</name>
  <precondition>The copy_signoff block in this plan reads "Status: SIGNED OFF" (the orchestrator sets it before execution); if it still reads PENDING, stop after Task 1 and report a checkpoint asking for copy sign-off.</precondition>
  <files>lib/addon/companion-auth.ts, lib/addon/sync-tokens.ts, lib/addon/__tests__/fake-addon-db.ts, lib/addon/__tests__/sync-tokens.test.ts, app/api/addon/auth/route.ts, app/api/addon/auth/token/route.ts, app/api/addon/auth/__tests__/pkce-flow.test.ts, app/companion/authorize/page.tsx, app/companion/authorize/GuildPicker.tsx, app/companion/authorize/__tests__/authorize-page.test.tsx, app/api/addon/attendance/route.ts, next.config.ts</files>
  <read_first>WT/companion/src/main/auth.ts; WT/app/api/addon/sync-token/route.ts; WT/app/api/addon/attendance/route.ts; WT/utils/server-roles.ts (verifyOfficerPermissions, isGuildCreator); WT/lib/post-auth-redirect.ts; WT/app/api/addon/import-string/__tests__/route.test.ts (mocks and fake client); WT/components/ui/button.tsx, card.tsx, typography.tsx; WT/next.config.ts lines 40-50</read_first>
  <behavior>
    - PKCE exchange (pkce-flow.test.ts, node env, through the real route handlers against the in-memory fake): good path GET authorize (signed in) 303 to /companion/authorize?canonical, POST consent 303 to lootlistplus://auth/callback?code=X, POST token with {code: X, code_verifier} 200 with exactly {token, guild_id, guild_name, expires_at} and Cache-Control no-store; the stored code row holds sha256(X) not X and expires 60s after issue; the stored sync token hash equals sha256(token)
    - wrong verifier: 400 invalid_grant, and the same code then fails again (burned); expired: fake Date moved 61s, 400 invalid_grant; reused code: second exchange 400 invalid_grant; wrong redirect_uri: authorize GET with lootlistplus://auth/callback/ or https://evil.example gets 400 with no Location, consent POST likewise, and a token request whose redirect_uri differs from the stored one gets 400 invalid_grant
    - plain method: GET and consent POST with code_challenge_method=plain, or with it missing, 303 to lootlistplus://auth/callback?error=invalid_request and no row inserted; a token request whose verifier equals the stored challenge (what a plain client sends) gets 400 invalid_grant
    - malformed input: missing/short/long/illegal-char code_verifier or missing code gives 400 invalid_request with no row deleted; repeated redirect_uri or code_challenge gives the matching rejection
    - sign-in round trip: signed-out GET 303 Location path '/' whose next param equals '/api/addon/auth?' + canonical query, resolvePostAuthRedirect({ next, hasMemberships: true }) returns it unchanged, and it does not contain 'code='
    - consent guards: cross-site Origin 403, missing Origin 403, no session 401, not officer 403, malformed guild_id 400; none inserts a row
    - token grants: officer rights revoked between consent and exchange gives 400 invalid_grant and no token row; a second login for the same user and guild replaces the earlier token hash
    - e2e: the token from the good path, sent as Bearer to POST /api/addon/attendance with the same guild_id, passes the gate (verifyOfficerPermissions called with the fake client, the token user id and that guild; status neither 401 nor 403); with another guild_id it gets 403 A-03 and verifyOfficerPermissions is not called
    - drift: COMPANION_REDIRECT_URI equals the redirect_uri literal in companion/src/main/auth.ts and the migration CHECK literal; AUTH_CODE_TTL_SECONDS equals the migration's interval; auth.ts still sends code_challenge_method 'S256' and posts code_verifier to /api/addon/auth/token
    - Bearer helper (sync-tokens.test.ts, node env): valid token for guild A on guild A ok with userId; expired 401 A-02; token for A on guild B 403 A-03 with no officer call; replaced token (issueSyncToken twice) old 401 A-01, new ok; missing header and no cookie 401 Unauthorized; no header with cookie session ok and officer check called with the cookie user; malformed header ('Basic x', 'Bearer', 'Bearer nothex') 401 A-01 without calling getAuthenticatedUser; a header present with a valid cookie still uses the token path; valid token but officer check false 403 Officer permissions required; the lookup queries token_hash with sha256(token), never the raw token
    - Picker page (authorize-page.test.tsx, jsdom): invalid params render C-08 and C-09; signed-out with valid params calls redirect with buildSignInPath('/api/addon/auth?' + canonical); zero officer guilds render C-06 and C-07; mixed memberships list only guilds where verifyOfficerPermissions passes (plus a creator-only guild), sorted by name, each a submit button with name guild_id and value the id, inside one form with method post and action '/api/addon/auth?' + canonical; every rendered string equals COMPANION_AUTHORIZE_COPY; no rendered text contains U+2014; metadata title equals C-01; rendering inserts no addon_auth_codes row; next.config.ts contains exactly one form-action directive and it reads form-action 'self' lootlistplus:
  </behavior>
  <action>
Setup: git -C REPO worktree add -b fix/300-companion-auth WT fix/300-companion-auth-table, then ln -s REPO/node_modules WT/node_modules. Run a baseline cd WT && npx vitest run and record it. Write the tests first from the behavior list, watch them fail, then implement.

A. lib/addon/companion-auth.ts (server-only; imports only node crypto and the SupabaseClient type plus verifyOfficerPermissions from '@/utils/server-roles'; no next/* imports so it loads in jsdom). Exports:
- COMPANION_REDIRECT_URI = 'lootlistplus://auth/callback' and AUTH_CODE_TTL_SECONDS = 60.
- parseAuthorizeParams(params: URLSearchParams) returns { ok: true, codeChallenge, query } | { ok: false, reason: 'invalid_redirect_uri' } | { ok: false, reason: 'invalid_request' }. Check redirect_uri first: it must appear exactly once and equal COMPANION_REDIRECT_URI by exact string comparison, with no normalisation, trimming or prefix match, else invalid_redirect_uri. Then response_type exactly once and equal to 'code', code_challenge_method exactly once and equal to 'S256' (case-sensitive; missing means plain per RFC 7636, so it is rejected), and code_challenge exactly once and matching ^[A-Za-z0-9_-]{43}$; otherwise invalid_request. query is the canonical string built with URLSearchParams in the fixed order response_type, code_challenge, code_challenge_method, redirect_uri. Unknown params are dropped.
- isValidCodeVerifier(v): a string matching ^[A-Za-z0-9._~-]{43,128}$ (RFC 7636).
- computeS256Challenge(verifier): sha256 digest as base64url.
- isSameOriginRequest(request: Request) per OD-06.
- issueAuthCode(supabase, { userId, guildId, codeChallenge, now? }): code = randomBytes(32) as base64url. First a best-effort delete of rows with expires_at earlier than now (log a constant message on error and continue). Then insert { code_hash: sha256 hex of the code, code_challenge, user_id, guild_id, redirect_uri: COMPANION_REDIRECT_URI, expires_at: now + AUTH_CODE_TTL_SECONDS }. On insert error, throw new Error('Failed to store authorization code'). Returns { code }.
- consumeAuthCode(supabase, { code, codeVerifier, redirectUri?: string | null, now? }) returns { ok: true, userId, guildId } | { ok: false, error: 'invalid_grant' } (OD-03). One call: delete().eq('code_hash', sha256 hex of the code).select('user_id, guild_id, code_challenge, redirect_uri, expires_at').maybeSingle(). Throw on a DB error. Then return invalid_grant if there is no row, if expires_at is at or before now, if the stored redirect_uri is not COMPANION_REDIRECT_URI, if redirectUri was given and differs from the stored value, or if computeS256Challenge(codeVerifier) does not equal the stored challenge (compare equal-length buffers with timingSafeEqual).
- listOfficerGuilds(supabase, userId) returns Array<{ id, name, realm }>. Candidates are the guild_ids of active character_guild_memberships for the user's characters, plus guilds where created_by = userId. Keep only candidates where verifyOfficerPermissions(supabase, userId, id).hasPermission is true. Fetch id, name, realm for those, sort by name with localeCompare, and throw on query errors. (Task 2 needs it for the page.)

B. lib/addon/sync-tokens.ts. It imports node crypto, createServiceRoleClient from '@/utils/supabase/service-role', getAuthenticatedUser from '@/utils/supabase/server' and verifyOfficerPermissions from '@/utils/server-roles'. Keep exactly these module paths so existing and parallel route tests keep intercepting them. It must NOT import next/server: build every error response with the web-standard Response.json(body, { status }). The jsdom picker test imports SYNC_TOKEN_DEFAULT_DAYS through this module, and next/server does not load under jsdom. Route handlers can return these Response objects as they are. Exports:
- SYNC_TOKEN_DEFAULT_DAYS = 30 and hashSyncToken(token) (sha256 hex).
- issueSyncToken(supabase, { userId, guildId, expiresDays?, now? }) returns { ok: true, token, expiresAt } | { ok: false, error }. It reproduces the sync-token route byte for byte in behaviour: randomBytes(32) as hex, expiry by setDate(getDate() + days), and upsert on onConflict 'guild_id,user_id', which replaces that user's previous token for the guild.
- type AddonPrincipal = { kind: 'session', userId } | { kind: 'sync_token', userId, guildId }.
- authenticateAddonRequest(request: Request) returns { ok: true, principal } | { ok: false, response }. If there is no Authorization header, take the cookie path: getAuthenticatedUser(), and on no user return 401 { error: 'Unauthorized' }. If the header is present in any form, take the token path only, with no cookie fallback. The header must match a case-insensitive 'Bearer ' followed by 64 lowercase hex chars, else 401 A-01. Look it up with createServiceRoleClient().from('addon_sync_tokens').select('user_id, guild_id, expires_at').eq('token_hash', hashSyncToken(token)).maybeSingle(). A DB error gives 500 { error: 'Internal server error' } with a constant log message. No row gives 401 A-01. expires_at at or before now gives 401 A-02.
- authorizeAddonGuild(supabase, principal, guildId) returns { ok: true, userId } | { ok: false, response }. When principal is a sync token whose guildId !== guildId, return 403 A-03 without calling anything (per D-02). Otherwise run verifyOfficerPermissions(supabase, principal.userId, guildId), and when it fails return 403 { error: 'Officer permissions required' }.

C. app/api/addon/auth/route.ts:
- GET(request: NextRequest): parseAuthorizeParams(request.nextUrl.searchParams). invalid_redirect_uri gives 400 A-04 JSON. invalid_request gives NextResponse.redirect of COMPANION_REDIRECT_URI plus ?error=invalid_request, status 303 (OD-02). getAuthenticatedUser() with no user gives a 303 to new URL(buildSignInPath('/api/addon/auth?' + query), request.url). With a user, 303 to new URL('/companion/authorize?' + query, request.url). This GET never issues a code (consent needs the POST).
- POST(request: NextRequest), the consent form: isSameOriginRequest, else 403 { error: 'Forbidden' }. Then parseAuthorizeParams(request.nextUrl.searchParams) (the form's action carries the canonical query) with the same 400 or 303 handling as GET. Then request.formData(): guild_id must appear exactly once, as a UUID-shaped string, else 400 { error: 'invalid_request' }. getAuthenticatedUser() with no user gives 401 { error: 'Unauthorized' }. Then service = createServiceRoleClient() and verifyOfficerPermissions(service, user.id, guildId), which on failure gives 403 { error: 'Officer permissions required' }. Then issueAuthCode, then NextResponse.redirect(COMPANION_REDIRECT_URI with the code set as the code search param, 303) with Cache-Control: no-store. This must be a real HTTP 303, because the companion only sees server-side redirects (will-redirect). Wrap in try/catch: trackApiError('unknown', 'POST /api/addon/auth', err) and 500 { error: 'server_error' }.

D. app/api/addon/auth/token/route.ts POST: parse the JSON body (a failure gives 400 invalid_request). code must be a non-empty string of at most 256 chars, code_verifier must pass isValidCodeVerifier, and redirect_uri is optional but must be a string if present; otherwise 400 { error: 'invalid_request' }. service = createServiceRoleClient(). consumeAuthCode, and on failure 400 { error: 'invalid_grant' }. verifyOfficerPermissions(service, userId, guildId), and on failure 400 invalid_grant (OD-04). Look up guilds.name by id with single(), and a missing guild gives 400 invalid_grant. issueSyncToken(service, { userId, guildId }), and !ok gives 500 { error: 'server_error' }. Success is 200 JSON { token, guild_id, guild_name, expires_at } at the top level (the companion reads them there), with Cache-Control: no-store and Pragma: no-cache. try/catch with trackApiError('unknown', 'POST /api/addon/auth/token', err) and 500 server_error.

E. Picker (per D-02). app/companion/authorize/GuildPicker.tsx (no 'use client'; presentational). Export COMPANION_AUTHORIZE_COPY holding C-01 to C-09 exactly as signed off in copy_signoff. C-05 is built from SYNC_TOKEN_DEFAULT_DAYS. The default export takes a state prop: { kind: 'invalid' } | { kind: 'no_guilds' } | { kind: 'pick', guilds, formAction }. Layout: a centred main, a max-w-md Card, Heading level 1, Text color muted. In the pick state: LabelText or Text for C-04, then one form method="post" action={formAction} holding a ul of li, each with a Button type="submit" name="guild_id" value={guild.id} variant="outline" full width showing the name and, when present, the realm as muted secondary text, then C-05. Semantic tokens only, no raw button, no hidden inputs (the canonical query rides in the action URL). app/companion/authorize/page.tsx is an async server component with metadata { title: { absolute: C-01 }, robots: { index: false, follow: false } }. It builds URLSearchParams from the awaited searchParams (appending every value of array entries so duplicates are caught) and runs parseAuthorizeParams: not ok renders the invalid state. getAuthenticatedUser() with no user calls redirect(buildSignInPath('/api/addon/auth?' + query)). Otherwise it calls listOfficerGuilds(createServiceRoleClient(), user.id): an empty list renders no_guilds, else pick with formAction '/api/addon/auth?' + query. The page never issues a code.

F. next.config.ts (OD-01): change the form-action entry to "form-action 'self' lootlistplus:". Replace its comment with one saying the companion guild picker's form POST ends in a 303 to lootlistplus://auth/callback (GH #300), and Chromium applies form-action to that redirect. Change nothing else in the CSP.

G. app/api/addon/attendance/route.ts (the tracer route). Replace the session-cookie and officer imports with one import of authenticateAddonRequest and authorizeAddonGuild from '@/lib/addon/sync-tokens'. Replace the first auth block with: const auth = await authenticateAddonRequest(request); if (!auth.ok) return auth.response. Replace the officer block with a comment noting the officer check plus sync-token guild scope (GH #300 D-02), then const access = await authorizeAddonGuild(supabase, auth.principal, guild_id); if (!access.ok) return access.response. Nothing else changes.

H. Tests: lib/addon/__tests__/fake-addon-db.ts (not a test file). It is an in-memory, recording fake Supabase client with tables addon_auth_codes, addon_sync_tokens, guilds, characters and character_guild_memberships, supporting select/eq/in/lt/order/limit/maybeSingle/single/then, insert, upsert with onConflict, and delete().eq().select().maybeSingle() and delete().lt(). Unknown tables resolve { data: [], error: null } so downstream route queries do not throw. There is an errorOn switch per table, and eslint-disable comments for any as in the existing fakes. Then lib/addon/__tests__/sync-tokens.test.ts, app/api/addon/auth/__tests__/pkce-flow.test.ts (node env, mocks as in import-string's route test plus team-routing and blp recompute for the attendance e2e, vi.useFakeTimers with toFake Date only for expiry) and app/companion/authorize/__tests__/authorize-page.test.tsx (jsdom; mock next/navigation redirect to throw a tagged error; render(await Page({ searchParams: Promise.resolve(...) }))), covering every bullet in behavior. Use UUIDs for guild ids.

Commit in two or three focused commits (for example: lib helpers plus tests; auth routes plus attendance plus e2e; picker plus CSP), each ending with the trailer. Do not push yet.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt300 && npx vitest run lib/addon app/api/addon/auth app/companion && npx tsc --noEmit && npx eslint lib/addon app/api/addon/auth app/companion app/api/addon/attendance/route.ts next.config.ts && grep -v '^[[:space:]]*//' next.config.ts | grep -c "form-action 'self' lootlistplus:" | grep -qx 1</automated>
  </verify>
  <done>The tracer path works end to end in tests: authorize GET, picker, consent POST 303 with a code, token exchange, and Bearer on /api/addon/attendance. Every PKCE, Bearer-helper and picker behaviour above passes and was observed failing first. The page shows only signed-off copy. CSP form-action allows lootlistplus:. tsc and eslint are clean. There are two or three commits, each with the trailer, not pushed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3 (expansion, per D-02): Bearer on the other three routes, sync-token reuse, rate limit, full verification, draft PR 2</name>
  <files>app/api/addon/loot-award/route.ts, app/api/addon/guild-data/route.ts, app/api/addon/export-string/route.ts, app/api/addon/sync-token/route.ts, proxy.ts, app/api/addon/__tests__/companion-bearer-routes.test.ts, app/api/addon/auth/__tests__/rate-limit.test.ts</files>
  <read_first>WT/app/api/addon/loot-award/route.ts; WT/app/api/addon/guild-data/route.ts lines 1-40; WT/app/api/addon/export-string/route.ts lines 1-40; WT/app/api/addon/loot-award/__tests__/route.test.ts (must keep passing unchanged); WT/proxy.ts (getRateLimitType and the rate-limit block)</read_first>
  <behavior>
    - companion-bearer-routes.test.ts (node env), for each of GET guild-data, GET export-string, POST loot-award and POST attendance: a Bearer token for guild A with guild_id B gives 403 A-03 and verifyOfficerPermissions is not called; a Bearer token for guild A with guild_id A and verifyOfficerPermissions resolving false gives 403 'Officer permissions required', with verifyOfficerPermissions called with (the fake client, the token's user id, A); no header and no cookie gives 401; an expired token gives 401 A-02; 'Basic abc' gives 401 A-01 and getAuthenticatedUser is not called
    - loot-award with a valid Bearer token and an officer (mock '@/lib/loot/guild-scoped-lookup' resolveGuildLootItem to return a fixed item; the fake answers insert().select().single() with { data: { id }, error: null }): the recorded loot_history insert payload's awarded-by column equals the token's user id (repudiation trail)
    - the existing app/api/addon/loot-award/__tests__/route.test.ts and import-string tests pass with no edits
    - POST /api/addon/sync-token still returns { data: { token, expires_at, guild_id } }, still upserts on guild_id,user_id, and still returns 500 'Failed to create token' on upsert error (covered in companion-bearer-routes.test.ts)
    - rate-limit.test.ts (node env, UPSTASH env stubbed empty, vi.resetModules then dynamic import of '@/proxy'): 10 POSTs to /api/addon/auth/token from one x-forwarded-for IP each carry X-RateLimit-Limit '10' and the 11th is 429; GET /api/addon/auth from a fresh IP carries '10'; /api/addon/guild-data and the lookalike /api/addon/authz each carry '60'
  </behavior>
  <action>
1. Per D-02, wire the three remaining routes exactly as attendance was wired in Task 2 (the same two-call pattern, the same variable names auth and access):
- loot-award: swap the imports and both blocks, and replace user.id with access.userId at the two later uses (awardedBy and the analytics userId).
- guild-data and export-string: minimal diff for the #290 overlap. Change ONLY the session-cookie import line, the officer-permissions import line, the 4-line auth block and the 5-line officer block. In guild-data also change the doc line " * Auth: Session cookie or sync token (future)" to " * Auth: Session cookie or Bearer sync token scoped to guild_id (GH #300)". No other line in those two files moves or changes, and there are no whitespace-only edits.
2. app/api/addon/sync-token/route.ts POST: replace the inline token generation, expiry and upsert with issueSyncToken(supabase, { userId: user.id, guildId: guild_id, expiresDays: expires_days || SYNC_TOKEN_DEFAULT_DAYS }). Map !ok to the existing console.error('Failed to create sync token:', result.error) and 500 { error: 'Failed to create token' }. The success response shape is unchanged. Drop the now-unused crypto import. Leave DELETE untouched.
3. proxy.ts getRateLimitType (OD-05): in the 'auth' branch, also return 'auth' when pathname === '/api/addon/auth' or pathname starts with '/api/addon/auth/'. Add a one-line comment citing GH #300 (the PKCE authorize, consent and token endpoints). Nothing else in proxy.ts changes, and nothing new is exported from it.
4. Tests: app/api/addon/__tests__/companion-bearer-routes.test.ts reuses lib/addon/__tests__/fake-addon-db.ts and issueSyncToken to mint real tokens into the fake. Mock the same modules as the existing addon route tests (plus team-routing, blp recompute, discord announcements, funnel, and next/server after). Then app/api/addon/auth/__tests__/rate-limit.test.ts. Cover every behavior bullet.
5. Full verification in WT: npx vitest run (full suite; failures must match the Task 2 baseline set exactly, and the SUMMARY lists any), npx tsc --noEmit, and npx eslint on every .ts/.tsx file changed since fix/300-companion-auth-table.
6. Commit (for example: route wiring; sync-token reuse plus rate limit plus tests), each with the trailer. git -C WT push -u origin fix/300-companion-auth.
7. Conflict preview (N-02). If git -C REPO ls-remote --heads origin fix/290-export-faction-aliases prints a ref, run git -C WT fetch origin fix/290-export-faction-aliases, then git -C WT merge-tree --write-tree --name-only HEAD FETCH_HEAD, and record which files conflict (expected: the import blocks of guild-data and export-string). Do not resolve or push anything for #290.
8. Write SCR/pr300-body.md. Sections: Summary (the flow from Login to sync, D-01 and D-02); Security (PKCE S256 only, exact redirect_uri allowlist, 60-second single-use hashed codes, guild-scoped tokens rejected on other guilds before any read, officer checks kept on every request and at exchange, same-origin consent POST, Cache-Control no-store, auth-bucket rate limit, CSP form-action change OD-01 with its reason); Routes changed; Tests (list the PKCE and Bearer cases by name, the wiring and rate-limit tests, the PGlite proof in PR 1); Merge order (stacked on PR 1 by number; retarget to main after it merges and deploys; N-01); Conflict with #290 (the merge-tree result from step 7, or "branch not found" if absent); Manual test for the user after deploy (dev-build the companion, click Login, sign in with Discord, pick a guild, confirm guild-data sync and one loot award land); Out of scope (N-03); the copy IDs C-01 to C-09 and A-01 to A-04 as signed off; and the line "Fixes #300". No em dash (U+2014). The last line is exactly: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
9. gh pr create --draft --base fix/300-companion-auth-table --head fix/300-companion-auth --title "fix: companion app login with PKCE and guild-scoped sync tokens (#300)" --body-file SCR/pr300-body.md.
10. Write REPO/.planning/workstreams/default/quick/260928-iom-fix-gh-300-companion-app-oauth-pkce-logi/260928-iom-SUMMARY.md (planning docs only; do not commit code in REPO). Include both PR numbers, the baselines, the mutants, the PGlite output, the merge-tree result and the copy as shipped.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt300 && npx vitest run && npx tsc --noEmit && npx eslint $(git diff --name-only origin/fix/300-companion-auth-table...HEAD -- '*.ts' '*.tsx') && test "$(git diff --name-only origin/fix/300-companion-auth-table...HEAD | wc -l | tr -d ' ')" = "19" && test -z "$(git diff --name-only origin/fix/300-companion-auth-table...HEAD -- supabase companion addon package.json package-lock.json app/api/addon/import-string app/api/addon/guild-data/__tests__ app/api/addon/export-string/__tests__)" && test "$(git diff origin/fix/300-companion-auth-table...HEAD -- app/api/addon/guild-data/route.ts | grep -c '^[-+][^-+]')" -le 20 && test "$(git diff origin/fix/300-companion-auth-table...HEAD -- app/api/addon/export-string/route.ts | grep -c '^[-+][^-+]')" -le 18 && test "$(git log origin/fix/300-companion-auth-table..HEAD --format=%H | wc -l | tr -d ' ')" = "$(git log origin/fix/300-companion-auth-table..HEAD --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" && gh pr view fix/300-companion-auth --json isDraft,baseRefName,title,body --jq '[.isDraft, (.baseRefName == "fix/300-companion-auth-table"), (.body | contains("Fixes #300")), ((.title + .body) | contains("—") | not), (.body | rtrimstr("\n") | endswith("🤖 Generated with [Claude Code](https://claude.com/claude-code)"))] | all' | grep -qx true</automated>
    <human-check>After both PRs merge and deploy (user-run, not the executor): in a dev build of the companion, click Login, sign in with Discord in the popup, pick a guild on the "Choose a guild to sync" page, and confirm the companion shows the guild name, a sync completes, and one addon loot award appears in that guild's loot history. Then call /api/addon/guild-data with the same token and another guild's id, and confirm a 403.</human-check>
  </verify>
  <done>All four addon routes use authenticateAddonRequest plus authorizeAddonGuild, and the wiring tests prove the guild scope and officer check on each. guild-data and export-string diffs are limited to the import lines, the two auth blocks and the one doc line. POST /api/addon/sync-token issues through issueSyncToken with unchanged responses. The auth endpoints are in the Upstash 'auth' bucket. The full suite (against the baseline), tsc and eslint pass. There are exactly 19 files changed against the table branch. The branch is pushed, and a DRAFT PR 2 against fix/300-companion-auth-table contains "Fixes #300", the merge-tree result and the signed-off copy, with no em dash and the Claude Code last line. The SUMMARY is written. Nothing is merged, --admin is not used, main is untouched and no real database was queried.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| companion window (Electron Chromium) to /api/addon/auth | Untrusted query params (redirect_uri, challenge, method) and the consent form (guild_id) |
| OS custom-scheme dispatch (lootlistplus://) | Any local app registered for the scheme may receive the code |
| companion to /api/addon/auth/token | Untrusted code, code_verifier and redirect_uri from any network client |
| companion to the four addon routes | Untrusted Bearer token and guild_id |
| server to Supabase (service role) | Bypasses RLS; the app code is the only guard |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-300-01 | Spoofing | lootlistplus:// code interception by another local app | high | mitigate | PKCE S256 only (parseAuthorizeParams, consumeAuthCode with timingSafeEqual); codes single-use via DELETE ... RETURNING, 60-second TTL, stored as sha256 only |
| T-300-02 | Elevation of privilege | a token for guild A used on guild B in the four routes | critical | mitigate | authorizeAddonGuild returns 403 before any read when principal.guildId differs (D-02); wiring tests on every route |
| T-300-03 | Tampering | open redirect through redirect_uri | high | mitigate | exact-string allowlist in parseAuthorizeParams, DB CHECK in the migration, 400 without redirect for bad values, drift test against the companion literal |
| T-300-04 | Tampering (CSRF) | POST /api/addon/auth consent | medium | mitigate | isSameOriginRequest Origin check (OD-06), SameSite=Lax cookies, CSP form-action, explicit guild pick (GET never issues a code) |
| T-300-05 | Information disclosure | codes and tokens at rest and in transit logs | high | mitigate | sha256 storage for both; no raw values in logs; Cache-Control no-store on the token and consent responses; addon_auth_codes RLS on with no policies plus REVOKE from anon and authenticated |
| T-300-06 | Denial of service / brute force | token and authorize endpoints | medium | mitigate | proxy.ts 'auth' bucket, 10 per minute per IP on Upstash (fail-closed in production as today); 256-bit codes; a failed exchange burns the code (OD-03) |
| T-300-07 | Elevation of privilege | demoted officer keeps a valid token | medium | mitigate | verifyOfficerPermissions re-run at exchange and on every Bearer request (OD-04) |
| T-300-08 | Tampering (downgrade) | plain PKCE method | high | mitigate | method must be exactly 'S256' at GET and POST; a missing method is rejected; the challenge shape is locked in code and DB |
| T-300-09 | Tampering | next param on the sign-in redirect | medium | mitigate | reuse buildSignInPath/isSafeNextPath/resolvePostAuthRedirect; the test asserts the round trip and the absence of 'code=' |
| T-300-10 | Repudiation | awards and attendance made with a token | low | mitigate | loot-award records awarded_by = access.userId (the token's user); the test asserts it |
| T-300-11 | Tampering | CodeQL tainted format strings in new logging | low | mitigate | constant first argument to every console.* call |
| T-300-12 | Tampering | CSP form-action relaxed to lootlistplus: | low | accept | the scheme source only lets forms target the companion's own scheme; no network destination is added (OD-01, user OK requested) |
| T-300-SC | Tampering | npm/pip/cargo installs | low | mitigate | no installs: PGlite reused by symlink from the existing scratchpad (@electric-sql/pglite 0.5.x from quick task 260928-fr8); Task 3's gate asserts package.json and package-lock.json are unchanged |
</threat_model>

<verification>
- WT_TABLE: migration shape test, full vitest (against the baseline), tsc, eslint, PGlite S1-S10 PASS, exactly 2 files changed, draft PR 1 against main with no closing keyword.
- WT: the PKCE, Bearer, picker, wiring and rate-limit tests; full vitest (against the baseline), tsc, eslint on the changed files; exactly 19 files against the table branch; the guild-data and export-string diffs bounded; draft PR 2 against the table branch with "Fixes #300".
- Both PR bodies: no U+2014, the Claude Code last line; commit trailers on every commit.
- Executor limits honoured: no merge, no --admin, no push to main, no SQL against a real database, no dependency changes, SCR/wt290 untouched.
</verification>

<success_criteria>
- D-01: public.addon_auth_codes exists in its own draft PR with RLS on, service-role only, exact redirect CHECK, 60-second default expiry and hashed codes, and the code deletes each code on exchange.
- D-02: the picker lists only officer guilds, the issued token works only for the chosen guild, and all four addon routes reject any other guild_id with 403 while keeping the officer checks.
- The companion's unchanged auth.ts contract is met: 303 to lootlistplus://auth/callback?code=..., and POST /api/addon/auth/token returns {token, guild_id, guild_name, expires_at}.
- The user-listed PKCE and Bearer test cases all exist by name and pass.
- The picker shows only the signed-off COPY, with no em dashes.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260928-iom-fix-gh-300-companion-app-oauth-pkce-logi/260928-iom-SUMMARY.md when done.
</output>
