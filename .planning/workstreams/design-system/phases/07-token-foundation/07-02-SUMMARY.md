---
phase: 07-token-foundation
plan: 02
subsystem: testing
tags: [puppeteer, visual-regression, ci, screenshot-baseline, node-scripts]

# Dependency graph
requires:
  - phase: 07-01
    provides: GO-AHEAD approval, PUPPETEER-24.43.1 approval, OI-6 resolution (and its amendments) for how the local dev server gets its Supabase env vars
provides:
  - A pinned, CI-safe puppeteer devDependency and a repeatable `npm run visual:baseline -- --label <label>` capture instrument
  - A committed pre-phase-07 before baseline (Home only, Overview symmetrically skipped) that Plans 03-05 can diff against and Plan 06 must reproduce the same subset of
affects: [07-03, 07-04, 07-05, 07-06, phase-08-through-12-visual-regression]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 5728
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: ["puppeteer@24.43.1 (devDependency, exact pin)"]
  patterns:
    - "Local-origin-only guard (hostname must be localhost/127.0.0.1) as the sole defense against a visual script ever pointing at production"
    - "D-16 fallback: a script that cannot complete an optional capture records a `skipped` entry and exits 0 rather than failing the whole run"
    - "Retry-the-whole-navigation-sequence pattern for transient Puppeteer/Next-dev-HMR races, rather than patching individual steps"

key-files:
  created:
    - scripts/visual/baseline.mjs
    - .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/home-light-1440.png
    - .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/home-light-390.png
    - .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/home-dark-1440.png
    - .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/home-dark-390.png
    - .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/manifest.json
  modified:
    - package.json
    - package-lock.json
    - .github/workflows/ci.yml

key-decisions:
  - "Accepted the D-16 fallback: Overview capture skipped (loadtest/test-users.json absent, and npm run test:users:create needs SUPABASE_SERVICE_ROLE_KEY which is not in this dev server's environment). Home-only baseline recorded with the skip reason in manifest.json, exiting 0 per the plan's own contract, rather than blocking the phase on a second credential."
  - "Hardened baseline.mjs against transient Puppeteer/Next-dev-HMR navigation races (retry-with-backoff per capture, viewport-before-navigate, reduced-motion, protocolTimeout) after diagnosing the earlier auth-loop blocker; the underlying cause turned out to be the dev server's Supabase key type, not the script, but the hardening is a legitimate correctness improvement kept in place."

requirements-completed: [TYPE-01, COLOR-01, COLOR-02, COLOR-06]

coverage:
  - id: D1
    description: "puppeteer 24.43.1 is an exact devDependency, the visual:baseline npm script exists, and the Node 20 CI test job carries PUPPETEER_SKIP_DOWNLOAD so no pull request pays the Chromium download cost"
    requirement: "TYPE-01"
    verification:
      - kind: other
        ref: "node -e checks against package.json devDependencies/scripts (task 1 acceptance criteria) + grep -c 'PUPPETEER_SKIP_DOWNLOAD' .github/workflows/ci.yml"
        status: pass
      - kind: other
        ref: "npm run lint && npm run typecheck && npm run test on commit 970758bf"
        status: pass
    human_judgment: false
  - id: D2
    description: "scripts/visual/baseline.mjs exists, refuses any non-localhost origin, refuses a missing --label, and logs no secret, credential or env value"
    requirement: "COLOR-01"
    verification:
      - kind: other
        ref: "node --check scripts/visual/baseline.mjs; BASE_URL=https://www.getlootlist.com node scripts/visual/baseline.mjs --label guard-probe (non-zero exit, no directory created); missing-label run (non-zero exit)"
        status: pass
      - kind: other
        ref: "npm run lint && npm run typecheck && npm run test on commit d27ed1ad and again on the hardening fix 5fd0ff88"
        status: pass
    human_judgment: false
  - id: D3
    description: "The pre-phase-07 before baseline is captured and committed with a manifest proving a local origin, so Plans 03-05 have a fixed point of comparison and Plan 06 knows exactly which subset to reproduce"
    requirement: "COLOR-02"
    verification:
      - kind: other
        ref: "manifest.json origin_hostname === localhost; images.length + skipped*4 === 8 slots; grep -rl 'NEXT_PUBLIC_SUPABASE' .planning/workstreams/design-system/baselines/ prints nothing; git log -1 --format=%s === 'docs(07): capture pre-phase-07 visual baseline'"
        status: pass
      - kind: other
        ref: "npm run lint && npm run typecheck && npm run test on commit 4e12b920"
        status: pass
    human_judgment: false
  - id: D4
    description: "The actual captured pixels (Home page, light/dark, 1440/390) look like the current app, not a broken/blank/error page"
    verification: []
    human_judgment: true
    rationale: "No automated check inspects pixel content; a human should open the 4 PNGs at least once before relying on them as the phase's before-comparison."

