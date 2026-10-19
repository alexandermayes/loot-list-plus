# Pitfalls Research

**Domain:** Adding Discovery mode (generic needs), a raid-night Drop Desk, a manifest-driven expansion format and a simplicity pass to a live WoW loot-management product (LootList+), Forever first
**Researched:** 2026-10-12
**Confidence:** HIGH for codebase pitfalls (verified by reading origin/main 523e2efe), MEDIUM for raid-night and delivery pitfalls (project history plus common practice), LOW for Forever client and loot-rule facts (fan sites and addon pages only, nothing official)

Milestone phases used for assignment below:

- **P1 Defect fixes** (the five Forever review defects)
- **P2 Expansion format** (SEED-001 manifest, wowhead_id join key, verification gate)
- **P3 Discovery lists** (generic needs, need picker, standing vs interest; due 2026-10-31)
- **P4 Drop Desk** (classify drops, order candidates, overrides, pin item to need; due 2026-11-30)
- **P5 Simplicity pass** (consumer-grade, across the board)

---

## Critical Pitfalls

### Pitfall 1: Fixing the five defects from a stale todo

**What goes wrong:**
The defect todo was written against origin/main 3f57adc1 on 2026-09-28. Since then several fixes landed, so a planner who trusts it will redo merged work, or "fix" code that was deliberately changed and regress it. Current state on origin/main 523e2efe:

