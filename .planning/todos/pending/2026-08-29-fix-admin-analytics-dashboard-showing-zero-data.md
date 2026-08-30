---
created: 2026-08-30T00:32:29.000Z
title: Fix admin analytics dashboard showing zero data
area: analytics
severity: major
files:
  - app/(app)/admin/analytics/_client.tsx
---

## Problem

`/admin/analytics` — Blog ("Top posts (90 days)" → "No blog views yet"), Funnel ("Signup funnel (30 days)" → 0 at every step), and Traffic (by domain / Top pages → empty) all show zero/empty data. User confirmed via screenshots on 2026-08-29.

Guilds and Revenue tabs on the same page show real numbers (e.g. 70 active guilds, 4 Pro guilds, 6% Pro rate), because they read straight from the database. Blog/Funnel/Traffic are different: `app/(app)/admin/analytics/_client.tsx` has a section explicitly commented `// ─── PostHog-backed section components ──────────────────────` covering exactly these three. So this is very likely a PostHog data/config problem, not a UI rendering bug — e.g. missing/wrong PostHog API key or project ID for this environment, events that were never actually instrumented client-side, or a query/date-range filter that's excluding all real events.

## Solution

TBD. Suggested first steps: confirm the PostHog project/API key config used by this dashboard's queries, check PostHog's own event explorer for whether pageview/signup events are landing at all, then trace the specific queries backing `FunnelSection` (and the Blog/Traffic equivalents) in `_client.tsx` for filter or date-range bugs. Do this before assuming the components themselves are broken.
