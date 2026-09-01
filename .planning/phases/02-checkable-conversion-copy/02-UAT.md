---
status: complete
phase: 02-checkable-conversion-copy
source: [02-VERIFICATION.md]
started: 2026-09-01T00:00:00Z
updated: 2026-09-01T18:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Signup page renders cleanly at mobile and desktop widths
expected: |
  At 375px: the H1, body, primary Discord button, and secondary link render without overflow,
  orphaned wraps, or the Discord button being pushed off-screen.
  At 1440px: the H1 reads as one confident line or a deliberate two-line break.
result: pass

### 2. Signup secondary link and Discord OAuth still work
expected: |
  Clicking "See how it works" lands on the marketing site's #how-it-works section
  (https://www.getlootlist.com/#how-it-works) and scrolls there.
  Clicking "Continue with Discord" still starts the Discord OAuth flow unaffected by the copy change.
result: pass

### 3. Homepage testimonial cards render cleanly and read as self-attestation
expected: |
  At 375px: each quote card holds its full attribution stack (name, guild, verification line)
  without clipping or overflow.
  The linked Warcraft Logs guild names (Indecisive, Soul Stoned) are the only accent-colored
  element in their card and open the correct guild's public page in a new tab.
  The verification line reads as LootList+ vouching for its own customer, not as a
  third-party endorsement.
result: pass

### 4. Homepage stat row renders cleanly
expected: |
  The replaced Row 2 stat card ("5 / supported Classic expansions") reads correctly beside
  its "0 spreadsheets needed" and "1 system..." siblings, and its label wraps cleanly at 375px.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None yet - all 4 tests pending your review.
