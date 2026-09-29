---
phase: 05-internal-authority-recrawl
plan: 02
subsystem: analytics-tooling
tags: [python, google-search-console, oauth, append-only-log, recrawl]

requires:
  - phase: 05-internal-authority-recrawl (plan 01)
    provides: pending Phase 2-4 commits pushed as the baseline deploy, and the production-facing probe script (probe-recrawl-urls.py)
provides:
  - A single append-only recrawl log (RECRAWL-LOG.md) with a validate-then-append writer and a mechanical already-requested check
  - A Search Console URL Inspection caller reusing the existing read-only OAuth token
  - A publish runbook step 5 that points at the one log instead of carrying its own table
affects: [05-03, 05-04, 05-05, "04-verified-guild-case-study (case-study publish runbook)"]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Two-row event log (prepared event with empty request_date, requested event with date+requester) instead of one-row-per-URL, so append-only and 'has this been requested' can both hold"
    - "Validate-then-append writer mirroring log-ai-answer.py's shape (validate_row / append_row / read_rows), extended with an already_requested() guard specific to the one-request-per-URL rule"
    - "Markdown table log with pipe-escaping instead of CSV, since the log doubles as a human-readable file linked from a runbook"

key-files:
  created:
    - scripts/analytics/RECRAWL-LOG.md
    - scripts/analytics/log-recrawl.py
    - scripts/analytics/test_log_recrawl.py
    - scripts/analytics/inspect-url.py
  modified:
    - .planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md

key-decisions:
  - "Recrawl log uses a Markdown table (not CSV) so it doubles as a readable file a runbook can point at, with pipe-character escaping in append_row/read_rows to keep a field value from forging an extra column"
  - "already_requested() and the CLI's --check flag are the single mechanical gate: the CLI exits 0 for an unrequested URL and 1 for an already-requested one, so a shell guard never has to parse prose"
  - "inspect-url.py copies pull-gsc.py's get_access_token() verbatim in structure rather than importing it, keeping the two scripts independently readable siblings, matching the existing scripts/analytics/ convention of small standalone stdlib scripts"
  - "A URL Google has never crawled is reported as a NEUTRAL verdict with UNSPECIFIED enum values rather than an absent indexStatusResult in practice (confirmed live against a nonexistent URL), and summarize() treats both shapes as a plain non-fatal outcome, never a traceback"

requirements-completed: [LINK-02]

coverage:
  - id: D1
    description: "Single append-only recrawl log with validate-then-append writer, already-requested guard, and a one-command check"
    requirement: LINK-02
    verification:
      - kind: unit
        ref: "scripts/analytics/test_log_recrawl.py (21 tests: validation, header creation, byte-identical append, double-request refusal, pipe round-trip, file-order reads)"
        status: pass
      - kind: manual_procedural
        ref: "plan's own automated <verify> block for Task 1, run this session"
        status: pass
    human_judgment: false
  - id: D2
    description: "Search Console URL Inspection caller reusing the existing read-only OAuth token, reporting verdict/canonical/indexing/fetch/robots state with no credential leakage"
    requirement: LINK-02
    verification:
      - kind: manual_procedural
        ref: "python3 scripts/analytics/inspect-url.py --url https://www.getlootlist.com/compare --json, run live this session: verdict PASS, canonicals agree, INDEXING_ALLOWED, SUCCESSFUL, ALLOWED, no token material in output"
        status: pass
    human_judgment: false
  - id: D3
    description: "04-PUBLISH-RUNBOOK.md step 5 points at the single recrawl log instead of carrying its own submitted-URL table"
    requirement: LINK-02
    verification:
      - kind: manual_procedural
        ref: "plan's own automated <verify> block for Task 3, run this session (pointer present, old table gone, warning paragraph byte-identical, git diff confined to step 5)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-07
status: complete
---

# Phase 5 Plan 2: Recrawl Log and URL Inspection Caller Summary

**A single append-only recrawl log with a validate-then-append writer and a one-command already-requested check, a Search Console URL Inspection caller reusing the existing read-only OAuth token, and a publish runbook that now points at the one log instead of keeping a second table.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-07T23:59:00Z (approx, following completion of 05-01)
- **Completed:** 2026-09-08T00:37:59Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `scripts/analytics/RECRAWL-LOG.md` and `scripts/analytics/log-recrawl.py`: the one place in the repository that records recrawl requests, with a validate-then-append writer that never rewrites, sorts, deduplicates or reorders an existing row, and an `already_requested()` guard plus `--check <url>` CLI flag that turns "has this URL already been asked for" into a single exit-code check
- `scripts/analytics/inspect-url.py`: reuses `pull-gsc.py`'s OAuth token exchange to call Search Console's URL Inspection endpoint with the existing `webmasters.readonly` token, no new consent; smoke-tested live against `https://www.getlootlist.com/compare` (verdict PASS, canonicals agree, `INDEXING_ALLOWED`, `SUCCESSFUL`, `ALLOWED`)
- `scripts/analytics/test_log_recrawl.py`: 21 unit tests covering validation by field name, header creation, append-only byte-identity across a second append, the double-request refusal, pipe-character escaping, and file-order (never sorted) reads
- `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` step 5 now points at `RECRAWL-LOG.md` and `log-recrawl.py --check` instead of carrying its own empty submitted-URL table, with the one-request-per-URL warning paragraph kept byte-identical

