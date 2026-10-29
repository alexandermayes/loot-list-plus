# Phase 3: Discovery Schema and Need Pipeline - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

A raid tier can run in Discovery mode (`raid_tiers.list_mode = 'discovery'`) and holds seeded need rows (`loot_items.kind = 'need'`) that raiders will later rank instead of real items. Need rows flow through submissions, approval, snapshots, the master sheet, exports and BLP without being silently dropped or crashing any reader, and a raider ranked on a need accrues BLP for it before any item exists. Every Known guild stays exactly as it is (Loot Score and seed-row golden fixtures byte-identical). The schema ships first, expand-only, in its own migration-only PR.

Out of this phase: the need picker and score split (Phase 4), the Drop Desk and pinning revealed items (Phases 5 and 6), the Known-mode transition (deferred milestone).

</domain>

<decisions>
## Implementation Decisions

### Carried forward (already decided, not re-asked)
- **D-00a:** Need rows live per raid tier; one picker fans a raider's ranking out to all three Forever raids (owner Decision 1).
- **D-00b:** Column `raid_tiers.list_mode`, values `known` and `discovery`, default `known`.
- **D-00c:** Stat families keep Healing and Spell damage separate (Decision 2); "Tier piece" is off the default picker (Decision 3); separate lists per raid size off (Decision 4); pins live in `loot_item_need_pins`. The loot-cost columns no longer ship in this phase (see D-18).
- **D-00d:** The migration is expand-only, ships in its own migration-only PR (`--admin` merge, non-raid day) and is live before any code that reads it; RLS matrix (raider, officer, non-member, ex-member) per new table; PGlite migration test (DISC-12).

### Officer switch and timing
- **D-01:** Forever raid tiers start in Discovery. Seeding (`syncExpansionCatalog`, `seedMode: 'sync'`) creates Forever tiers with `list_mode = 'discovery'` and their need rows. Every legacy tier stays `known`. — **Reversibility:** costly — need rows and BLP accrue against Discovery tiers from the first raid night.
- **D-02:** Ship the plumbing in Phase 3, hold the visible switch. Schema, need rows and reader branches ship now; the officer-facing toggle and anything raiders see of need rows turn on with the Phase 4 picker, so nobody lands on a half-built screen. Plan-phase decides the gating mechanism (feature flag or simply not rendering the toggle until Phase 4).
- **D-03:** An officer may switch a Discovery tier back to Known only while no one has ranked a need on it and no need award exists; after that the switch is blocked with a reason. The real Known transition (mapping needs to items) stays deferred.
- **D-04:** Changing `list_mode` uses the existing `manage_settings` permission, the same gate as other tier settings in `ExpansionManager`.
- **D-05:** Existing Forever tiers (created by Phase 2 seeding or `sync:forever`) are flipped to Discovery and get their need rows by a reviewed, idempotent backfill limited to the Forever expansion. Legacy tiers are never touched. Planner decides whether the flip is SQL in the migration and the need-row seed runs through the sync path (`npm run sync:forever -- --apply`), so the taxonomy has one TypeScript source. — **Reversibility:** costly — backfilled rows are what raiders rank on.

### Cost scheme
- **D-06:** Need rows carry the 10-point budget scheme: Big 3, Medium 2, Standard 1, stored in the existing `loot_items.allocation_cost` column (no new cost column). Phase 4's budget reads it. — **Reversibility:** costly — Phase 4's picker copy and budget sentence depend on it.
- **D-07:** Big = weapons and trinkets; Medium = rings, necks, cloaks; Standard = armour slots. Tier stays off the default picker.
- **D-08:** Restriction class is mirrored from the cost tier: Big rows `Reserved`, Medium rows `Limited`, Standard rows `Unlimited`, so readers and bracket validation that key on `classification` keep working without a Discovery special case.

### Need list and naming
- **D-09:** One need row = slot plus stat family, with armour class only where it matters (e.g. "Chest, Plate, Strength", "Two-hand weapon, Strength", "Trinket, Healing", "Ring, Physical").
- **D-10:** Display names read as plain words with commas ("Two-hand weapon, Strength"); no em dashes. Each row has a stable `need_key` (e.g. `two-hand-weapon.strength`) plus a display name. Display copy is proposed here and signed off by the owner with the Phase 4 picker copy (Oct 26).
- **D-11:** Every Discovery tier gets the same full need set, so a raider's needs map to the same keys in Barrow Deeps, Hyjal Summit and Onyxia's Lair and BLP accrues per tier.
- **D-12:** The taxonomy is a frozen list in `domain/loot/needs.ts` with tests (manifest-gate style). Keys never change once shipped; a rename carries an alias the way tier names carry `previousNames`. It is the single source for seeding, the picker and the Drop Desk. — **Reversibility:** one-way — shipped `need_key` values are referenced by submissions, BLP and pins.

