---
phase: 03-anonymized-product-data-report
fixed_at: 2026-09-06T01:35:14Z
review_path: .planning/phases/03-anonymized-product-data-report/03-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-09-06T01:35:14Z
**Source review:** .planning/phases/03-anonymized-product-data-report/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 8
- Fixed: 7
- Skipped: 1

All fixes were applied and verified in an isolated worktree
(`gsd-reviewfix/03-96667`, fast-forwarded onto `main`), then fast-forward
merged into the checkout this report is written from. Verification (test
suites, lint, `tsc --noEmit`) ran inside that same worktree, with
`node_modules` symlinked from the main checkout (no reinstall needed) since
the worktree does not carry its own `node_modules`.

**Hard constraint compliance:**
- No visible copy string was reworded. All fixes are code-level (bindings,
  guards, CLI wiring, metadata derivation).
- The committed artifacts (`public/research/wow-classic-loot-systems-2026-aggregates.{json,csv}`)
  were never regenerated or modified. CR-01/CR-02/WR-01/WR-02/WR-03's wiring
  changes were proven output-neutral for today's data via a dry-run harness
  that monkeypatches the Management API call with canned rows matching the
  committed artifact's numbers and diffs the produced JSON against the
  committed one (byte-identical except `generated_at`). No production query
  was run and the Keychain token was never touched.
- Python stayed stdlib-only; no em dashes were introduced in user-visible
  text.
- Each fix was verified with the relevant test suite
  (`python3 scripts/analytics/test_research_report.py`, `npx vitest run` on
  the page/sitemap suites, scoped `npx eslint`, `npx tsc --noEmit`) before
  being committed atomically.

## Fixed Issues

### CR-01: `--floor` CLI argument is silently a no-op

**Files modified:** `scripts/analytics/run-research-report.py`
**Commit:** `d60ca59`
**Applied fix:** Threaded `floor=args.floor` into the `assemble_breakdown(...)`
call inside `run_all_metrics` (previously called with no `floor` argument,
so it always fell back to the hardcoded `GUILD_FLOOR` default regardless of
`--floor`). `apply_floor`/`assemble_breakdown` were already correctly
implemented and unit-tested for a custom floor (`test_respects_custom_floor`);
this fix only wires the CLI value through to that existing, tested code
path. Verified output-neutral: with the default floor (10, matching
`--floor 10` explicitly passed), a dry-run against canned rows matching the
committed artifact's numbers reproduces the committed JSON byte-for-byte
(excluding `generated_at`).

### CR-02: `decide_top_bracket_coverage` is dead code in the production runner

**Files modified:** `scripts/analytics/run-research-report.py`,
`scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json`
**Commit:** `c45e98b`
**Applied fix:** Added a gate in `run_all_metrics` that, when assembling
`top-priority-bracket`, reads the already-computed `top-bracket-coverage`
support result from `results` and calls `decide_top_bracket_coverage` on its
raw `awards_in_window` / `awards_with_prior_snapshot` /
`active_guilds_with_usable_snapshots` numbers. If the decision says
`publish: False`, `top-priority-bracket` now routes to `unavailable` with
the decision's reason instead of being published unconditionally. Because
`run_all_metrics` processes `metrics.json` entries in registry order, and
`top-bracket-coverage` originally came *after* `top-priority-bracket` in
that list, I reordered the two support entries (`funnel-cohort-coverage`,
`top-bracket-coverage`) to precede `top-priority-bracket` in the registry so
the coverage result is available in `results` by the time the gate runs.
This reorder only moves `kind: "support"` entries, which are never emitted
into the published `findings`/`unavailable` arrays or CSV
(`main()` explicitly skips `kind == "support"` when building the
`unavailable` list) and are unaffected in `TestMetricsRegistryCompleteness`
(order-independent assertions) -- confirmed output-neutral via dry-run.
Separately verified the withhold path fires correctly by rerunning the
dry-run harness with a simulated degraded coverage
(`active_guilds_with_usable_snapshots: 5`, below the 10-guild floor): the
metric correctly routes to `unavailable` and the run correctly errors out
because the (unmodified) `published-findings.txt` still names it as
selected -- proving the gate is live, not a no-op.

