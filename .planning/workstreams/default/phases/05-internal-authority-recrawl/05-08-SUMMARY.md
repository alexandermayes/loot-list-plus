---
phase: 05-internal-authority-recrawl
plan: 08
subsystem: seo
tags: [python-stdlib, vercel, search-console, url-inspection, recrawl, nextjs]

# Dependency graph
requires:
  - phase: 05-internal-authority-recrawl
    provides: "05-02's probe/log/inspection scripts, 05-04/05-05's link sweep, 05-06's dates module, 05-07's blog-post date parity -- the full deploy-two payload this plan pushes and proves"
provides:
  - "Deploy two live on production: buildId dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX at git SHA ded23d70, superseding deploy one's dpl_FPzLT8iTS776gvsSGL9t94VMow2K"
  - "scripts/analytics/recrawl-targets.json: the 11-entry frozen recrawl list, one object per URL in 05-COPY-DRAFT.md's RECRAWL-LIST, each carrying the byte-matched anchor and href derived from the approved APPROVED-STRING lines"
  - "probe-recrawl-urls.py and inspect-url.py both fixed to accept the real file shapes this and later plans pass them (nested content-dates.json, array-shaped targets file), so the same targets.json now serves as --url-list, --dates-file input, and --anchors-file for both tools"
  - "scripts/analytics/RECRAWL-LOG.md: 11 prepared rows, one per recrawl-list URL, carrying deploy identifiers plus the probe and inspection verdicts, every request_date and requester empty"
affects: ["05-09"]

# Actuals (#2632)
actuals:
  tokens: 5300
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "normalize_dates_map/normalize_anchors_map: accept-both-shapes adapters so a single frozen targets.json (array of {url, anchor, href}) can serve --anchors-file, --url-list, while data/content-dates.json's nested {routes, blogPosts} shape can serve --dates-file directly, without maintaining a second, driftable flat-map copy of either file"
    - "load_url_list detects a leading '[' to choose JSON-array parsing over line-per-URL parsing, kept backward compatible with the original plain-text file design"

key-files:
  created:
    - scripts/analytics/recrawl-targets.json
    - scripts/analytics/test_inspect_url.py
  modified:
    - scripts/analytics/probe-recrawl-urls.py
    - scripts/analytics/inspect-url.py
    - scripts/analytics/test_probe_recrawl_urls.py
    - scripts/analytics/RECRAWL-LOG.md

key-decisions:
  - "The research report's single targets.json entry carries only one of its two approved outbound anchors (report.link-1, to /compare) as the anchor/href pair, since the targets schema is one-anchor-per-URL and the recrawl list itself is one-URL-per-page. Both of the report's outbound links (Links 5 and 6) are already exhaustively byte-matched by app/blog/__tests__/guide-report-links.test.tsx and the report's own render tests, part of the 1049/1049 passing npm test suite; this plan's live-CDN probe is a spot check on top of that, not a replacement for it."
  - "Fixed three real shape mismatches in probe-recrawl-urls.py and inspect-url.py (Rule 3 - blocking): --dates-file expected a flat url-to-date map but data/content-dates.json is the nested {routes, blogPosts} shape from plan 05-06; --anchors-file expected a flat url-to-{text,href} map but the frozen targets file is an array; --url-list expected one URL per line but this plan's own <verify> block points it at the same JSON array file. Added normalize_dates_map, normalize_anchors_map, and a dual-shape load_url_list to both scripts, with 17 new unit tests (172/172 total passing)."
  - "Task 3's own automated verify block's blocked-check (`indexingState not in (None, 'INDEXING_ALLOWED')`) does not match the real Search Console API behavior 05-02-SUMMARY already documented: a never-crawled URL returns the string 'INDEXING_STATE_UNSPECIFIED', not None. Ran a precision-corrected check (treating the UNSPECIFIED sentinel plus absent canonicals as the documented never-crawled outcome, not a blocking one) to prove the real acceptance criterion -- no genuine blocking state on any of the 11 URLs -- holds. Not a code change; the plan's own literal check is imprecise the same way 05-01's docstring grep and 05-06's git-diff substring check were."
  - "Today's calendar date (2026-09-08) already matched the deploy-two date plan 05-06 recorded in data/content-dates.json, so the date-correction branch in task 1 was not taken; no blog page or dates-module edit was needed."

requirements-completed: [LINK-02]

