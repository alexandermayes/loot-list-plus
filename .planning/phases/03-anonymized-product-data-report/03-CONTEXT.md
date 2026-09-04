# Phase 3: Anonymized Product-Data Report - Context

**Gathered:** 2026-09-03 (resumed from 2026-09-01 checkpoint)
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish `/research/wow-classic-loot-systems-2026`: an anonymized product-data report with a stated methodology, date range, sample definitions, and 3 to 5 findings written as plain-English claims. Every published number traces to a saved query committed to the repo and reproduces on re-run (EVID-01, EVID-02, EVID-03). Source data comes from the production database via the Supabase Management API only: aggregate measures only, minimum 10 guilds per published segment, no player or guild names in the page, artifacts, commits, or chat. Visible copy requires user sign-off before shipping (roadmap cross-phase rule); no em dashes.

</domain>

<decisions>
## Implementation Decisions

### Finding selection flow
- **D-01:** Findings are chosen at a human checkpoint: the executor runs ALL candidate aggregate queries from the sprint plan's recommended-dataset list, presents every metric with its real number, and the user picks which become published findings (mirrors the Phase 1/2 checkpoint pattern).
- **D-02:** The checkpoint menu lists every plan metric, including uncomputable or unpublishable ones, which appear greyed out with the exact reason (e.g., no survey data exists for officer time; top-bracket share only if the data supports it accurately). The user cannot pick greyed-out metrics.
- **D-03:** Target 3 to 5 findings on a quality bar: publish every genuinely strong, privacy-safe finding, capped around 5.
- **D-04:** When a segmented breakdown has a segment under the 10-guild floor, small segments merge into an "Other" bucket so breakdowns sum to 100% without exposing small cohorts.

### Reproducibility mechanism
- **D-05:** Pipeline is queries → artifact → page: committed SQL files plus a runner that executes them via the Supabase Management API and writes a committed aggregates JSON; the page imports that JSON at build time so published numbers cannot drift from the queries. — **Reversibility:** costly — the JSON artifact schema becomes the contract between the runner and the page build; changing it later touches the queries, the runner, the artifact, and the page component together, and EVID-02 re-verification must be redone.
- **D-06:** Tooling is Python in `scripts/analytics/`, matching the Phase 1 analytics tooling and provenance convention; Supabase Management API with the CLI token from the macOS keychain.
- **D-07:** The report's methodology section publicly links to the saved-queries directory on GitHub for maximum checkability. — **Reversibility:** costly — once published, the GitHub path in the methodology is a public pointer; moving or renaming the queries directory breaks the published proof link.

