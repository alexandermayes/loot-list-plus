# Requirements: LootList+ v2.0, WoW Forever Loot: Discovery to Known

**Defined:** 2026-10-12
**Workstream:** forever
**Core Value:** A Forever guild can run loot from day one without knowing a single item: raiders rank generic needs, officers settle every drop in seconds from a Drop Desk, and the whole product feels like a consumer app that just works.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Defects and privacy

- [x] **FIX-01**: Officer deleting or editing an award sees BLP recomputed for the affected item in the same request
- [x] **FIX-02**: Companion app receives real BLP and item priorities from the addon routes (queries `blp_tracking` and `guild_item_priorities`; PostgREST errors surface instead of returning empty)
- [x] **FIX-03**: Every Discord item link for a Forever guild opens `wowhead.com/forever/...` (loot announcements, post-raid summary, bot interactions); bot embed titles carry no em dash
- [x] **FIX-04**: Award receipts keep `donationBonus` and `raiderBonus` in the audited score snapshot
- [x] **FIX-05**: The `master_loot_awarded` analytics event carries no player name and reports the item, not the review status
- [x] **FIX-06**: Addon and bot routes use a typed service-role client so a query against a nonexistent table fails typecheck

### Expansion format (SEED-001)

- [x] **EXPN-01**: Officer creating a Forever guild gets Barrow Deeps, Hyjal Summit and Onyxia's Lair with bosses seeded from a manifest keyed on `wowhead_id`; unverified bosses are marked provisional
  - Clarified 2026-10-14 (D-16): the `wowhead_id` key applies to items; bosses are manifest entries keyed by name/slug until an encounter id is confirmed.
- [x] **EXPN-02**: The seeder resolves every expansion through one registry; no displayName if/else chains remain
- [x] **EXPN-03**: The five existing expansions seed byte-identical rows through adapters (golden-row snapshot test)
- [x] **EXPN-04**: A Vitest manifest gate rejects duplicate ids, missing token classes, phase or raid gaps, and name mismatches before merge
- [x] **EXPN-05**: Catalog sync for Forever is idempotent and never deletes or renames a referenced row
- [x] **EXPN-06**: wago.tools snapshots are committed with provenance; no runtime or test code fetches wago or Wowhead live

### Discovery lists

- [ ] **DISC-01**: Officer can set a raid tier's list mode to Discovery; existing tiers stay Known with unchanged scores (golden fixtures)
- [ ] **DISC-02**: Raider in a Discovery guild fills one five-row, one-column need picker (slot, armour class where it matters, stat family) in under 60 seconds on a phone
- [ ] **DISC-03**: Raider sees a points budget as one sentence and cannot exceed it (weapons and trinkets Reserved, jewellery and tier Limited, others Unlimited)
- [ ] **DISC-04**: Raider gets a spec-based default list and can accept it with one tap ("Looks right")
- [ ] **DISC-05**: Raider's one picker fans out to every Discovery raid tier in the expansion (per-raid need rows, no synthetic tier)
- [ ] **DISC-06**: Need rows flow through submissions, approval, snapshots, master sheet, exports and BLP as `loot_items` rows with `kind = 'need'`; every reader has a tested mode branch
- [x] **DISC-07**: Raider ranked on a need accrues BLP for that need before any item exists
- [ ] **DISC-08**: Score shows standing and interest separately, each with a one-sentence explanation; totals unchanged for Known guilds
- [ ] **DISC-09**: Raider sees a "What would it take" line on every score
- [ ] **DISC-10**: Officer picks one of three loot style presets at setup, with Fine-tune behind disclosure
- [ ] **DISC-11**: Raider can open the picker from a Discord "Set your 5" link
- [x] **DISC-12**: Discovery schema ships expand-only, before the code that reads it, with an RLS matrix per new table and a PGlite migration test

### Drop Desk