Kept the registry's existing static `definition_note` verbatim rather than
rebuilding it from live numbers (see WR-04 below, skipped).

### CR-03: report page binds finding values by array index, prose by metric_id

**Files modified:** `app/research/wow-classic-loot-systems-2026/page.tsx`
**Commit:** `f8d2955`
**Applied fix:** Added a `findingsById` lookup (`Object.fromEntries(findings.map(f => [f.metric_id, f]))`)
and a `requireFinding(metricId)` helper that throws a build-time error if a
token'd metric is missing. Replaced every `findings[N].display` /
`findings[N].denominator` token binding in `TOKENS` with
`requireFinding('<metric-id>').display` / `.denominator`, matching the same
`metric_id`-keyed binding strategy the H2/body/callout-label copy already
used via `approved(\`finding.${finding.metric_id}...\`)`. A future reorder or
reselection of `published-findings.txt` now either resolves correctly (if
all four token'd ids are still present) or fails loudly at build time
(if one is missing), instead of silently misattributing one finding's
number into a different finding's prose section. No visible copy was
changed -- only the binding mechanism. Verified with the existing page
test suite (31 tests passed) plus scoped eslint and a full `tsc --noEmit`
(exit 0, no new errors).

### WR-01: `--start`/`--end` only affect the cosmetic `window` label

**Files modified:** `scripts/analytics/run-research-report.py`
**Commit:** `e0a2472`
**Applied fix:** Added a check at the top of `main()` that exits with an
error if `args.start != WINDOW_START or args.end != WINDOW_END`, since every
committed query has the real window baked in as a literal
(`assert_window_literals` enforces this) and these flags never actually
changed what was queried -- only what the published artifact's `window`
field claimed. Verified: `--lint-queries` with default args still exits 0;
`--lint-queries --start 2020-01-01` now exits 1 with a clear error instead
of silently mislabeling.

### WR-02: `resolve_output_path` doesn't confine absolute paths to `OUTPUT_DIR`

**Files modified:** `scripts/analytics/research_report.py`,
`scripts/analytics/test_research_report.py`
**Commit:** `9bcb27e`
**Applied fix:** Added a check after the existing bare-filename join that
resolves the path to an absolute path and raises `ValueError` unless it is
`OUTPUT_DIR` itself or a descendant of it. This closes the gap where an
absolute path (or one with an explicit separator) previously skipped both
existing guard branches and passed through unconfined. Two pre-existing
tests (`TestWriteCsv.test_orders_sample_then_findings_then_segments_by_count_desc_name_asc`,
`test_two_runs_over_unchanged_data_produce_identical_bytes`) wrote to an
arbitrary system tempdir outside `OUTPUT_DIR`, which the fix now correctly
rejects -- updated both to use `tempfile.TemporaryDirectory(dir=OUTPUT_DIR)`
instead, preserving their original intent (CSV row ordering, run-to-run
byte-identity) without relying on the now-fixed unconfined behavior. Added
four new tests directly covering the fix (`TestResolveOutputPath`):
rejects an absolute path outside `OUTPUT_DIR`, accepts a bare filename,
accepts a relative path inside `OUTPUT_DIR`, still rejects a `..` segment.
All 49 (now 53 after WR-03's additions) tests pass; dry-run confirmed
output-neutral for the real `DEFAULT_JSON`/`DEFAULT_CSV` paths (both already
inside `OUTPUT_DIR`).

### WR-03: header parsing absorbs prose colons; no metric-id cross-check

**Files modified:** `scripts/analytics/research_report.py`,
`scripts/analytics/run-research-report.py`,
`scripts/analytics/test_research_report.py`
**Commit:** `53189b0`
**Applied fix:** Two parts. (1) `parse_query_header` now stops at the first
blank `--` comment line (a `--` line with no content after stripping
dashes) -- every committed query file follows the shape of four required
`key: value` lines, then a bare `--` line, then free-form prose, so this
reliably separates the header from the prose without needing to touch any
`.sql` file. (2) `lint_queries` now accepts an optional `metrics` argument
and, when given, cross-checks every registry entry with a `query_file`
against that file's own parsed `header["metric-id"]`, raising if they
disagree. `main()` was reordered to load `metrics.json` before calling
`lint_queries` so this cross-check runs during the same offline preflight
that already guards window/forbidden-column literals (covering both
`--lint-queries` and a full run). Added 4 new unit tests for
`parse_query_header` (parses required keys, raises on missing key, stops at
blank comment line even with colon-bearing prose below it, a prose line
colliding with a required key never overwrites the real value) plus a
manual negative-path check (not committed as a test, run ad hoc) proving
the cross-check raises when a registry entry's `metric_id` doesn't match
its query file's header. All 8 committed query files still pass
`--lint-queries` cleanly after the fix (verified: header/registry ids
already agree everywhere).

### WR-05: page metadata dates are hardcoded and already stale

**Files modified:** `app/research/wow-classic-loot-systems-2026/page.tsx`
**Commit:** `4e16b7e`
**Applied fix:** Added `PUBLISHED_ISO` (kept fixed at the 2026-09-04 copy
sign-off date -- a page's original publish date intentionally does not move
on every pipeline rerun) and `MODIFIED_ISO = aggregates.generated_at`
(derived from the committed artifact, so it can never drift again). Wired
`MODIFIED_ISO` into `jsonLd.dateModified` and a new `openGraph.modifiedTime`
field, kept `PUBLISHED_ISO` for `openGraph.publishedTime`/`jsonLd.datePublished`,
and replaced the hardcoded visible `<time dateTime="2026-09-04">September 4,
2026</time>` with `<time dateTime={MODIFIED_DATE_ONLY}>{MODIFIED_DATE_DISPLAY}</time>`,
both derived from `aggregates.generated_at` via a new `formatIsoDateOnly`
helper. This directly implements the approved `methodology.window` copy's
own claim that "the data page states when its numbers were generated." No
visible copy string was changed -- the date text itself was never part of
`APPROVED_STRINGS` (it was a bare JSX literal). Verified: page test suite
(31 tests) still passes, scoped eslint clean, `tsc --noEmit` exits 0
(confirming `openGraph.modifiedTime` is a valid Next.js `Metadata` field for
`type: 'article'`), and the derived value now correctly reads "September 6,
2026" / `2026-09-06`, matching the committed artifact's real
`generated_at` (`2026-09-06T01:01:48Z`) instead of the stale hardcoded
`2026-09-04`.

## Skipped Issues

### WR-04: `top-priority-bracket`'s `definition_note` hardcodes a one-time coverage snapshot

**File:** `scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json:74`
**Reason:** Attempted to build the `definition_note` dynamically from the
live `top-bracket-coverage` numbers (as the review's fix note suggests, "once
CR-02 wires it in"), but discovered a genuine, unresolvable ambiguity: the
existing static note's own embedded numbers (16 guilds, 4,292 of 4,853
awards, "88.5%") are internally inconsistent --
`quantize_display(4292/4853*100, "percentage")` computes `88.4`, not `88.5`,
using the exact formula `decide_top_bracket_coverage` and the live query
both use. This means either the static note's `4,292` is off by one from
the true production value (the true value would need to be `4,293` to
round to `88.5`), or the note's `88.5%` was hand-rounded incorrectly at
authoring time -- and there is no way to determine which without querying
production, which hard constraint #2 explicitly forbids (no regenerating
or comparing against a fresh production run in this task). Building the
dynamic note from the exact numbers embedded in the current static text
would very likely change the rendered percentage in the `definition_note`
from `88.5%` to `88.4%` for today's data -- a real output change I cannot
prove is neutral, and constraint #2 requires that fixes be proven
output-neutral for current data "where feasible," which isn't feasible here
without touching production. Applied CR-02's gating logic without also
touching `definition_note` (kept the registry's static note verbatim when
publishing), so the metric's actual publish/withhold safety (the critical
issue) is fixed; only the cosmetic staleness-of-the-note risk (the warning)
remains open. Recommend a human either (a) manually re-verify the true
production coverage numbers and correct the static note by hand, or (b)
approve rebuilding it dynamically with the small, disclosed risk of a 0.1
percentage-point display change.

---

_Fixed: 2026-09-06T01:35:14Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
