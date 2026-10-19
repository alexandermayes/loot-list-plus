---
phase: 02-expansion-onboarding-manifest
plan: 09
subsystem: infra
tags: [github-actions, wago, snapshot, source-scan, vitest, ci]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "scripts/expansions/snapshot-reference.ts and its GITHUB_OUTPUT keys (plan 02-08); the committed placeholder wago.json (plan 02-07); FOREVER_MANIFEST (plan 02-02)"
provides:
  - "data/expansions/__tests__/no-live-fetch.test.ts: repo-wide source scan (findLiveFetchViolations) that fails the build when runtime or test code fetches wago or Wowhead live, names the wago or tooltip host, or imports from scripts/"
  - ".github/workflows/refresh-wago-snapshot.yml: weekly and manual snapshot refresh that opens or updates one PR on a fixed branch only when the snapshot changed, and stays green through a wago outage"
  - "refresh-item-data.yml also triggers on pushes to main that change data/expansions/**"
affects: [02-10, 02-11, 02-12, 02-13]

actuals:
  tokens: 5500
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Source-scan guard with a file-count floor and synthetic self-checks, host literals built by concatenation so the scan does not flag itself"
    - "Fixed-branch bot PR: git checkout -B, one force push, gh pr create falling back to gh pr edit, so an unmerged PR is updated in place"
    - "Plain-text workflow verification on comment-stripped lines, no YAML parser dependency"

key-files:
  created:
    - data/expansions/__tests__/no-live-fetch.test.ts
    - .github/workflows/refresh-wago-snapshot.yml
  modified:
    - .github/workflows/refresh-item-data.yml

key-decisions:
  - "The promotable list reaches the shell through an env var (PROMOTABLE), not by interpolating the step output into the script text, so a crafted boss name cannot inject shell"
  - "The .npmrc step copies the empty-secret guard from ci.yml (fails fast with an error) rather than the bare printf in refresh-item-data.yml, minus the Dependabot hint because this workflow never runs under Dependabot"
  - "The PR body is assembled in the run script and stripped of YAML indentation with sed, so it reads as plain paragraphs in the PR"

patterns-established:
  - "Scheduled workflows that must never be required checks carry only schedule and workflow_dispatch triggers"

requirements-completed: [EXPN-06]

coverage:
  - id: D1
    description: "Source scan: no runtime or test file fetches wago or Wowhead live, names the wago or tooltip host, or imports from scripts/; at least 700 files scanned; self-checks flag synthetic violations and pass a Wowhead link builder"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/no-live-fetch.test.ts (20 tests, 815 files scanned, zero offenders)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Weekly and manual refresh workflow: cron '17 6 * * 1' plus workflow_dispatch, no push or pull_request trigger, concurrency group refresh-wago-snapshot, PR only when outage is not true and changed is true, fixed branch with a single force push and a gh pr edit fallback, GITHUB_TOKEN note and promotable instruction in the PR body"
    requirement: "EXPN-06"
    verification:
      - kind: other
        ref: "plan Task 2 plain-text check (exit 0) plus the five acceptance greps and a js-yaml parse of both workflows"
        status: pass
    human_judgment: false
  - id: D3
    description: "Roadmap success criterion 5, snapshot half: the workflow actually runs green on GitHub and either reports a wago outage notice or opens a snapshot PR"
    requirement: "EXPN-06"
    verification: []
    human_judgment: true
    rationale: "Scheduled and dispatched workflows only exist once the file is on main; the first workflow_dispatch run also confirms the unverified wago endpoint, builds shape and CSV header assumptions from plan 02-08, which no offline check can"

duration: ~25min
completed: 2026-10-19
status: complete
---

# Phase 2 Plan 09: No-Live-Fetch Scan and Weekly Wago Snapshot Workflow Summary

**A repo-wide source scan now fails the build if runtime or test code fetches wago or Wowhead live, and a weekly plus manual GitHub workflow refreshes the committed wago snapshot through the offline script, opening or updating one fixed-branch PR only when the data changed and exiting green through a wago outage.**

## Performance

