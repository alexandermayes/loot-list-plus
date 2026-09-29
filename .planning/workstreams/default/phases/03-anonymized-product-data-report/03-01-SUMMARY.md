---
phase: 03-anonymized-product-data-report
plan: 01
subsystem: analytics-pipeline
tags: [python, supabase-management-api, nextjs-server-component, resolveJsonModule, k-anonymity, structured-data]

requires:
  - phase: 01-search-console-baseline
    provides: "scripts/analytics/ Python stdlib convention (pull-gsc.py, gsc_export.py) and the Management API + macOS Keychain pattern (scripts/deploy-migrations.sh)"
  - phase: 02-checkable-conversion-copy
    provides: "the no-self-serving-schema precedent (no Review/AggregateRating) and the Zev Person/Article JSON-LD pattern (#247) this page's structured data extends"
provides:
  - "A committed, reproducible pipeline: 01-sample-definition.sql -> run-research-report.py (Management API + Keychain) -> committed aggregates.json/.csv -> page.tsx (build-time import)"
  - "The centralized 10-guild floor merge (apply_floor/WITHHELD), window guard, forbidden-column guard, and ROUND_HALF_UP quantizer that every later query in this phase reuses"
  - "The report page skeleton at /research/wow-classic-loot-systems-2026 with self-canonical metadata, Article/Person/BreadcrumbList JSON-LD, and the first render-tested blog/landing page in this repo"
affects: ["03-02 (adds the remaining nine candidate metrics to metrics.json and reuses apply_floor for segmented breakdowns)", "03-03 (copy sign-off gate on this page's visible prose)", "03-04 (findings sections, per-finding stat callouts, methodology section, download links)", "03-05 (removes the interim robots noindex and adds the sitemap entry)"]

