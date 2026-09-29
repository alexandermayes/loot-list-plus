STATUS: APPROVED
SELECTION: APPROVED 2026-09-04

Record of the D-01 human checkpoint (plan 03-03, task 2): the candidate menu generated live from the committed queries against production, and the user's selection of which candidates become the report's published findings.

## Selected

Publication order, as given by the user:

SELECTED: median-list-length = 18.0
SELECTED: attendance-weighting = 84.8
SELECTED: blp-usage = 45.5
SELECTED: top-priority-bracket = 29.5

## Declined

None. The menu offered four pickable candidates and all four were selected for publication.

## Unavailable

These candidates could not be computed accurately enough to publish, or could not be computed at all. Each reason is verbatim from the runner's checkpoint output (metrics.json plus the runtime floor/coverage decisions built on top of it). No number appears here beyond what the reason itself states about why the candidate is withheld.

- **expansion-distribution** (Distribution of expansions active guilds raided in): withheld: after merging every segment under the 10-guild privacy floor into an "Other" bucket, that merged bucket itself holds fewer than 10 guilds, so no segment here can be published without risking identifying a specific guild.
- **time-to-qualified** (Median time from guild creation to qualified setup): guild_funnel_milestones shipped via migration 20260827000000 on 2026-08-27, four days before this report's window closes (2026-08-31) and roughly three months after it opens (2026-06-01). The evaluator (utils/analytics/funnel.ts) only stamps qualified_at with the time it happens to re-run and observe the condition newly true, not the historical time the condition became true, so any guild that qualified before 2026-08-27 carries a qualified_at timestamp reflecting an incidental later mutation rather than the true milestone date. Measured: only 2 of the 33 active guilds in this window were created on or after 2026-08-27 (funnel-cohort-coverage), well below the 10-guild floor, so even a cohort restricted to post-instrumentation guilds could not be published.
- **time-to-activated** (Median time from qualified setup to activation): guild_funnel_milestones shipped via migration 20260827000000 on 2026-08-27, four days before this report's window closes (2026-08-31) and roughly three months after it opens (2026-06-01). The evaluator (utils/analytics/funnel.ts) only stamps both qualified_at and activated_at with the time it happens to re-run and observe each condition newly true, not the historical time each condition became true, so any guild that qualified or activated before 2026-08-27 carries timestamps reflecting an incidental later mutation rather than the true milestone dates. Measured: only 2 of the 33 active guilds in this window were created on or after 2026-08-27 (funnel-cohort-coverage), well below the 10-guild floor, so even a cohort restricted to post-instrumentation guilds could not be published.
- **officer-time-survey** (Self-reported weekly officer time before and after LootList+): No survey instrument exists in this product, no self-reported officer-time data has ever been collected, and the sprint plan requires self-reported figures to be reported separately from behavioral data, so there is nothing to report.

## Definitions in force

**Active guild:** A guild qualifies as active if, during the window, it has at least one non-skipped raid event, OR at least one loot award, OR at least five approved loot lists. A raid_events row with is_skipped true is excluded. An approved list counts when COALESCE(reviewed_at, submitted_at) falls inside the window.

**Raiders:** Raiders are counted as distinct characters holding an approved list inside the window. No alt de-duplication is applied; this is a character count, not a person count.

**Median list length (definition_note):** Counts only non-removed items on an approved loot list inside the window; a list whose owner deleted entries has the length the owner kept, not the length they ever typed.

**Attendance-weighting (definition_note):** guild_settings.attendance_type is a non-null column whose shipped application default is 'points-per-raid' with a nonzero max_attendance_bonus, so a presence check on attendance_type would return effectively every guild and would say nothing. The measured quantity is the share of active guilds whose attendance configuration differs from the shipped defaults (domain/scoring/defaults.ts) on at least one of the seven confirmed guild_settings attendance columns. This measures guilds that tuned attendance away from the shipped defaults, not mere presence of attendance scoring (attendance scoring is on by default for every guild). Its exact public wording still requires user sign-off at the plan 03-04 copy checkpoint.

**BLP usage:** Percentage of active guilds using bad-luck protection (guild_settings.blp_enabled true). No definition_note beyond the label.

**Top-priority-bracket (definition_note):** Measured live against production (top-bracket-coverage): 16 active guilds have at least one usable prior list snapshot (clears the 10-guild floor) and 4,292 of 4,853 awards in the window (88.5%) have a prior snapshot (clears the 80% coverage bar), so this ships. The share covers only awards whose winner had a prior loot_submission_snapshots row and whose awarded item was found, with a rank, in that snapshot; an award without a determinable rank is excluded from both the numerator and the denominator rather than counted as a miss. "Top priority bracket" is Bracket 1 (ranks 48-50), the fixed rank set from domain/loot/bracket-validation.ts, constant across every guild, not a guild_settings-configurable value.

**Window:** 2026-06-01 to 2026-08-31 (the fixed calendar-month window, D-12).

## Decision provenance

The user reviewed the full menu at the checkpoint, asked where the findings are published, and explicitly delegated the specific selection to the orchestrator's recommendation ("going with whatever you suggest"). The orchestrator recommended all four pickable metrics in the publication order recorded above. The attendance-weighting definition nuance (measures guilds that tuned attendance away from shipped defaults, not mere presence) was disclosed at the checkpoint and stands as recorded in Definitions in force above; its exact public wording still requires user sign-off at the plan 03-04 copy checkpoint.
