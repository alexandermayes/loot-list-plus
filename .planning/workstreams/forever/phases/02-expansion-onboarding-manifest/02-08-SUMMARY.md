---
phase: 02-expansion-onboarding-manifest
plan: 08
subsystem: infra
tags: [wago, snapshot, csv-parse, retry, backoff, tsx, vitest]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "ReferenceSnapshotSchema, canonicalSnapshotPayload, findPromotableBosses and the committed placeholder wago.json (plan 02-07); FOREVER_MANIFEST (plan 02-02)"
provides:
  - "scripts/lib/wago-snapshot.ts: offline snapshot library (resolveBuild, parseTable, trimToManifest, refreshSnapshot, withRetry, RetryableHttpError, TerminalHttpError)"
  - "scripts/expansions/snapshot-reference.ts: thin CLI for the scheduled workflow; outage exits 0 with a notice, any other failure exits 1"
  - "Retry policy: 5 attempts, 2 s base, 60 s cap, plus or minus 25 percent jitter, Retry-After honoured, one identifying User-Agent on every attempt"
affects: [02-09]

actuals:
  tokens: 11800
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Side-effect-free script library with injected fetch, sleep, random, clock and writer; the CLI is the only caller that binds the real ones"
    - "Typed exhaustion: withRetry returns { kind: 'exhausted' } instead of throwing, and refreshSnapshot turns it into outcome 'outage' so only genuine failures throw"
    - "Single identity: one USER_AGENT constant, no second User-Agent anywhere in code; a 403 is backed off like 429 and 5xx, never worked around"

key-files:
  created:
    - scripts/lib/wago-snapshot.ts
    - scripts/expansions/snapshot-reference.ts
    - scripts/lib/__tests__/wago-snapshot.test.ts
  modified: []

key-decisions:
  - "Jitter is applied before the cap, so 60 s is a true ceiling: delay = min(capMs, baseMs * 2^(k-1) * (0.75 + random * 0.5)). The plan text capped before jitter, which would allow up to 75 s and contradict the must_have that delays never exceed 60 s"
  - "Retry-After is honoured in its seconds form only; an HTTP-date or unreadable value falls back to backoff"
  - "A response body that fails to read mid-stream is retried like a network error"
  - "withRetry takes an optional onRetry callback; refreshSnapshot uses it to log each retry through deps.log so the run summary shows attempt, status and delay"

patterns-established:
  - "Outage versus failure is decided in one place: exhausted retries become outcome 'outage'; terminal HTTP errors, header errors, no-build errors and schema failures propagate and the CLI exits 1"

requirements-completed: [EXPN-06]

coverage:
  - id: D1
    description: "Offline refresh: build resolution by highest numeric last segment, CSV parsing with header and integer checks, trimming to the manifest, and no rewrite when build and canonical hash are unchanged"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/wago-snapshot.test.ts#resolveBuild, #parseTable, #trimToManifest, #refreshSnapshot"
        status: pass
    human_judgment: false
  - id: D2
    description: "Retry with exponential backoff, jitter, cap and Retry-After through injected sleep and random; 403, 429, 500, 502, 503, 504, network errors and timeouts retried, 404 and other non-2xx terminal"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/wago-snapshot.test.ts#withRetry, #retry through refreshSnapshot"
        status: pass
    human_judgment: false
  - id: D3
    description: "Single identifying User-Agent: every recorded request across retried and persistent 403s carries only USER_AGENT, and no browser-style or second identity exists in code"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/wago-snapshot.test.ts#never sends a second identity: five 403 responses are an outage"
        status: pass
      - kind: other
        ref: "comment-stripped scan of scripts/lib/wago-snapshot.ts finds no Mozilla or FALLBACK_USER_AGENT"
        status: pass
    human_judgment: false
  - id: D4
    description: "Outage set returns outcome 'outage' and writes nothing; failure set throws; CLI --help exits 0 before any I/O"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/wago-snapshot.test.ts#treats 403 that never clears as an outage after 5 attempts and writes nothing"
        status: pass
      - kind: other
        ref: "npx tsx scripts/expansions/snapshot-reference.ts --help (exit 0)"
        status: pass
    human_judgment: false
  - id: D5
    description: "CLI outage and failure output: ::notice:: line, outage=true and changed=false to GITHUB_OUTPUT with no file written and exit 0; ::error:: and exit 1 otherwise"
    requirement: "EXPN-06"
    verification: []
    human_judgment: true
    rationale: "The CLI cannot be run without contacting the live host, so the notice, GITHUB_OUTPUT lines and exit codes are covered by code review and by the first manual workflow_dispatch run in plan 02-09, not by a test"
  - id: D6
    description: "Roadmap success criterion 5, refresh tooling against the real service: endpoint paths, builds list shape and CSV headers confirmed on the first successful pull"
    requirement: "EXPN-06"
    verification: []
    human_judgment: true
    rationale: "Research A4 and A7 are unconfirmed assumptions; only a real pull confirms them, and nothing in this phase waits on it (D-14)"

