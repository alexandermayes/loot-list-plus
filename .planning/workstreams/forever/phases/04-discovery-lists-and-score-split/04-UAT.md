---
status: complete
phase: 04-discovery-lists-and-score-split
source: [04-VERIFICATION.md]
started: 2026-11-11T08:18:07Z
updated: 2026-11-12T23:50:47Z
---

## Current Test

[testing complete]

## Tests

### 1. Raider fills the five-row picker on a real phone in under 60 seconds (SC1, DISC-02)
expected: Start from a Discovery guild with a character whose spec has a default, change at least two rows through the question sheet, and tap Save my 5. The whole flow takes under 60 seconds, one column, tap targets at least 44px, no horizontal scroll.
result: pass
evidence: Owner ran it on a real phone against production.

### 2. Layout at 320px, 343px and 375px, plus 200% zoom (SC1, SC2, SC5)
expected: Picker, question bottom sheet, budget footer, ScoreSplit tiles, master sheet popover, comparison modal, preset cards, list-mode row and the Send Set your 5 row show no clipping or horizontal scroll. The longest need sentence (Shoulders, Leather, Spell damage) wraps to two lines at 375px; the 409 reason wraps under the list-mode row at 320px; the eight-part standing sentence wraps inside the popover; a 300 character rejection note wraps with no max height.
result: pass
evidence: Owner checked every surface on production at 320, 343 and 375px and at 200% zoom. ScoreSplit tiles on the Overview of a Known guild at 320px: no clipping, no horizontal overflow (no element extends past the viewport); the total tile's label stacks one word per line beside the two tiles, cosmetic. Every other surface in this test needs a Forever guild with a Discovery tier.

### 3. Keyboard and screen-reader pass on the picker, question sheet and preset cards (SC1 to SC4)
expected: Rows reachable by Tab, the sheet traps focus and returns it, options announce pressed state, a blocked slot announces its reason, the budget live region announces changes, the saved-status region takes focus after save, Fine-tune announces expanded and collapsed, the preset radio group is arrow-key navigable.
result: pass
evidence: Owner ran the keyboard and screen-reader pass on production.

### 4. Light and dark themes for every new surface
expected: Warning panel (never the danger palette), cost markers (neutral, not traffic-light), ScoreSplit, preset cards and the Customised badge read correctly in both themes.
result: pass
evidence: Owner checked the warning panel, cost markers, preset cards and Customised badge in both themes on production. ScoreSplit on the Overview reads correctly in light and dark (neutral tiles, dark text on light, both sentences legible). Warning panel, cost markers, preset cards and the Customised badge need a Forever guild with a Discovery tier.

### 5. Signed-out Set your 5 round trip (SC3, DISC-11)
expected: Opening /loot-list?guild=<guild_id>&picker=1 signed out redirects to sign-in with next carrying the path and query, and after sign-in lands on the picker for the member's main character. A member with no character in that guild sees Create a character first. A non-member stays on their current guild.
result: pass
evidence: Signed out, the link redirects to /?next=<path and query> (verified on a local dev server at b0aa333e). Signed in, a link to a guild the member is not in leaves them on their current guild with no empty state (verified). Owner confirmed on production that after sign-in the link lands on the main character's picker.

### 6. Real Discord send of Set your 5 (SC3, DISC-11)
expected: From Guild Settings, the officer confirms and sends once. One channel message with a Set my 5 link button posts, active members with a Discord id get one DM each, the result line shows counts only, a second send inside 60 minutes is refused, and the link button opens the picker.
result: pass
evidence: Owner sent it from Guild Settings on production: one channel message with the link button, DMs delivered, counts-only result line, second send refused, button opened the picker.

### 7. A Classic or other Known guild is unchanged in a browser (SC5, Known lock)
expected: /loot-list shows the 50-rank editor, score totals match what they were, the settings modal still opens with every card (Fine-tune starts expanded for a null loot_style), the addon export is unchanged.
result: pass
evidence: Owner checked a Classic guild on production: 50-rank editor, totals, settings modal with Fine-tune expanded, addon export. Regenerated addon fixtures from b0aa333e were byte-identical (see Test 10).

### 8. Owner sets the changelog ship date in lib/updates-data.ts
expected: The new entry at the top of lib/updates-data.ts carries the placeholder date November 10, 2026 and a comment saying to set it to the ship date before merge. Set it before PR 3 merges; the Discord updates cron posts the newest entry after merge.
result: pass
evidence: Owner decided on 2026-11-12 to keep November 10, 2026: the entry merged with that date and the hourly cron has already posted it once; changing the date would re-post under a new slug. The placeholder comment in lib/updates-data.ts can go in any later PR.

### 9. Privacy page note about Discord direct messages (optional, owner decision)
expected: app/privacy/page.tsx describes Discord OAuth but not that the app sends direct messages. Pre-existing gap; Set your 5 adds one more DM type. The owner decides whether to update it.
result: skipped
reason: Owner decided on 2026-11-12 not to add a direct message note to the privacy page for this phase; pre-existing gap, left for a later decision.

### 10. Optional addon repo check (A9)
expected: Run the addon repo's gen_web_fixtures.mts once in case it serialises whole ScoreResult objects, which now carry standing and interest. This repo's Lua exporter never calls computeScore and its output is unchanged.
result: pass
evidence: gen_web_fixtures.mts regenerated from b0aa333e; web_scoring.json and export_string_ranks.txt byte-identical to the addon's tests/fixtures apart from generatedFrom; output contains no standing or interest strings; no addon route imports computeScore.

## Summary

total: 10
passed: 9
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps
