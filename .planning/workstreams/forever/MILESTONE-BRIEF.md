# Milestone v2.0 Brief: WoW Forever Loot, Discovery to Known

Workstream: forever. Written 2026-10-12 from the Sep 28 Forever loot PRD (summarised in
.planning/todos/pending/2026-09-13-build-world-of-warcraft-forever-support-with-a-repeatable-ex.md),
the Sep 29 and Oct 6 Big Yikes officer meetings, SEED-001, and the owner's direction in session.

## Goal

A Forever guild can run loot from day one without knowing a single item: raiders rank generic
needs, officers settle every drop in seconds from a Drop Desk, and the whole product feels like a
consumer app that just works. LootList+ should become the go-to loot tool for all of World of
Warcraft, Forever first.

## Owner direction (verbatim intent)

1. "Dive deep and research really hard on LootList+."
2. "Get this to a place that's very simple to use, very consumer product oriented that doesn't
   really need abstraction. Something that just works." Apply that pass across the board, not just
   to new screens.
3. "Come up with some new features that could be added to LootList+ that would be the go-to loot
   tool for all World of Warcraft, especially for Forever."
4. Raid assignments (roster import, per-boss sheets, positioning maps, AI comp optimiser) are a
   SEPARATE tool the owner is building. Out of scope here except, at most, a later read API.

## Hard facts about WoW Forever (from the PRD research and the Sep 25 beta data check)

- Forever launched beta 2026-09-17, worldwide launch 2026-11-04, included in the WoW subscription.
- Raids open 2026-12-09, not at launch: Barrow Deeps (10), Hyjal Summit (20), Onyxia's Lair (40),
  one difficulty each. Every future tier is expected to start hidden too.
- Blizzard hides item stats by design until an item drops on your server. Stats are computed
  server-side and the boss-drop table ships empty, so no data source (wago.tools, Wowhead,
  Blizzard API) can reveal raid loot early. Named loot lists are impossible at raid open.
- The Forever client is built on the retail client (Encounter Journal code present, data absent).
- wago.tools exposes Forever under product wow_classic_beta as version 1.60.x (CSV per DB2 table,
  scripted access works). Item ids mostly 230000 to 289999. No new InventoryType values (no new
  item slots). Tier tokens not yet identified; a "[DNT] Crafted Tier Piece Placeholder" exists.
  ChrRaces adds Skyborne Elves (ids 95, 96). Wowhead has a Forever item database
  (wowhead.com/forever/item=<id>, tooltip at nether.wowhead.com/forever/tooltip/item/<id>) but no
  drop sources yet.
- Master loot is unconfirmed; GDKP is banned; every boss has rare chase items; tier sets appear
  role-split; crafted tier may consume disenchanted raid gear.