# Metrics
duration: 22min
completed: 2026-09-16
status: complete
---

# Phase 07 Plan 02: Visual Baseline Instrument Summary

**Pinned puppeteer 24.43.1 devDependency behind a CI skip-download flag, a hardened `visual:baseline` Puppeteer capture script with a hard localhost-only guard, and a committed pre-phase-07 before baseline (4 Home PNGs, Overview symmetrically skipped per the documented D-16 fallback).**

## Performance

- **Duration:** 22 min (this continuation session; Tasks 1-2 were committed in an earlier session)
- **Started:** 2026-09-16T18:08:00Z (approx, this session)
- **Completed:** 2026-09-16T18:30:28Z
- **Tasks:** 3 (all complete)
- **Files modified:** 8 (3 modified: package.json, package-lock.json, .github/workflows/ci.yml; 1 created script; 4 PNGs + 1 manifest created)

## Accomplishments

- puppeteer 24.43.1 installed as an exact-pinned devDependency, with the Node 20 CI test job carrying `PUPPETEER_SKIP_DOWNLOAD: 1` so the Chromium binary download never hits a pull request
- `scripts/visual/baseline.mjs` built and hardened: fixed 8-image capture matrix (2 pages x 2 themes x 2 viewports), a hard-exit guard that refuses any origin whose hostname is not `localhost`/`127.0.0.1`, an assertion that the target theme actually landed in `html.classList`, retry-with-backoff around known-transient Puppeteer/Next-dev-HMR races, and logging discipline that never prints a credential or env value
- The pre-phase-07 before baseline is captured and committed: 4 Home PNGs (light/dark x 1440/390) plus `manifest.json` recording `origin_hostname: "localhost"`, `git_sha`, and a `skipped: [{ page: "overview", reason: "GET /api/dev/test-users returned 404" }]` entry
- Resolved the auth-redirect-loop blocker that had paused the phase at Task 3: root cause was the dev server running with a disabled legacy Supabase anon key, not an app or script bug; the orchestrator supplied the project's current publishable key via a gitignored `.env.local` write, and no value was ever read, printed, or committed by this executor

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin puppeteer as a devDependency and keep the Chromium download out of the CI test job** - `970758bf` (feat)
2. **Task 2: Build the baseline capture script** - `d27ed1ad` (feat)
3. **Task 2 (hardening fix): Retry-with-backoff, viewport-before-navigate, reduced-motion, protocolTimeout** - `5fd0ff88` (fix)
4. **Task 3: Capture and commit the before baseline** - `4e12b920` (docs)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `scripts/visual/baseline.mjs` - Puppeteer capture script for the fixed 8-image baseline matrix, reused by Plans 03-06 and Phases 08-12
- `package.json` - `puppeteer` devDependency pinned exactly at `24.43.1`; `visual:baseline` npm script
- `package-lock.json` - resolved puppeteer subtree
- `.github/workflows/ci.yml` - job-level `env: PUPPETEER_SKIP_DOWNLOAD: 1` on the Node 20 `test` job
- `.planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/home-{light,dark}-{1440,390}.png` - the 4 captured before-baseline images
- `.planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/manifest.json` - capture metadata (origin hostname, git sha, images, skipped)

## Decisions Made

