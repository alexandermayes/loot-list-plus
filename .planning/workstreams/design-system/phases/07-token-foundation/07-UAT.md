---
status: complete
phase: 07-token-foundation
source: [07-VERIFICATION.md]
started: 2026-09-16T19:54:42Z
updated: 2026-09-17T02:53:53Z
---

## Current Test

[testing complete]

## Tests

### 1. Dark surface and border ramp reads correctly on a card-dense screen
expected: Open .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/ and 2026-09-16-post-phase-07/ side by side, plus a card-dense authenticated screen (Overview, guild settings or raid tracking) in dark mode at 1440 and 390. Cards read as cards against the page without a second border; the border is visible; a hovered row (--muted) is visibly lighter than its card; an unchecked switch track is still visible on a card; the page is as deep as before (near-black, unchanged); nothing looks washed out. (WINDOWS.md entry 4, 07-04 Task 3 human-check)
result: pass

### 2. Standby amber is consistent and distinct on raid tracking
expected: On the raid-tracking page, in dark mode at 1440 and 390 and then in light mode, compare the standby cell rail, the legend swatch and the RaidMemberList StatusPill against the pre-phase-07 baseline or the live app. All three standby renderings read as the same amber; that amber is visually distinct from the late-yellow chip and from the accent orange used elsewhere; a benched raider is not mistakable for a late one. (WINDOWS.md entry 5, 07-05 Task 3 human-check)
result: pass

### 3. Decide whether the Home-only screenshot pair satisfies ROADMAP success criterion 5
expected: Either capture a matching authenticated app-page before/after pair (Overview or another card-dense screen, 1440 and 390, light and dark) and add it to the baseline sets, or record an explicit decision that the symmetric Home-only pair is accepted for this phase given the D-16 fallback (loadtest/test-users.json and SUPABASE_SERVICE_ROLE_KEY were out of scope for the capturing plans). Criterion 5 literally asks for one public page and one app page. (07-EVIDENCE.md carried-forward item 7, WINDOWS.md entry 6)
result: pass
note: "User confirmed. Baseline sets contain the Home pair only, so this records the explicit decision that the symmetric Home-only pair is accepted for Phase 07 under the D-16 fallback."

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