| # | Defect | Status now | Evidence |
|---|--------|------------|----------|
| 1 | Addon routes query missing tables and `loot_items.slot` | **Partly fixed.** `slot` fixed (GH #290, `guild-data/route.ts:78`). `bad_luck_protection` and `item_priorities` are still queried (`guild-data/route.ts:88,101`, `export-string/route.ts:179,185`). The real tables are `blp_tracking` and `guild_item_priorities`. | `lib/database.types.ts:278,780` |
| 2 | Discord `/priority` selects a missing column, sorts by raw rank | **Mostly fixed** by PR #363 (approved lists, Ranks switch). It still orders by raw list rank **on purpose** (header comment, `app/api/bot/priority/route.ts:5-6`). Changing it to Loot Score is a product decision, not a bug fix. | PR #363, #391 |
| 3 | Addon awards never set `raid_event_id`, no BLP recompute | **Fixed** by PR #322 (GH #295/#307). `lib/loot/loot-history-rows.ts:79`, `app/api/addon/loot-award/route.ts:173,200`. | |
| 4 | Award DELETE and PATCH never recompute BLP | **Still open.** `app/api/loot-history/bulk/route.ts` DELETE (line 445) and PATCH (line 558) never call `recomputeBlpForItems`; only POST does (line 394). | |
| 5 | Discord links use retail Wowhead, summary hardcodes `/classic/` | **Still open.** `lib/discord-loot-announcements.ts:34` and `app/api/discord/post-raid-summary/route.ts:281`. | |

**Why it happens:** Todos are snapshots. Five Wowhead URL builders exist (`ItemLink.tsx`, the two Discord files, `reserve/join/[token]/page.tsx`, `help-content.ts`) and only `ItemLink` knows about Forever.

**How to avoid:**
- Phase P1 opens by re-verifying every item against current main and rewriting the todo as "remaining: 1 (two tables), 4, 5; decision: 2".
- For #1, the root cause is that `utils/supabase/service-role.ts` calls `createClient` with no `Database` generic, so a query against a table that does not exist still compiles. Also, `const { data: blpData } = await ...` throws the error away, so the result is just silently empty. Fix the two table names, then give the service client the `Database` type (at least for addon, bot and new Desk routes) so typecheck catches this whole class of bug.
- For #5, add one `wowheadItemUrl(game, id)` helper and point all five call sites at it. Forever tooltips only resolve under `/forever/` (the `/classic/` tooltip path returns 404 for Forever ids, per the 2026-09-25 check).

**Warning signs:** Addon in-game score preview shows BLP 0 for everyone. A PR diff "fixes" `raid_event_id` that is already set. Forever award posts in Discord link to retail item pages.

**Phase to address:** P1 Defect fixes.

---

### Pitfall 2: Generic needs bolted onto `loot_submission_items` through a nullable foreign key

**What goes wrong:**
`loot_submission_items.loot_item_id` is **already nullable** in the baseline schema (`supabase/migrations/20260101000000_baseline_schema.sql:1954`). The cheapest-looking Discovery design is "insert a row with `loot_item_id = NULL` and a new `need_id`". Every existing reader assumes an item, though, and a null slips through quietly instead of failing:
- BLP recompute counts a raider as a contender only if they "ranked the item in an approved, non-removed submission" (`20260609000001_blp_recompute_from_history.sql`). Need rows match nothing, so BLP never accrues.
- The master sheet, `domain/loot/item-competition.ts`, `slot-capacity.ts`, `bot-item-priority.ts`, `gargul-dft.ts`, the addon export and Discord `/priority` all join on `loot_item_id`. They will drop need rows, or crash on `null.wowhead_id`.
- The live-position unique index `idx_loot_submission_items_unique_live_rank_slot` (GH #354) and `save_submission_items` treat rank and slot as shared space. If needs share that space, item and need rows collide in mixed-mode lists.

**Why it happens:** Nullable FKs feel additive. In a codebase with no UI tests on `LootListContent.tsx` (2,533 lines) or the master sheet (CONCERNS.md), nothing fails loudly.

**How to avoid:**
- Decide the schema before any UI work. Recommended shape: a per-tier `list_mode` column on `raid_tiers` (`'items' | 'discovery'`, default `'items'`, so every existing guild is unchanged). A `need_definitions` catalog per tier. List rows that carry **exactly one** of `loot_item_id` or `need_id`, enforced by `CHECK ((loot_item_id IS NULL) <> (need_id IS NULL))`.
- Before the migration merges, grep every reader of `loot_submission_items` and `loot_history`, and give each one an explicit mode branch or an explicit "items-only" guard with a test.
- Keep Discovery reading and scoring in new, small modules (`domain/discovery/*`) composed at the route or page level. Do not add `if (discovery)` branches inside the 2,500-line components.
- Mode is a property of the **raid tier**, not of `guild.game === 'forever'`. Forever string checks already appear in about 20 files (`GuildContext.tsx`, `LootListContent.tsx`, `ExpansionManager.tsx`, `ItemLink.tsx` and others). Adding a second axis the same way doubles the drift. Add one capability resolver, e.g. `getTierCapabilities(tier, guild)`, and migrate new checks to it.

**Warning signs:** A migration adds `need_id` with no CHECK constraint. Code reads `row.loot_items?.name ?? 'Unknown'`. Discovery raiders vanish from the master sheet. `/priority` answers "no_items_in_expansion" for every Forever guild (it already does today, because Forever has zero seeded tiers).

**Phase to address:** P3 Discovery lists (schema first, before the picker UI). Capability resolver in P2.

---

### Pitfall 3: Bad-luck protection silently zero in Discovery, then double-counted on pin

**What goes wrong:**
BLP is keyed `(guild_id, loot_item_id)` in `blp_tracking`. It is rebuilt by `recompute_blp_for_item` from awards and attendance. In Discovery mode two failure modes stack up:
1. **Silent zero.** Need-ranked raiders are never contenders, so a full month of December raiding accrues no BLP. Nobody notices, because "0" looks like a normal value.
2. **Double count on pin.** The PRD says BLP "accrues by slot in Discovery mode, then attaches to the specific item once it has been seen". If pinning **copies** slot credits onto the item, and the slot bucket keeps counting, one missed drop pays out twice. If pinning **moves** them but other needs of the same slot share the bucket, credits are either split or duplicated, depending on how the pin happens to be implemented.

**Why it happens:** BLP was made a derived value in 20260609000001 specifically to stop order-dependent bugs. Bolting a second, incremental, slot-based counter on beside it brings back exactly the class of bug that migration removed (91 of 167 awards in one guild had lost BLP before that fix).

**How to avoid:**
- Keep BLP derived. Extend the contender definition and the award key so recompute reads one **bucket key**: `need_id` (Discovery) or `loot_item_id` (Known). Pinning an item to a need then becomes a mapping row (`need_item_pins`) that recompute honours. It is not a data copy.
- Write property tests on the pure recompute logic. Total credits for a raider are the same before and after a pin. A pin followed by an unpin restores the original state. Recompute is idempotent. Award then attendance gives the same result as attendance then award (the existing race).
- Run the recompute for a need bucket from every write path: award insert, award DELETE and PATCH (defect #4, which must be fixed first), attendance write, pin and unpin.

**Warning signs:** `blp_tracking` has no rows for a Forever guild after two raid nights. A raider's BLP jumps after an officer pins an item. Recompute RPCs are called with `need_id` from one path and `loot_item_id` from another.

**Phase to address:** P1 (defect #4 recompute on DELETE and PATCH), P3 (bucket model, contender rule), P4 (pin and award writes).

---

### Pitfall 4: Scoring regression for the existing five-expansion guilds

**What goes wrong:**
Splitting the Loot Score into "standing" and "interest" and adding a "slot-weighted loot cost" changes `computeScore()` in `domain/scoring/engine.ts`. Today it returns `itemRank + attendance + rankModifier + roleBonus + badLuck + priority + trialPenalty + donation + raiderBonus`. That one number is rendered in at least four places:
- `MasterSheetContent.tsx`
- `DashboardContent.tsx`
- `domain/scoring/explain.ts` (the "why")
- the addon's **separate Lua score engine**, fed by `export-string/route.ts` ("The Lua score engine consumes this directly", line 336)

Change the formula, or even the rounding, for an item-mode guild and every raider's ranking can shift overnight. The in-game preview also stops matching the web until the addon ships, and old addon versions stay installed for weeks.

**Why it happens:** The new formula is designed for Forever, but `computeScore` is shared. CONCERNS.md already flags scoring as fragile: "small changes affect guild's entire ranking system".

**How to avoid:**
- Golden-lock first. `LOOT_SCORE_FIXTURES` and `engine-contracts.test.ts` must stay byte-identical for every `list_mode = 'items'` input. Add fixtures from two or three real (anonymised) guild configs before touching the engine.
- New components default to 0 or off. The loot cost weight is opt-in per guild. Standing vs interest is a **presentation** split of the same total for item-mode tiers, never a new total.
- Version the addon export payload (`format_version`). The Lua engine refuses, or shows "update addon", on an unknown version rather than computing a wrong score.

**Warning signs:** Any diff to `domain/scoring/engine.ts` without a fixture diff. A support message saying "my score changed and I did nothing". Addon preview totals differ from the master sheet.

**Phase to address:** P3 Discovery lists (engine change, golden lock); P5 must not touch formulas.

---

### Pitfall 5: Name-keyed joins come back through the new manifest (the GH-269 class)

**What goes wrong:**
GH-269: 24 Naxxramas Tier 3 tokens in 9 guilds got the wrong class restrictions, so no raider could list them. The fix (`20260913000000_fix_naxx_token_names.sql`) had to relabel per-guild rows in place. The same mechanics are still live:
- `expansionSeeder.ts` looks up classification and roles by `item.name` (lines 452-479, `classificationMap[item.name]`, `roleMap[item.name]`). The brief cites lines 382-405; they have drifted.
- `getTokenClasses(tokenName)` in `data/token-class-mapping.ts:220` does a **first-match substring** search over `TOKEN_CLASS_MAPPING`, so the order of entries decides the result.
- `canClassUseToken` returns `true` for an unknown token ("safe default"). For Forever, where token conventions are unknown, every unrecognised token becomes usable by every class.

A manifest that keeps names as keys, or ports these helpers unchanged, ships a sixth copy of the bug.

**How to avoid:**
- Manifest schema (validated with zod at build and test time) keys items, classifications, roles and token class groups by `wowhead_id`. Names are display-only fields. Tests fail on duplicate ids, on a name with no id, and on token groups that reference ids not present in the manifest.
- Unknown token for a manifest-driven expansion means "needs review" (excluded from lists and flagged to the owner), not allow-all. Keep allow-all only as a legacy adapter behaviour for the five old expansions.
- Verification gate per expansion, modelled on `data/__tests__/classic-wow-raids.test.ts`. For Forever, check id-to-name against a committed snapshot of the Wowhead Forever tooltip (`nether.wowhead.com/forever/tooltip/item/<id>`) and the wago.tools ItemSparse CSV. **Never** call either at test time (flaky CI, rate limits).
- Migrate the five old expansions as **adapters** that emit the manifest shape. Do not re-key their per-guild rows in this milestone. A rewrite of data that 9+ guilds have history against is a separate, riskier project.

**Warning signs:** A manifest field named `itemName` used in a lookup. `.includes(` over token names in new code. A Forever token that every class can list.

**Phase to address:** P2 Expansion format.

---

### Pitfall 6: Seed-once catalog copies cannot absorb loot that arrives after guilds exist

**What goes wrong:**
The seeder copies catalog data into **per-guild** `raid_tiers` and `loot_items` rows when an expansion is added. Every catalog correction since has needed a hand-written backfill migration: #269 relabel, #284 Classic raid recipes. Forever turns this from rare to constant:
- Guilds sign up now with **zero** raid tiers (`FOREVER_DATA` comment in `expansionSeeder.ts`).
- Raid tiers and bosses must appear before 2026-12-09.
- Items appear drop by drop after that.
- `loot_history.loot_item_id` and `raid_tier_id` are **NOT NULL** (baseline lines 1843, 1845), so a drop cannot be recorded until a guild-level item row exists.

The seeder also is not transactional. It `continue`s past a failed tier and logs a failed loot insert, so a guild can be left half-seeded. And the guild's expansion row is created with `name: expansionData.displayName`, so renaming an expansion in a manifest orphans existing guilds.

**How to avoid:**
- Add an idempotent `syncCatalogToGuild(guildId, expansionKey)` that upserts tiers and items keyed on stable ids (`(expansion_id, tier_key)`, `(raid_tier_id, wowhead_id)`). It never deletes or renames a row that `loot_history` or `loot_submission_items` reference. Run it from the seeder, from a backfill job, and on demand from the Drop Desk.
- Give expansions a stable `key` (e.g. `forever`) separate from display name. Look guilds up by key.
- Run the seed in one RPC or transaction, or make sync idempotent so a re-run heals a partial seed. Add a test that a second sync is a no-op.
- The Drop Desk "unknown item" path creates the guild `loot_items` row from a wowhead id (pasted link, or addon item link) through the same sync function. It does not use a one-off insert.

**Warning signs:** A plan that says "add a migration to backfill Forever items for existing guilds". Two Forever guilds showing different boss lists. An award fails with a NOT NULL violation on `raid_tier_id`.

**Phase to address:** P2 Expansion format (sync function, stable keys). P4 uses it for unknown drops.

---

### Pitfall 7: Letting volatile Forever data sources sit on the Oct 31 or Nov 30 critical path

**What goes wrong:**
Every Forever data source can move under you:
- wago.tools ships Forever as product `wow_classic_beta` 1.60.x. Its `/api/builds` list is unsorted, builds come and go, and the product name may change at launch on 2026-11-04.
- Forever ItemSparse has about 5,000 fewer rows than Classic Era (possible encrypted or hidden rows).
- No 1.x-style encounter journal tables exist, and as of 2026-09-25 the Barrow Deeps boss names were **not** in DungeonEncounter.
- Wowhead has items but no drop sources.
- No Blizzard API namespace has been confirmed.
- Tier tokens are unidentified (only "[DNT] Crafted Tier Piece Placeholder").
- Raids could slip from 2026-12-09 or open in stages.

A plan where Discovery lists or the Desk "load from wago" or "wait for Wowhead drop data" can be blocked by any of these.

**How to avoid:**
- **Discovery needs no loot data at all.** Need definitions (slot, armour class, main stat, tier piece n) come from the existing `InventoryType` set, which is unchanged in Forever, plus a hand-authored per-tier list in the manifest. That is how Oct 31 stays independent of every external source.
- **Drop Desk works with an unknown item and an unknown boss.** Classify by need, record the wowhead id if known, and allow "boss: unknown". Then Nov 30 and Dec 9 do not depend on drop-source data.
- Ingest offline. A script pulls a wago CSV or Wowhead tooltip for a pinned build and commits a snapshot with provenance (`build`, `fetched_at`, `sha256`). The manifest marks every field `source` and `verified: true|false`. Nothing fetches wago or Wowhead at build, deploy or request time.
- Raid open dates live in manifest data (`opens_on`), never in code. None are hardcoded today; keep it that way. Mark raids and bosses `provisional` until verified, and let officers rename a provisional boss in their guild.
- Treat a new item id as "maybe Forever". Season of Discovery carry-overs share the 230000-289999 range (e.g. Hakkari Summoning Token).

**Warning signs:** A phase plan with "fetch from wago.tools" in a runtime or CI step. A plan task blocked on "Wowhead drop data". `'2026-12-09'` appearing in a `.ts` file.

**Phase to address:** P2 (offline ingest, provenance, provisional flags), P3 (data-free need catalog), P4 (unknown item and boss path).

---

### Pitfall 8: Assuming the in-game addon will work on Forever raid nights

**What goes wrong:**
Several items are reported but **not confirmed** by Blizzard:
- The Forever client runs on the Mainline (retail 12.x) API with interface 16001 and inherits Midnight's addon restrictions ("secret values" during encounters).
- Classic-era addons must be rebuilt to load.
- Master loot is unconfirmed, and retail has no master looter.

The LootList+ addon (which lives outside this repo) and the companion are built for the Classic API. If the Drop Desk depends on addon award import or on master-loot events, it can fail on Dec 9 with no fallback. The companion is also listed as never shipped in CONCERNS.md.

**How to avoid:**
- Make the Drop Desk **web-first**. It records awards with no addon at all; the addon is an accelerator.
- Put an explicit "verify on the Forever client" task (TOC interface, loot events available after the encounter ends, loot method in a real group) on the P4 checklist before promising addon import for Forever.
- Design for group loot or personal loot as well as master loot. The officer records who received the item and why, rather than performing the trade.
- Version the export string (see Pitfall 4) so an old Classic addon cannot import Forever data it does not understand.

**Warning signs:** P4 acceptance criteria that mention the addon for Forever. No test of the Desk with the addon absent.

**Phase to address:** P4 Drop Desk (with a verification task). P1 keeps the Classic addon routes correct.

---

### Pitfall 9: The Drop Desk races itself on raid night

**What goes wrong:** Six raid-night failure modes:
- **Two officers, one drop.** Both click Award within a second, so you get two `loot_history` rows or a 23505 error the UI shows as a crash.
- **Stale ordering.** BLP recompute runs in `after()` (`bulk/route.ts:394`, `loot-award/route.ts:200`), fire-and-forget, errors only `console.error`'d. The next drop's candidate order uses pre-award BLP.
- **No undo.** CONCERNS.md lists "No Undo/Rollback for Loot Awards", and DELETE does not recompute BLP (defect #4). A mis-click on raid night leaves wrong BLP and a wrong Discord post.
- **Wrong raid night.** Award session matching uses UTC (`lib/addon/award-session.ts`). A US raid running past 00:00 UTC lands on the next date unless `toRaidNightDate` is reused.
- **Offline officer.** Spotty connection mid-raid, and the award is lost or sent twice on reconnect.
- **Latency.** The Desk must open in under 2 seconds per drop. Loading the full guild bundle per drop (the master sheet pattern) will not.

**How to avoid:**
- **Idempotency already exists. Use it.** `20261001120000_allow_second_same_night_award.sql` added `source_award_key` (unique per guild) and `award_copy`. Every Desk action carries a client-generated key per drop decision, so a resend is a no-op and a second officer gets "already awarded by X" rather than an error.
- Model each drop as a row (`raid_drops`: raid_event_id, item or need, status `open|awarded|disenchanted|void`, version). An award is a conditional update `WHERE status = 'open' AND version = $v`. The loser of a race sees the winner's decision.
- For the one item or need being awarded, recompute BLP **synchronously** (a single-item RPC is cheap) before returning. Batch the rest in `after()`. Show "scores updating" if recompute fails, never stale numbers presented as fresh.
- Undo is a reversal within the raid session: it voids the drop, deletes the award, recomputes BLP and edits the Discord message. Every override and undo is written to an insert-only audit table with a reason.
- Require a raid night (`raid_event_id`) before the Desk opens. Without it, BLP skips the award (the original #295 bug).
- Keep a local queue of pending actions in `localStorage` with their idempotency keys. Retry is then safe.

**Warning signs:** Desk actions without a key. Award endpoints returning 500 on 23505. A "recalculate" button appearing as a workaround. Duplicate awards found in `loot_history` the day after a beta night.

**Phase to address:** P1 (defect #4), P4 Drop Desk.

---

### Pitfall 10: Discord rate limits on fast award bursts

**What goes wrong:**
`notifyLootAward` (`lib/discord-loot-announcements.ts`) posts one channel message per call. A Drop Desk that settles a 40-player Onyxia clear in seconds per drop will push 5 or more posts into one channel in a few seconds. Discord's commonly cited bot limit is 5 messages per 5 seconds per channel (MEDIUM confidence; read the `X-RateLimit` headers rather than hardcoding). `lib/discord.ts` retries on 429, but inside Vercel `after()` the retries can outlive the function, and posts drop or arrive out of order.

**How to avoid:**
- One running "Raid night loot" message per raid event, **edited** as awards land and debounced (e.g. every 5 seconds), instead of one post per award. Store its message id on the raid event.
- Undo edits that message too. Post a full summary at raid end (`post-raid-summary`).
- Use the shared Wowhead URL helper so Forever links resolve (defect #5).

**Warning signs:** `[loot-announce] discord post failed (429)` in logs. The order of announcements differs from the award order.

**Phase to address:** P4 Drop Desk (P1 fixes the links).

---

### Pitfall 11: Migrations run before the code that needs them, with no CI on the SQL

**What goes wrong:**
`deploy-migrations.yml` applies SQL to production about 12 seconds after merge to main. The Vercel app deploys minutes later, and the Railway Discord bot later still, or not at all if nobody redeploys it. Migration-only PRs fail CodeQL and need `--admin`, so the SQL gets **no** required CI. Three ways this bites:
- A NOT NULL column, a renamed column or a tightened CHECK breaks the still-running old code for those minutes, on a live guild's raid night.
- Old addon builds and the old bot keep calling old shapes for days.
- Migrations are forward-only (`supabase/migrations/README.md`), so a bad one cannot be "reverted", only fixed forward.

**How to avoid:**
- Expand and contract, always. (1) Additive migration: nullable columns, new tables, new CHECK as `NOT VALID`. (2) Code that writes both shapes. (3) Backfill. (4) Constraint or cleanup in a later PR. Never combine a breaking schema change with its code in one deploy.
- Every migration PR runs `supabase db reset` locally plus the route or RLS tests that touch it, and records that in the PR body, since CI will not.
- Regenerate `lib/database.types.ts` (`npm run gen:types`) in the same app PR that first uses the new shape.
- Merge schema changes on non-raid days. For a guild that raids Tue and Thu, Wed is safe; ask the beta guild for its schedule.
- Allow-list the new `loot_history.source` value (e.g. `'desk'`) by migration **before** shipping Desk code. The current CHECK only allows `web | addon | import`.

**Warning signs:** A PR containing both `ALTER ... SET NOT NULL` and the code that fills it. A migration PR merged without a local reset note. Production errors in the 5 minutes after a migration deploy.

**Phase to address:** All phases. The rules are set in P1, the first phase with migrations.

---

### Pitfall 12: RLS gaps on new tables fail silently, not loudly

**What goes wrong:**
The repo's history is a list of silent RLS failures:
- "Fix trial penalty not applied on master sheet (RLS bug)" b7a91358
- "Add missing SELECT policy on loot_item_classes" edfeb443
- "Fix raid event creation failing silently due to client-side RLS queries" 3b930894
- "Fix loot management saves not persisting (RLS bypass)" 217fd2e1

A missing SELECT policy returns an **empty list**, not an error. So a raider sees no needs, the master sheet shows no Discovery interest, and the Desk lists no candidates, all with no error. The opposite gap: over-broad policies leak officer overrides or council notes to raiders. `20261004040000_loot_item_officer_notes_officers_only.sql` shows notes are already sensitive.

**How to avoid:**
- Every new table (`need_definitions`, list need rows, `need_item_pins`, `raid_drops`, `desk_overrides` or audit) ships with RLS on and explicit SELECT, INSERT, UPDATE and DELETE policies using `is_guild_officer` or `is_guild_master` and the active-membership rule from `20261003180000_policies_require_active_guild_membership.sql`. Per the migrations README, no literal role names.
- The audit table is insert-only: no UPDATE or DELETE policy, and no service-role writes that skip the audit row.
- Add a per-table RLS test matrix (raider, officer, non-member, ex-member). Read paths assert "returns rows" as well as "returns no error".
- Service-role routes check permission before the query (CONCERNS.md security note), and new Desk routes do this through one helper.

**Warning signs:** A new table in a migration with no `CREATE POLICY` lines. A component showing an empty state where data exists for an officer. Tests that only check `error === null`.

**Phase to address:** P3 and P4 (every new table). P2 if catalog tables are added.

---

### Pitfall 13: Running the beta night on a real guild before the Desk is stable

**What goes wrong:**
A live guild (likely Big Yikes, the owner's own) uses the Desk in a real raid. A crash or a duplicate award in front of 20 to 40 raiders costs more trust than a late launch. Forever raids do not open until 2026-12-09, but the Desk is due 2026-11-30. So any "beta night" before Dec 9 is on Classic content (item mode) or synthetic Forever drops, and neither exercises the Discovery path for real.

**How to avoid:**
- Ladder: (1) replay a past raid's real award log through the Desk on a staging guild; (2) a dry run with officers only, no raiders watching; (3) a live night with a **paper or spreadsheet fallback** and a named officer authorised to abandon the Desk; (4) a post-night reconciliation script comparing `loot_history`, BLP and the Discord post.
- Gate the Desk per guild with a DB setting (see Pitfall 14) so only the beta guild sees it.
- Agree a data-cleanup plan in advance: which rows get voided if the night goes wrong, and who signs off.
- No deploys or migrations on the beta day.

**Warning signs:** The beta night is scheduled before a staging replay has passed. There is no fallback named in the plan.

**Phase to address:** P4 Drop Desk (release plan).

---

### Pitfall 14: Using PostHog feature flags for behaviour rather than exposure

**What goes wrong:**
`useFeatureFlag` (`utils/feature-flags.ts`) is client-only and returns `false` while loading. That causes a flash of old UI on every load. It also returns `false` forever for any officer whose ad-blocker blocks PostHog, and it is keyed to the **user** distinct id, while Discovery and the Desk are **guild** decisions. Server routes, the bot and the addon cannot read it. If Discovery mode is "on" because of a flag, the web shows needs while the API and bot behave as item mode. PROJECT.md already warns against mixing user-scoped and guild-scoped PostHog ids.

**How to avoid:**
- Behaviour is DB state: `raid_tiers.list_mode` for Discovery, and a guild setting such as `guild_settings.drop_desk_enabled` for the beta gate. Every surface reads it from the same row.
- PostHog flags only for UI exposure experiments, never for deciding which data a route writes.
- Hard cutover per tier rather than flag-driven dual paths that live forever. Once a Forever tier is Discovery, it stays so until the deferred Known transition.

**Warning signs:** `useFeatureFlag('discovery...')` in a component that writes data. An API route with no mode check.

**Phase to address:** P3 (list_mode), P4 (desk gate).

---

### Pitfall 15: The simplicity pass removes what officers depend on, or hides the "why"

**What goes wrong:**
"Consumer-grade, no abstraction, no manual" applied across the board tempts deletion. Officers of the five existing expansions depend on a long list of power features: PPR and linear attendance settings, rank and role modifiers, priority lists (`PriorityListTab.tsx`), raid teams (Premium, `utils/feature-gate.ts`), reserve runs, Warcraft Logs import, Gargul export, the master sheet. Removing or burying one breaks a paying guild's workflow.

The bigger risk is trust. The score breakdown (`domain/scoring/explain.ts`) **is** the product promise ("Loot Scores show who has priority for each item and why"). A cleaner screen that shows only a rank, or a Desk order with no reason, reads as "the officers decided" and loses the transparency that sells LootList+ over loot council.

**How to avoid:**
- Audit before cutting. Pull PostHog usage per feature (guild-scoped, aggregated, no names, per the privacy rule) and get the owner's sign-off on a keep, move or remove list. Removals are a separate decision from simplification.
- Use progressive disclosure, not deletion. Sensible defaults, plus a closed "Advanced" section that keeps every existing setting reachable. Never change a default for an existing guild.
- The "why" stays one tap away everywhere a score or order appears: list, master sheet, Desk candidate row, Discord `/score`. In Discovery, explain standing vs interest in plain words.
- Add characterization tests before restructuring `LootListContent.tsx`, `DashboardContent.tsx` and `raid-tracking/_client.tsx`. CONCERNS.md lists them as untested and oversized.
- A feature that is moved or renamed triggers the full surface sweep (site, help content in `lib/help-content.ts`, schema, Discord, GitHub, legal, external posts).

**Warning signs:** A PR description says "removed" about a settings control. A score shown without a breakdown affordance. Help articles that reference screens that no longer exist.

**Phase to address:** P5 Simplicity pass (audit gate at phase start). P3 and P4 must ship new screens with the "why" built in.

---

### Pitfall 16: Copy drift, jargon and mobile regressions in the simplicity pass and new screens

**What goes wrong:** Three ways it goes wrong:
- **Copy.** New screens need dozens of strings, and AI-drafted copy drifts from the owner's voice. Em dashes are banned in user-facing text, but the only automated check found guards DESIGN.md parity (`__tests__/design-tokens/design-md-parity.test.ts`). Em dashes still appear in about 56 `.tsx` files (mostly comments, but nothing stops one reaching JSX).
- **Jargon.** Onboarding assumes the reader knows DKP, EPGP, loot council, BLP, PPR, "Reserved / Limited / Unlimited", "allocation points". Even "Discovery mode" and "Known mode" are internal terms.
- **Mobile.** Raiders build lists on phones. dnd-kit drag-and-drop and the planned one-column, five-row quiz picker both need real 375px testing. The current two-column picker already confused people.

**How to avoid:**
- Collect all new and changed strings for each phase into one copy sheet that the owner signs off before merge. PRs reference that sheet's version.
- Add a test that fails on U+2014 (and U+2013 used as a dash) in JSX text and string literals under `app/` and `components/`, excluding comments.
- Plain-language names in UI. "Rank what you need" rather than "Discovery mode". "Bad luck bonus" with an inline one-line explanation rather than "BLP". Every term gets a tooltip or inline sentence on first use; no manual required.
- What consumer products do to stay simple without becoming shallow:
  - one primary action per screen
  - smart defaults with a named preset ("Recommended for 20-player guilds")
  - undo instead of confirm dialogs
  - empty states that teach by example
  - depth behind disclosure, never removed
- Mobile acceptance at 375px for the need picker, the list and the Desk candidate list. Touch targets at least 44px, and drag replaced or supplemented by up and down buttons.

**Warning signs:** A PR that changes UI strings with no copy-sheet link. A help article needed to explain a new screen. Horizontal scroll on mobile.

**Phase to address:** P5 primarily. P3 and P4 for their own screens (picker and Desk copy signed off before their due dates).

---

### Pitfall 17: Need taxonomy hardcoded in code, so it cannot follow Blizzard's reveals

**What goes wrong:**
Need granularity is unresolved: "Two-hand weapon" versus "Two-hand weapon + strength" versus "Tier piece #1". Blizzard may reveal loot in unexpected ways too: role-split tier, crafted tier that consumes disenchanted raid gear, rare 1% chase items, legendaries. If needs are a TypeScript enum or a CHECK constraint, every change is a deploy plus a migration close to Dec 9. Too generic a need makes everyone rank "Trinket #1" (a conflict pile-up). Too specific a need pigeonholes players.

**How to avoid:**
- Needs are data per tier (manifest-provided defaults, copied to `need_definitions` per guild tier through the same sync as Pitfall 6). Officers can rename, merge or retire a need without a deploy.
- Restriction points (weapons and trinkets always restricted, then jewellery and tier) live on the need definition. Rare and legendary drops route to council with no list scoring.
- Retiring or merging a need **remaps** existing list rows and BLP buckets. It never deletes them.

**Warning signs:** `type NeedKind = 'two_hand' | ...` driving behaviour. A migration needed to add a need.

**Phase to address:** P3 Discovery lists (with the manifest from P2).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `need_id` on `loot_submission_items` with no XOR CHECK | One migration, no new table | Every item reader silently drops or crashes on need rows; BLP never accrues | Never without the CHECK and a reader audit |
| Branching on `guild.game === 'forever'` for Discovery | Quick | A second axis across about 20 files; breaks when a Classic guild wants Discovery for a new tier | Never; use the tier capability resolver |
| Keeping the untyped service-role client | No mass type fixes | Queries against nonexistent tables keep compiling (defect #1 class) | Only for legacy routes; new routes typed |
| Hand-written backfill migration per Forever data drop | Fast for the first one | Dozens of one-off migrations, each needing `--admin` | Never; use idempotent `syncCatalogToGuild` |
| Porting `getTokenClasses` substring matching into the manifest | Reuses tested code | GH-269 again | Legacy adapters only |
| BLP recompute only in `after()` | Fast responses | Stale candidate order on the Desk | OK for batch paths; not for the item just awarded |
| PostHog flag as the Discovery switch | No migration | API, bot and addon disagree with the web | UI exposure experiments only |
| Copying old Classic per-guild data into the new manifest shape | "One format" sooner | Rewrites data with live history; big blast radius | Not this milestone; adapters instead |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| In-game addon (Lua, separate repo) | Changing export payload or score formula without a version; assuming the Classic addon loads on Forever | `format_version` in export; Lua refuses unknown versions; verify interface 16001 and the loot API on the Forever client before relying on it (LOW confidence facts) |
| Addon export routes | Destructuring `{ data }` and dropping `error`, so missing tables look empty | Check `error` and fail loudly in route tests; fix `blp_tracking` and `guild_item_priorities` names |
| Discord bot (Railway, discord.js) | Bot deploys separately; `/priority` and `/score` are item-name lookups that return `no_items_in_expansion` for Discovery tiers | Need-aware replies ("3 raiders ranked Two-hand weapon + Strength"); deploy bot after app; keep Premium gating (#391) consistent |
| Discord channel posts | One post per award; hardcoded Wowhead domains | Single edited per-raid message, debounced; shared `wowheadItemUrl(game, id)` |
| Stripe Premium | Gating Discovery (core list) behind Premium, contradicting the free core plan; gating checks on the client | Discovery lists free (core). Decide Desk tier with the owner before P4 ships; gate only server-side via `utils/feature-gate.ts`; tier change triggers the surface sweep |
| wago.tools | Taking `/api/builds` first entry; runtime fetch | Filter `1.60.` prefix and pin a build; offline snapshot with sha and provenance |
| Wowhead Forever | Using `/classic/` or retail paths; expecting drop sources | `wowhead.com/forever/item=<id>` and `nether.wowhead.com/forever/tooltip/item/<id>`; drop data treated as optional |
| Refresh Item Data workflow | Manifest files outside `data/*-raids.ts` never trigger icon and unique refresh (GH #171 stale icons again) | Extend the workflow `paths` to the manifest location; icon script uses the Forever tooltip path |
| Supabase migrations | Breaking change merged with code; no CI on SQL | Expand and contract; local `db reset` evidence in PR; non-raid-day merges |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Desk loads the full guild bundle or master sheet per drop | Several seconds per drop; officers fall back to rolls | Desk endpoint returns candidates for one item or need only, precomputed standing per raider per raid night | 40-player raids, 20+ drops per night |
| Per-item BLP recompute loop (`recomputeBlpForItems` iterates RPCs serially) | Slow undo and reassign; timeouts in `after()` | Recompute only the touched bucket synchronously; batch RPC for the rest | Bulk edits of 20+ awards |
| Large context providers re-rendering on Desk updates (`LootListContext`, `GuildContext`) | Typing lag on the Desk | Desk state isolated in its own small store; no GuildContext writes per drop | Any real raid night |
| Client-side score computation in the master sheet extended to needs | Master sheet slows as list rows grow | Compute need standing server-side once per request | Guilds with 80+ raiders |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| New tables without full RLS policy sets | Silent empty reads, or raiders reading council overrides | Policy matrix test per table; `is_guild_officer` helpers |
| Mutable audit log | Officers can erase overrides, defeating the trust feature | Insert-only policies; no UPDATE or DELETE |
| Tainted format strings in new logging (`console.error(\`... ${text}\`)` with Discord, Wowhead or wago response text) | CodeQL blocks the PR at the worst time | Constant format string plus args: `console.error('[desk] post failed %d', status, text)`; add to the PR checklist for ingest and Desk code |
| Service-role Desk routes trusting a client-sent `guild_id` and `raid_event_id` | Cross-guild award writes | Server-side membership and officer check first; verify raid event and character belong to the guild (as #296 and #297 did) |
| Names in analytics for Desk events | Breaks the privacy rule (no player or guild names) | Ids and counts only in PostHog events |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Exposing "Discovery" and "Known" as modes | Officers think they must configure something | Say "Loot for this raid is not revealed yet. Rank what you need." and switch automatically by tier |
| Two-column need picker (the current confusing pattern) | Raiders pick wrong slots, conflicts pile up | One column, three questions (slot, armour class, main stat), five ranked rows, as the PRD decided |
| Desk order with no visible reason | "Officers picked their friends" | Each candidate row shows response, standing and interest in plain words, with the breakdown one tap away |
| Confirm dialogs on every award | Slow raid nights | Instant award plus a 10-second undo toast, and the reversal path from Pitfall 9 |
| Onboarding that asks "DKP, EPGP or loot council?" | New officers bounce | Default to LootList+ scoring with one sentence explaining it; offer alternatives under Advanced |
| Raiders shown an empty list until Dec 9 | Forever guilds churn before raids open | Needs available from launch (Nov 4) so lists can be built during levelling |

## "Looks Done But Isn't" Checklist

- [ ] **Defect fixes:** Each of the five re-verified on current main; #2 decision recorded; DELETE and PATCH recompute BLP with route tests.
- [ ] **Manifest:** Forever manifest validates; no name-keyed lookups; unknown tokens are "needs review"; a second `syncCatalogToGuild` run is a no-op; refresh workflow triggers on manifest paths.
- [ ] **Discovery lists:** Item-mode golden score fixtures unchanged; need rows appear on the master sheet, the addon export (versioned) and Discord `/priority`; BLP accrues for need contenders after a test raid night.
- [ ] **Pin:** BLP totals unchanged by pin and unpin (property test).
- [ ] **Drop Desk:** Double-submit and two-officer race produce one award; undo recomputes BLP and edits Discord; works with the addon absent; works with "boss unknown" and an item not yet in the catalog.
- [ ] **RLS:** Every new table has a raider, officer, non-member and ex-member test that asserts rows returned, not just no error.
- [ ] **Copy:** Owner-signed copy sheet linked; em-dash test passes; no new jargon without an inline explanation.
- [ ] **Mobile:** Picker, list and Desk checked at 375px.
- [ ] **Delivery:** Each migration PR notes local `db reset`; no breaking schema change shares a deploy with its code; types regenerated.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong classification or token classes shipped to guilds (GH-269 class) | MEDIUM | Fix the manifest by wowhead_id; re-run `syncCatalogToGuild` (keeps row ids); recompute BLP for affected items |
| Duplicate awards from a race | LOW (if keys exist), HIGH (if not) | Void duplicates via the reversal path; recompute BLP; edit the Discord message; reconcile with the raid log |
| Scoring regression for item-mode guilds | HIGH (trust) | Revert the engine change; restore golden fixtures; post a dated correction in Discord |
| Silent zero BLP in Discovery | MEDIUM | Because BLP is derived, fix the contender rule and run recompute per need bucket for every Forever raid event |
| Bad migration deployed | MEDIUM | Forward-only fix migration; restore from Supabase point-in-time recovery only if data was destroyed |
| Beta night failure | MEDIUM | Switch to the paper fallback; enter awards after the raid with keys; post-night reconciliation script |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Stale defect todo, untyped service client | P1 Defect fixes | Re-verification table in the phase plan; typed client catches a deliberately bad table name in a test |
| 2 Nullable FK and dual-mode drift | P3 (schema); P2 (capability resolver) | XOR CHECK in the migration; reader audit list with a test per reader |
| 3 BLP silent zero and pin double count | P1 (#4), P3, P4 | Property tests on recompute; BLP rows exist after a staged Discovery raid |
| 4 Scoring regression and Lua drift | P3 | Golden fixtures byte-identical; export `format_version` test |
| 5 Name-keyed joins (GH-269) | P2 | Manifest zod schema; duplicate-id and unknown-token tests |
| 6 Seed-once copies, NOT NULL history FKs | P2; used by P4 | Idempotent sync test; Desk awards an item not yet in the catalog |
| 7 Volatile Forever data on the critical path | P2, P3, P4 | No runtime fetch in code (grep test); no hardcoded raid dates; Desk works with unknown boss |
| 8 Addon on the Forever client | P4 | Desk acceptance passes with no addon; Forever-client verification task recorded |
| 9 Desk races, undo, stale order, UTC night | P1 (#4), P4 | Race and double-submit tests; synchronous single-bucket recompute; undo test |
| 10 Discord rate limits | P4 (links in P1) | Burst test of 20 awards produces one edited message with no 429s |
| 11 Migration ordering, no CI on SQL | All (rules set in P1) | PR checklist; no breaking schema change shares a deploy with its code |
| 12 RLS gaps | P3, P4 | Policy matrix tests per new table |
| 13 Premature beta night | P4 | Staging replay passes before the live night; fallback named |
| 14 PostHog flags for behaviour | P3, P4 | `list_mode` and desk gate in DB; grep finds no data-writing component behind `useFeatureFlag` |
| 15 Power-feature loss, hidden "why" | P5 (P3 and P4 for new screens) | Owner-signed keep, move or remove list; breakdown affordance on every score surface |
| 16 Copy drift, jargon, mobile | P5 (P3 and P4 own screens) | Em-dash test; copy sheet sign-off; 375px checks |
| 17 Hardcoded need taxonomy | P3 (manifest support in P2) | Officer can add, rename and merge a need without a deploy; merge remaps BLP |

## Sources

- Codebase, origin/main 523e2efe (HIGH): `app/services/expansionSeeder.ts`, `data/token-class-mapping.ts`, `app/api/addon/guild-data/route.ts`, `app/api/addon/export-string/route.ts`, `app/api/bot/priority/route.ts`, `app/api/loot-history/bulk/route.ts`, `app/api/addon/loot-award/route.ts`, `lib/loot/loot-history-rows.ts`, `lib/addon/award-session.ts`, `lib/discord-loot-announcements.ts`, `app/api/discord/post-raid-summary/route.ts`, `utils/blp/recompute.ts`, `utils/supabase/service-role.ts`, `utils/feature-flags.ts`, `utils/feature-gate.ts`, `domain/scoring/engine.ts`, `.github/workflows/deploy-migrations.yml`, `.github/workflows/refresh-item-data.yml`, `supabase/migrations/README.md`
- Migrations (HIGH): `20260101000000_baseline_schema.sql` (loot_submission_items, loot_history), `20260609000001_blp_recompute_from_history.sql`, `20260913000000_fix_naxx_token_names.sql` (GH-269), `20261001120000_allow_second_same_night_award.sql`, `20261003120000_unique_live_loot_list_item_positions.sql`, `20261003180000_policies_require_active_guild_membership.sql`
- Git history (HIGH): PRs #290/#301, #295/#307/#322, #363, #391, #269, #284; RLS fix commits b7a91358, edfeb443, 3b930894, 217fd2e1
- Planning docs: `.planning/workstreams/forever/MILESTONE-BRIEF.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md`, the two pending todos (Forever data checks dated 2026-09-25)
- Forever client and addon API, LOW (unofficial, unverified against Blizzard): [Gamewave on Midnight addon restrictions in Forever](https://gamewave.fr/world-of-warcraft-forever/wow-forever-les-restrictions-d-addons-de-midnight-seront-aussi-appliquees/), [GFinity Forever UI and addons guide](https://www.gfinityesports.com/article/world-of-warcraft-forever-ui-addons-setup-guide), [CurseForge Chronicle Forever (interface 16001)](https://www.curseforge.com/wow/addons/chronicle-forever), [Warcraft Tavern on retail addons loading](https://www.warcrafttavern.com/forever/news/wow-forever-loads-your-retail-addons-keybinds/)
- Midnight restrictions and loot council addons, LOW to MEDIUM: [Icy Veins: combat addon restrictions eased](https://www.icy-veins.com/wow/news/combat-addon-restrictions-eased-in-midnight/), [warcraft.wiki.gg Patch 12.0.1 API changes](https://warcraft.wiki.gg/wiki/Patch_12.0.1/API_changes)
- Forever loot rules, LOW: [GuildOrder Forever loot systems wiki](https://guildorder.com/games/wow_forever/wiki/loot-systems-for-a-10-and-a-20), [Arbiter Loot Council (Forever alpha)](https://www.curseforge.com/wow/addons/arbiter-loot-council)
- Discord rate limits, MEDIUM (no official doc page retrieved): [Javacord rate limits](https://javacord.org/wiki/advanced-topics/ratelimits.html), [space-node Discord rate limits explained](https://space-node.net/blog/discord-api-rate-limits-explained-2026)

---
*Pitfalls research for: LootList+ v2.0 WoW Forever Loot, Discovery to Known*
*Researched: 2026-10-12*