- Beta changes relevant to roles and comp: several debuffs now personal (Scorch, Shadow Weaving,
  ISB, Winter's Chill), Windfury reworked to a main-hand enhancer that now helps Feral Druids,
  totems still party-wide, quest and dungeon loot buffed. Leveling 1 to 60 about 100 to 130 hours.

## Product design already decided in the PRD (pending owner decisions in its section 15)

- Per-tier Discovery mode: raiders rank generic needs instead of items, e.g. "Two-hand weapon",
  "Tier piece #1", "Trinket #2". Preferred granularity: item type plus main stat, e.g.
  "two-handed weapon + strength" (too generic causes conflicts, too specific pigeonholes players).
- Quiz-style need picker: three categories (item slot, armour class, main stat), one column, five
  rows, replacing the current two-column layout that confused people.
- Points-based restriction kept: weapons and trinkets always restricted, then jewellery and tier,
  then everything else. Rare 1% drops and legendaries go to loot council.
- Loot Score split into standing (attendance, bad-luck protection, modifiers, a new slot-weighted
  loot cost) and interest (need rank).
- Drop Desk: classify each drop, order candidates by response then score, record audited council
  overrides. Pin a revealed item onto a need. Switch a raid to Known mode once loot is mapped.
- Bad-luck protection accrues by slot in Discovery mode, then attaches to the specific item once it
  has been seen.
- Transition plan: after about two resets Wowhead should hold 95 to 97% of items; open real item
  submissions around reset 3, close generic entries by reset 6. This Known-mode transition is
  DEFERRED to a later milestone (it lands after 2026-12-09 plus three resets).
- Officer meeting dates: Forever lists usable by 2026-10-31, Drop Desk by 2026-11-30.
- Attendance and signup points as roll modifiers were floated as an alternative "modified roll
  system"; EPGP-style tracking was named as a longer-term, loot-table-independent option because
  That's My Biz is too clunky for officers. Attendance, effort and decay are valued by the guild.

## Scope selected for v2.0

1. Fix five existing Forever loot defects first (see
   .planning/todos/pending/2026-09-28-fix-five-defects-found-in-the-forever-loot-code-review.md):
   addon routes query tables that do not exist (bad_luck_protection, item_priorities,
   loot_items.slot); Discord /priority selects loot_submissions.items which does not exist and
   sorts by raw rank; addon awards never set raid_event_id so they skip BLP; award DELETE and PATCH
   never recompute BLP; Discord links point at retail Wowhead and the raid summary hardcodes
   /classic/.
2. Discovery mode lists by Oct 31.
3. Drop Desk by Nov 30.
4. SEED-001: repeatable expansion-onboarding format. Per-expansion manifest consumed generically
   by app/services/expansionSeeder.ts (replace displayName if/else chains at lines 382 to 405 and
   the hardcoded registry at 195 to 207), wowhead_id as the join key for classifications, roles and
   token classes (names display-only; GH-269 was 24 Naxx tokens misattached in 9 guilds because
   names were the key), and a verification gate per expansion like
   data/__tests__/classic-wow-raids.test.ts. For Forever the manifest starts as raids and bosses
   only, because loot is hidden.
5. Simplicity pass across the board (consumer-grade, no abstraction, no manual).
6. New feature ideas that would make LootList+ the go-to loot tool for all WoW, Forever first.

## Out of scope for v2.0

- Raid assignment tool, positioning maps, AI comp optimiser, HQ dashboard, Big Yikes bot work.
- Known mode transition (resets 3 to 6). Deferred, lands after Dec 9 plus three resets.
- Any surface that depends on Forever raid loot data existing before Dec 9.

## Existing product (what is already built, do not re-research)

LootList+: Next.js 16 App Router, React 19, Supabase (Postgres, Auth, RLS), Tailwind, Stripe
Premium ($4.99/mo or $39/yr per guild), Discord bot (discord.js), in-game addon (Lua, exports and
award import), Electron companion app, PostHog analytics. Ranked loot lists, attendance-weighted
Loot Scores with breakdowns, bad-luck protection, Warcraft Logs import, reserves (soft-reserve
runs), master sheet, loot history and awards, Discord OAuth signup, five supported expansions
(Classic, TBC, Wrath, Cata, MoP) via hand-built data files, and WoW Forever signup, game version
and raid-aware dashboard shipped in PRs #274, #280, #281, #287, #288, #291. Scoring lives in
domain/scoring, loot engine in domain/loot. Design system workstream (v1.1) completed 2026-09-24.
Codebase map in .planning/codebase/.

## Constraints carried over

- Owner sign-off required on user-facing copy. No em dashes anywhere in user-facing text.
- Migration-only PRs need --admin merge and auto-deploy about 12 seconds after merge.
- Privacy: no player or guild names in analytics or published data.
- Any feature, pricing or positioning change triggers a full surface sweep (site, schema,
  Discord, GitHub, legal, external posts).

## Corrections from research (2026-10-12, see .planning/research/SUMMARY.md)

- Seeder line numbers above are stale. Registry `EXPANSION_DATA` is at app/services/expansionSeeder.ts:224-237; displayName if/else chains at :449-462 (classifications) and :470-481 (roles); name-based token lookup at :532 and at read time in lib/loot-items-query.ts:173-175.
- The Lua addon lives in the separate repo alexandermayes/loot-list-plus-addon; there is no addon/ directory here (CLAUDE.md is stale on this).
- Defect status on this branch: #3 fixed (PR #322); #2 query fixed (PR #363), raw-rank ordering is deliberate until the shared ranker lands; #1 still queries bad_luck_protection (should be blp_tracking) and item_priorities (should be guild_item_priorities, column item_id) with errors swallowed; #4 open (bulk/route.ts DELETE ~445-537, PATCH ~558-659); #5 open with a third site at post-raid-summary/route.ts:281 and discord-bot/interactions.js:79-81 (embed titles also carry em dashes). Extra: ALLOWED_COMPONENT_KEYS at bulk/route.ts:19 drops donationBonus and raiderBonus.
- Privacy: app/(app)/master-loot/_client.tsx:262 sends master_loot_awarded with character_name and uses review status as item_name. Fix in Phase 1.
- Sidebar has up to 11 entries (app/components/Sidebar.tsx:44-227), four loot-named; /master-loot renders submission review. Target for Phase 8.
