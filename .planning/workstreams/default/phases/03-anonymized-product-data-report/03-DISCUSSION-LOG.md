# Phase 3: Anonymized Product-Data Report - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01 (areas 1-3) and 2026-09-03 (area 4, resumed from checkpoint)
**Phase:** 3-Anonymized Product-Data Report
**Areas discussed:** Finding selection flow, Reproducibility mechanism, Page presentation, Dataset window & definitions

---

## Finding selection flow (2026-09-01)

**Q: How should the published findings get chosen?**

| Option | Selected |
|--------|----------|
| Checkpoint menu (Recommended) | ✓ |
| Pre-commit metrics now | |
| Executor drafts, you approve | |

**User's choice:** Checkpoint menu — executor runs ALL candidate aggregate queries, presents every metric with its real number, user picks findings (mirrors Phase 1/2 checkpoint pattern).

**Q: How should the checkpoint menu handle uncomputable/unpublishable metrics?**

| Option | Selected |
|--------|----------|
| Show with reasons (Recommended) | ✓ |
| Exclude entirely | |

**User's choice:** Show with reasons — greyed out with the exact reason; user cannot pick them.

**Q: How many findings should the report target?**

| Option | Selected |
|--------|----------|
| 3 to 5, quality bar (Recommended) | ✓ |
| Exactly 3 | |
| All that pass | |

**User's choice:** 3 to 5 on a quality bar, capped around 5.

**Q: When a segmented breakdown has a segment under the 10-guild floor, what happens?**

| Option | Selected |
|--------|----------|
| Merge into "Other" (Recommended) | ✓ |
| Drop the segment | |
| Drop the whole finding | |

**User's choice:** Merge into "Other" so breakdowns sum to 100% without exposing small cohorts.

---

## Reproducibility mechanism (2026-09-01)

**Q: How should saved queries connect to the published numbers?**

| Option | Selected |
|--------|----------|
| Queries → artifact → page (Recommended) | ✓ |
| Queries + hand-transcribed numbers | |
| Single runner script | |

**User's choice:** Committed SQL + runner via Supabase Management API writing a committed aggregates JSON; page imports the JSON at build time.

**Q: What tooling runs the saved queries?**

| Option | Selected |
|--------|----------|
| Python in scripts/analytics (Recommended) | ✓ |
| TypeScript via tsx | |

**User's choice:** Python in scripts/analytics, matching Phase 1 conventions.

**Q: Should the report page publicly link to the saved queries on GitHub?**

| Option | Selected |
|--------|----------|
| Link the queries (Recommended) | ✓ |
| Methodology only | |

**User's choice:** Methodology section links the queries directory on GitHub.

---

## Page presentation (2026-09-01)

**Q: What overall layout should the report page use?**

| Option | Selected |
|--------|----------|
| Research article layout (Recommended) | ✓ |
| Custom report page | |

**Q: How should the data be presented?**

| Option | Selected |
|--------|----------|
| HTML tables + stat callouts (Recommended) | ✓ |
| Hand-built SVG bars | |
| Add a chart library | |

**Q: What should the plan-required download be?**

| Option | Selected |
|--------|----------|
| CSV + JSON (Recommended) | ✓ |
| CSV only | |
| JSON only | |

**Q: Should the report carry the Zev author identity?**

| Option | Selected |
|--------|----------|
| Zev byline (Recommended) | ✓ |
| Org-authored, no byline | |

---

## Dataset window & definitions (2026-09-03)

**Q: What date window should the report's dataset use?**

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed calendar months (Recommended) | Jun 1 to Aug 31, 2026: last 3 complete months; pinned dates for exact reproducibility | ✓ |
| 90 days ending at a pinned date | Freshest data, still reproducible, arbitrary-looking boundaries | |
| Rolling previous 90 days | Plan's literal wording; numbers change on re-run | |

**User's choice:** Fixed calendar months, Jun 1 to Aug 31, 2026.

**Q: How should "active guild" be defined?**

| Option | Description | Selected |
|--------|-------------|----------|
| Plan's OR-definition (Recommended) | ≥1 raid OR ≥1 loot award OR ≥5 approved lists in window | ✓ |
| Stricter: raid AND loot | Smaller but more credible cohort | |
| Simplest: any raid event | One-clause definition | |

**User's choice:** Plan's OR-definition verbatim.

**Q: How is a guild assigned to an expansion for segmented breakdowns?**

| Option | Description | Selected |
|--------|-------------|----------|
| Activity in window (Recommended) | Counts under each expansion with qualifying activity, via raid_events/raid_tiers, not loot_history.expansion_id | ✓ |
| Current expansion | One bucket per guild; clean 100% but misstates switchers | |
| You decide | Claude picks at execution | |

**User's choice:** Activity in window; methodology notes breakdown may sum over 100%.

**Q: How should raiders be counted?**

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct characters (Recommended) | Distinct characters with an approved list in window | ✓ |
| Dedupe alts | Collapse via character_aliases | |
| You decide | Claude checks alias coverage at execution | |

**User's choice:** Distinct characters; methodology states it is a character count.

---

## Cross-referenced Todos

**Q: Fold any of the 6 keyword-matched pending todos into Phase 3?**

**User's choice:** None — the 2 SEO todos already shipped in Phase 2 (D-09/D-11); the 4 growth/analytics todos stay deferred until after the sprint.

## Claude's Discretion

- Exact SQL shape of each saved query (aggregate-only)
- Aggregates JSON schema and CSV column layout
- Visual styling of stat callouts and tables within the existing design system
- Computability call on the "top priority bracket" metric
- Draft page copy (user sign-off gate before ship)

## Deferred Ideas

None new — discussion stayed within phase scope. Six reviewed-not-folded todos recorded in CONTEXT.md.
