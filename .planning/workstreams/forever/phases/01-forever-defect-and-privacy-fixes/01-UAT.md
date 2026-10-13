---
status: complete
phase: 01-forever-defect-and-privacy-fixes
source: [01-VERIFICATION.md]
started: 2026-10-13T22:11:42Z
updated: 2026-10-13T23:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live Forever item links on all four surfaces
expected: Open a real Forever item link from a Discord loot announcement, the post-raid summary, a /priority reply and the reserve page "Copy for Discord" text. Each opens https://www.wowhead.com/forever/item=<id> on a live Wowhead page.
result: pass

### 2. Owner copy sign-off for plan 01-09 bot strings
expected: Owner approves or edits the new bot copy before the plan 01-09 PR merges (Hard Constraint 2). Strings: /priority titles "Top priority: <item>", /score titles "<name>: Loot Score" and "<name>: Loot Score (<team>)", the raider line "rank N" separated by a middle dot, and the officer help-article review title "🆕 New help article (pending review)". Also decide whether the three extra em dashes at discord-bot/feedback.js:324, discord-bot/help-review.js:94 and discord-bot/help.js:129 join the Phase 7 REH-02 deferral list.
result: pass

### 3. Whole-night DELETE latency on a real guild
expected: Delete a whole raid night with many awards (for example 40 items) on a real guild and time the DELETE /api/loot-history/bulk response. The response returns with BLP already corrected and in acceptable time (recompute is awaited, one RPC per distinct item, serial). Unit tests mock the recompute RPC, so real latency was never measured.
result: pass

### 4. Reserve page "Copy for Discord" for Forever and non-Forever runs
expected: On the reserve join page, click "Copy for Discord" for a Forever run and for a non-Forever run. The Forever run pastes wowhead.com/forever/item=<id> links; the non-Forever run pastes the same retail /item= links as before. No component test covers the copy handler.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