coverage:
  - id: D1
    description: "Deploy two is live on production: the link sweep and the honest dates are publicly visible, proven by a build-identifier change plus independent content assertions (the approved /compare anchor in the delivered HTML, the dates-module lastmod in the delivered sitemap), not by the build identifier alone"
    requirement: "LINK-02"
    verification:
      - kind: other
        ref: "task 1 automated verify block, run live this session: git rev-parse origin/main == HEAD; blog-dates.test.tsx (42/42) and sitemap.test.ts (17/17) re-run green after confirming no date correction was needed; curl https://www.getlootlist.com/api/version buildId changed from dpl_FPzLT8iTS776gvsSGL9t94VMow2K to dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX; /compare returned 200 with the approved anchor present; /sitemap.xml carried the dates-module report lastmod (2026-09-08)"
        status: pass
    human_judgment: false
  - id: D2
    description: "scripts/analytics/recrawl-targets.json: the 11-entry frozen recrawl list, cross-checked three ways (RECRAWL-LIST line count, the confirmed changed-page set in 05-04/05-05-SUMMARY.md, and data/content-dates.json coverage); probe-recrawl-urls.py run twice against production with every one of the six named checks passing for all 11 URLs, no skips, byte-identical results"
    requirement: "LINK-02"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_probe_recrawl_urls.py (172/172 passing across the whole scripts/analytics suite, run via python3 -m unittest discover; 17 new assertions for normalize_dates_map, normalize_anchors_map, and the dual-shape load_url_list)"
        status: pass
      - kind: other
        ref: "task 2 automated verify block, run live this session: targets file shape/count/cross-reference checks; two live probe runs against production (66 total check results: 11 URLs x 6 checks), all pass, exit 0, byte-identical between runs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every recrawl-list URL inspected live via Search Console URL Inspection, with no blocking canonical mismatch, indexing state or fetch state (three URLs correctly reported as having no crawl history yet, the documented normal outcome, not a blocking one); one prepared row per URL appended to RECRAWL-LOG.md via log-recrawl.py with every request_date and requester empty; no credential material anywhere in the inspection output or the committed log; no indexing request or sitemap resubmission made"
    requirement: "LINK-02"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_inspect_url.py (6 new assertions for load_url_list's dual-shape parsing and summarize()'s ready/never-crawled/canonical-mismatch/blocked-indexing branches)"
        status: pass
      - kind: other
        ref: "task 3 automated verify block, run live this session: inspect-url.py --url-list against the 11-entry targets file, --json output grepped for access_token/refresh_token/client_secret (none found); log-recrawl.py --check run for all 11 URLs before appending (none already requested); prepared-rows-present and no-request-date-written checks re-run against the committed log; grep -c em-dash returns 0"
        status: pass
    human_judgment: true
    rationale: "Task 3's own literal blocked-indexing-state check (None-only) does not match the documented real API shape for a never-crawled URL (UNSPECIFIED enum strings, per 05-02-SUMMARY); this SUMMARY documents a precision-corrected re-check that passed, but the underlying judgment that 'no crawl history yet' on 3 of 11 URLs is genuinely non-blocking (rather than a masked real problem) rests on the plan's own stated design intent, not a mechanically provable assertion alone -- a human should confirm this reading before the 05-09 request step."

duration: 55min
completed: 2026-09-08
status: complete
---

# Phase 5 Plan 8: Deploy Two and the Double-Proof Recrawl Readiness Summary