- [ ] **DESK-01**: Officer records a drop on raid night by pasting an item link or typing a name, with unknown boss and unknown item both allowed
- [ ] **DESK-02**: Officer classifies the drop with the same need picker; a revealed item is pinned to its need (pin table, unpin is a delete)
- [ ] **DESK-03**: Officer sees candidates ordered by response (main spec, off spec, pass or absent), then total, then standing, with a one-sentence verdict per candidate
- [ ] **DESK-04**: Raider responds Need, Off-spec or Pass from the phone or Discord and the Desk ordering updates within 5 seconds
- [ ] **DESK-05**: Officer awards, sends to council with a reason, or marks disenchanted; the award, decision record and BLP recompute land in one transaction with an idempotency key
- [ ] **DESK-06**: Two officers cannot award the same drop; the second sees who claimed it
- [ ] **DESK-07**: Officer can undo an award; the drop reopens, BLP is recomputed, and the Discord message is edited
- [ ] **DESK-08**: Addon award for an item the guild has no row for lands in the Desk inbox instead of a 404
- [ ] **DESK-09**: Guild's Discord channel shows one edited message per raid night with a reason on every award
- [ ] **DESK-10**: Chase-item and legendary drops open a council card with a published one-line reason
- [ ] **DESK-11**: Desk is free for all guilds, enabled by a server-side guild setting (not a PostHog flag)
- [ ] **DESK-12**: Desk works browser-only with no addon and no master loot

### Rehearsal

- [ ] **REH-01**: A past raid's award log replays on a staging guild with `loot_history`, BLP and the Discord post reconciled
- [ ] **REH-02**: User-facing copy for picker, presets, Desk and Discord is signed off by the owner; an automated test blocks em dashes in on-screen text
- [ ] **REH-03**: Picker and Desk pass 375px mobile checks

### Simplicity pass

- [ ] **SIMP-01**: Owner receives a usage-backed keep, move or remove list for every officer and raider surface (aggregated PostHog, no names)
- [ ] **SIMP-02**: Sidebar reduced from up to 11 entries to a raider set (My list, Raid night, History) and an officer set (plus Drop Desk, Roster, Settings)
- [ ] **SIMP-03**: Every retained setting stays reachable under Advanced; no power feature removed without owner sign-off
- [ ] **SIMP-04**: `LootListContent`, `DashboardContent` and raid tracking are restructured only behind characterization tests
- [ ] **SIMP-05**: Help content updated in the same change as each cut

## v2 Requirements

Deferred to a later milestone. Tracked but not in the current roadmap.

### Known mode transition

- **KNOWN-01**: Raider can swap a generic need for a real item once Wowhead holds most of a tier (around reset 3)
- **KNOWN-02**: Officer can close generic entries for a tier (around reset 6) with BLP carried across

### After real drops exist (Dec 9 onward)

- **DROP-01**: Weekly fairness digest and drought alert
- **DROP-02**: First-seen reveal card and auto-suggest pin on reveal
- **DROP-03**: Forever revealed-item map pooled across guilds (at least 10 guilds per number, no guild names)
- **DROP-04**: Public guild loot record (opt-in) and end-of-tier recap card
- **DROP-05**: Slot soft reserves for pugs and alts
- **DROP-06**: Crafted-tier essence queue (only if crafted tier and disenchant-to-essence are confirmed live)
- **DROP-07**: Addon auto-classify at the corpse (only after the Forever-client API spike)

### Platform