- **Duration:** about 25 min across both tasks; Task 1 was run by an earlier agent on 2026-10-17 and its time is approximate, Task 2 ran on 2026-10-19
- **Completed:** 2026-10-19
- **Tasks:** 2 (Task 1 tracer with TDD, owner approved the checkpoint; Task 2 auto)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `findLiveFetchViolations` enforces three rules over every `.ts`, `.tsx`, `.js`, `.mjs` and `.cjs` file under `app`, `lib`, `utils`, `domain`, `components`, `data` and `discord-bot` plus every test file: no fetch-family call naming the wago host or a wowhead.com host, no wago or Wowhead tooltip host literal at all (comments stripped), and no non-test import from `scripts/`. The live run scans 815 files against a 700 floor and finds zero offenders. Self-checks prove each rule fires on a synthetic source and that a clean source and a Wowhead link builder pass.
- `refresh-wago-snapshot.yml` runs Mondays 06:17 UTC and on `workflow_dispatch`, with no push or pull_request trigger so it can never be a required check. It runs `npx tsx scripts/expansions/snapshot-reference.ts` in a step with `id: snapshot`, and the PR step is gated on `outage != 'true' && changed == 'true'`.
- The PR step exits early when the snapshot file is unchanged on disk, otherwise commits only `data/expansions/forever/reference/wago.json` as github-actions[bot] on `chore/refresh-wago-snapshot`, pushes it with one force push, and runs `gh pr create`, falling back to `gh pr edit` so an unmerged PR is updated in place.
- The PR body states it was generated by the Refresh wago snapshot workflow, asks for a review of the trimmed rows, says the PR was opened with GITHUB_TOKEN so CI did not run (run `npm run test` locally or push a commit before merging), and when `promotable` is non-empty tells the maintainer to promote each named boss in `data/expansions/forever/manifest.ts` and remove it from the allowlist in the same PR, otherwise the Forever reference test fails (D-15).
- `refresh-item-data.yml` now also fires on pushes to main that touch `data/expansions/**`, and its header comment says why (icon and unique maps refresh when manifest items change; Forever has no items yet).

## Task Commits

1. **Task 1: Tracer, source scan for live wago and Wowhead fetches (TDD)**
   - `da350ebc` (test, RED)
   - `ce7dc5ed` (feat, GREEN: 20 of 20 passing)
2. **Task 2: Weekly snapshot refresh workflow and manifest trigger**
   - `456cded8` (feat)

**Plan metadata:** the docs commit that carries this file and the state, roadmap and requirements update.

## Files Created/Modified

- `data/expansions/__tests__/no-live-fetch.test.ts` - the scan, its floor and its self-checks; contains no host literal (built by concatenation) and is not excluded from its own scan
- `.github/workflows/refresh-wago-snapshot.yml` - the weekly and manual refresh workflow
- `.github/workflows/refresh-item-data.yml` - added `"data/expansions/**"` to the push paths and the header comment

## Decisions Made

See `key-decisions` above.

## Deviations from Plan

None - plan executed exactly as written. The `.npmrc` step follows the plan's "copy the existing guard pattern" using the ci.yml guard, and the env-var handoff for `promotable` is an implementation detail inside the plan's described step, recorded as a decision.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** none.

## Issues Encountered

None.

## Authentication Gates

None. The workflow needs the existing `NPM_RC` repository secret (already used by CI); no new secret is required.

## Known Stubs

None in the two files this plan added or changed. The wago snapshot itself is still the D-14 placeholder committed by plan 02-07; that is the subject of success criterion 5 below, not a stub in this plan's files.

## Threat Flags

None. The workflow adds no inbound trigger (no push, pull_request or pull_request_target), uses the default-scoped GITHUB_TOKEN with contents and pull-requests write only, and passes the step output through an environment variable rather than into script text.

## Verification Results

- Plan Task 2 plain-text check run verbatim: exit 0
- Acceptance greps on `refresh-wago-snapshot.yml`: `GITHUB_TOKEN` 3, `node-version: 22` 1, `NPM_RC` 5, `git push --force` 1
- No em dash added to either workflow file
- Both workflows parse with js-yaml; triggers are `schedule` and `workflow_dispatch` for the new file, `push` and `workflow_dispatch` for the item-data file
- `npx vitest run data/expansions`: 4 files, 177 tests passed (the no-live-fetch scan still reports zero offenders)
- `npm run typecheck`: exit 0, no output
- `npm run lint`: 0 errors (377 pre-existing warnings repo-wide)
- The workflow itself was not executed; it cannot run until it is on main

## User Setup Required

None for the code. One manual acceptance step is pending, see below.

## Pending Manual Acceptance

**Task 2 human-check (pending, owed by the user):** After PR 5 merges to main, open the Actions tab, run "Refresh wago snapshot" with `workflow_dispatch` once, and confirm the run is green. Expected: either a notice that wago was unavailable (no PR), or a PR from `chore/refresh-wago-snapshot` whose body carries the GITHUB_TOKEN note and the promotable list. If a PR appears, run the test suite locally on that branch before merging.

## Verifier notes

- **Roadmap success criterion 5: conditionally met.** The no-live-fetch half is fully met by Task 1. The snapshot half rests on the D-14 placeholder committed by plan 02-07 (build, fetchedAt and sha256 null, every table empty); real rows arrive only when this workflow first succeeds. SC5 conditionally met: placeholder committed; real snapshot pending first successful refresh (first `workflow_dispatch` run is a manual acceptance step).
- The Task 2 human-check above is that manual acceptance step.

## Next Phase Readiness

Plan 02-09 is the last plan of Phase 2 in wave order; all 13 plans now have a summary. Ready for phase verification. The first workflow run also confirms the wago endpoint, builds shape and CSV header assumptions from plan 02-08 (research A4, A7).

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-19*

## Self-Check: PASSED

All three files exist and commits da350ebc, ce7dc5ed and 456cded8 are present in git log.