### What readers show before Phase 4
- **D-13:** Need rows render as a NeedLabel: the need name and a neutral icon, no Wowhead link, no boss. On the master sheet they group under a "Needs" section per tier instead of a boss.
- **D-14:** These surfaces exclude Discovery tiers or need rows outright rather than branching: reserves and soft-reserve runs; BIS import; addon and companion exports (filter `kind = 'item'`, so the addon never sees a row without a `wowhead_id`); bot `/priority` stays item-only until the Drop Desk (Phase 5).
- **D-15:** An award against a need records `loot_history.loot_item_id` = the need row and a new `loot_history.awarded_item_id` = the real item (null until the Desk exists). The BLP recompute SQL stays unchanged because it already keys on `loot_item_id`; only reports that show item names read `awarded_item_id`. — **Reversibility:** one-way — new column on `loot_history`, and the keying defines how BLP accrues for every Discovery award.
- **D-16:** A reader that meets a need row it was not written for skips it and logs a warning once per request: never crash, never drop silently. Every reader still gets an explicit, tested mode branch (DISC-06); the fallback is a safety net, not the plan.

### Plan-phase review of research (owner answers, 2026-10-19)
- **D-17:** In Phase 3 the list-mode PATCH accepts `discovery` only for tiers of the Forever expansion. The guard lives in one place so Phase 4 or the owner can lift it. Legacy tiers can never be switched to Discovery in this phase.
- **D-18:** The loot-cost `guild_settings` columns are deferred to the phase that reads them (Phase 4 or 5). They do not ship in the Discovery migration, so the `guild-data` addon payload is unchanged.
- **D-19:** A need award consumes the winner's list entry for that need, the same way receiving an item skips one entry today. Build the pure identity-key logic now (tested, unused by Known guilds) and wire it into the receive-skip sites.
- **D-20:** `@electric-sql/pglite` is added as an exact-pinned devDependency at `0.5.8` with no execution checkpoint, so the DISC-12 migration test is committed and runs in CI.
- **D-21:** ROADMAP success criterion 2 ("every tier that existed before stays Known") is read as every non-Forever tier. Forever tiers are Discovery after the D-05 backfill, and tests assert exactly that. [informational]

### Plan-check review (owner answers, 2026-10-19)
- **D-22:** The D-02 hold on ranking needs is enforced server-side, not only in the UI. Until Phase 4 lifts it, the submit route and the `save_submission_items` RPC reject `kind = 'need'` rows, so no raider can rank a need (and start accruing BLP) by calling the API directly. The approval, snapshot, master sheet, export and BLP flow for need rows is proven with fixture tests. Phase 4 removes the guard, including the small SQL part.
- **D-23:** Shield, Off-hand item and Relic need rows cost Medium (2 points, `Limited`), as the research proposed. Wands fold into the Ranged weapon need rows. These costs ship in the seeded rows; the Oct 26 review covers display names only.

### Second plan-check review (owner answers, 2026-10-20)
- **D-24:** Close the expansion-rename route around D-17. Browser sessions (anon, authenticated) cannot rename an expansion to or from 'Forever', and cannot insert one, unless the planner finds a browser path that legitimately needs to insert it (then explain and keep inserts open). One narrow, WHEN-gated trigger on `expansions`; no accepted residual for this.
- **D-25:** The owner reviews the frozen need key list (`need_key` values and stat families from `domain/loot/needs.ts`) at the existing PR 1 merge stop (03-02). PR 2, which freezes the keys, does not merge until the owner confirms the list there. Display names are still reviewed Oct 26.

### Third plan-check review (owner answer, 2026-10-20)
- **D-26:** Close the tier-move route around D-17. Browser sessions (anon, authenticated) cannot change `raid_tiers.expansion_id`; one WHEN-gated trigger, since no app path moves a tier between expansions. Plans that may fix a reader in-task (03-17, 03-18) list those candidate source files as conditional edits. Plans at the file or size limit (03-06, 03-10, 03-13) stay unsplit; the risk is recorded in their summaries. [informational for the size note]

### Final plan-check review (owner answers, 2026-10-20)
- **D-27:** Browser sessions (anon, authenticated) cannot delete need rows from `loot_items`; one WHEN-gated `BEFORE DELETE` trigger (`OLD.kind = 'need'`), so a direct delete can never silently drop need rankings or BLP credit. Item deletes are unchanged. The service role keeps delete rights.
- **D-28:** Plan 03-17 splits in two so each half stays at or under 10 files. Plans at the 10-file mark (03-04, 03-07, 03-18) carry the same size note as 03-06, 03-10 and 03-13. Planning finishes on the deterministic gates (frontmatter, plan structure, decision coverage, wave and file overlap) with no further checker round. [informational]