- Accepted the D-16 fallback for the Overview capture rather than chasing a second credential: `npm run test:users:create` requires `SUPABASE_SERVICE_ROLE_KEY`, which is a different, more privileged credential than the two `NEXT_PUBLIC_*` variables the OI-6 resolution scoped for this plan. Ran the script once as instructed, confirmed the failure was the documented missing-env-var path (no secret printed, only variable names), and proceeded with the Home-only baseline exactly as the plan's Task 3 anticipates.
- Kept the Task 2 hardening fix (5fd0ff88) from the earlier session in this plan's scope rather than re-deriving it, since it is a legitimate Rule 1 bug fix (transient CDP/HMR races) already committed and verified green before this continuation began.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hardened baseline.mjs against transient Puppeteer/Next-dev-HMR navigation races**
- **Found during:** Task 2 continuation (prior session, before this dispatch)
- **Issue:** A first navigation on a freshly created Puppeteer page occasionally aborted with `net::ERR_ABORTED`, and Next.js dev-mode's HMR websocket handshake could briefly invalidate the execution/DOM context mid-navigation, surfacing as a `Protocol error`. Neither reflected a real problem with the target server or page.
- **Fix:** Added `withTransientRetry`/`gotoWithRetry` helpers retrying the whole per-image navigation sequence (viewport-then-navigate order, a 1.5s HMR settle delay, up to 4 attempts with growing backoff), set `protocolTimeout: 45000` on browser launch, and emulated `prefers-reduced-motion: reduce` plus an animation-disabling style tag before each screenshot so Framer Motion's per-frame JS animations cannot keep the screenshot protocol call from settling.
- **Files modified:** scripts/visual/baseline.mjs
- **Verification:** `npm run lint`, `npm run typecheck`, `npm run test` all green on the commit; this session's live capture run completed cleanly on the first attempt with the hardened script.
- **Committed in:** `5fd0ff88`

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** Necessary for correctness — without it, transient Chromium/Next-dev races could silently produce a missing or corrupted baseline image. No scope creep; the fix stayed inside `scripts/visual/baseline.mjs`.

## Issues Encountered

- **Auth-redirect-loop blocker (resolved before this dispatch, documented here for the record):** the dev server's Home page looped on a client-side `SIGNED_OUT` reload because the Supabase anon key written to `.env.local` was a legacy-format JWT, and this Supabase project has legacy API keys disabled (`auth` answered 401 "Legacy API keys are disabled"). The orchestrator replaced it with the project's current publishable key (`sb_publishable` prefix) through the same CLI-to-file pipe, printing, reading back, or committing no value at any point. This executor re-verified the precondition read-only (`curl` status 200, SSR HTML contains no `nextjs-portal` marker) before proceeding and did not touch `.env.local` or any app source file.
- **Overview capture skipped (expected, by design):** `loadtest/test-users.json` is absent and `npm run test:users:create` requires `SUPABASE_SERVICE_ROLE_KEY`, a credential out of scope for this plan (OI-6 only covers the two public Supabase variables). The script's own D-16 fallback recorded the skip and exited 0. **Plan 06 must capture the same Home-only subset** (or, if the service-role key becomes available by then, may capture the full 8-image set — but the two runs must match each other for the before/after comparison to stay symmetric).

## User Setup Required

None - no external service configuration required by this plan. (The dev server's Supabase env vars were already resolved by the orchestrator per the OI-6 amendment before this dispatch.)

## Next Phase Readiness

- Plans 03-05 (the token commits) now have a committed, verified-local before baseline to diff their own after-captures against.
- Plan 06 (the after baseline) must reproduce the Home-only subset captured here (or explicitly re-attempt Overview with a service-role key and note the asymmetry) so the before/after comparison is apples-to-apples.
- No blockers remain for Phase 07 execution to continue with Plan 03.

---
*Phase: 07-token-foundation*
*Completed: 2026-09-16*

## Self-Check: PASSED

All created files verified present on disk (scripts/visual/baseline.mjs, the 4 baseline PNGs, manifest.json, this SUMMARY.md). All 4 commits (970758bf, d27ed1ad, 5fd0ff88, 4e12b920) verified present in git log. All Task 3 acceptance criteria re-run and passed: manifest origin_hostname is `localhost`, 8 slots accounted for (4 images + 4 skipped-page slots), 4 PNGs present, `docs(07): capture pre-phase-07 visual baseline` commit subject matches exactly, no `NEXT_PUBLIC_SUPABASE` string anywhere under the baselines directory, and lint/typecheck/test all exit 0.
