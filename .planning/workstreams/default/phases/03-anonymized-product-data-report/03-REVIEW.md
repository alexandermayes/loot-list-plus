---
phase: 03-anonymized-product-data-report
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - app/__tests__/sitemap.test.ts
  - app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx
  - app/research/wow-classic-loot-systems-2026/page.tsx
  - app/sitemap.ts
  - public/research/README.md
  - public/research/wow-classic-loot-systems-2026-aggregates.csv
  - public/research/wow-classic-loot-systems-2026-aggregates.json
  - scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/02-median-list-length.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/03-attendance-weighting.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/04-bad-luck-protection-usage.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/08-top-priority-bracket.sql
  - scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json
  - scripts/analytics/queries/wow-classic-loot-systems-2026/published-findings.txt
  - scripts/analytics/research_report.py
  - scripts/analytics/run-research-report.py
  - scripts/analytics/test_research_report.py
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the wow-classic-loot-systems-2026 research report pipeline (stdlib-only Python query runner + assembler), the committed SQL queries and artifacts, and the Next.js report page that renders them.

The privacy floor mechanics (`apply_floor`/`WITHHELD`) are correctly implemented and well covered by unit tests, and no committed SQL or artifact contains a forbidden identity column/token. However, three separate load-bearing safety/correctness mechanisms turned out to be disconnected from the code path that actually runs in production:

1. The `--floor` CLI flag — the one lever an operator has to raise the guild-privacy floor per this project's own constraint ("raise the floor if combinations could identify a guild") — has no effect; `apply_floor` always uses the hardcoded module constant regardless of what's passed on the command line.
2. `decide_top_bracket_coverage`, the function specifically built and unit-tested to gate the `top-priority-bracket` metric on the 10-guild floor and 80% coverage threshold, is never called by the production runner (`run-research-report.py`). The metric is published unconditionally as an ordinary percentage whenever it's in the selection file, so a future rerun with degraded snapshot coverage would not be automatically withheld.
3. The report page binds each finding's numeric value/denominator to a fixed array index (`findings[0]`..`findings[3]`) while binding all of its prose (headline, body, callout label) to the finding's `metric_id`. These two binding strategies silently diverge the moment the selection file's order changes or a different finding set is published — today's data happens to be in the same order the page assumes, masking the bug.

None of these three are hit by the currently committed data, which is why the test suite passes — but all three are real, provable defects in the mechanism itself, not defects in today's specific inputs.

## Critical Issues

### CR-01: `--floor` CLI argument is silently a no-op — the privacy floor is not actually configurable