### Claude's Discretion
- The exact stat family list per slot and which slots carry an armour class, within D-09 and Decision 2 (planner proposes from research; owner reviews with the picker copy).
- The flag or rendering mechanism that holds the switch until Phase 4 (D-02).
- Whether the Forever backfill is pure SQL or SQL plus `sync:forever` (D-05).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/workstreams/forever/ROADMAP.md` (Phase 3 section) — goal, success criteria, defaults applied, risk and research topics
- `.planning/workstreams/forever/REQUIREMENTS.md` — DISC-01, DISC-06, DISC-07, DISC-12
- `.planning/workstreams/forever/MILESTONE-BRIEF.md` — product design already decided (granularity, restriction order, BLP by slot)
- `.planning/workstreams/forever/STATE.md` — standing constraints 1 to 5

### Research
- `.planning/research/SUMMARY.md` — "Phase 3: Discovery schema and taxonomy" outline, conflict table rows 3 (BLP keying), 7 (need grain), 10 (column name), 16 (sync scope), owner decisions 1 to 6
- `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, `.planning/research/STACK.md` — schema shape, reader list, pitfalls 2, 11, 12, 14

### Prior phase outputs this phase builds on
- `.planning/workstreams/forever/phases/02-expansion-onboarding-manifest/02-CONTEXT.md` — manifest, registry and sync decisions (D-08 lazy-sync rule, D-11 Forever-only sync)
- `.planning/workstreams/forever/phases/02-expansion-onboarding-manifest/02-SECURITY.md` — residual risks still open (pin Forever mapIds; schema modules in the client-safe scan)
- `.planning/workstreams/forever/phases/01-forever-defect-and-privacy-fixes/01-CONTEXT.md` — read-error 500 policy (owner decisions 7 and 8) that every reader branch must keep

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/services/expansionCatalogSync.ts` (`syncExpansionCatalog`, `planCatalogSync`): insert-only, Forever-only sync; the natural place to seed need rows for Discovery tiers.
- `scripts/lib/forever-sync.ts` and `npm run sync:forever`: owner-run, dry-run-by-default path for backfilling existing Forever guilds.
- `loot_items.allocation_cost` and `loot_items.classification` already exist; D-06 and D-08 reuse them.
- `domain/loot/slot-capacity.ts`: per-item cap logic that needs a need branch (research: `maxCopiesForItem`).
- `utils/supabase/typed-service-role.ts` and `selectAllPagesOrThrow`: the typed, paged, error-checked read pattern every reader branch must follow.
- `data/expansions/__tests__/manifest-gate.test.ts`: the frozen-list test style to copy for `domain/loot/needs.ts`.

### Established Patterns
- Expand-only migrations with CHECKs added `NOT VALID` then validated; regenerate `lib/database.types.ts`; RLS matrix tests per table.
- Golden fixtures (`app/services/__tests__/__golden__/*.rows.txt`, Loot Score fixtures) run under `CI=true` and are never regenerated.
- Source-scan tests with floors and self-checks enforce cross-cutting rules (typed client, no names in analytics, no live fetch).

### Integration Points (reader audit, research list)
- BLP recompute SQL (`recompute_blp_for_item`), `lib/addon/member-ranked-items.ts` (`buildMemberRankedItems`), `app/api/addon/guild-data`, `app/api/addon/export-string`, `app/api/bot/priority`, `domain/loot/gargul-dft.ts`, the master sheet components, reserve and BIS routes, and every other reader of `loot_submission_items` and `loot_history`.
- `app/(app)/guild-settings/components/ExpansionManager.tsx` and `app/api/raid-tiers/route.ts`: where the held list-mode switch will live.

</code_context>

<specifics>
## Specific Ideas

- Name format example: "Two-hand weapon, Strength"; key format example: `two-hand-weapon.strength`.
- Budget sentence for Phase 4 to build on: 10 points over 5 rows, weapons and trinkets cost 3, rings, necks and cloaks 2, armour 1.

</specifics>

<deferred>
## Deferred Ideas

- Bot `/priority` for need rows: arrives with the Drop Desk (Phase 5).
- Known-mode transition (mapping needs to revealed items, closing generic entries): deferred milestone, after Dec 9 plus three resets.
- Pinning revealed items onto needs through the Desk UI: Phases 5 and 6 (the table ships here).
- Loot-cost `guild_settings` columns: the phase that reads them, Phase 4 or 5 (D-18).

</deferred>

---

*Phase: 03-discovery-schema-and-need-pipeline*
*Context gathered: 2026-10-19*
