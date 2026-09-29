---
status: resolved
trigger: "npm run build fails with \"TypeError: c.createContext is not a function\" during \"Collecting page data\" for /blog/* pages. A different blog slug fails each run (nondeterministic across the 9-worker parallel page-data collection). Confirmed pre-existing and unrelated to any recent design-system work — reproduces identically at commit 27b3df5e (before Phase 10's colour-literal-migration work started) and on every state since. Tracked as .planning/WINDOWS.md entry 19 (kind: deviation, phase: 10, status: open). Only one copy of React exists in node_modules (19.2.3, no duplicates) per prior investigation. Next.js 16.2.12 with Turbopack. Need root cause and a fix."
created: 2026-09-20T19:00:00Z
updated: 2026-09-21T18:02:01Z
resolved_at: 2026-09-21T18:02:01Z
fix_commit: 50a91c9e33134f60b44a266ecf1e0a53a56de3c4
---

## Current Focus
<!-- OVERWRITE on each update - always reflects NOW -->

hypothesis: CONFIRMED — `components/ui/card.tsx` calls `React.createContext` but carries no `'use client'` directive, so when a React Server Component imports it (via `app/components/landing/BlogRelatedPosts.tsx`, which every blog post page renders) Turbopack compiles the real module into the RSC server layer, where `react` resolves through the `react-server` export condition to `react/react.react-server.js` — a build that does not export `createContext` at all.
test: Fix applied — add `'use client'` to `components/ui/card.tsx` (matching the existing `components/ui/modal.tsx` precedent, the only other `components/ui` primitive using `React.createContext`). Verify with a clean `rm -rf .next && npm run build`.
expecting: Build completes through "Collecting page data" for all 10 blog pages plus /research and /customers. Reverting the one-line change must bring the failure back.
next_action: NONE — session closed. Human verification returned "confirmed fixed" on 2026-09-21, independently re-verified by the orchestrator (clean `rm -rf .next && npm run build` exits 0 with all three previously-failing slugs emitted as static HTML under `.next/server/app/blog/`; the 6-test contract guard passes; `npm run lint` 0 errors / 397 pre-existing warnings). The user also chose to keep the ItemLink.tsx latent-duplicate fix in scope rather than narrowing it out. Fix committed as 50a91c9e; WINDOWS.md entry 19 marked fixed; knowledge-base entry KB-002 appended.
bug_class: Bohrbug (fully deterministic — every server-layer Card importer fails every build; the *reported* slug varies only because 9 parallel page-data workers race to report the first failure and the build aborts on it)
reasoning_checkpoint:
  hypothesis: "`components/ui/card.tsx` uses React.createContext without a 'use client' directive; React Server Components import it transitively, so it is compiled into the RSC layer where React's `react-server` conditional export omits createContext, throwing at module evaluation."
  confirming_evidence:
    - "Read the failing minified chunk at the exact stack offset: `.next/server/chunks/ssr/[root-of-the-server]__1hzfws9._.js:1:1491` is card.tsx compiled — `var c=a.i(717); let e=c.createContext(\"default\"), f=c.forwardRef(...)` with the verbatim nested/unified/default className strings from card.tsx."
    - "`node -e` on `react/react.react-server.js` (React 19.2.3) prints an export list with NO createContext (and no useState/useEffect/useContext/useRef) — only Children, Fragment, forwardRef, memo, use, useCallback, useId, useMemo, cache, etc. `react/package.json` maps the `react-server` condition to that file."
    - "Source-map layer analysis: `components/ui/card.tsx` appears as a REAL module inside `[root-of-the-server]__*` chunks, whereas every `'use client'` peer (LandingNav.tsx, GuildContext.tsx) appears there only as `__nextjs-internal-proxy.mjs` client references with their real modules in separate SSR chunks. modal.tsx — which also calls React.createContext but HAS \"use client\" — never appears in a root-of-the-server chunk."
  falsification_test: "Adding 'use client' to card.tsx leaves the build still failing with c.createContext, or the failing chunk turns out to be some module other than card.tsx."
  fix_rationale: "React context is a client-only React feature; the react-server build deliberately omits it. The defect is that the module declares a client-only capability without declaring itself a client module. Adding the directive makes the declaration match the capability, moving the real module out of the RSC layer into the SSR/client layer where createContext exists. This is the root cause, not the symptom — the symptom would be 'stop importing Card from blog pages'."
  blind_spots: "Not yet measured: RSC payload / client-bundle delta on the static marketing pages (blog, research, customers) now that Card is a client boundary. Not tested: runtime behaviour of the (app) authenticated routes, which already imported Card from client components and should be unaffected. CardHeader/CardContent/CardFooter also call React.useContext (likewise absent from react-server), so they would have been the next crash even if createContext had survived."
  candidate_causes:
    - "code: components/ui/card.tsx calls React.createContext with no 'use client' directive (primary, confirmed)"
    - "code: 5688967e (Phase 09-05) introduced the first genuine React Server Component importers of Card — app/blog/page.tsx, app/components/landing/BlogRelatedPosts.tsx, app/customers/[slug]/sections.tsx, app/research/wow-classic-loot-systems-2026/page.tsx (confirmed)"
    - "environment: Next.js 16.2.12 Turbopack applies the `react-server` export condition to the RSC layer — correct framework behaviour, not a fault, but it is the condition that makes the code defect observable"
    - "config: no lint rule, typecheck, or test gate asserts that components/ui primitives using client-only React APIs carry a client directive (confirmed gap — eslint-config-next does not check this, and tsc cannot see export conditions)"
  and_gate: "yes — two conditions had to hold simultaneously. card.tsx has called React.createContext since 5febb4f5 (2026-02-04) with zero build failures, because until 5688967e its only importers were client components (verified: at 5688967e~1 the sole non-'use client' importer was components/ui/skeletons.tsx, itself only reached from client components). The build only breaks once BOTH (a) the primitive uses client-only React AND (b) a real Server Component reaches it. Neither alone is sufficient."
