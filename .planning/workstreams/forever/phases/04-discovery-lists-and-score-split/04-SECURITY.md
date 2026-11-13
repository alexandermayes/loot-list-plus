---
phase: 04
slug: discovery-lists-and-score-split
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-11-12
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: authored at plan time (all 21 PLAN files carry a `<threat_model>` block; the 76 rows below are the plans' rows verbatim). Verification depth: ASVS L1 (grep and test evidence against the merged implementation at origin/main f73eea33, phase diff measured from the PR #506 merge 50a01eea). Block threshold: high. Verified by the gsd-security-auditor on 2026-11-12 after the Phase 4 UAT passed (04-UAT.md, 10 of 10); no implementation file was changed by the audit and every SUMMARY "Threat Flags" section names only registered ids.

Totals: 76 threats (16 high, 33 medium, 27 low); 65 mitigate, 11 accept, 0 transfer. 76 closed (65 mitigations verified in code, 11 accepted risks recorded below). threats_open: 0 at or above high; 0 open below the threshold. The audit left one medium open below the threshold (T-04-07-03); quick task 261112-u5j closed it on 2026-11-12 (its evidence bullet and the audit trail below).


---

## Trust Boundaries

| Boundary | Description | Data Crossing | Plans |
|----------|-------------|---------------|-------|
| Browser session to PostgREST (raid_tiers, expansions DELETE) | Officers hold DELETE policies on raid_tiers and expansions; every link to need rows cascades | see description | 04-01 |
| Browser session to save_submission_items | After the hold is dropped a raider can save need rows into a draft | see description | 04-01 |
| Migration deploy to production | Applies about 12 seconds after the merge with no CI on the SQL | see description | 04-01 |
| GitHub main to production database | A merge touching supabase/migrations deploys through the Management API with the repo's access token | see description | 04-02 |
| Supabase CLI to the working tree | gen:types reads the live schema with the owner's CLI session | see description | 04-02 |
| Request body or saved rows to the pure checks | need keys, ranks and slots reach these functions from client-written rows | see description | 04-03 |
| Character class and spec names (client context) to defaultNeedsFor | names come from the character row the raider can edit | see description | 04-04 |
| Guild settings (decimal places, attendance maximum) to the sentence builder | values come from the guild's settings row | see description | 04-05 |
| Stored settings row to the compare helpers | values arrive as PostgREST JSON (numeric columns as strings) | see description | 04-06 |
| Browser to /api/master-sheet/visibility | item ids in the POST body | see description | 04-07 |
| Officer browser to POST /api/prio-list | item_id chosen by the caller | see description | 04-07 |
| Unauthenticated request to proxy.ts | path and query are attacker-controlled | see description | 04-07 |
| Raider browser or any API caller to POST /api/loot-submissions/submit | saved rows were written by the client through save_submission_items | see description | 04-08 |
| Character row (class, spec) to eligibility | the raider can edit their own spec | see description | 04-08 |
| Raider browser to GET bootstrap and GET loot-items | expansion_id, phase and character_id come from the query string | see description | 04-09 |
| Client UI only | the flow makes no request; the server repeats every rule at submit (04-08) | see description | 04-10 |
| Raider browser to save_submission_items and POST /api/loot-submissions/submit | the picker builds the rankings client-side | see description | 04-11 |
| Visibility API data to officer UI | rankings and components come from the server; the UI only renders | see description | 04-12 |
| URL query (guild, picker) to the client entry | anyone can craft the link | see description | 04-13 |
| Client rendering only | no new request or data | see description | 04-14 |
| Officer browser to PUT /api/guild-settings | settings body | see description | 04-15 |
| Signed-in user to POST /api/guilds | creation body | see description | 04-15 |
| Addon token holder to guild-data and export-string | payload consumers outside the web app | see description | 04-15 |
| Officer browser to the settings PUT and the creation POST | values validated server-side (04-15) | see description | 04-16 |
| Officer browser to PATCH /api/raid-tiers | list_mode change request | see description | 04-17 |
| Officer browser to POST /api/discord/set-your-five | guild_id from the body | see description | 04-18 |
| App server to Discord REST | bot token in DISCORD_BOT_TOKEN | see description | 04-18 |
| Public Discord channel | the link is visible to anyone in the channel | see description | 04-18 |
| Repository to public surfaces | merged copy reaches the site, the changelog and Discord automatically | see description | 04-19 |
| Submit route response to the picker | the 422 body (code, error, ineligible) is rendered in the raider's browser | see description | 04-20 |
| Raider browser to the audited reopen route | an approved list is reopened when the raider saves a change | see description | 04-20 |
| Officer browser to the review modal read | reads loot_submission_items under RLS | see description | 04-21 |
| Raider browser to the Overview loot priority read | reads the raider's own ranked rows under RLS; no new query | see description | 04-21 |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01-01 | Tampering | officer DELETE on a ranked Discovery tier or its expansion | high | mitigate | WHEN-gated SECURITY DEFINER guard enforce_raid_tier_need_delete_lock refuses anon and authenticated deletes when any need ranking or award exists; proven in need-lists-pglite.test.ts with positive controls | closed |
| T-04-01-02 | Elevation of privilege | guard function callable from the browser | medium | mitigate | REVOKE ALL from PUBLIC, anon, authenticated; search_path pinned; asserted with has_function_privilege | closed |
| T-04-01-03 | Tampering | arbitrary loot_style value | low | mitigate | guild_settings_loot_style_check limits it to null and the three ids; the routes also validate (04-15) | closed |
| T-04-01-04 | Tampering | need list ranked without a budget after the hold drops | medium | accept | D-08 amended accepts the draft-only window: between this deploy and 04-08 a raider can only save a draft holding need rows through save_submission_items, because the submit route keeps refusing need rows until 04-08 ships with the budget and eligibility checks; a draft never reaches pending, approval, the master sheet or BLP; the owner records the acceptance at the 04-02 stop (Task 2) | closed |
| T-04-01-05 | Denial of service | migration lock during a raid | medium | mitigate | lock_timeout 5s, small tables, owner picks a non-raid merge day in 04-02 | closed |
| T-04-01-06 | Tampering | delete_guild blocked for a Forever guild master | medium | mitigate | predicate guard (no depth rule) passes because delete_guild clears lists and history first; the creator case is proven | closed |
| T-04-02-01 | Denial of service | migration deploy during a raid | medium | mitigate | Blocking owner checkpoint chooses the day; lock_timeout 5s in the file (04-01) | closed |
| T-04-02-02 | Tampering | PR 1 carrying non-migration code past the --admin merge | high | mitigate | Task 1 acceptance requires exactly the five files of 04-01; CI runs the PGlite and contract tests before the merge | closed |
| T-04-02-03 | Tampering | gen:types truncating or drifting lib/database.types.ts | medium | mitigate | Non-empty check, unrelated-diff check with hand-edit fallback, typecheck gate, single-file commit | closed |
| T-04-02-04 | Information disclosure | token or DB URL pasted from logs into the SUMMARY or PR | medium | mitigate | Only run id, sha, conclusion and the apply line are recorded; prohibition in must_haves | closed |
| T-04-02-05 | Elevation of privilege | dependent code merging before the deploy | high | mitigate | Every dependent plan lists 04-02 in depends_on; shipping notes forbid opening PR 3 or PR 4 before the recorded deploy | closed |
| T-04-02-06 | Tampering | spec defaults shipped without the owner's review (D-09) | medium | mitigate | Review at the Task 2 stop; PR 2 waits for the recorded 'D-09 spec defaults confirmed' line | closed |
| T-04-03-01 | Tampering | budget undercount by stacking keys at one rank | high | mitigate | needBudgetUsed counts distinct (rank, need_key) picks, tested with five keys at rank 50 | closed |
| T-04-03-02 | Tampering | prototype keys in need or class lookups | low | mitigate | findNeedDefinition (Map) and frozen Sets or Maps for class tables; '__proto__' case tested | closed |
| T-04-03-03 | Tampering | slot drift breaking award locks | medium | mitigate | assignTierSlots ignores is_guild_active and input order, ties by id; tested | closed |
| T-04-03-04 | Information disclosure | none (pure modules hold no data) | low | accept | No I/O, no names, no ids beyond the caller's input | closed |
| T-04-04-01 | Tampering | prototype key as class or spec name | low | mitigate | Map lookup keyed by a joined string; '__proto__' case tested | closed |
| T-04-04-02 | Tampering | a default the server would refuse | medium | mitigate | gate test runs eligibleNeedsFor and the budget on every list; the server repeats both checks (04-08) | closed |
| T-04-04-03 | Repudiation | defaults changed without owner review | low | mitigate | D-09 review recorded at the 04-02 stop; later edits are PRs | closed |
| T-04-05-01 | Tampering | silent change to Known guild scores | high | mitigate | Total expression untouched; golden and engine-contract suites under CI=true; Lua exporter cmp against a capture taken in the same worktree | closed |
| T-04-05-02 | Repudiation | award receipt shape drift | medium | mitigate | ScoreComponents unchanged; bulk award route not touched (diff check) | closed |
| T-04-05-03 | Information disclosure | sentences naming players | low | accept | Sentences hold numbers and fixed words only; names are rendered by the surfaces as before | closed |
| T-04-06-01 | Tampering | unknown or prototype preset id | low | mitigate | isLootStyleId checks the tuple; lookups only after the guard; '__proto__' tested | closed |
| T-04-06-02 | Tampering | preset flipping unrelated rules | medium | mitigate | knob maps limited to the 20 scoring keys; test asserts the exact key set and that other keys survive applyLootStyle | closed |
| T-04-06-03 | Information disclosure | none | low | accept | No I/O and no personal data | closed |
| T-04-07-01 | Denial of service | over-long PostgREST URLs from 435 need ids | medium | mitigate | 100-id chunks on both reads and on the need BLP GET | closed |
| T-04-07-02 | Repudiation | failed read shown as an empty master sheet | medium | mitigate | selectAllPagesOrThrow and the route catch answer 500; tested | closed |
| T-04-07-03 | Tampering | officer prio on a need row | medium | mitigate | POST refuses need rows with 400 before any write; GET drops them | closed |
| T-04-07-04 | Spoofing | open redirect through next with a query | medium | mitigate | isSafeNextPath unchanged and still parses against a placeholder origin; test covers the query form | closed |
| T-04-08-01 | Tampering | over-budget list through a direct API call | high | mitigate | checkNeedList budget refusal (422) before any write, distinct (rank, need_key) counting; tested with stacked keys | closed |
| T-04-08-02 | Tampering | ineligible need ranked to farm BLP | medium | mitigate | eligibility refusal (422) from the server-read class and spec; drafts cannot reach approval without submit | closed |
| T-04-08-03 | Elevation of privilege | submitting another raider's list | high | mitigate | existing ownership check (403) and active membership check run first and are unchanged | closed |
| T-04-08-04 | Tampering | window where needs rank without a budget | high | mitigate | D-08: hold removal and budget check ship in one commit, after the 04-02 deploy (precondition); this commit closes the draft-only window D-08 amended accepts between the deploy and PR 3, so from here every submitted need list passes the budget and eligibility checks | closed |
| T-04-08-05 | Tampering | spec changed after saving to dodge eligibility | low | accept | the check runs at every submit against the current spec; a changed spec makes the list refused until the raider edits it | closed |
| T-04-09-01 | Information disclosure | tier ids and slots of another guild's expansion | low | mitigate | both routes keep their existing character ownership check before any read; need rows are the same seeded taxonomy for every guild | closed |
| T-04-09-02 | Tampering | needs shown in the Known editor | medium | mitigate | includeNeeds only for an all-Discovery active group; mixed and Known groups tested | closed |
| T-04-09-03 | Repudiation | failed scope read shown as a Known editor | low | mitigate | resolveNeedListScope throws and the routes answer 500 | closed |
| T-04-10-01 | Tampering | client-side budget or eligibility bypass | low | accept | UI rules are convenience only; the submit route refuses over-budget and ineligible lists (04-08) | closed |
| T-04-10-02 | Denial of service | Modal placement change breaking existing dialogs | medium | mitigate | default 'center' path unchanged and asserted in modal.test.tsx | closed |
| T-04-10-03 | Information disclosure | none | low | accept | the flow renders taxonomy words only | closed |
| T-04-11-01 | Tampering | client builds an over-budget or ineligible list | low | accept | UI rules mirror the server; the submit route refuses (04-08) and drafts cannot be approved | closed |
| T-04-11-02 | Elevation of privilege | saving another character's list | high | mitigate | save_submission_items authorises owner or officer and submit checks ownership; the picker only uses the active character from GuildContext | closed |
| T-04-11-03 | Denial of service | Known editor regression | medium | mitigate | the switch keys on need_tier_slots only; LootListContent-mode test proves the editor renders unchanged for null; saveSubmission without options keeps today's behaviour, tested | closed |
| T-04-12-01 | Repudiation | award receipt changed by the UI edit | medium | mitigate | award body asserted unchanged in ItemCandidateModal.test.tsx | closed |
| T-04-12-02 | Information disclosure | none new | low | accept | the surfaces show the same officer-only data as before, split into two numbers | closed |
| T-04-13-01 | Elevation of privilege | guild parameter used to view another guild | medium | mitigate | the entry only switches among the user's own memberships; switchGuild refuses others; data routes re-verify membership | closed |
| T-04-13-02 | Tampering | malformed guild value | low | mitigate | parseSetYourFiveParams UUID check; invalid values ignored | closed |
| T-04-14-01 | Information disclosure | none new | low | accept | the comparison modal already shows both scores to the raider; only the layout changes | closed |
| T-04-14-02 | Spoofing | a need label linking out | low | mitigate | NeedLabel never renders an anchor or a Wowhead attribute; test asserts it | closed |
| T-04-15-01 | Tampering | arbitrary loot_style | low | mitigate | isLootStyleId in both routes plus the database check | closed |
| T-04-15-02 | Elevation of privilege | non-officer writing settings | high | mitigate | existing verifyPermission manage_settings in the PUT is unchanged | closed |
| T-04-15-03 | Repudiation | false activation milestone at creation | medium | mitigate | preset rides on the creation insert; tests assert no settings PUT and no lootSettingsUpdated | closed |
| T-04-15-04 | Tampering | addon payload drift for Known guilds | medium | mitigate | loot_style removed before serialisation; payload key tests | closed |
| T-04-16-01 | Tampering | silent overwrite of customised knobs | medium | mitigate | confirm with the presetDiff count before applying over Custom or Customised; tested | closed |
| T-04-16-02 | Tampering | loot_style dropped by autosave | low | mitigate | loot_style in state and safeSettings; tested on the PUT body | closed |
| T-04-16-03 | Repudiation | creation marking the activation milestone | medium | mitigate | no settings PUT from the creation modal; tested | closed |
| T-04-17-01 | Elevation of privilege | non-officer switching a tier | high | mitigate | the route's verifyPermission manage_settings and tier-to-guild check are unchanged; the UI hides the control from non-managers | closed |
| T-04-17-02 | Tampering | legacy tier switched to Discovery or a ranked tier switched back | medium | mitigate | the route's D-17 and D-03 guards and the database triggers refuse; the UI shows the reason | closed |
| T-04-17-03 | Repudiation | mode changes without a trail | low | mitigate | the route already writes an audit row per change | closed |
| T-04-18-01 | Elevation of privilege | non-officer triggers a guild-wide DM | high | mitigate | verifyPermission manage_settings before any read or send; tested | closed |
| T-04-18-02 | Denial of service | DM spam or repeated sends | high | mitigate | 60-minute server cooldown from audit_logs, confirm modal, 60-second client disable, Discovery gate; tested | closed |
| T-04-18-03 | Information disclosure | Discord ids or names in logs or responses | high | mitigate | counts-only response; fixed-format error log with stage and status; tests assert no id in console or body | closed |
| T-04-18-04 | Spoofing | link carries identity or a token | medium | mitigate | link holds only guild and picker; the page re-checks membership and every route re-verifies (04-13) | closed |
| T-04-18-05 | Denial of service | function timeout mid-send | medium | mitigate | maxDuration 60, concurrency 5, 45-second start budget, untouched recipients counted as skipped | closed |
| T-04-18-06 | Tampering | mention injection | low | mitigate | allowed_mentions parse empty; no user text in the message | closed |
| T-04-18-07 | Repudiation | sends without an audit trail | low | mitigate | audit row per send (counts only) | closed |
| T-04-19-01 | Repudiation | unsigned copy shipped | medium | mitigate | blocking owner checkpoint; the record line gates merges | closed |
| T-04-19-02 | Information disclosure | names or ids in the SUMMARY or changelog | medium | mitigate | counts only; prohibition in must_haves | closed |
| T-04-19-03 | Tampering | a new unlisted reader slipping past review | medium | mitigate | the inventory scan fails CI on any unlisted reader; swept here | closed |
| T-04-19-04 | Tampering | Known guild regression | high | mitigate | golden, Lua cmp against origin/main, editor mode test and addon payload tests in Task 1 | closed |
| T-04-20-01 | Tampering | approved list silently demoted | medium | mitigate | the confirm only unlocks rows; the audited reopen runs at save inside saveSubmission and is logged; a test asserts confirming makes no server call | closed |
| T-04-20-02 | Elevation of privilege | reopening or saving another character's list | high | mitigate | the reopen route and save_submission_items authorise owner or officer and submit checks ownership; the picker acts only on the active character's submission from the context | closed |
| T-04-20-03 | Information disclosure | raw server error details shown to the raider | low | mitigate | the picker renders only the fixed sentences for the two known codes and a fixed failure sentence for anything else; details are read for ineligible keys only, never dumped | closed |
| T-04-20-04 | Repudiation | a list change taking effect without an officer | low | mitigate | every save submits to pending (D-27); the reopen route writes its audit row | closed |
| T-04-21-01 | Information disclosure | review modal tier names | low | accept | officers already see every tier of their guild (moved from 04-13) | closed |
| T-04-21-02 | Tampering | a grouped line hiding a ranked row from officer review | low | mitigate | toNeedLines groups need rows only by rank and need key and carries every row of the group; a test asserts the 15-row list keeps all 15 rows across five lines and item rows pass through unchanged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Verification Evidence

Repo-relative paths and line numbers at origin/main f73eea33, as recorded by the auditor on 2026-11-12.


**T-04-**

- T-04-01-01: supabase/migrations/20261111120000_need_lists.sql:140-180 (enforce_raid_tier_need_delete_lock, BEFORE DELETE, WHEN on Discovery; refuses anon and authenticated when a need ranking or award exists). PGlite proofs app/services/__tests__/need-lists-pglite.test.ts:363-445 with positive controls.
- T-04-01-02: Migration :141-142 (SECURITY DEFINER, search_path pinned) and :176 (REVOKE from PUBLIC, anon, authenticated); has_function_privilege asserted in the PGlite test :341-358.
- T-04-01-03: Migration :134-136 (guild_settings_loot_style_check); isLootStyleId in app/api/guild-settings/route.ts:358-360 and app/api/guilds/route.ts:91-93.
- T-04-01-04: Accepted risk: PLAN row plus the owner's acceptance in the 04-02 SUMMARY (draft-only window, 2026-11-11). Commit 94642635 closed the window (see T-04-08-04).
- T-04-01-05: Migration :114 (SET LOCAL lock_timeout = '5s'); the 04-02 SUMMARY records the non-raid-day merge.
- T-04-01-06: Guard is a plain predicate with no depth rule (migration :149-163); PGlite :447 proves the guild creator can still run delete_guild with ranked and awarded needs.
- T-04-02-01: lock_timeout as T-04-01-05; owner checkpoint and non-raid-day merge recorded in the 04-02 SUMMARY.
- T-04-02-02: git diff 50a01eea^1 50a01eea shows exactly the five 04-01 files; .github/workflows/ci.yml:4,48 runs npm run test on pull requests and vitest.config.ts excludes nothing.
- T-04-02-03: Commit 900fdc9a touches only lib/database.types.ts (:919, :991, :1063); the SUMMARY records that drifted gen:types output was discarded.
- T-04-02-04: Phase directory scanned for tokens and connection strings (sbp_, postgres://, JWTs, token assignments): no hits; the deploy record holds only run id, sha, conclusion and the apply line.
- T-04-02-05: First-parent history shows #506 (migration) merged before #507, #508 and #509; 04-08, 04-09 and 04-15 depend on 04-02 and 04-11, 04-13, 04-16 and 04-20 inherit it. 04-17, 04-18 and 04-21 shipped in #509 after the deploy.
- T-04-02-06: 'D-09 spec defaults confirmed 2026-11-11' recorded in the 04-02 SUMMARY.
- T-04-03-01: domain/loot/need-budget.ts:35-52 (distinctPickCosts keyed by rank|need_key); domain/loot/__tests__/need-budget.test.ts:61-64.
- T-04-03-02: domain/loot/needs.ts:222-246 (Map lookup); domain/loot/need-eligibility.ts:50-81 (frozen Set and Map) and :161 (Object.hasOwn); __proto__ tests in the need-eligibility, need-budget and need-picks test files.
- T-04-03-03: domain/loot/need-picks.ts:60-79 (sort by sort_order then id, ignores is_guild_active); need-picks.test.ts:88,93,100.
- T-04-03-04: Accepted risk: the modules import only domain code, no I/O.
- T-04-04-01: domain/loot/need-defaults.ts:243-257 (DEFAULT_BY_PAIR Map); __proto__ tests need-defaults.test.ts:123,180.
- T-04-04-02: need-defaults.test.ts:69-77 checks every list against the budget and eligibleNeedsFor; the submit route repeats both checks at :285-307.
- T-04-04-03: D-09 confirmation recorded in the 04-02 SUMMARY.
- T-04-05-01: domain/scoring/engine.ts phase diff only adds toScoreResult; the total expression is unchanged. Golden and engine-contract tests unchanged across the phase; Lua cmp recorded in the 04-05 and 04-19 SUMMARYs.
- T-04-05-02: ScoreComponents unchanged in domain/types.ts (only ScoreResult and ScoreExplanation gained fields); app/api/loot-history/bulk/ has no diff across the phase.
- T-04-05-03: Accepted risk: domain/scoring/explain.ts:45-104 builds sentences from fixed labels and numbers only.
- T-04-06-01: domain/guild/loot-style-presets.ts:23-24 (includes on the id tuple) and :250 (guard in lootStyleStatus); tests :55-56,252.
- T-04-06-02: LOOT_STYLE_KNOB_KEYS at loot-style-presets.ts:32; tests :61 (exactly 20 keys) and :149-153 (unrelated keys survive).
- T-04-06-03: Accepted risk: no I/O and no personal data.
- T-04-07-01: app/api/master-sheet/visibility/route.ts:26-32,63,308 (chunks of IN_FILTER_CHUNK_SIZE = 100 from utils/supabase/paginate.ts:11); MasterSheetContent.tsx:56,847-857 (BLP_NEED_ID_CHUNK = 100); route.test.ts:851-900.
- T-04-07-02: selectAllPagesOrThrow at visibility/route.ts:64,309; the catch answers 500 at :412-414; test :851.
- T-04-07-03: closed 2026-11-12 by quick task 261112-u5j (branch fix/t-04-07-03-need-row-priority, aac3a3af, on top of f73eea33). app/api/prio-list/bulk/route.ts:55-75 reads id and kind from loot_items for the batch's distinct item ids in chunks of IN_FILTER_CHUNK_SIZE, after the manage_loot check at :45-51 and before the upsert at :95; a failed read answers 500 at :70 and a need row answers 400 with NEED_ROW_FIXED_ERROR at :73, matching POST /api/prio-list (route.ts:192-206). app/api/addon/export-string/route.ts:234 selects loot_items (kind) on the guild_item_priorities read and :241-242 drop need-row priorities after the read and count them in the D-16 need-skip scope; app/api/addon/guild-data/route.ts:168 and :270-273,282 do the same. Tests: app/api/prio-list/bulk/__tests__/route.test.ts:118-191 (403 before any read, 400 with no upsert, 500 with no upsert, catalog-only batch upserted, chunked and de-duplicated reads, a need row in a later chunk); export-string route.test.ts:808 and guild-data route.test.ts:658 (N6: the need-row priority is left out, the read embeds kind, one warning). The route is kept rather than removed: nothing in the app, discord-bot/, companion/ or the addon repo calls it (grep for prio-list/bulk finds only its own trackApiError string), and the refusal costs one read. No database guard was added: the two prio-list routes are the app's only writers of priority rows (the delete_guild function only removes them, and lib/db.ts only types the row). The addon web fixtures (loot-list-plus-addon/tests/tools/gen_web_fixtures.mts, run against the branch) are byte-identical apart from generatedFrom: the generator reads domain/scoring and lib/addon/member-ranked-items only.
- T-04-07-04: proxy.ts:318-321 carries the query in next; lib/post-auth-redirect.ts:29-56 (isSafeNextPath parses against a placeholder origin) unchanged in the phase; lib/__tests__/proxy-next.test.ts:51-57.
- T-04-08-01: app/api/loot-submissions/submit/route.ts:283-301 refuses an over-budget list with 422 before the writes at :359,368; cost and key come from the server-side loot_items join (:124); route.test.ts:480,494. enforce_loot_submission_item_rules (migration 20260930000000) blocks non-officer browser writes to pending or approved lists; the review route approves only pending lists (:224).
- T-04-08-02: Class and spec read server-side (submit/route.ts:100); ineligible needs get 422 (:302-307); test :512.
- T-04-08-03: Ownership 403 at submit/route.ts:98-105 and active membership 403 at :108-114, both before any item read or write; tests :248,286.
- T-04-08-04: Commit 94642635 deletes need-ranking-hold.ts and adds checkNeedList to submit in the same commit; reached main through #509 after #506.
- T-04-08-05: Accepted risk: the current spec is read on every submit (submit/route.ts:100).
- T-04-09-01: Ownership 403 runs before resolveNeedListScope in app/api/loot-list/bootstrap/route.ts:71-76 (scope at :171) and app/api/loot-items/route.ts:51-59 (scope at :110).
- T-04-09-02: lib/loot/need-list-scope.ts:55-57; Known and mixed groups tested in need-list-scope.test.ts:60,66 and the bootstrap test :183,218.
- T-04-09-03: need-list-scope.ts:50 throws and both routes' catches answer 500; tests bootstrap :248, loot-items :209.
- T-04-10-01: Accepted risk: the server repeats every rule (see 04-08); confirmed in the SUMMARY threat flags.
- T-04-10-02: components/ui/modal.tsx:250-267 (placement defaults to center); modal.test.tsx:352-368 pins the class strings.
- T-04-10-03: Accepted risk: the flow shows taxonomy words only.
- T-04-11-01: Accepted risk: the submit route refuses these lists (see 04-08).
- T-04-11-02: NeedPicker.tsx:215-239 uses only activeCharacter from GuildContext; save_submission_items checks owner or officer (migration 20261028120000); submit checks ownership at :104.
- T-04-11-03: LootListContent.tsx:863 (pickerMode = Boolean(needTierSlots)); LootListContent-mode.test.tsx:102 and LootListContext-save.test.tsx:198.
- T-04-12-01: ItemCandidateModal.test.tsx:423-460 (test D5 asserts the nine component keys and the winner components on the request body).
- T-04-12-02: Accepted risk: the same officer-only data as before; confirmed in the SUMMARY threat flags.
- T-04-13-01: SetYourFiveLinkEntry.tsx:42-51 checks membership against userGuilds; GuildContext.tsx:596 (switchGuild only switches to a guild in userGuilds); the data routes recheck ownership.
- T-04-13-02: domain/loot/set-your-five.ts:70,78-84 (UUID pattern check; an invalid value becomes null).
- T-04-14-01: Accepted risk: layout-only change.
- T-04-14-02: NeedLabel.test.tsx:6-13,60: no [href], no data-wowhead and no anchor.
- T-04-15-01: guild-settings/route.ts:358-360, guilds/route.ts:91-93, plus the database check (T-04-01-03).
- T-04-15-02: guild-settings/route.ts:319-321 (verifyPermission manage_settings) runs before the write.
- T-04-15-03: guilds/route.ts:224-240 (the preset rides on the creation insert); guilds/__tests__/route.test.ts:472 and CreateGuildModal-loot-style.test.tsx:166-183.
- T-04-15-04: lib/addon/without-loot-style.ts:12-16, used at guild-data/route.ts:108 and export-string/route.ts:90; guild-data route.test.ts:1047-1083. Note: removes one named column; an allow-list is the stronger design and a follow-up.
- T-04-16-01: app/components/LootStylePicker.tsx:65-81 (confirm gated on the presetDiff count over Custom or Customised); LootStylePicker.test.tsx:48,95,121.
- T-04-16-02: LootSettingsContent.tsx:276,368 (loot_style in state and in safeSettings); LootSettingsContent-loot-style.test.tsx:140,163.
- T-04-16-03: CreateGuildModal-loot-style.test.tsx:183 asserts zero /api/guild-settings requests.
- T-04-17-01: app/api/raid-tiers/route.ts:128-130 (manage_settings) and :179 (tier-to-guild check, 404); the phase diff of this route is one select column and a comment; the UI shows the control only to managers (_client.tsx:79).
- T-04-17-02: raid-tiers/route.ts:196-198 (canSwitchToDiscovery, D-17) and :205-225 (D-03 ranked and awarded counts); enforce_raid_tier_list_mode_rules (migration 20261020120000 :334-382); the UI shows the reason (_client.tsx:146-153).
- T-04-17-03: raid-tiers/route.ts:303-313 (logAudit on a mode change).
- T-04-18-01: app/api/discord/set-your-five/route.ts:77-80 checks permission before any read, token or send; tests :272,284.
- T-04-18-02: 60-minute cooldown from audit_logs at set-your-five/route.ts:145-166 (fails closed at :153); the send row is reserved before the post (:221-235); Discovery gate at :90-127; SetYourFiveSendRow.tsx:12,74,103 (60-second disable) and :113-123 (confirm); tests :302,390,420,444.
- T-04-18-03: Response is counts only (:291); logs are fixed strings (:283,294); tests :506-524 assert the exact log arguments and response bodies; lib/discord.ts sendDirectMessage returns stage and status only and never logs the recipient.
- T-04-18-04: domain/loot/set-your-five.ts:39-41 (the link carries only guild and picker); the page rechecks membership (T-04-13-01).
- T-04-18-05: set-your-five/route.ts:24 (maxDuration 60), :26 (concurrency 5), :27 (45-second budget), :31 (55-second deadline), :291 (unreached recipients counted as skipped); test :668.
- T-04-18-06: set-your-five.ts:66 (allowed_mentions: { parse: [] }); the content is fixed strings (:59).
- T-04-18-07: set-your-five/route.ts:221-235: one audit row per send (new_data: {posted: true}).
- T-04-19-01: The 04-19 SUMMARY records the owner's copy sign-off on 2026-11-11 and the DRAFT flips; the sign-off comment is in lib/updates-data.ts.
- T-04-19-02: The changelog entry holds no names or ids; the phase SUMMARYs hold no UUIDs or Discord ids.
- T-04-19-03: lib/loot/__tests__/need-reader-inventory.test.ts:1038-1302 walks the source tree and fails on missing or stale entries; runs in CI.
- T-04-19-04: Golden and contract tests unchanged (T-04-05-01); editor mode test exists; addon payload tests at guild-data route.test.ts:1047-1083; Lua cmp recorded in the 04-19 SUMMARY.
- T-04-20-01: NeedPicker.tsx:358 (confirm only calls setUnlocked(true)); the reopen happens inside saveSubmission (LootListContext.tsx:813-822); NeedPicker.test.tsx:708-724 asserts no fetch and no reopenForEdit call.
- T-04-20-02: app/api/loot-submissions/reopen/route.ts:57-61 is owner-only (stricter than the declared owner or officer); save_submission_items and submit check ownership; the picker uses activeCharacter.
- T-04-20-03: NeedPicker.tsx:170-191,479-493: ineligible keys are read only to mark rows and any other failure shows the fixed saveError; test :835.
- T-04-20-04: NeedPicker.tsx:472 (saveSubmission(true, ...) submits to pending); the reopen route awaits logStatusChange (:94-103).
- T-04-21-01: Accepted risk: officers already see every tier of their guild.
- T-04-21-02: lib/loot/need-lines.ts:111-132: rows that cannot be grouped pass through as item lines and each group keeps all its rows; need-lines.test.ts:87-101,131-145.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-04-01 | T-04-01-04 | D-08 amended accepts the draft-only window: between this deploy and 04-08 a raider can only save a draft holding need rows through save_submission_items, because the submit route keeps refusing need rows until 04-08 ships with the budget and eligibility checks; a draft never reaches pending, approval, the master sheet or BLP; the owner records the acceptance at the 04-02 stop (Task 2) | Owner (04-02 SUMMARY) | 2026-11-11 |
| R-04-02 | T-04-03-04 | No I/O, no names, no ids beyond the caller's input | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-03 | T-04-05-03 | Sentences hold numbers and fixed words only; names are rendered by the surfaces as before | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-04 | T-04-06-03 | No I/O and no personal data | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-05 | T-04-08-05 | the check runs at every submit against the current spec; a changed spec makes the list refused until the raider edits it | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-06 | T-04-10-01 | UI rules are convenience only; the submit route refuses over-budget and ineligible lists (04-08) | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-07 | T-04-10-03 | the flow renders taxonomy words only | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-08 | T-04-11-01 | UI rules mirror the server; the submit route refuses (04-08) and drafts cannot be approved | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-09 | T-04-12-02 | the surfaces show the same officer-only data as before, split into two numbers | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-10 | T-04-14-01 | the comparison modal already shows both scores to the raider; only the layout changes | Owner (plan row, confirmed at UAT) | 2026-11-12 |
| R-04-11 | T-04-21-01 | officers already see every tier of their guild (moved from 04-13) | Owner (plan row, confirmed at UAT) | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Open Below Threshold

| Threat ID | Severity | What is missing | Suggested fix |
|-----------|----------|-----------------|---------------|

None. T-04-07-03 (medium) sat here after the 2026-11-12 audit and was closed the same day by quick task 261112-u5j; its evidence is in the Verification Evidence section.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 76 | 75 | 1 (below threshold, non-blocking) | gsd-security-auditor via /gsd-secure-phase 4 |
| 2026-11-12 | 76 | 76 | 0 | quick task 261112-u5j (T-04-07-03 fix on fix/t-04-07-03-need-row-priority, PR #517, aac3a3af; evidence re-checked by grep and the route tests) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
