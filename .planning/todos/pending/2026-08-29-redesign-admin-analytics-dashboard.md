---
created: 2026-08-30T00:32:29.000Z
title: Redesign admin analytics dashboard
area: analytics
severity: major
files:
  - app/(app)/admin/analytics/_client.tsx
---

## Problem

User feedback on 2026-08-29 (screenshots of `/admin/analytics` — Guilds/Blog/Funnel/Traffic/Revenue tabs): "Looks kind of plain right now." Wants more detail in the data shown and "some nice animations." Upgraded from a cosmetic-only ask to major when asked to confirm severity — treat as a real feature pass, not just a visual coat of paint.

This is an internal admin tool, not customer-facing — scope the redesign accordingly (function and data depth first, polish second), and note that the data-accuracy bug ([[fix-admin-analytics-dashboard-showing-zero-data]] on the same page) should probably be resolved first so the redesign isn't built around empty placeholder data.

## Solution

TBD. Likely needs: a scoping pass on what "more detail" means per tab (Guilds/Blog/Funnel/Traffic/Revenue each currently show a fairly thin single-card view), and a decision on how much motion/animation budget is appropriate for an internal tool before reaching for a design skill (e.g. `frontend-design` or `impeccable`) to execute.
