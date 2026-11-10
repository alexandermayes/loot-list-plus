---
status: testing
phase: 03-discovery-schema-and-need-pipeline
source: [03-VERIFICATION.md]
started: 2026-10-21T23:35:55Z
updated: 2026-10-28T12:00:00Z
---

## Current Test

number: 1
name: Master sheet shows a ranked need as a NeedLabel under "Needs"
expected: |
  On a throwaway Forever guild whose tier is Discovery, with one need ranked via a superuser or fixture insert, open the master sheet.
  A "Needs" group appears after every boss group, the ranked need shows as a NeedLabel (neutral icon, no Wowhead link, no hover tooltip request),
  unranked needs stay hidden, and an officer click still opens the ranking detail.
awaiting: user response

## Tests

### 1. Master sheet shows a ranked need as a NeedLabel under "Needs"
expected: Covers the tracer slices deferred by human_verify_mode end-of-phase (03-05, 03-06, 03-10, 03-13). A "Needs" group appears after every boss group; the ranked need is a NeedLabel with no Wowhead link or tooltip request; unranked needs stay hidden; an officer click opens the ranking detail.
result: [pending]

### 2. Dashboard and raid-tracking render a need award
expected: Award a need row through POST /api/loot-history/bulk on a Discovery tier, then open Overview (recent awards, loot priority) and Raid Tracking (loot entries). The award shows the need's display name as a NeedLabel, with no item=0 or item=null link and no crash; item awards look exactly as before.
result: [pending]

### 3. Owner copy review (Oct 26)
expected: Owner signs off the 145 need display names and the reason strings DISCOVERY_FOREVER_ONLY_REASON, KNOWN_SWITCH_BLOCKED_REASON, NEED_ROW_FIXED_ERROR, RESERVES_UNAVAILABLE_ERROR and NEED_RANKING_HOLD_ERROR; no em dashes.
result: pass
note: Owner approved the 145 need display names and the five reason strings in chat on 2026-10-28, with "Main hand weapon" and "Back" kept as proposed; zero em dashes confirmed in the shipped strings.

### 4. Owner-run sync:forever backfill after PR 4 deploys
expected: npm run sync:forever (dry run) reports, per Forever expansion, the tiers it would switch to Discovery and the need rows it would insert (ids and counts only); npm run sync:forever -- --apply performs them; a second dry run reports zero of each.
result: [pending]

### 5. Decision on code review WR-02 and WR-04
expected: Owner either schedules fixes before Phase 4 lifts the D-22 hold or Forever guilds go live, or records them as accepted residuals. WR-02: master sheet visibility route puts up to 435 need ids in PostgREST GET URLs and does not check the page error. WR-04: an officer delete of a Discovery tier or expansion cascades through need rankings, awards and BLP.
result: [pending]

## Summary

total: 5
passed: 1
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