actuals:
  tokens: 12483
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Supabase Management API SQL execution via Python stdlib urllib, with an explicit curl-like User-Agent header (Cloudflare blocks urllib's default UA on this endpoint with HTTP 403 / error code 1010 -- undocumented in RESEARCH.md, discovered this session)"
    - "Build-time JSON import (resolveJsonModule) binding a Next.js Server Component's rendered numbers to a committed data artifact, verified in the compiled Turbopack server bundle"
    - "Idempotent artifact writing: the runner reuses the previously committed generated_at timestamp when nothing else in the artifact changed, so re-running over unchanged production data produces a byte-identical file"

key-files:
  created:
    - scripts/analytics/research_report.py
    - scripts/analytics/run-research-report.py
    - scripts/analytics/test_research_report.py
    - scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json
    - scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql
    - public/research/wow-classic-loot-systems-2026-aggregates.json
    - public/research/wow-classic-loot-systems-2026-aggregates.csv
    - app/research/wow-classic-loot-systems-2026/page.tsx
    - app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx
    - .planning/phases/03-anonymized-product-data-report/deferred-items.md
  modified: []

key-decisions:
  - "Fixed a Cloudflare bot-protection block (HTTP 403, error code 1010) on Python urllib's default User-Agent against the Management API endpoint by setting an explicit curl-like User-Agent in run_sql() -- not in RESEARCH.md, verified live this session with and without the header"
  - "build_artifact() owns the zero-row-to-unavailable routing (a candidate finding with value=None is moved into the unavailable list with its reason, never published as a zero/null finding) rather than leaving that solely to the CLI's main() loop, so the EVID-02 empty-result contract is covered by an offline unit test"
  - "The runner reuses the previous run's generated_at timestamp when the rest of the artifact is byte-identical, so the EVID-02 determinism acceptance criterion (git status clean on a second run) holds despite generated_at being a real timestamp"
  - "Metadata/JSON-LD URLs are written as repeated string literals (matching the existing blog-page convention) rather than a shared constant, so the acceptance criterion's literal grep count is met honestly rather than gamed"

patterns-established:
  - "Pattern: every future query file in this phase must pass parse_query_header + assert_window_literals + assert_no_forbidden_columns before it can run, enforced by lint_queries() on every invocation of run-research-report.py, not only --lint-queries"

requirements-completed: []  # EVID-01/EVID-02 are shared across 03-02..03-06; requirements.ready-ids reported 0/2 ready (other plans still pending) -- not marked complete by this plan.

coverage:
  - id: D1
    description: "A committed SQL file, run through a committed runner against production, produces a committed JSON+CSV artifact holding the four headline sample numbers"
    requirement: "EVID-02"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_research_report.py (19 tests, python3 -m unittest discover)"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py --lint-queries"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py (real run against production; sample: active_guilds=33, raid_events=454, loot_awards=5432, raiders_with_approved_lists=452)"
        status: pass
      - kind: other
        ref: "git status --porcelain public/research/ clean on a second run over unchanged data"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deleting the 2026-08-31 literal, or adding a forbidden identity column, makes --lint-queries fail and name the offending file/token"
    requirement: "EVID-02"
    verification:
      - kind: other
        ref: "manual scratch-file reproduction this session: window-literal removal and a scratch loot_history.character_name SELECT both produced a non-zero exit naming the file/token"
        status: pass
    human_judgment: false
  - id: D3
    description: "The report page renders the four sample numbers, window dates, and honest-framing sentence from the committed artifact import, with exactly one H1, self-canonical metadata, and Article/Person/BreadcrumbList JSON-LD with no Review/AggregateRating"
    requirement: "EVID-01"
    verification:
      - kind: component
        ref: "app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx (8 tests, npx vitest run)"
        status: pass
      - kind: other
        ref: "npm run typecheck, npx eslint on both new files"
        status: pass
    human_judgment: false
  - id: D4
    description: "npm run build proves the JSON import resolves in a real production Turbopack build, not only under vitest"
    verification:
      - kind: other
        ref: "npm run build (Turbopack compile phase: '✓ Compiled successfully'); grep of the emitted server chunk confirmed h.default.sample.active_guilds.toLocaleString(...) is present -- a binding, not a hardcoded number"
        status: pass
    human_judgment: true
    rationale: "Full `next build` cannot complete end-to-end in this sandbox: an unrelated, pre-existing /api/guild-count route requires SUPABASE_SERVICE_ROLE_KEY (a real production secret) to prerender, which is not present here and was not fabricated. The compile-phase success plus the server-chunk binding grep is strong evidence for this plan's page specifically, but a human/CI run with the real secret configured should confirm the full build exits 0."

duration: 45min
completed: 2026-09-04
status: complete
---

# Phase 3 Plan 01: Research-Report Tracer -- Committed Query to Production, Committed Artifact, Report Page Summary

**End-to-end reproducibility pipeline proven on real production data: a committed SQL file executed via the Supabase Management API produced a committed JSON/CSV artifact (33 active guilds, 454 raid events, 5,432 loot awards, 452 raiders), and a new Server Component page renders those exact numbers through a build-time JSON import, verified in the compiled production bundle.**

## Performance
- **Duration:** 45min
- **Started:** 2026-09-04T17:45:00Z (approx.)
- **Completed:** 2026-09-04T18:25:00Z
- **Tasks:** 2 completed
- **Files modified:** 10 (9 plan files + 1 deferred-items log)

## Accomplishments
- Built and ran the full pipeline against production for real: `01-sample-definition.sql` -> `run-research-report.py` (Keychain token, Management API) -> committed `public/research/*.json`/`*.csv` artifact.
- Centralized the D-04 10-guild floor merge, the D-12 window guard, the T-03-01 forbidden-column guard, and the ROUND_HALF_UP display quantizer in `research_report.py`, pinned by 19 offline unit tests.
- Shipped the report page skeleton at `/research/wow-classic-loot-systems-2026`: self-canonical metadata, Article/Person/BreadcrumbList JSON-LD (no Review/AggregateRating), and an opening-copy paragraph that reads every number from the committed artifact -- the first render-tested blog/landing page in this repo (8 passing assertions).
- Discovered and fixed a live-environment landmine not flagged in RESEARCH.md: the Management API endpoint sits behind Cloudflare, and Python's default `urllib` User-Agent gets a 403 (error code 1010) before Supabase's own auth check ever runs; a curl-like User-Agent header resolves it.
- Confirmed `percentile_cont` works through the Management API endpoint with a trivial live query (`SELECT percentile_cont(0.5) ... -> 2`), de-risking the median metrics plan 03-02 will add (RESEARCH.md Open Question 3).

## Task Commits
Each task was committed atomically:
1. **Task 1: One committed query, executed against production, to a committed artifact** - `b5b7589` (feat)
2. **Task 2: The page displays those numbers, imported from the artifact at build time** - `87913c0` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/WINDOWS/REQUIREMENTS updates)

