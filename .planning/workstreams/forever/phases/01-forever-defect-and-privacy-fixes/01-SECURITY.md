---
phase: 01
slug: forever-defect-and-privacy-fixes
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-13
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: authored at plan time (all nine PLAN files carry a `<threat_model>` block). Verification depth: ASVS L1 (grep and test evidence against the implementation). Block threshold: high.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| officer browser to /api/loot-history/bulk | Session auth plus verifyPermission(manage_loot); body carries guild_id, ids, raid_event_id, updates, decision_context | Award rows, audit payloads (untrusted input) |
| companion or addon to /api/addon/guild-data and /api/addon/export-string | Sync token or session auth via authenticateAddonRequest and authorizeAddonGuild; untrusted guild_id query param | BLP counters, item priorities, submissions, attendance |
| bot to /api/bot/priority and /api/bot/score | Bot key auth (checkBotAuth) and Premium gate (requireBotLookupAccess) | Item queries, scores, item_url |
| route to Postgres (service role) | Bypasses RLS; the verified guild_id filter is the only tenant boundary | All guild rows |
| server and bot to Discord channels | Embeds render Discord markdown in public and officer channels | Item links, character names, bot copy |
| raider browser to clipboard | Reserve "Copy for Discord" text built client-side | Item links |
| browser and API routes to PostHog | Client and server analytics leave our systems | Event properties, person and group properties |
| source tree to CI | Scan tests gate merges | Analytics call sites, service-role factory call sites |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering / Elevation | DELETE and PATCH in app/api/loot-history/bulk/route.ts | high | mitigate | 7 `.eq('guild_id', guild_id)` filters; verifyPermission(manage_loot) at lines 202 and 492; recomputeBlpForItems receives the request guild_id (lines 537, 582, 725) | closed |
| T-01-02 | Tampering (integrity) | DELETE pre-read and PATCH before-read | medium | mitigate | Read errors answer 500 before any write (lines 507, 549); awaited recompute tests pass | closed |
| T-01-03 | Repudiation | DELETE audit trail | low | mitigate | logAudit per deleted row (lines 391, 522); read-error 500 precedes any delete | closed |
| T-01-04 | Denial of service | Awaited recompute on DELETE by raid_event_id | low | accept | Officer-only; one idempotent RPC per distinct item; UAT test 3 timed a real whole-night delete and passed | closed |
| T-01-05 | Information disclosure | decision_context in audit_logs | low | mitigate | MAX_AUDIT_PAYLOAD_BYTES 4096, strings sliced to 64, top_candidates capped at 3 (lines 40, 87-120) | closed |
| T-01-06 | Tampering | console logging in the route | low | mitigate | Constant first argument on console calls; CodeQL green on the merged PR | closed |
| T-02-01 | Tampering (integrity) | guild-data reads | high | mitigate | 6 selectAllPagesOrThrow call sites in app/api/addon/guild-data/route.ts; each page error throws to the 500 catch | closed |
| T-02-02 | Information disclosure | blp_tracking and guild_item_priorities reads | high | mitigate | Both reads filter on the authorized guildId (lines 144-151); route tests assert the filter | closed |
| T-02-03 | Information disclosure | 500 error body | low | mitigate | Catch returns `{ error: 'Internal server error' }` (line 326) | closed |
| T-02-04 | Tampering (integrity) | service-role queries | medium | mitigate | createTypedServiceRoleClient (line 57); typed-client-usage scan test passes | closed |
| T-02-05 | Denial of service | paged reads for very large guilds | low | accept | Pages of 1000 bounded by the guild's own rows; officer-only route | closed |
| T-02-06 | Spoofing | addon authentication | low | accept | authenticateAddonRequest and authorizeAddonGuild untouched; pkce-flow and companion-bearer-routes suites green | closed |
| T-03-01 | Spoofing / Tampering (link injection) | wowheadItemUrl and the three link sites | low | mitigate | domain/expansion/wowhead.ts builds URLs only from EXPANSION_TO_WOWHEAD_DOMAIN and the numeric wowheadId (lines 12-57); UAT test 1 confirmed live links | closed |
| T-03-02 | Denial of service | notifyLootAward expansion lookup | medium | mitigate | Lookup in its own try/catch with fallback link (lib/discord-loot-announcements.ts lines 79-95) | closed |
| T-03-03 | Information disclosure | post-raid summary character names | low | accept | Existing behaviour: names posted to the guild's own configured channel by its officers | closed |
| T-03-04 | Tampering | console logging | low | mitigate | Constant first argument `'[loot-announce] expansion lookup failed'` (lines 90, 95) | closed |
| T-04-01 | Spoofing / Tampering (link injection) | priorityEmbed rendering item_url | medium | mitigate | WOWHEAD_ITEM_URL regex `^https://www\.wowhead\.com/(?:[a-z0-9-]+/)?item=\d+$` gates item_url (discord-bot/interactions.js lines 83-87); parenthesis-injection test | closed |
| T-04-02 | Tampering (integrity) | expansion read in /api/bot/priority | medium | mitigate | Every query checks its error and answers 500 on failure (route header lines 18-21; D-04 case table) | closed |
| T-04-03 | Elevation of privilege | bot route auth | low | accept | checkBotAuth and requireBotLookupAccess untouched; D-09 auth-before-database tests green | closed |
| T-04-04 | Tampering (integrity of scores) | typed-client casts in /api/bot/score | medium | mitigate | Narrow casts only; /score route tests and domain/scoring tests unchanged and green | closed |
| T-04-05 | Information disclosure | additive item_url field | low | accept | Public Wowhead URL from a public item id | closed |
| T-05-01 | Tampering (integrity) | future addon or bot routes | medium | mitigate | utils/supabase/__tests__/typed-client-usage.test.ts passes; 10 addon and bot routes on the typed client, 0 on the untyped factory | closed |
| T-05-02 | Spoofing | addon auth and token routes | medium | mitigate | pkce-flow and companion-bearer-routes suites pass unedited | closed |
| T-05-03 | Elevation of privilege | service-role usage | low | accept | No new service-role call sites | closed |
| T-06-01 | Information disclosure | master_loot_awarded and four other browser name-carrying events | high | mitigate | Name properties removed; master-loot-events builder takes primitives and an id array; no-names-in-analytics scan test passes | closed |
| T-06-02 | Information disclosure | posthog.register guild_name super property | high | mitigate | `posthog.unregister('guild_name')` in app/contexts/GuildContext.tsx line 889 | closed |
| T-06-03 | Information disclosure | posthog.group name, identify current_guild and display_name | medium | mitigate | Removed; GuildContext identify carries counts, role and expansion id only (lines 899-904) | closed |
| T-06-04 | Information disclosure | posthog.identify email | medium | mitigate | PostHogProvider identify carries discord_id and created_at only (lines 81-84); scan rejects an email key | closed |
| T-06-05 | Repudiation (analytics history) | existing PostHog insights | low | accept | Decision 19, Hard Constraint 3, owner decisions 1 and 4 | closed |
| T-06-06 | Information disclosure (aggregation) | group realm, faction, created_at | low | accept | Not names; no published data in this phase | closed |
| T-06-07 | Information disclosure | loot_item_ids on master_loot_awarded | low | accept | Catalog item ids only (owner decision 1) | closed |
| T-06-08 | Tampering (analytics integrity) | item_count after a failed item read | low | mitigate | summarizeSubmissionItems returns null on a failed read; failed-read test in master-loot-events.test.ts | closed |
| T-07-01 | Tampering (integrity) | export-string reads | high | mitigate | 5 selectAllPagesOrThrow call sites in app/api/addon/export-string/route.ts; every read error-checked | closed |
| T-07-02 | Information disclosure | blp_tracking and guild_item_priorities reads | high | mitigate | Both reads filter on the authorized guildId (lines 208-221); tests assert the filter | closed |
| T-07-03 | Information disclosure | 500 error body | low | mitigate | Catch returns `{ error: 'Internal server error' }` (line 370) | closed |
| T-07-04 | Tampering (integrity) | service-role queries | medium | mitigate | createTypedServiceRoleClient (line 59); fake allow-list fails on unknown tables | closed |
| T-07-05 | Spoofing | addon authentication | low | accept | Auth helpers untouched; suites green | closed |
| T-08-01 | Information disclosure | five server analytics events | high | mitigate | Name properties removed; exact-properties assertions in the guilds, reserve awards, import and remove-item route tests | closed |
| T-08-02 | Information disclosure (regression) | any future analytics call | high | mitigate | utils/analytics/__tests__/no-names-in-analytics.test.ts with call-site floor and synthetic self-checks passes | closed |
| T-08-03 | Information disclosure (scan blind spot) | properties built in a variable before the call | low | accept | Route-level assertions cover the server events; recorded in plan assumptions | closed |
| T-08-04 | Repudiation (analytics history) | insights on the four server events | low | accept | Hard Constraint 3 | closed |
| T-09-01 | Repudiation (unapproved copy) | new bot title, separator and review strings | low | mitigate | Owner signed off the strings in UAT test 2 (2026-10-13) | closed |
| T-09-02 | Tampering (markdown rendering) | titles and raider line | low | mitigate | Only static characters changed (interactions.js lines 64-108); full-string test assertions | closed |
| T-09-03 | Tampering (link integrity) | priorityEmbed item link | low | mitigate | WOWHEAD_ITEM_URL and fallback untouched; plan 01-04 tests run unedited | closed |
| T-09-04 | Information disclosure | reviewEmbed export | low | accept | Pure embed builder exported for tests; not reachable from Discord | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01-01 | T-01-04 | Officer-only route; serial idempotent recompute per distinct item; real latency confirmed acceptable in UAT test 3 | Owner (UAT) | 2026-10-13 |
| R-01-02 | T-02-05 | Pages of 1000 bounded by the guild's own rows; officer-only | Plan 01-02 | 2026-10-13 |
| R-01-03 | T-02-06, T-07-05 | Addon auth helpers untouched; existing suites green | Plans 01-02, 01-07 | 2026-10-13 |
| R-01-04 | T-03-03 | Character names already posted to the guild's own channel by its officers | Plan 01-03 | 2026-10-13 |
| R-01-05 | T-04-03 | Bot auth and Premium gate untouched; D-09 tests green | Plan 01-04 | 2026-10-13 |
| R-01-06 | T-04-05 | Public Wowhead URL from a public item id | Plan 01-04 | 2026-10-13 |
| R-01-07 | T-05-03 | No new service-role call sites | Plan 01-05 | 2026-10-13 |
| R-01-08 | T-06-05, T-08-04 | Loss of historical PostHog insights accepted by Decision 19 and Hard Constraint 3 | Owner decisions 1 and 4 | 2026-10-13 |
| R-01-09 | T-06-06 | Group realm, faction and created_at are not names; no published data this phase | Plan 01-06 | 2026-10-13 |
| R-01-10 | T-06-07 | loot_item_ids are catalog ids only | Owner decision 1 | 2026-10-13 |
| R-01-11 | T-08-03 | Scan reads call arguments only; server events covered by route tests | Plan 01-08 | 2026-10-13 |
| R-01-12 | T-09-04 | reviewEmbed export is a pure builder inside the bot process | Plan 01-09 | 2026-10-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-13 | 45 | 45 | 0 | /gsd-secure-phase (L1 grep and test evidence; scan tests typed-client-usage and no-names-in-analytics run green, 20/20) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-13