**Pushed deploy two to production (buildId dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX), froze the 11-URL recrawl list into `recrawl-targets.json`, fixed three real file-shape bugs in the probe and inspection scripts so they could actually consume that list, then proved every URL live from the CDN (two identical 66-check probe passes) and from Google itself (Search Console URL Inspection), writing one prepared row per URL into `RECRAWL-LOG.md` with every request date still blank.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-08T11:45:00Z (approx)
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- **Deploy two is live.** `git push origin main` published 39 pending phase-05 commits (the link sweep, the recrawl log/inspection tooling, the sitemap dates module, the blog-post date parity gate). Production's `/api/version` buildId moved from `dpl_FPzLT8iTS776gvsSGL9t94VMow2K` (deploy one) to `dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX`, confirmed within about 90 seconds of the push. Content assertions on top of that build-id change: `/compare` returns 200 and delivers the approved anchor text in its HTML; `/sitemap.xml`'s report entry carries the dates-module lastmod (`2026-09-08T00:00:00.000Z`) rather than a stale literal. Today's date already matched the deploy-two date `data/content-dates.json` recorded, so no date-correction commit was needed.
- **`scripts/analytics/recrawl-targets.json`** freezes the approved recrawl list into 11 machine-readable entries (`url`, `anchor`, `href`), cross-checked against the `RECRAWL-LIST` line count, the confirmed changed-page set in `05-04-SUMMARY.md`/`05-05-SUMMARY.md`, and `data/content-dates.json` coverage, with no disagreement found.
- **Fixed three real bugs in the probe and inspection tooling** that would otherwise have silently produced skipped checks or crashed outright: `probe-recrawl-urls.py --dates-file` and `--anchors-file` expected flat url-keyed maps, but `data/content-dates.json` (from plan 05-06) is the nested `{routes, blogPosts}` shape and the targets file is an array; `--url-list` in both `probe-recrawl-urls.py` and `inspect-url.py` expected one URL per line, but the same targets file needed to serve that role too. Added `normalize_dates_map`, `normalize_anchors_map`, and a dual-shape `load_url_list` to both scripts, with 23 new unit tests (172/172 total passing across `scripts/analytics/`).
- **The live production probe ran twice, byte-identically, with zero failures and zero skips**: all 11 URLs passed all 6 named checks (`status_200`, `self_canonical`, `no_noindex_meta`, `no_noindex_header`, `anchor_present`, `sitemap_lastmod_matches`) -- 66 passing checks per run, two runs.
- **All 11 URLs inspected live in Search Console.** 8 have a real Google verdict already (`googleCanonical` matches the page's own URL, `INDEXING_ALLOWED`, `SUCCESSFUL` fetch, `ALLOWED` robots); 3 (`/pricing`, the research report, and the first linked guide) have no crawl history yet -- the plan's own documented, expected first-crawl outcome for a report or newly-linked page, not a blocking condition. No credential material appeared anywhere in the inspection output.
- **`RECRAWL-LOG.md` now carries 11 prepared rows**, one per recrawl-list URL, each written through `log-recrawl.py` (never by hand), carrying `deploy_sha=ded23d70`, `deploy_build_id=dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX`, the probe verdict, and the summarized inspection verdict. Every `request_date` and `requester` is empty. `log-recrawl.py --check` confirmed none of the 11 URLs had been requested before appending.
- **No Search Console write of any kind was made.** No indexing request, no sitemap resubmission. `inspect-url.py` only calls the read-only URL Inspection endpoint.

## Six-check probe verdict table (both runs identical)

| URL | status_200 | self_canonical | no_noindex_meta | no_noindex_header | anchor_present | sitemap_lastmod_matches |
|---|---|---|---|---|---|---|
| / | pass | pass | pass | pass | pass | pass |
| /compare | pass | pass | pass | pass | pass | pass |
| /pricing | pass | pass | pass | pass | pass | pass |
| /about | pass | pass | pass | pass | pass | pass |
| /research/wow-classic-loot-systems-2026 | pass | pass | pass | pass | pass | pass |
| /blog/loot-priority-lists-vs-loot-council | pass | pass | pass | pass | pass | pass |
| /blog/dkp-is-dead-what-classic-guilds-use-in-2026 | pass | pass | pass | pass | pass | pass |
| /blog/how-to-handle-loot-drama-without-losing-raiders | pass | pass | pass | pass | pass | pass |
| /blog/how-to-run-loot-without-a-spreadsheet | pass | pass | pass | pass | pass | pass |
| /blog/why-attendance-tracking-matters-more-than-loot-rules | pass | pass | pass | pass | pass | pass |
| /blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild | pass | pass | pass | pass | pass | pass |

All 11 rows: 6/6 pass, 0 skipped, 0 failed. Confirmed identical on a second run.

## Search Console URL Inspection verdict table

| URL | verdict | googleCanonical == userCanonical | indexingState | pageFetchState | robotsTxtState |
|---|---|---|---|---|---|
| / | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /compare | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /pricing | NEUTRAL | no crawl history yet | UNSPECIFIED | UNSPECIFIED | UNSPECIFIED |
| /about | NEUTRAL | googleCanonical = own URL (userCanonical stale, see note) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /research/wow-classic-loot-systems-2026 | NEUTRAL | no crawl history yet | UNSPECIFIED | UNSPECIFIED | UNSPECIFIED |
| /blog/loot-priority-lists-vs-loot-council | NEUTRAL | no crawl history yet | UNSPECIFIED | UNSPECIFIED | UNSPECIFIED |
| /blog/dkp-is-dead-what-classic-guilds-use-in-2026 | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /blog/how-to-handle-loot-drama-without-losing-raiders | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /blog/how-to-run-loot-without-a-spreadsheet | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /blog/why-attendance-tracking-matters-more-than-loot-rules | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |
| /blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild | NEUTRAL | yes (own URL) | INDEXING_ALLOWED | SUCCESSFUL | ALLOWED |

Note on `/about`: Google's cached `userCanonical` reads `https://www.getlootlist.com/` (stale data), but `googleCanonical` -- the URL Google will actually index -- correctly resolves to `/about`, and the live page's own `<link rel="canonical" href="https://www.getlootlist.com/about"/>` was independently confirmed via `curl`. Not disqualifying per the plan's own criterion (a canonical Google actually uses that is not the page's own).

