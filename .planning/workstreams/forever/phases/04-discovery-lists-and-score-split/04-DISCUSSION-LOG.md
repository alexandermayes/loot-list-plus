# Phase 4: Discovery Lists and Score Split - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-11-10
**Phase:** 04-discovery-lists-and-score-split
**Areas discussed:** Ranking shape, Budget and defaults, Presets and score split, Discord link and schema

Sixteen questions in four batches; the owner took the recommended option on every one. Phase 3 decisions were carried forward without re-asking.

---

## Ranking shape

| Question | Options | Selected |
|----------|---------|----------|
| How far apart should need #1 and need #5 score? | 4 points (ranks 50 to 46, attendance-sized) / 12 points (ranks 50, 47, 44, 41, 38) / You decide | 4 points |
| Do officer class prio pools apply to need rows? | No, a need is open to every class and spec that can use it / Yes, like items (officers set a pool on a need row) | No |
| Five main-spec rows only, or the Off-spec and rare-drops toggles too? | Five rows only (toggles arrive with the Desk) / Add Off-spec now (rows at off-spec ranks) / Add both now (plus a per-list flag column) | Five rows only |
| Does an awarded need's row lock, and how freely may raiders re-rank? | Same as items (officer approval; award slot locks when the guild has them on) / Never lock / Always lock | Same as items |

**Notes:** All three Forever raids are Phase 1, so one submission holds five needs times three tiers; the migration widens the slot check from 1..2 to 1..8 so each tier takes one slot at the need's rank.

## Budget and defaults

| Question | Options | Selected |
|----------|---------|----------|
| Is the 10-point budget fixed or a guild setting? | Fixed at 10 (Fine-tune may expose it later) / Guild setting now (new column) | Fixed at 10 |
| Where do the 22 per-spec default lists live and who maintains them? | Frozen data file reviewed by the owner / Computed from roles with no file / Officers edit per guild (scope creep) | Frozen data file |
| Which need rows can a raider pick? | Class and spec fit (lighter armour allowed) / Any need row | Class and spec fit |
| Where does the picker live? | Replaces the 50-rank editor on /loot-list when every raid in the phase is Discovery / Its own /needs page | Replaces the editor |

## Presets and score split

| Question | Options | Selected |
|----------|---------|----------|
| Which three loot style presets? | Research trio (Reward attendance, Even rotation, Officers decide, score advises) / Council variant (third preset shows attendance and bad luck protection side by side) / You name them | Research trio |
| Store the chosen preset on the guild? | Store it (guild_settings.loot_style column, "Customised" computed) / Apply only (no column) | Store it |
| Where does the standing and interest split show? | All guilds (same total, presentation only) / Discovery guilds only | All guilds |
| What happens on Looks right or Save my 5? | Officer review (pending, same approve, reject and reopen paths) / Auto-approve | Officer review |

## Discord link and schema

| Question | Options | Selected |
|----------|---------|----------|
| How does the Set your 5 link reach raiders? | App sends it (officer button posts a channel message and DMs linked members, no bot deploy) / Bot slash command /setmy5 (Railway deploy) / Both | App sends it |
| What does the link open? | The picker directly on /loot-list for the raider's main character, sign-in first if needed / The Overview page with a card | Picker directly |
| Close Phase 3 WR-04 (tier delete cascades through need rankings, awards and BLP)? | Guard now (WHEN-gated BEFORE DELETE guard on raid_tiers in the Phase 4 migration) / Accept until Phase 5 | Guard now |
| What do the master sheet, Summary and Raid Mode list once the picker is live? | Ranked needs only (keepRankedNeedRows stays) / Every seeded need (145 per tier) | Ranked needs only |

## Claude's Discretion

- Exact eligibility matrix and the five-key default per spec (owner reviews the file)
- Exact knob values behind each preset
- Tier-to-slot order at save time; chunk size or body shape for the WR-02 fix
- Picker bottom-sheet flow, icons and card layout (UI design contract)
- How the Overview card and the deep link share one entry component
- Response shape of the submit route's eligibility refusal

## Deferred Ideas

- Off-spec rows and the rare-drops flag (Phases 5 and 6)
- Guild-tunable budget under Fine-tune
- Officers editing spec defaults per guild (post-v2.0)
- Council-style preset with a preparation score (after that component ships)
- Slot-weighted loot cost component (PLAT-02)
- Bot /priority for needs, bot /score beyond attendance (Phase 5 and later)
- Raid-tracking edit re-import of need awards (carry into Phase 5)
- A /setmy5 bot command if raiders ask for it