## Task Commits

Each task was committed atomically:

1. **Task 1: The single append-only recrawl log and its validate-then-append writer** - `fd91000` (feat)
2. **Task 2: The Search Console URL Inspection caller** - `635f848` (feat)
3. **Task 3: Collapse the runbook's second recrawl record into a pointer** - `37dc69b` (docs)

_No TDD tasks in this plan; each task is a single atomic commit._

## Files Created/Modified
- `scripts/analytics/RECRAWL-LOG.md` - the append-only recrawl record with its own header explaining the two-row event model and the never-rewrite rule; committed with header only, zero data rows (nothing has been submitted yet)
- `scripts/analytics/log-recrawl.py` - `validate_row`, `append_row`, `read_rows`, `already_requested`, and an argparse `main` with `--url`/`--check`/`--list`/`--log-path`
- `scripts/analytics/test_log_recrawl.py` - unittest module loading the hyphenated script by path via importlib, using `tempfile` so no test touches the real log
- `scripts/analytics/inspect-url.py` - `load_env`, `get_access_token`, `inspect`, `summarize`, `main`; CLI with `--url` (repeatable), `--url-list`, `--site`, `--json`
- `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` - step 5 edited to point at the shared log; steps 1-4 and 6 untouched (confirmed via `git diff`)

## Decisions Made
- Recrawl log is a Markdown table, not CSV, matching D-15's "e.g. `.md` or `.csv`" discretion, because the log doubles as a file a runbook links to and a human reads directly
- Pipe characters in a field value are escaped (`\|`) rather than switching to a different delimiter, keeping the file a normal-looking Markdown table while still round-tripping any value safely
- `inspect-url.py` copies `pull-gsc.py`'s `get_access_token()` in structure rather than importing it as a shared module, following this repo's existing pattern of small independent stdlib scripts in `scripts/analytics/` rather than introducing a new shared helper module
- Confirmed live (not just per RESEARCH.md's documentation citation) that a URL Google has never crawled returns a `NEUTRAL` verdict with `*_UNSPECIFIED` enum values rather than an absent `indexStatusResult` — `summarize()` handles both shapes without a traceback

## Deviations from Plan

None - plan executed exactly as written. The only adjustment was two rewordings inside `inspect-url.py`'s own docstring (removing the literal substrings "requests" and "sitemaps.submit"/"indexing.googleapis.com" from prose) after the task's own `<verify>` grep flagged them as false positives against code that does not actually call those things - not a deviation from the plan's intent, a fix to satisfy the plan's own verify script as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. The precondition on Task 2 (`.env.local` GSC credentials) was already satisfied from Phase 1's OAuth setup; verified present (non-printed) before executing the task.

## Next Phase Readiness
- The recrawl log and inspection caller are ready for the deploy-two link sweep (05-03 through 05-05) to use once the final content is live: probe passes, inspect confirms, `log-recrawl.py` records the prepared event, the human clicks Request Indexing, and the requested event is appended.
- `04-PUBLISH-RUNBOOK.md`'s case-study publish path now shares the same log, so a later case-study publish and this phase's own recrawl pass cannot produce two disagreeing records.
- No blockers for the next plan in this phase.

## Self-Check: PASSED

- `[ -f scripts/analytics/RECRAWL-LOG.md ]` — FOUND
- `[ -f scripts/analytics/log-recrawl.py ]` — FOUND
- `[ -f scripts/analytics/test_log_recrawl.py ]` — FOUND
- `[ -f scripts/analytics/inspect-url.py ]` — FOUND
- `git log --oneline --all | grep -q fd91000` — FOUND
- `git log --oneline --all | grep -q 635f848` — FOUND
- `git log --oneline --all | grep -q 37dc69b` — FOUND
- `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'` — 155 tests, OK
- Plan-level `<verification>` block re-run this session — all five checks pass

---
*Phase: 05-internal-authority-recrawl*
*Completed: 2026-09-07*