No inspection result reported an indexing state blocked by a meta tag, header or robots directive, or a fetch state other than successful, on any of the 11 URLs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy two, the push that makes the link sweep and the honest dates public** - no repository files changed (`type="auto"`, this task publishes existing commits via `git push origin main`, then verifies from production; today's date already matched the recorded deploy-two date, so the correction branch was not taken). Verified via the plan's own automated `<verify>` block, run directly this session, all assertions passing.
2. **Task 2: Probe every recrawl-list URL against the live CDN** - `2c2722b` (feat)
3. **Task 3: Inspect every URL in Search Console and write the prepared rows** - `bc87428` (feat)

**Plan metadata:** commit for this SUMMARY follows (see final_commit step).

## Files Created/Modified

- `scripts/analytics/recrawl-targets.json` (new) - the 11-entry frozen recrawl list
- `scripts/analytics/probe-recrawl-urls.py` - added `normalize_dates_map`, `normalize_anchors_map`, and a dual-shape `load_url_list` so `--dates-file`/`--anchors-file`/`--url-list` all accept this plan's real file shapes
- `scripts/analytics/inspect-url.py` - same `load_url_list` dual-shape fix
- `scripts/analytics/test_probe_recrawl_urls.py` - 17 new unit tests for the two normalizers and the dual-shape URL-list loader
- `scripts/analytics/test_inspect_url.py` (new) - 6 unit tests for `load_url_list` and `summarize()`'s ready/never-crawled/canonical-mismatch/blocked branches
- `scripts/analytics/RECRAWL-LOG.md` - 11 prepared rows appended via `log-recrawl.py`

## Decisions Made

- The research report's single `recrawl-targets.json` entry carries only its `/compare`-directed anchor (report.link-1), not both of its two approved outbound links, because the targets schema is one-anchor-per-URL. Both links are already exhaustively byte-matched by the existing `guide-report-links.test.tsx` and the report's own render tests (part of the 1049/1049 passing `npm test` suite); this plan's live probe is a spot check, not a substitute for that exhaustive test coverage.
- Fixed three genuine file-shape mismatches (Rule 3, blocking) between the probe/inspection scripts' original flat-map design (plan 05-01/05-02) and the real files this plan needed to pass them (plan 05-06's nested `content-dates.json`, this plan's own array-shaped targets file). See key-decisions in frontmatter for the full account and the 23 new unit tests added alongside the fix.
- Ran a precision-corrected version of task 3's own literal blocked-indexing-state check after confirming its `None`-only comparison does not match the real Search Console API shape for a never-crawled URL (`INDEXING_STATE_UNSPECIFIED`, not `None`) -- a mismatch 05-02-SUMMARY had already documented. The corrected check confirms the real acceptance criterion holds; the plan's own check text was not edited.
- Deploy-two date correction branch was not needed: today's calendar date (2026-09-08) already matched the date plan 05-06 recorded throughout `data/content-dates.json`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed probe-recrawl-urls.py and inspect-url.py to accept the real --dates-file, --anchors-file and --url-list shapes this plan needed to pass them**
- **Found during:** Task 2, first attempt to run the probe with `--dates-file data/content-dates.json --anchors-file scripts/analytics/recrawl-targets.json`
- **Issue:** `--dates-file` expected a flat `url -> date` map (per plan 05-01's original design), but `data/content-dates.json` (created later, in plan 05-06) is the nested `{routes, blogPosts}` shape keyed by relative path/slug, not full URL -- every `sitemap_lastmod_matches` check would have silently reported `skipped`. `--anchors-file` expected a flat `url -> {text, href}` map, but the targets file this plan's own task defines is an array, which crashed with `AttributeError: 'list' object has no attribute 'get'`. `--url-list` in both scripts expected one URL per line, but this plan's own `<verify>` block points it at the same JSON array file.
- **Fix:** Added `normalize_dates_map(data, origin)` (detects the nested shape via a `routes`/`blogPosts` key and flattens it to full URLs) and `normalize_anchors_map(data)` (detects a list and keys it by `url`) to `probe-recrawl-urls.py`; added a dual-shape `load_url_list` (detects a leading `[` for JSON, falls back to line-per-URL) to both `probe-recrawl-urls.py` and `inspect-url.py`.
- **Files modified:** `scripts/analytics/probe-recrawl-urls.py`, `scripts/analytics/inspect-url.py`, `scripts/analytics/test_probe_recrawl_urls.py`, `scripts/analytics/test_inspect_url.py`
- **Verification:** 23 new unit tests (172/172 total passing); live probe run against production, all 11 URLs x 6 checks pass, exit 0, two runs byte-identical.
- **Committed in:** `2c2722b` (Task 2), `bc87428` (Task 3, for the `inspect-url.py` half)

---

**Total deviations:** 1 auto-fixed (1 blocking issue spanning both scripts, split across two task commits by which tool each half belongs to)
**Impact on plan:** The fix was necessary for task 2 and task 3 to run at all as the plan specifies them (pointing both tools at the real committed files). No scope creep: the fix is confined to file-loading in the two scripts named in the plan's own artifact list, with full unit test coverage added alongside it.

## Issues Encountered

- **Task 3's own automated `<verify>` block contains an imprecise blocked-indexing-state check.** The literal check (`indexingState not in (None, 'INDEXING_ALLOWED')`) assumes a never-crawled URL reports `None`, but the real Search Console API (confirmed live this session, matching 05-02-SUMMARY's prior documented finding) reports the string `'INDEXING_STATE_UNSPECIFIED'` instead, alongside `None` canonicals and `'PAGE_FETCH_STATE_UNSPECIFIED'`. Run literally, this check flags 3 of the 11 URLs (`/pricing`, the research report, the first linked guide) as "blocked," which is a false positive: all three have no crawl history at all (every field is absent or the UNSPECIFIED sentinel together, not a real disallowed-indexing signal). A precision-corrected version of the same check, treating that consistent all-absent/UNSPECIFIED shape as the plan's own documented "never crawled" outcome rather than a blocking one, confirms all 11 URLs genuinely pass. This is the same class of check-precision issue `05-01-SUMMARY.md` and `05-06-SUMMARY.md` both documented (a blunt literal check not accounting for a real, previously-discovered API/tooling behavior); the plan's own verify text was not edited, only re-run with the correction applied and documented here.
- **`/about`'s Search Console `userCanonical` field shows a stale value** (`https://www.getlootlist.com/`) that does not match the live page's own canonical tag (`https://www.getlootlist.com/about`, confirmed via a direct `curl` of production). This reflects cached historical crawl data in Google's index, not a current issue -- `googleCanonical` (the field that determines what Google will actually index) correctly resolves to `/about` itself, which is the field the plan's own disqualification criterion names.

## User Setup Required

None - no external service configuration required. The `.env.local` GSC credentials precondition (present from Phase 1's OAuth setup) was verified non-empty (values not printed) before Task 3.

## Next Phase Readiness

- Production carries the final deploy-two state: the link sweep, the honest sitemap dates, and every blog post's structured-data parity. `scripts/analytics/RECRAWL-LOG.md` holds 11 prepared rows, each with its deploy identifiers, probe verdict and inspection verdict, and an empty request date.
- Plan 05-09 is the designated next step: it owns the one human action (clicking Request Indexing in Search Console) for each of these 11 URLs, using `log-recrawl.py --request-date --requester` to append the requested event after each click. No request has been made yet; the log's `request_date` column is entirely empty by design.
- No blocker for the next plan. The 3 URLs with no crawl history yet are not a blocker -- getting them crawled is the entire purpose of the request plan 05-09 makes.

---
*Phase: 05-internal-authority-recrawl*
*Completed: 2026-09-08*

## Self-Check: PASSED

- `[ -f scripts/analytics/recrawl-targets.json ]` - FOUND
- `[ -f scripts/analytics/test_inspect_url.py ]` - FOUND
- `[ -f scripts/analytics/probe-recrawl-urls.py ]` - FOUND
- `[ -f scripts/analytics/inspect-url.py ]` - FOUND
- `[ -f scripts/analytics/RECRAWL-LOG.md ]` - FOUND
- `git log --oneline --all | grep -q 2c2722b` - FOUND
- `git log --oneline --all | grep -q bc87428` - FOUND
- `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'` - 172 tests, OK
- `python3 scripts/analytics/probe-recrawl-urls.py --url-list scripts/analytics/recrawl-targets.json --dates-file data/content-dates.json --anchors-file scripts/analytics/recrawl-targets.json --json` - exit 0, 11 URLs x 6 checks pass, 0 skipped
- `python3 scripts/analytics/inspect-url.py --url-list scripts/analytics/recrawl-targets.json --json` - exit 0, 11 results, no credential material
- All plan-level `<acceptance_criteria>` re-run and passing for all three tasks (task 3's own blocked-check literal assertion documented above as an imprecise check, re-verified with the corrected version)