duration: ~20min
completed: 2026-10-16
status: complete
---

# Phase 2 Plan 08: Wago Reference Snapshot Library and CLI Summary

**Offline snapshot refresh library and CLI for the Forever reference data: highest-numeric build resolution, header-checked CSV parsing, manifest trimming, a no-rewrite guard on unchanged hash, and a retry policy (backoff, jitter, Retry-After, one identifying User-Agent) that turns a lasting wago outage, 403 included, into a green notice while a 404, missing header, no build or schema failure exits 1.**

## Performance

- **Duration:** about 20 min for the Task 2 continuation; Task 1 was run by an earlier agent and its time was not carried into this run, so the figure is approximate
- **Started (Task 2 dispatch):** 2026-10-16T22:55:00Z
- **Completed:** 2026-10-16
- **Tasks:** 2 (Task 1 tracer, owner approved the checkpoint; Task 2 auto)
- **Files modified:** 3 (all created)

## Accomplishments

- `resolveBuild` accepts a flat list, a list of `{ version }` objects or an object keyed by product, and picks the highest numeric last segment under the manifest prefix (`1.60.1.70009` beats `1.60.1.9` and an earlier-listed `1.60.0.68000`). `parseTable` handles a BOM, CRLF and quoted names, checks headers first and parses integers strictly. `trimToManifest` keeps only encounters, maps and items the manifest references, sorted by ID.
- `refreshSnapshot` does not write when the build and canonical hash match the committed snapshot (a new `fetchedAt` alone never produces a diff), and otherwise validates against `ReferenceSnapshotSchema` before one write, returning the promotable bosses.
- `withRetry` retries 403, 429, 500, 502, 503, 504, network errors, timeouts and unreadable bodies up to 5 attempts, honours `Retry-After`, and returns a typed exhausted result. `refreshSnapshot` maps exhaustion on the builds call or any table call to outcome `'outage'` with attempts and last status, and writes nothing.
- Every request on every attempt sends only `USER_AGENT`. A test records the headers of five consecutive 403 responses and asserts the header object is exactly `{ 'User-Agent': USER_AGENT }` each time. No second identity exists in code.
- The CLI prints `::notice::wago unavailable after N attempts (last status S); snapshot not refreshed`, writes `outage=true` and `changed=false` and exits 0 on an outage; any thrown error prints `::error::` and exits 1. `--help` exits 0 before any I/O.

## Task Commits

1. **Task 1: Tracer, offline refresh from injected responses (TDD)**
   - `53355560` (test, RED)
   - `a760637c` (feat, GREEN)
2. **Task 2: Retry, single User-Agent and the outage set (TDD)**
   - `2ded6abf` (test, RED: 28 of 61 tests failing before the implementation)
   - `8c992a14` (feat, GREEN: 61 of 61 passing)

**Plan metadata:** the docs commits that carry this file and the state and roadmap update.

## Files Created/Modified

- `scripts/lib/wago-snapshot.ts` - the one approved network-touching module; exports `WAGO_BASE_URL`, `PINNED_TABLES`, `EXPECTED_HEADERS`, `USER_AGENT`, `RetryableHttpError`, `TerminalHttpError`, `withRetry`, `resolveBuild`, `parseTable`, `trimToManifest`, `refreshSnapshot` and the types `PinnedTable`, `RefreshDeps`, `RefreshResult`, `RetryResult`, `RetryOptions`
- `scripts/expansions/snapshot-reference.ts` - CLI; usage header states the outage set, failure set and single identity
- `scripts/lib/__tests__/wago-snapshot.test.ts` - 61 offline tests; global `fetch` stubbed to throw and asserted unused; no host literal (URLs come from `WAGO_BASE_URL`)

