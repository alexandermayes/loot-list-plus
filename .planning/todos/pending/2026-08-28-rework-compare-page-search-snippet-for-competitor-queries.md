---
created: 2026-08-28T23:39:47.318Z
title: Rework /compare search snippet for competitor queries
area: seo
severity: minor
files:
  - app/compare/
  - scripts/analytics/exports/gsc-trend-query-2026-05-24_2026-08-23.csv
  - scripts/analytics/exports/gsc-trend-page-2026-05-24_2026-08-23.csv
---

## Problem

The committed GSC baseline (May 24 to Aug 23, 2026) shows competitor queries "tmb loot" (17 impressions, position 9.4) and "tmb loot system" (12 impressions, position 9.2) both at 0% CTR, and /compare itself at 305 impressions, position 12.6, 1.31% CTR. Meanwhile the week-1 AI answer log (2026-08-28) shows Claude cited /compare in 4 of 6 answers, so the page content works for AI surfaces; the search snippet (title/meta description) is what fails to earn the click from humans.

## Solution

Phase 2 (Checkable Conversion Copy) scope: rewrite the /compare title and meta description to speak to a TMB user comparing alternatives, with a checkable claim rather than marketing copy (Claude's answer explicitly flagged the compare page as vendor-written marketing; that criticism is itself a Phase 2 signal). Keep every claim verifiable per the phase goal. User sign-off required on user-facing copy; no em dashes.