### Page presentation
- **D-08:** Research article layout: an article-shaped page like the blog posts (opening, H2-per-finding, methodology section) under `/research`, with data tables inline.
- **D-09:** Data presented as HTML tables plus big-number stat callouts per finding; zero new dependencies; all values are quotable text (crawlable by AI surfaces).
- **D-10:** Downloads are CSV + JSON: a CSV of the aggregates table and the committed JSON artifact itself.
- **D-11:** The report carries the Zev author identity: visible byline plus Person schema consistent with the blog posts (#247).

### Dataset window & definitions
- **D-12:** Dataset window is fixed calendar months: June 1 to August 31, 2026 (the last 3 complete months). Pinned dates make every query exactly reproducible and read cleanly in the opening copy. The plan's "previous 90 days" wording is interpreted as this fixed window, never a rolling one. — **Reversibility:** costly — the window is stated in the published methodology and baked into every saved query and the artifact; changing it means re-running all queries, re-holding the finding-selection checkpoint, and re-editing a page that Phase 5 recrawls exactly once.
- **D-13:** "Active guild" uses the sprint plan's OR-definition verbatim: at least 1 recorded raid, OR at least 1 loot award, OR at least 5 approved lists during the window (queryable from raid_events, loot_history, loot_submissions). Largest honest N, which helps segments clear the 10-guild floor. — **Reversibility:** costly — this is the denominator of every published number and is stated in the methodology.
- **D-14:** Expansion segmentation assigns a guild to each expansion where it had qualifying activity during the window, derived from reliable activity tables (raid_events/raid_tiers), NOT `loot_history.expansion_id` (known-unreliable; the Loot History phase filter had to route through raid_tiers). A guild can count in multiple buckets; the breakdown may sum over 100% and the methodology says so.
- **D-15:** Raiders are counted as distinct characters with an approved list in the window. No alt-dedup via character_aliases; the methodology states it is a character count.

### Claude's Discretion
- Exact SQL shape of each saved query (aggregate-only, within the definitions above).
- Aggregates JSON schema and the CSV column layout.
- Exact visual styling of stat callouts and tables within the existing Tailwind design system.
- Whether the "top priority bracket" metric is computable accurately enough to offer at the checkpoint (D-02 governs how it is presented if not).
- Draft wording of all page copy (plan copy is the starting point; user sign-off gate applies before ship).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sprint plan (report brief and exact template)
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` §"Product-data report brief and exact template" (~line 415) — working title, slug, meta description, the recommended-dataset metric list (the candidate queries for D-01), opening-copy template, finding format (H2 claim + number sentence + officer meaning + limits paragraph), and CTA copy ("Create your guild free"). Plan copy is a starting point; user sign-off required on final wording.

### Phase 1/2 conventions this phase extends
- `scripts/analytics/exports/README.md` — the provenance-row pattern every committed data artifact must follow
- `.planning/phases/02-checkable-conversion-copy/02-CONTEXT.md` — proof-format pattern (D-03), consolidated copy sign-off gate (D-16), and the no-review-schema rule (D-05) that also binds this page's structured data

### Code surfaces
- `app/sitemap.ts` — where the report page must appear exactly once with accurate lastmod (EVID-03)
- `app/blog/` — the article layout, metadata, and Zev Person-schema pattern (#247) the research page mirrors (D-08, D-11)
- `lib/database.types.ts` — table shapes for the saved queries (guilds, raid_events, attendance_records, loot_history, loot_submissions, guild_settings, raid_tiers, expansions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Blog post article layout and metadata pattern in `app/blog/` — the research page is article-shaped by decision D-08
- Zev Person schema + visible byline shipped on all 9 blog posts (#247) — reuse for D-11
- `scripts/analytics/` Python tooling from Phase 1 (GSC pull scripts, provenance README) — the saved-query runner follows the same conventions (D-06)
- `guild_settings` carries attendance fields (attendance_bonus, attendance_threshold, attendance_type, attendance_weeks) and BLP fields — the source for the "% weighting attendance" and "% using bad-luck protection" candidate findings

### Established Patterns
- Prod DB access only via Supabase Management API with the CLI token in the macOS keychain; no Supabase keys in .env.local
- Committed data artifacts carry a provenance row (source, query window, pull date) per Phase 1's exports README
- Copy voice: concise, personality-first; no em dashes (repo-enforced #253); user sign-off on all visible copy before ship
- No self-serving Review/AggregateRating schema anywhere (Phase 2 D-05); the research page's structured data must match visible content

### Integration Points
- `app/sitemap.ts` for the single sitemap entry; self-canonical metadata via the App Router metadata API
- Contextual create-your-guild CTA links into the existing signup flow (LoginPage surface reworked in Phase 2)
- Phase 5 will interlink this page from homepage/Compare/Pricing/About — the page needs stable heading anchors

### Data landmine
- `loot_history.expansion_id` is unreliable; expansion/phase attribution must route through raid_events/raid_tiers (D-14). Verified previously in the Loot History phase-filter work.

</code_context>

<specifics>
## Specific Ideas

- Opening copy follows the plan template: "Between June 1 and August 31, 2026, {N} active guilds used LootList+ to manage {A} raid events and {L} loot awards across {R} raiders with approved lists..." with the honest framing sentence ("This is product usage data, not a survey of every WoW guild.")
- Each finding: plain-English H2 claim, one sentence with the number, one paragraph on what it means for an officer, one paragraph on limits or alternative interpretations
- Greyed-out checkpoint entries must show the exact reason (e.g., "no survey instrument exists for officer time; plan requires it reported separately from behavioral data")

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Fix "loot list" query cannibalization (changelog vs homepage)** — already folded into Phase 2 (D-09/D-10) and shipped; todo file can be archived
- **Rework /compare search snippet for competitor queries** — already folded into Phase 2 (D-11) and shipped; todo file can be archived
- **Explore top-of-funnel and paid ads strategy** — explicitly deferred by user until after the sprint (Phases 2-6 land first)
- **Review PostHog data for growth experiments** — same deferral
- **Redesign admin analytics dashboard** — same deferral
- **Fix admin analytics dashboard showing zero data** — same deferral

None of the six relate to the report's scope; keyword matches only.

</deferred>

---

*Phase: 3-Anonymized Product-Data Report*
*Context gathered: 2026-09-03*