tdd_checkpoint: null

## Symptoms
<!-- Written during gathering, then immutable -->

expected: `npm run build` completes successfully, producing a production build including all static /blog/* pages.
actual: Build fails during the "Collecting page data" phase with `TypeError: c.createContext is not a function`, thrown while evaluating a generated SSR chunk for one specific /blog/* page. The specific failing slug is nondeterministic across runs — observed failures on `/blog/dkp-is-dead-what-classic-guilds-use-in-2026`, `/blog/how-to-handle-loot-drama-without-losing-raiders`, and `/blog/guild-recruitment-guide-find-raiders-who-stay` across different build attempts, always exactly one page per failed build, always a /blog/* page.
errors: |
  Error: Failed to collect configuration for /blog/<slug>
      at ignore-listed frames {
    [cause]: TypeError: c.createContext is not a function
        at module evaluation (.next/server/chunks/ssr/[root-of-the-server]__<hash>._.js:1:<offset>)
        at instantiateModule (.next/server/chunks/ssr/[turbopack]_runtime.js:853:9)
        at getOrInstantiateModuleFromParent (.next/server/chunks/ssr/[turbopack]_runtime.js:877:12)
        at Context.esmImport [as i] (.next/server/chunks/ssr/[turbopack]_runtime.js:281:20)
        ... (repeats 2-3 times, chained module evaluations)
  }
  > Build error occurred
  Error: Failed to collect page data for /blog/<slug>
reproduction: Run `npm run build` (Next.js 16.2.12, Turbopack) from a clean `.next/` directory (`rm -rf .next && npm run build`) in this repo. Fails during "Collecting page data using 9 workers". Confirmed to reproduce on multiple different git commits/working-tree states, including at commit 27b3df5e (the last commit before Phase 10's design-system work started) and on the current HEAD — same error shape, different slug each time. `npm run dev` was not tested for the same symptom in this session (only `npm run build`'s static/SSG page-data-collection path was exercised).
started: Unknown exact origin point — confirmed present before Phase 10 (design-system workstream) started; not caused by any of Phase 07-10's design-token/CSS/Tailwind-only changes (those touch no blog code, no React context, no bundler config). Not yet bisected further back than commit 27b3df5e.

## Eliminated
<!-- APPEND only - prevents re-investigating after /clear -->

- hypothesis: The `--background-inset` token deletion, the purple/gradient migration, or any other Phase 10 design-token/CSS change caused this.
  evidence: Reproduced identically (same error shape, same nondeterministic-slug pattern) at commit 27b3df5e, the last commit before any Phase 10 file was touched, and separately on the Task-2-only state mid-Phase-10 (six card conversions committed, token-deletion changes stashed out). Both reproductions ran `rm -rf .next && npm run build` from a clean state.
  timestamp: 2026-09-20T18:30:00Z (prior session, orchestrator-level investigation)
- hypothesis: A duplicate/mismatched copy of the `react` package in node_modules (a classic cause of "X is not a function" on a React export in a bundled context).
  evidence: Checked node_modules for multiple React copies; only one copy of `react` exists (19.2.3), no duplicates found.
  timestamp: 2026-09-20T18:30:00Z (prior session, orchestrator-level investigation, not independently re-verified this session)
- hypothesis: A Turbopack worker-pool race / module-initialization-order bug during the 9-worker parallel page-data collection (suggested by the nondeterministic failing slug).
  evidence: The failing module is the same one on every run — `components/ui/card.tsx` — and the failure is fully deterministic per route. All 10 blog post pages plus /research and /customers/[slug] reach Card from a Server Component, so all of them fail; the build aborts on whichever of the 9 workers reports first, which is the only nondeterministic element. Nothing about the bundling varies between runs.
  timestamp: 2026-09-20T20:34:00Z
- hypothesis: Blog-content-specific cause — something in a particular post's markup, metadata, or per-slug data.
  evidence: The stack offset resolves to a shared design-system primitive (components/ui/card.tsx) reached identically by all 10 posts through the shared `BlogRelatedPosts` component. No per-slug code path is involved, and the same defect breaks the non-blog /research and /customers routes.
  timestamp: 2026-09-20T20:34:00Z

## Evidence
<!-- APPEND only - facts discovered during investigation -->

- timestamp: 2026-09-20T18:30:00Z
  checked: Ran `npm run build` on the Task-2-only committed state (before Phase 10's token-deletion edit) and separately at commit 27b3df5e (before any Phase 10 work), both after `rm -rf .next`.
  found: Both runs failed identically — `TypeError: c.createContext is not a function` during "Collecting page data", each time on a different /blog/* slug.
  implication: The failure predates and is unrelated to Phase 10's design-system work entirely. It is a pre-existing defect in the blog static-page-data-collection path.
- timestamp: 2026-09-20T18:30:00Z
  checked: `node_modules` for duplicate React installs.
  found: Only one copy of `react` (19.2.3) present.
  implication: Rules out the most common cause of this exact error class (two React copies producing two different Context/hook implementations), at least at the top-level dependency resolution. Does not rule out a *bundled* copy of React shipped inside some other dependency (e.g. an MDX/CMS library vendoring its own React), which Turbopack could pull into the SSR chunk separately from the app's own React import.
- timestamp: 2026-09-20T20:25:00Z
  checked: Reproduced with `rm -rf .next && npm run build`, then read the generated chunk named in the stack trace at the exact byte offset (`.next/server/chunks/ssr/[root-of-the-server]__1hzfws9._.js:1:1491`).
  found: Failed on `/blog/dkp-is-dead-what-classic-guilds-use-in-2026`. The module at offset 1491 is `components/ui/card.tsx` compiled — `var b=a.i(7997),c=a.i(717),d=a.i(82248); let e=c.createContext("default"), f=c.forwardRef(...)` containing the verbatim `"nested"===c?"border-t border-border first:border-t-0":"rounded-xl border border-border bg-card text-card-foreground"` class strings from card.tsx. So `c` is the React module and `c.createContext` is `components/ui/card.tsx:26`.
  implication: The bug is not blog-content-specific and not a Turbopack worker race. It is a single primitive, `components/ui/card.tsx`, which every blog page reaches through `BlogRelatedPosts`.
- timestamp: 2026-09-20T20:27:00Z
  checked: `react@19.2.3` package exports map and the runtime export surface of the `react-server` conditional build (`node -e "Object.keys(require('react/react.react-server.js'))"`).
  found: `react/package.json` maps `"." -> { "react-server": "./react.react-server.js", "default": "./index.js" }`. The react-server build exports only Children, Fragment, Profiler, StrictMode, Suspense, cache, cacheSignal, captureOwnerStack, cloneElement, createElement, createRef, forwardRef, isValidElement, lazy, memo, use, useCallback, useDebugValue, useId, useMemo, version. It exports NO createContext (grep count 0 in both cjs builds), and no useState/useEffect/useContext/useRef.
  implication: Any module evaluated in the React Server Components layer that calls `React.createContext` throws exactly `TypeError: <react>.createContext is not a function`. `forwardRef` survives (it IS exported), which is why the crash lands precisely on the createContext line and not earlier. `React.useContext` in CardHeader/CardContent/CardFooter would have been the next crash.
- timestamp: 2026-09-20T20:29:00Z
  checked: Parsed every `.map` under `.next/server/chunks/` and `.next/server/chunks/ssr/` to determine which layer each source file's REAL module is compiled into, versus appearing only as a client-reference proxy.
  found: `components/ui/card.tsx` appears as a real module directly inside `[root-of-the-server]__*` chunks (01cti9-, 086lykh, 0zznecj). By contrast `app/components/landing/LandingNav.tsx` and `app/contexts/GuildContext.tsx` (both `'use client'`) appear in `[root-of-the-server]__*` chunks ONLY as `<file>/__nextjs-internal-proxy.mjs`, with their real modules in separate chunks. `components/ui/modal.tsx` — which also calls `React.createContext` but carries `"use client"` — never appears in a root-of-the-server chunk at all.
  implication: Direct confirmation that `[root-of-the-server]__*` is the RSC server layer, that the `'use client'` directive is what keeps a module out of it, and that card.tsx is the only `components/ui` context-using primitive missing that directive. modal.tsx is the working control in a differential comparison.
- timestamp: 2026-09-20T20:32:00Z
  checked: `git log -S createContext -- components/ui/card.tsx`, and the set of non-`'use client'` Card importers at `5688967e~1` versus `5688967e` (checking for the directive within the first 20 lines, since some files open with a JSDoc block).
  found: `React.createContext` entered card.tsx in `5febb4f5` (2026-02-04). At `5688967e~1` the only non-client importer was `components/ui/skeletons.tsx`, which is itself only reached from client components. `5688967e` ("feat(09-05): migrate app/components and public pages onto Card", 2026-09-19) added the first true Server Component importers: `app/blog/page.tsx`, `app/components/landing/BlogRelatedPosts.tsx`, `app/customers/[slug]/sections.tsx`, `app/research/wow-classic-loot-systems-2026/page.tsx`. `5688967e` is an ancestor of `27b3df5e`.
  implication: Pinpoints the introducing commit as 5688967e (Phase 09-05), which sits before 27b3df5e — exactly consistent with the earlier finding that the failure reproduces at 27b3df5e and is unrelated to Phase 10. Confirms the AND-gate: the latent primitive defect (since February) only became a build failure when a Server Component reached it.
- timestamp: 2026-09-20T20:34:00Z
  checked: Why exactly one slug fails per build and why it differs run to run.
  found: All 10 blog post pages import `BlogRelatedPosts` -> `Card`, and `/research/...` and `/customers/[slug]` import Card directly from server components. Page data is collected by 9 parallel workers and the build aborts on the first reported failure.
  implication: The nondeterminism is purely reporting order across the worker pool, not a race in bundling. The defect is fully deterministic (Bohrbug) — every affected route fails every build. This retires the "Turbopack worker-pool race condition" alternative from the original hypothesis.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Two conditions had to hold at once (AND-gate):
  (1) `components/ui/card.tsx` calls `React.createContext` (and `React.useContext` in
      CardHeader/CardContent/CardFooter) to share its `variant` with its sub-components,
      but carries no `'use client'` directive. React context is a client-only feature:
      React 19.2.3 resolves the `react-server` export condition to
      `react/react.react-server.js`, whose export surface omits createContext, useContext,
      useState, useEffect and useRef entirely.
  (2) Commit 5688967e ("feat(09-05): migrate app/components and public pages onto Card",
      2026-09-19) introduced the first true React Server Component importers of Card:
      app/components/landing/BlogRelatedPosts.tsx (rendered by all 10 blog post pages),
      app/blog/page.tsx, app/research/wow-classic-loot-systems-2026/page.tsx and
      app/customers/[slug]/sections.tsx.
  Because card.tsx did not opt out of the server layer, Turbopack compiled the real module
  into the RSC chunk group (`[root-of-the-server]__*`), where `createContext` is undefined,
  so module evaluation threw during "Collecting page data".
  The nondeterministic slug was never a race: all 12 affected routes fail on every build,
  and the build simply aborts on whichever of the 9 parallel page-data workers reports first.
  Latent duplicate of the same class found and closed: app/components/ItemLink.tsx used
  useState/useEffect/useContext without the directive, safe today only because every one of
  its 21 importers happens to be a client component.
fix: |
  Added the `'use client'` directive to `components/ui/card.tsx` (matching the existing
  `components/ui/modal.tsx` precedent -- the only other components/ui primitive using
  React.createContext, which already had it), plus an explanatory comment recording why.
  Also added the directive to `app/components/ItemLink.tsx` to close the identical latent
  landmine before a future Server Component importer reintroduces the same build break.
  Added a derived-oracle regression test that reads the installed react-server build's real
  export surface and asserts every module under components/ui, app/components and
  app/contexts that uses a React API missing from it declares `'use client'`.
  No behavioural change: Card renders identical markup either way, and the prerendered blog
  HTML still contains all 8 server-rendered Cards and the full related-posts content.
verification: |
  guardrail_verdict: accepted
  signal_1_original_issue_resolved: PASS -- `rm -rf .next && npm run build` exits 0. All 10
    /blog/* post pages plus /blog, /research/wow-classic-loot-systems-2026 and
    /customers/[slug] now prerender. Zero occurrences of "error", "failed" or "createContext"
    in the build log. Pre-fix build of the identical tree (build1.log) failed on
    /blog/dkp-is-dead-what-classic-guilds-use-in-2026.
  signal_2_regression_test: PASS -- components/ui/__tests__/react-server-client-directive.test.ts,
    6 tests. Includes oracle self-guards (asserts the scanner resolves the react-server build,
    scans >20 files and detects >5 unsafe modules) so a broken scanner cannot pass vacuously.
  signal_3_revert_reproduces: PASS -- removing only the `"use client"` line from card.tsx makes
    the contract test fail with exactly
    `components/ui/card.tsx uses createContext, useContext without a "use client" directive`,
    and the pre-fix clean build (build1.log) failed with the original TypeError. Fix restored.
  signal_4_diff_shape: PASS -- addition-only, 19 insertions across 2 source files, 0 deletions.
    No code path removed or weakened.
  signal_5_regression_surface: PASS -- full vitest suite 73 files / 1219 tests green (includes
    the existing components/ui/__tests__/card.test.tsx covering the Phase 10 nested/unified/
    default variants). TypeScript check green inside the build. `npm run lint` 0 errors,
    397 warnings, all pre-existing (the one warning reported in a changed file,
    ItemLink.tsx:109 set-state-in-effect, exists verbatim at HEAD and only moved line number).
  environment: verified via the production build path only (`next build`, Turbopack, Node 20).
    Not exercised: `npm run dev`, staging, or production runtime.
  human_verify: CONFIRMED 2026-09-21 -- user replied "confirmed fixed, commit it". Independently
    re-run by the orchestrator before asking: `rm -rf .next && npm run build` exited 0 and all
    three previously-observed failing slugs (dkp-is-dead-what-classic-guilds-use-in-2026,
    guild-recruitment-guide-find-raiders-who-stay, how-to-handle-loot-drama-without-losing-raiders)
    are present as static HTML under `.next/server/app/blog/`; the 6-test contract guard passed;
    `npm run lint` reported 0 errors and the same 397 pre-existing warnings. Scope question on
    the ItemLink.tsx latent-duplicate fix answered "keep it" -- shipped in the same commit.
oracle_type: derived -- the forbidden-API set is read at test time from the installed
  react/react.react-server.js export surface rather than hardcoded, so the contract follows
  React upgrades. Boundary neighbours asserted in both directions: createContext/useContext/
  useState/useEffect/useRef must be absent from that surface, and forwardRef/memo/useMemo/
  useCallback/useId/createElement must be present (so server-safe primitives such as
  components/ui/badge.tsx are provably not over-flagged).
files_changed:
  - components/ui/card.tsx (added "use client" + rationale comment)
  - app/components/ItemLink.tsx (added 'use client' + rationale comment; latent duplicate)
  - components/ui/__tests__/react-server-client-directive.test.ts (new regression guard)
commit: 50a91c9e33134f60b44a266ecf1e0a53a56de3c4 -- "fix(debug): declare Card and ItemLink as
  client components to unbreak the build" (all three files in one commit)
prevention: |
  why not caught: no gate existed for this class. eslint-config-next has no rule for
  client-only React APIs in undeclared modules, `tsc` cannot see package export conditions,
  and the vitest suite never evaluates a module under the `react-server` condition. The only
  signal was `next build`, which is not run per-commit in this repo -- and phase 10 had
  already routed around a red build (WINDOWS.md entry 19) using a substituted proof.
  guard: components/ui/__tests__/react-server-client-directive.test.ts -- a derived-oracle
  contract test that reads the installed react/react.react-server.js export surface at test
  time and fails any module under components/ui, app/components or app/contexts that uses a
  missing API without a 'use client' directive. It runs in the normal unit-test suite, so the
  class is now caught in seconds rather than at build time.
related_windows: .planning/WINDOWS.md entry 19 (phase 10, kind: deviation) marked fixed.
