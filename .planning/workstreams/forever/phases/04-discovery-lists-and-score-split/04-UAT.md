---
status: testing
phase: 04-discovery-lists-and-score-split
source: [04-VERIFICATION.md]
started: 2026-11-11T08:18:07Z
updated: 2026-11-11T08:18:07Z
---

## Current Test

number: 1
name: Raider fills the five-row picker on a real phone in under 60 seconds (SC1, DISC-02)
expected: |
  Start from a Discovery guild with a character whose spec has a default, change at least two rows through the question sheet, and tap Save my 5. The whole flow takes under 60 seconds, one column, tap targets at least 44px, no horizontal scroll.
awaiting: user response

## Tests

### 1. Raider fills the five-row picker on a real phone in under 60 seconds (SC1, DISC-02)
expected: Start from a Discovery guild with a character whose spec has a default, change at least two rows through the question sheet, and tap Save my 5. The whole flow takes under 60 seconds, one column, tap targets at least 44px, no horizontal scroll.
result: [pending]

### 2. Layout at 320px, 343px and 375px, plus 200% zoom (SC1, SC2, SC5)
expected: Picker, question bottom sheet, budget footer, ScoreSplit tiles, master sheet popover, comparison modal, preset cards, list-mode row and the Send Set your 5 row show no clipping or horizontal scroll. The longest need sentence (Shoulders, Leather, Spell damage) wraps to two lines at 375px; the 409 reason wraps under the list-mode row at 320px; the eight-part standing sentence wraps inside the popover; a 300 character rejection note wraps with no max height.
result: [pending]

### 3. Keyboard and screen-reader pass on the picker, question sheet and preset cards (SC1 to SC4)
expected: Rows reachable by Tab, the sheet traps focus and returns it, options announce pressed state, a blocked slot announces its reason, the budget live region announces changes, the saved-status region takes focus after save, Fine-tune announces expanded and collapsed, the preset radio group is arrow-key navigable.
result: [pending]

### 4. Light and dark themes for every new surface
expected: Warning panel (never the danger palette), cost markers (neutral, not traffic-light), ScoreSplit, preset cards and the Customised badge read correctly in both themes.
result: [pending]

### 5. Signed-out Set your 5 round trip (SC3, DISC-11)
expected: Opening /loot-list?guild=<guild_id>&picker=1 signed out redirects to sign-in with next carrying the path and query, and after sign-in lands on the picker for the member's main character. A member with no character in that guild sees Create a character first. A non-member stays on their current guild.
result: [pending]

### 6. Real Discord send of Set your 5 (SC3, DISC-11)
expected: From Guild Settings, the officer confirms and sends once. One channel message with a Set my 5 link button posts, active members with a Discord id get one DM each, the result line shows counts only, a second send inside 60 minutes is refused, and the link button opens the picker.
result: [pending]

### 7. A Classic or other Known guild is unchanged in a browser (SC5, Known lock)
expected: /loot-list shows the 50-rank editor, score totals match what they were, the settings modal still opens with every card (Fine-tune starts expanded for a null loot_style), the addon export is unchanged.
result: [pending]

### 8. Owner sets the changelog ship date in lib/updates-data.ts
expected: The new entry at the top of lib/updates-data.ts carries the placeholder date November 10, 2026 and a comment saying to set it to the ship date before merge. Set it before PR 3 merges; the Discord updates cron posts the newest entry after merge.
result: [pending]

### 9. Privacy page note about Discord direct messages (optional, owner decision)
expected: app/privacy/page.tsx describes Discord OAuth but not that the app sends direct messages. Pre-existing gap; Set your 5 adds one more DM type. The owner decides whether to update it.
result: [pending]

### 10. Optional addon repo check (A9)
expected: Run the addon repo's gen_web_fixtures.mts once in case it serialises whole ScoreResult objects, which now carry standing and interest. This repo's Lua exporter never calls computeScore and its output is unchanged.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
