---
created: 2026-08-28T23:39:47.318Z
title: Fix "loot list" query cannibalization (changelog vs homepage)
area: seo
severity: minor
files:
  - app/changelog/
  - scripts/analytics/exports/gsc-trend-query-2026-05-24_2026-08-23.csv
  - scripts/analytics/exports/gsc-trend-page-2026-05-24_2026-08-23.csv
---

## Problem

The committed GSC baseline (May 24 to Aug 23, 2026) shows the top generic query "loot list" earned 597 impressions (59% of all site impressions) at position 7.3 with only 1.0% CTR, and the page soaking up those impressions is /changelog (514 impressions, position 12.4, 0.19% CTR), not the homepage. Google is ranking the changelog for the money query, and its snippet earns almost no clicks. The homepage or a purpose-built landing page should own "loot list" with a title and description an officer actually wants to click.

Note: "loot list" is currently in the "unclustered" bucket because the sprint's fixed keyword lists do not include the two-word form. Do not edit the cluster lists mid-sprint (week-over-week comparability); flag for the Phase 6 review instead.

## Solution

Phase 2 (Checkable Conversion Copy) scope: retitle/re-meta the changelog page so it stops competing for the generic query (e.g. title it as a changelog, consider whether it should be indexed at all), and make the homepage title/description target "loot list" intent directly. Verify no other page cannibalizes. Evidence and reproducing commands live in scripts/analytics/exports/README.md.