**File:** `scripts/analytics/run-research-report.py:295`, `scripts/analytics/run-research-report.py:183-282`
**Issue:** `build_parser()` defines `--floor` (`type=int, default=GUILD_FLOOR`) and `args.floor` is parsed, but it is never read anywhere else in the file — `grep -n "args.floor"` finds only its own definition. The actual privacy floor enforcement happens in `assemble_breakdown()` (research_report.py:308), which is called as `assemble_breakdown(metric, segment_counts, denominator)` with no `floor` argument, so it always falls back to its default parameter `floor=GUILD_FLOOR` (the hardcoded module constant, 10) — never `args.floor`. An operator who runs `python3 run-research-report.py --floor 15` believing they raised the guild-privacy floor (exactly the operation this project's own CLAUDE.md constraint anticipates — "raise the floor if combinations could identify a guild") gets the default floor of 10 with no warning that their flag did nothing.
**Fix:**
```python
# run_all_metrics needs the floor threaded through:
def run_all_metrics(metrics, args, token):
    ...
    if metric["kind"] == "breakdown":
        ...
        results[metric["metric_id"]] = assemble_breakdown(metric, segment_counts, denominator, floor=args.floor)
```

### CR-02: `decide_top_bracket_coverage` — the floor/coverage gate for `top-priority-bracket` — is dead code in the production runner

**File:** `scripts/analytics/run-research-report.py:183-282` (missing call), `scripts/analytics/research_report.py:377-427`
**Issue:** `decide_top_bracket_coverage()` is fully implemented and unit-tested (`test_research_report.py:436-470`) to withhold `top-priority-bracket` unless `active_guilds_with_usable_snapshots >= GUILD_FLOOR` **and** the prior-snapshot coverage share clears `TOP_BRACKET_SHARE_THRESHOLD` (80%). But `run-research-report.py` never imports or calls it (confirmed: the only references to `decide_top_bracket_coverage` in `scripts/analytics/` are its own definition and its unit tests). In `run_all_metrics`, `top-priority-bracket` has `kind: "percentage"` and a `query_file`, so it falls straight through the generic branch:
```python
elif metric["kind"] == "percentage" and len(columns) == 2:
    results[metric["metric_id"]] = assemble_percentage_from_counts(metric, row[columns[0]], row[columns[1]])
```
This runs and publishes the metric with zero regard for guild-floor or coverage-share gating. The only thing currently preventing an under-covered value from being published is that a human happened to read `07-top-bracket-coverage.sql`'s numbers once and manually kept `top-priority-bracket` out of (or in) `published-findings.txt`. If this pipeline is rerun later in the sprint (or after the window is reused, per this project's recrawl-once policy) and coverage drops below either bar — e.g., guilds delete stale snapshots, or awards outpace snapshot coverage — nothing in the code stops the metric from being silently republished below the privacy floor. The support query (`07-top-bracket-coverage.sql`) and its `top-bracket-coverage` support-kind registry entry exist purely for a human to eyeball; they are not wired to a machine-enforced decision.
**Fix:** Call the gate before assembling the finding, using the already-computed `top-bracket-coverage` support row:
```python
coverage_row = results.get("top-bracket-coverage")
if coverage_row and coverage_row[0] == "finding":
    raw = coverage_row[1]["raw"]
    decision = decide_top_bracket_coverage(
        raw["awards_in_window"], raw["awards_with_prior_snapshot"], raw["active_guilds_with_usable_snapshots"]
    )
    if not decision["publish"]:
        results["top-priority-bracket"] = ("unavailable", {
            "metric_id": "top-priority-bracket", "label": metric["label"], "reason": decision["reason"],
        })
        continue
```

### CR-03: Report page binds finding values to a fixed array index while binding prose to `metric_id` — a reorder or reselection silently misattributes numbers to the wrong finding