- **PLAT-01**: Supabase Realtime Broadcast as the Desk change signal, polling as fallback
- **PLAT-02**: Slot-weighted loot-cost toggle (plumbing ships at zero in v1)
- **PLAT-03**: Zero-setup Discord-based guild creation
- **PLAT-04**: One-paste switch from TMB or softres.it
- **PLAT-05**: Co-officer phone Drop Desk
- **PLAT-06**: Legacy expansion data converted fully to wowhead_id keys (after Nov 30, under the golden-row gate)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Raid assignments, positioning maps, AI comp optimiser, HQ dashboard | The owner is building these as a separate tool |
| GDKP, gold or resource bidding | Banned on Forever |
| Pre-launch BiS or guessed loot tables | Blizzard hides stats until an item drops; guesses would be wrong and erode trust |
| DKP-style spending, officer-typed GP per item | Officers called That's My Biz too clunky; the point is fewer knobs |
| Custom need-taxonomy builder | A fixed taxonomy keeps the picker a 60-second task |
| Mandatory raider addon | Forever addon support is unconfirmed; the web path must stand alone |
| In-encounter addon voting | Forever reportedly inherits Midnight's addon lock during encounters |
| AI auto-award with no confirm | Every award needs a human and a reason |
| Cross-guild leaderboards with names | Privacy constraint: no player or guild names in published data |
| WeakAuras delivery | WeakAuras does not support Mainline-API clients |
| Known mode transition in v1 | Lands after Dec 9 plus three resets |

## Open Decisions (researched defaults applied)

Defaults from `.planning/research/SUMMARY.md` apply unless the owner overrides: stat families keep Healing and Spell damage separate; "Tier piece" is off the default picker; separate lists per raid size off; 10-point budget (Big 3, Medium 2, Standard 1); bot `/priority` labelled "by list rank" until the shared ranker lands, then Loot Score; off-spec ranks below every main-spec need; "Count me in for rare drops" defaults on; polling-only Desk in v1. Owner inputs still needed: spec defaults review (by Oct 26), copy sign-off (by Oct 26), Forever boss names (by Oct 21), addon scope and owner for the separate repo (by Oct 21), beta guild and named paper-fallback officer (by Nov 9).

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 1 | Complete |
| FIX-02 | Phase 1 | Complete |
| FIX-03 | Phase 1 | Complete |
| FIX-04 | Phase 1 | Complete |
| FIX-05 | Phase 1 | Complete |
| FIX-06 | Phase 1 | Complete |
| EXPN-01 | Phase 2 | Complete |
| EXPN-02 | Phase 2 | Complete |
| EXPN-03 | Phase 2 | Complete |
| EXPN-04 | Phase 2 | Complete |
| EXPN-05 | Phase 2 | Complete |
| EXPN-06 | Phase 2 | Complete |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 4 | Pending |
| DISC-03 | Phase 4 | Pending |
| DISC-04 | Phase 4 | Pending |
| DISC-05 | Phase 4 | Pending |
| DISC-06 | Phase 3 | Pending |
| DISC-07 | Phase 3 | Complete |
| DISC-08 | Phase 4 | Pending |
| DISC-09 | Phase 6 | Pending |
| DISC-10 | Phase 4 | Pending |
| DISC-11 | Phase 4 | Pending |
| DISC-12 | Phase 3 | Complete |
| DESK-01 | Phase 5 | Pending |
| DESK-02 | Phase 5 | Pending |
| DESK-03 | Phase 5 | Pending |
| DESK-04 | Phase 6 | Pending |
| DESK-05 | Phase 5 | Pending |
| DESK-06 | Phase 5 | Pending |
| DESK-07 | Phase 6 | Pending |
| DESK-08 | Phase 5 | Pending |
| DESK-09 | Phase 6 | Pending |
| DESK-10 | Phase 6 | Pending |
| DESK-11 | Phase 5 | Pending |
| DESK-12 | Phase 5 | Pending |
| REH-01 | Phase 7 | Pending |
| REH-02 | Phase 7 | Pending |
| REH-03 | Phase 7 | Pending |
| SIMP-01 | Phase 8 | Pending |
| SIMP-02 | Phase 8 | Pending |
| SIMP-03 | Phase 8 | Pending |
| SIMP-04 | Phase 8 | Pending |
| SIMP-05 | Phase 8 | Pending |

**Coverage:**

- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-12*
*Last updated: 2026-10-12 after roadmap creation (8 phases, 44/44 mapped)*