## Decisions Made

See `key-decisions` above. Additive exports beyond the plan's list: `RetryResult`, `RetryOptions` and the `onRetry` option on `withRetry`.

## Deviations from Plan

None - plan executed exactly as written, with one reading of the plan text recorded as a decision rather than a deviation: the plan's formula caps the delay before applying jitter, but its own must_have says delays never exceed 60 s, so the cap is applied after jitter. At `random = 0.5` the two readings give identical delays (2000, 4000, 8000, 16000), so no behavior in the plan's examples changes.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** none.

## Issues Encountered

None. The RED run failed as expected (28 failures, all in the new retry and outage tests) and GREEN passed on the first implementation run.

## Authentication Gates

None.

## Known Stubs

None. Nothing in the three files holds hardcoded empty values that flow to UI, and none of them renders UI.

## Threat Flags

None. The only network surface is the one the plan's threat model already covers (T-02-08-01 to T-02-08-07); no new endpoint, auth path or schema change was added.

## Verification Results

- `CI=true npx vitest run scripts data/expansions`: 5 files, 170 tests passed
- `CI=true npx vitest run scripts/lib/__tests__/wago-snapshot.test.ts`: 61 tests passed
- `npx tsx scripts/expansions/snapshot-reference.ts --help`: exit 0, prints the usage line containing "snapshot-reference"
- `git diff --quiet -- data/expansions/forever/reference/wago.json`: clean after the test run
- No host literal in the test source (node check exit 0); no `Mozilla` or `FALLBACK_USER_AGENT` in the comment-stripped library (exit 0)
- Grep counts: `USER_AGENT` in the test 8, `403` in the test 7, `::notice::` in the CLI 2, `::error::` in the CLI 2, `GITHUB_OUTPUT` in the CLI 4, `User-Agent` in the library 1
- `npm run lint`: 0 errors (377 pre-existing warnings repo-wide, none in the three files)
- `npm run typecheck`: only the known `.next/dev/types/validator.ts` error
- The CLI was never run without `--help`, so no live host was contacted

## User Setup Required

None - no external service configuration required.

## Handoff to Plan 02-09

- **GITHUB_OUTPUT keys written by the CLI:** `outage` (`true` or `false`), `changed` (`true` or `false`), `promotable_count` and `promotable` (a `; `-separated list of `raid/bossKey (encounter id)`). On an outage only `outage=true` and `changed=false` are written, so the workflow must treat `promotable_count` and `promotable` as possibly unset and must not open a PR when `outage` is `true` or `changed` is `false`.
- **Exit codes:** 0 on success and on an outage (a `::notice::` line names the attempts and last status, which is how a lasting block stays visible across weekly runs, T-02-08-06); 1 on any failure, with a `::error::` line.
- **`refreshSnapshot` outcomes:** `unchanged` (no write), `updated` (one write, snapshot returned) and `outage` (`attempts`, `lastStatus`, no write).
- **No-live-fetch scan:** the wago host literal lives only in `WAGO_BASE_URL` in `scripts/lib/wago-snapshot.ts`, so the scan in `data/expansions/__tests__/no-live-fetch.test.ts` must exclude `scripts/` (as the research shape already says). This plan's test source holds no host literal, so it would pass the scan even if included.
- **Runtime:** the CLI runs under `npx tsx` from the repo root and uses the `@/` alias for `@/data`, `@/domain` and `@/lib` imports (tsx resolution confirmed in Task 1); the snapshot and allowlist paths are resolved from `process.cwd()`.
- **First real pull:** endpoint paths, the builds list shape and CSV headers are still unconfirmed assumptions (research A4, A7). The first manual `workflow_dispatch` run is where they are confirmed; a wrong guess fails loudly (a missing header or unknown shape exits 1) instead of writing a partial snapshot.

## Next Phase Readiness

Ready for plan 02-09 (workflow and no-live-fetch scan) and, in wave 3, plan 02-10. No blockers.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-16*

## Self-Check: PASSED

- FOUND: scripts/lib/wago-snapshot.ts, scripts/expansions/snapshot-reference.ts, scripts/lib/__tests__/wago-snapshot.test.ts
- FOUND commits: 53355560, a760637c, 2ded6abf, 8c992a14
- All Task 1 and Task 2 acceptance criteria re-run and passing; plan-level verification re-run and passing
