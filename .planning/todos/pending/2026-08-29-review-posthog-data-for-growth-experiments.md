---
created: 2026-08-30T00:32:29.000Z
title: Review PostHog data for growth experiments
area: growth
severity: major
files: []
---

## Problem

User (2026-08-29): wants to "go back through PostHog and update things if needed for our data analytics side of things" and look at the data for "potential improvements or tests we should run to see what performs better to increase usage, signups, etc."

This is a research/initiative task rather than a bug — no code is known-broken here (that's tracked separately in [[fix-admin-analytics-dashboard-showing-zero-data]], which is likely the SAME underlying PostHog config gap). Bundling both: (1) audit PostHog setup/events for correctness, (2) once data is trustworthy, mine it for signup/activation funnel drop-off points worth A/B testing.

## Solution

TBD. Natural sequencing: resolve the PostHog data-gap bug first (same root cause likely), then use the now-trustworthy funnel data to identify the biggest drop-off step and propose 1-2 concrete, testable changes (copy, flow, or UI) rather than testing broadly.