**File:** `app/research/wow-classic-loot-systems-2026/page.tsx:146-153`
**Issue:** `TOKENS` resolves every `{finding_*_value}` / `{finding_*_denominator}` placeholder from a hardcoded array position:
```ts
finding_median_list_length_value: findings[0].display,
finding_attendance_weighting_value: findings[1].display,
finding_blp_usage_value: findings[2].display,
finding_top_priority_bracket_value: findings[3].display,
```
But the render loop below binds every other piece of copy for the same finding by `metric_id`, not index: `approved(`finding.${finding.metric_id}.h2`)`, `.number-sentence`, `.officer-meaning`, `.limits`, `.callout-label`. There is no runtime assertion anywhere (in `page.tsx`, its test, or the Python pipeline) that `findings[1].metric_id === 'attendance-weighting'`. `published-findings.txt` is an operator-edited, order-preserving selection file by design (`load_selection_file` docstring: "one metric id per line, in publication order"), and `build_artifact` assembles `findings` in exactly that file's order. If the selection file is ever reordered (e.g., `blp-usage` moved above `attendance-weighting` for editorial reasons — a fully supported, undocumented-as-forbidden operation), the H2/body copy for "attendance-weighting" would still render correctly (looked up by `metric_id`), but the number embedded inside that same section's `number-sentence`/callout would silently become `blp-usage`'s value instead — the exact "number token bound to the wrong artifact path" failure mode the file's own header comment (line 19) explicitly calls out as the reason these interfaces exist, yet the actual token-binding code doesn't defend against it. A selection with fewer than 4 findings crashes the module at build time (`findings[3]` is `undefined`) instead of silently mismatching — a less bad but still unhandled failure mode.
**Fix:** Bind every token by `metric_id`, not position:
```ts
const findingsById = Object.fromEntries(findings.map((f) => [f.metric_id, f]))
function requireFinding(id: string): Finding {
  const f = findingsById[id]
  if (!f) throw new Error(`Expected published finding "${id}" not found in aggregates artifact`)
  return f
}
const TOKENS: Record<string, string> = {
  ...
  finding_median_list_length_value: requireFinding('median-list-length').display,
  finding_median_list_length_denominator: (requireFinding('median-list-length').denominator ?? 0).toLocaleString('en-US'),
  finding_attendance_weighting_value: requireFinding('attendance-weighting').display,
  // ...
}
```
This turns a future reorder/reselection into a loud build error (if a token'd metric is missing) instead of a silent misattribution.

## Warnings

### WR-01: `--start`/`--end` CLI arguments only affect the artifact's cosmetic `window` label, never the actual query bounds

**File:** `scripts/analytics/run-research-report.py:293-294`, `:389`
**Issue:** `args.start`/`args.end` are used exactly once, to populate `window = {"start": args.start, "end": args.end}` in the published artifact (line 389). `assert_window_literals` (called at line 212 and in `lint_queries`) checks for the module constants `WINDOW_START`/`WINDOW_END` (hardcoded `2026-06-01`/`2026-08-31` in `research_report.py`), not `args.start`/`args.end`, and every committed `.sql` file has those dates baked in as literals. Running `--start 2020-01-01 --end 2020-02-01` produces a committed artifact whose `window` field claims a 2020 period while every number in it was computed over the real 2026-06-01..2026-08-31 data — a silent mislabeling with no error.
**Fix:** Either remove the flags (since the design intentionally hardcodes the window per query file, per the module's own comments) or make them assert equality with the module constants unless an explicit `--allow-window-override` is passed:
```python
if args.start != WINDOW_START or args.end != WINDOW_END:
    print("error: --start/--end must match the committed queries' window; edit the .sql files' literals instead", file=sys.stderr)
    sys.exit(1)
```

### WR-02: `resolve_output_path`'s traversal guard doesn't confine output to `OUTPUT_DIR` for absolute paths

**File:** `scripts/analytics/research_report.py:523-534`
**Issue:** The function only rejects a literal `..` path segment and only joins onto `OUTPUT_DIR` when the given path has no separator at all. An absolute path (e.g. `--json /tmp/whatever.json` or, worse, a typo like `--json /Users/shared/aggregates.json`) contains no `..` segment and already contains `os.sep`, so it passes through untouched — the function's own docstring ("reuses gsc_export.resolve_export_path's guard shape... rejects a `..` path segment") implies stronger confinement than it actually provides.
**Fix:**
```python
def resolve_output_path(path):
    if ".." in path.split(os.sep):
        raise ValueError(f"refusing output path containing '..' segment: {path}")
    if os.sep not in path and (os.altsep is None or os.altsep not in path):
        path = os.path.join(OUTPUT_DIR, path)
    resolved = os.path.abspath(path)
    allowed_root = os.path.abspath(OUTPUT_DIR)
    if not resolved.startswith(allowed_root + os.sep) and resolved != allowed_root:
        raise ValueError(f"refusing output path outside {OUTPUT_DIR}: {path}")
    ...
```

### WR-03: `parse_query_header` absorbs every colon-containing comment line as a header key, and header values are never cross-checked against the registry

**File:** `scripts/analytics/research_report.py:71-96`
**Issue:** The loop only stops when it reaches a line that doesn't start with `--`; it doesn't stop at the end of the four required `key: value` lines. Several committed query files' explanatory comment blocks contain other colon-bearing `--` lines below the required header (e.g. `02-median-list-length.sql`'s "(SUMMARY: "Confirmed percentile_cont works..."` line), which get parsed into extra, currently-harmless dict entries because their keys (`"endpoint in plan 03-01 (SUMMARY"`, etc.) don't collide with `metric-id`/`label`/`columns`/`window`. That's incidental luck, not a guard: a future query file whose descriptive prose happens to start a `--` line with the literal word `window:` or `columns:` (easy to do without noticing, since these words appear constantly in this report's own prose) would silently overwrite the real header value with no error surfaced anywhere. Separately, the parsed `header["metric-id"]` / `header["label"]` values are validated only for *presence*, never checked for equality against the `metrics.json` entry whose `query_file` points at this file — so a copy-paste mistake wiring the wrong `.sql` file to the wrong `metric_id` in `metrics.json` would run successfully and publish a mislabeled number with no test or lint catching it.
**Fix:** Stop header parsing at the first blank `--` comment line (or a blank line), and add a cross-check in `lint_queries`/`run_all_metrics`:
```python
if header["metric-id"] != metric["metric_id"]:
    raise ValueError(f"{path}: header metric-id {header['metric-id']!r} does not match registry metric_id {metric['metric_id']!r}")
```

### WR-04: `top-priority-bracket`'s `definition_note` hardcodes a one-time manual coverage snapshot that goes stale on rerun

**File:** `scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json:74`
**Issue:** The registry's static `definition_note` embeds specific measured numbers from a single manual check ("16 active guilds have at least one usable prior list snapshot... and 4,292 of 4,853 awards in the window (88.5%) have a prior snapshot"). Per CR-02, nothing recomputes or re-validates this note against the actual `top-bracket-coverage` support measurement on subsequent runs — `assemble_scalar_finding` just copies `metric.get("definition_note")` through verbatim (research_report.py:256-257). If the pipeline is rerun later over changed data, the published methodology text will keep asserting the original run's coverage numbers even if the real, freshly-computed coverage has since changed, misrepresenting the current data.
**Fix:** Once CR-02 wires `decide_top_bracket_coverage` into the runner, build this note dynamically from the live coverage numbers each run instead of hardcoding them in the committed registry.

### WR-05: Page metadata dates are hardcoded and already stale relative to the artifact's actual `generated_at`

**File:** `app/research/wow-classic-loot-systems-2026/page.tsx:270,284-285`
**Issue:** `metadata.openGraph.publishedTime`, `jsonLd.datePublished`, `jsonLd.dateModified`, and the visible `<time dateTime="2026-09-04">` are all hardcoded to `2026-09-04T00:00:00Z`/`September 4, 2026`. The committed artifact's `generated_at` is now `2026-09-06T01:01:48Z` (per `public/research/wow-classic-loot-systems-2026-aggregates.json` and the provenance table in `public/research/README.md`) — the data was regenerated two days after these dates were authored, and none of them are derived from `aggregates.generated_at`, so the structured data and visible byline currently understate how fresh the numbers are, and a future regeneration won't update them either since they're literal strings.
**Fix:** Derive from the artifact instead of a literal:
```ts
const dateModifiedIso = aggregates.generated_at // e.g. "2026-09-06T01:01:48Z"
```
and use it (or a separately-approved, deliberately-fixed "first published" date plus the artifact's `generated_at` for `dateModified`) consistently across `metadata.openGraph.publishedTime`, `jsonLd.datePublished`/`dateModified`, and the visible `<time>` element.

## Info

### IN-01: Alias `ls` is reused for two different CTEs in the same query

**File:** `scripts/analytics/queries/wow-classic-loot-systems-2026/08-top-priority-bracket.sql:80-93`
**Issue:** `ls` denotes `loot_submissions` in the `prior_snapshots` CTE (lines 80-85) and is then reused to denote `latest_snapshot` in the `ranked_awards` CTE (lines 92-98). Each is scoped correctly (no actual bug), but reusing the same short alias for two different tables in one file is easy to misread during future edits.
**Fix:** Rename the second usage, e.g. `FROM latest_snapshot lsn ... WHERE item ->> 'loot_item_id' = lsn.loot_item_id::text ORDER BY lsn.award_id`.

### IN-02: Inconsistent derivation strategy between the two download hrefs

**File:** `app/research/wow-classic-loot-systems-2026/page.tsx:229-230`
**Issue:** `CSV_DOWNLOAD_HREF` is a hand-typed literal path while `JSON_DOWNLOAD_HREF` is derived from `aggregates.report_slug`. The in-file comment explains this was done deliberately to keep a literal filename substring appearing exactly once (for an external parity-check script), but it leaves the two sibling constants built by visibly different methods, which a future maintainer touching one is likely to "fix" to match the other and break the parity-check assumption.
**Fix:** If the parity-check script's substring requirement is real, add a one-line comment directly above `CSV_DOWNLOAD_HREF` referencing the same constraint that's already documented above `JSON_DOWNLOAD_HREF`, so both constants carry the same warning.

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