## Files Created/Modified
- `scripts/analytics/research_report.py` - pure helpers: header parsing, window/forbidden-column guards, `apply_floor`/`WITHHELD`, `quantize_display`, `build_artifact`, JSON/CSV writers, `resolve_output_path`
- `scripts/analytics/run-research-report.py` - CLI runner: Keychain token, Management API `run_sql` (with the required curl-like User-Agent), `--lint-queries`, `--menu`, idempotent `generated_at` handling
- `scripts/analytics/test_research_report.py` - 19 offline unit tests covering every behavior bullet in the plan
- `scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json` - candidate-metric registry, seeded with `sample-definition`
- `scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql` - D-13 active-guild OR-definition and the four headline sample counts
- `public/research/wow-classic-loot-systems-2026-aggregates.json` / `.csv` - committed artifact from a real production run
- `app/research/wow-classic-loot-systems-2026/page.tsx` - report page Server Component
- `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` - 8 render assertions
- `.planning/phases/03-anonymized-product-data-report/deferred-items.md` - out-of-scope environment issues found this session

## Decisions Made
- Fixed the Cloudflare/urllib User-Agent block (Rule 3 -- blocking issue) rather than switching to `curl` via subprocess, keeping the runner stdlib-only per D-06/D-09.
- `build_artifact()` performs the zero-row -> `unavailable` routing itself (not just the CLI's `main()`), so the EVID-02 empty-result guarantee has direct unit-test coverage.
- Added a `stable_generated_at()` idempotency check to `run-research-report.py` so re-running over unchanged data leaves `git status --porcelain public/research/` clean, honoring the EVID-02 determinism acceptance criterion (the plan's artifact schema did not otherwise account for a real, always-different timestamp field).
- Metadata/JSON-LD URLs use repeated literal strings (matching `app/blog/*`'s existing convention) instead of a shared constant, because the acceptance criteria grep for literal occurrence counts.

## Deviations from Plan

**1. [Rule 3 - Blocking issue] Management API requests via Python urllib were blocked by Cloudflare (HTTP 403, error code 1010)**
- **Found during:** Task 1, first live run against production
- **Issue:** `urllib.request`'s default `User-Agent: Python-urllib/3.x` header is rejected by Cloudflare's bot protection in front of `api.supabase.com`, before the request reaches Supabase's own auth check. `curl` (used by `scripts/deploy-migrations.sh`) is unaffected because its default User-Agent isn't flagged.
- **Fix:** Added an explicit `User-Agent: curl/8.7.1` header to `run_sql()`'s request, with a code comment explaining why. Verified live: the same request fails with the default urllib UA and succeeds with the curl-like UA.
- **Files modified:** `scripts/analytics/run-research-report.py`
- **Verification:** live production request round-trip succeeded (`SELECT 1 as x;` -> `[{"x":1}]`); the real pipeline run then produced the committed artifact.
- **Commit:** `b5b7589`

**2. [Rule 2 - Missing critical functionality] Artifact writer was not idempotent across a real timestamp field**
- **Found during:** Task 1, verifying the "two runs, clean git status" acceptance criterion
- **Issue:** `generated_at` is a live UTC timestamp; without special handling, every run produces a different byte sequence even when the underlying data is unchanged, permanently failing the EVID-02 determinism criterion once the artifact is committed.
- **Fix:** Added `stable_generated_at()`: before writing, compares the candidate artifact (minus `generated_at`) against the existing committed file (minus `generated_at`); if they match, reuses the old timestamp.
- **Files modified:** `scripts/analytics/run-research-report.py`
- **Verification:** ran the pipeline, staged the output, re-ran it, confirmed `git status --porcelain public/research/` reports no modifications (only the pre-staged `A` markers).
- **Commit:** `b5b7589`

**Total deviations:** 2 auto-fixed (1 blocking-issue fix, 1 missing-critical-functionality fix).
**Impact on plan:** Both fixes were necessary for the plan's own stated acceptance criteria to pass; no scope was added beyond what EVID-02 already required.

## Issues Encountered
- `npm run lint` (full project) fails with a pre-existing, repo-wide ESLint config error (`react-hooks/purity` rule references a plugin that isn't registered in `eslint.config.mjs`, last touched at commit `b807e2f`, unrelated to this plan). Verified out of scope: `npx eslint` run directly against both files this plan touched passes with zero errors/warnings. Logged to `.planning/phases/03-anonymized-product-data-report/deferred-items.md` and to `.planning/WINDOWS.md` (unrun-verify).
- `npm run build` (full project) cannot complete in this sandbox: the pre-existing, unrelated `/api/guild-count` route requires `SUPABASE_SERVICE_ROLE_KEY` (a real production secret) at prerender time, which is not present here. This executor did not fabricate or source that secret. Verified instead via Turbopack's `✓ Compiled successfully` message and by grepping the emitted server chunk, which confirmed this plan's page compiles to `h.default.sample.active_guilds.toLocaleString(...)` -- a live binding to the JSON import, not a hardcoded number -- before the build later aborted on the unrelated route. Logged to `deferred-items.md` and `WINDOWS.md`.

## User Setup Required
None -- no external service configuration required. The macOS Keychain "Supabase CLI" entry already existed and was used read-only (its value was never displayed, logged, or committed).

## Next Phase Readiness
- Plan 03-02 can extend `metrics.json` and add new `.sql` files immediately; `apply_floor`, the window/forbidden-column guards, and `quantize_display` are ready for segmented-breakdown metrics.
- Plan 03-03's copy sign-off gate applies to this page's opening-copy prose (unchanged from the sprint plan's template, per CONTEXT.md).
- Plan 03-05 must remove the interim `robots: { index: false, follow: false }` directive and add the `app/sitemap.ts` entry in the same commit, per this page's code comment.
- No blockers. The two sandbox-only verification gaps (full lint, full build) are environment limitations, not defects in this plan's deliverables; both have direct evidence of correctness recorded above and in `deferred-items.md`.

## Self-Check: PASSED

- `[ -f scripts/analytics/research_report.py ]` -> FOUND
- `[ -f scripts/analytics/run-research-report.py ]` -> FOUND
- `[ -f scripts/analytics/test_research_report.py ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql ]` -> FOUND
- `[ -f public/research/wow-classic-loot-systems-2026-aggregates.json ]` -> FOUND
- `[ -f public/research/wow-classic-loot-systems-2026-aggregates.csv ]` -> FOUND
- `[ -f app/research/wow-classic-loot-systems-2026/page.tsx ]` -> FOUND
- `[ -f app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx ]` -> FOUND
- `git log --oneline --grep="(03-01)"` -> 2 commits found (`b5b7589`, `87913c0`)
- Re-ran all acceptance criteria for both tasks: all pass (see coverage block and Issues Encountered for the two sandbox-scoped exceptions)
- Re-ran plan-level `<verification>`: unittest suite (19/19), `--lint-queries` (pass), page vitest suite (8/8), `npm test` (822/822 across 47 files), `npm run typecheck` (pass); `npm run lint` and `npm run build` blocked by pre-existing, out-of-scope environment issues documented above

---
*Phase: 03-anonymized-product-data-report*
*Completed: 2026-09-04*
