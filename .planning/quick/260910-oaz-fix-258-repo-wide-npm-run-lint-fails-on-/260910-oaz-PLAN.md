---
phase: quick-260910-oaz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - eslint.config.mjs
  - app/api/guild-count/route.ts
  - app/api/guild-count/__tests__/route.test.ts
autonomous: true
requirements:
  - GH-258
  - GH-257

estimate:
  tokens: 44000
  raw_tokens: 22000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "`npm run lint` exits 0 in a working tree that contains the untracked local agent tooling dirs (.claude, .codex, .gsd, .agents) and their .cjs scripts (GH-258)"
    - "`npm run build` reaches completion locally with no Supabase env vars set, because /api/guild-count is no longer executed during static generation (GH-257)"
    - "GET /api/guild-count still returns the { guilds, raiders, loot } shape that app/components/landing/LandingHero.tsx consumes"
    - "A successful GET /api/guild-count response carries a one hour CDN cache header so removing ISR does not increase Supabase load"
    - "A failing GET /api/guild-count returns a generic 500 JSON body instead of throwing"
  artifacts:
    - eslint.config.mjs (react-hooks rule block scoped, agent tooling dirs globally ignored)
    - app/api/guild-count/route.ts (force-dynamic, try/catch, Cache-Control header)
    - app/api/guild-count/__tests__/route.test.ts (new vitest coverage)
  key_links:
    - "The files glob on the react-hooks error block must mirror the glob eslint-config-next uses to register the react-hooks plugin, otherwise the rules silently stop applying to real source files"
    - "app/components/landing/LandingHero.tsx line 28 depends on the exact guilds/raiders/loot response keys, so the rewrite must not rename them"
---

<objective>
Fix two local developer-experience regressions that both pass CI and only bite on a
developer workstation.

GH-258: `npm run lint` aborts with a plugin resolution error because the repo's
react-hooks ratchet block applies to every linted file, including the `.cjs` scripts
inside untracked local agent tooling directories where eslint-config-next never
registers the react-hooks plugin.

GH-257: `npm run build` aborts during static generation because
`app/api/guild-count/route.ts` exports an ISR revalidate window and reads nothing from
the request, so Next.js 16 executes the handler at build time, where
`createServiceRoleClient()` throws on the absent `NEXT_PUBLIC_SUPABASE_URL`.

Purpose: restore a clean local `npm run lint` and `npm run build` so the standard
pre-push loop works without env or ignore-flag workarounds.
Output: a scoped eslint config, a build-safe guild-count route, and vitest coverage
that locks in the route contract.

Tracer-first decomposition does not apply here. These are two independent regressions
in already-shipped end-to-end paths, not layers of one new capability, so each task is
a self-contained `auto` fix with its own atomic commit.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

# Task 1 source
@eslint.config.mjs

# Task 2 source and the pattern to copy
@app/api/guild-count/route.ts
@app/api/landing-stats/route.ts
@app/components/landing/LandingHero.tsx

# Test convention reference (explicit named vitest imports, scoped setup comments)
@app/customers/[slug]/__tests__/page.test.tsx
</context>

<interface_context>
Shapes the executor must preserve exactly.

`GET /api/guild-count` success body, consumed at app/components/landing/LandingHero.tsx
line 20 and line 28 by a `useState<{ guilds: number; raiders: number; loot: number }>`:

  { guilds: number, raiders: number, loot: number }

Counts come from three `head: true` count queries on `guilds`,
`character_guild_memberships`, and `loot_history`, in that order, mapped to `guilds`,
`raiders`, and `loot` respectively.

The consumer guards with `if (data.guilds) setStats(data)`, so an error body shaped
`{ error: string }` is already safe for the client.

`createServiceRoleClient()` from `@/utils/supabase/service-role` throws synchronously
when `NEXT_PUBLIC_SUPABASE_URL` is missing. That module is out of scope and must not be
edited.

eslint-config-next 16.1.1 registers the `react-hooks` plugin only inside a config object
scoped to `files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}']`. `.cjs` is deliberately absent
from that list.
</interface_context>

<tasks>

<task type="auto">
  <name>Task 1: Scope the react-hooks ratchet and ignore local agent tooling dirs (GH-258)</name>
  <files>eslint.config.mjs</files>
  <precondition>`node_modules/eslint-config-next/dist/index.js` exists (dependencies installed via `npm ci` or `npm install`). Halt and report if absent, since the fix is verified by running eslint.</precondition>
  <action>
Make two changes to eslint.config.mjs, both required. Change A removes the offending
files from the lint run. Change B makes the config correct even if such files return.

Change A. Extend the `globalIgnores([...])` call (currently around lines 9 to 15). Keep
the four existing eslint-config-next default ignores exactly as they are, then append
four new entries: `".claude/**"`, `".codex/**"`, `".gsd/**"`, `".agents/**"`. Above the
new entries add a short comment, in the voice of the surrounding comments, explaining
that these are local agent tooling directories, that they are gitignored (.gitignore
line 78 covers `.claude/*`) and therefore invisible to CI, that they contain CommonJS
`.cjs` scripts that are not part of the shipped app, and that linting them is what makes
a local run diverge from CI. Do not use em dashes in any text you add (CLAUDE.md copy
rule). Leave the pre-existing em dashes elsewhere in the file untouched.

Change B. The react-hooks ratchet block (currently around lines 33 to 41, the one whose
rules object sets `react-hooks/purity`, `react-hooks/set-state-in-effect`,
`react-hooks/refs`, `react-hooks/immutability`, and
`react-hooks/preserve-manual-memoization` to `"error"`) has no `files` key, so flat
config applies it to every linted file. When the linted file is a `.cjs` file, the
`react-hooks` plugin is not registered for it and ESLint 9.39.2 aborts the whole run
with `could not find plugin "react-hooks"`. Add `files:
["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"]` as the first key of that config object so the
block only applies where eslint-config-next actually registers the plugin. Copy that
glob verbatim from the upstream registration so the two stay in sync.

Append one or two sentences to the existing ratchet comment block above it recording
that the glob mirrors the plugin registration glob in eslint-config-next, and that
widening it without widening upstream reintroduces GH-258. Keep the existing ratchet
instructions in that comment intact.

Do not touch the five grandfathered "warn" override blocks that follow. Each already
carries an explicit `files` list of `.ts`/`.tsx` paths, so they are already correctly
scoped. Do not remove any file from those lists and do not change any rule severity.

Do not edit .gitignore, package.json, the CI workflow, or any source file.
  </action>
  <verify>
    <automated>npm run lint; echo "lint_exit=$?"  # required: lint_exit=0 (warnings are expected and allowed, errors are not)</automated>
    <automated>npx eslint eslint.config.mjs; echo "selfcheck_exit=$?"  # required: selfcheck_exit=0</automated>
    <automated>grep -Ec '"\.(claude|codex|gsd|agents)/\*\*"' eslint.config.mjs  # required: 4</automated>
    <automated>grep -Ec 'files: \["\*\*/\*\.\{js,jsx,mjs,ts,tsx,mts,cts\}"\]' eslint.config.mjs  # required: 1</automated>
  </verify>
  <done>
`npm run lint` exits 0 from the repo root with the untracked .claude, .codex, .gsd, and
.agents directories present on disk. The four agent tooling globs are in
`globalIgnores`, the react-hooks error block carries the upstream files glob, and the
five grandfathered warn overrides are byte-identical to before.
Commit atomically:
`fix(lint): scope react-hooks rules and ignore local agent tooling dirs (#258)`
with a body explaining the plugin-registration mismatch, ending with the line
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Make /api/guild-count build-safe and cover it with vitest (GH-257)</name>
  <files>app/api/guild-count/route.ts, app/api/guild-count/__tests__/route.test.ts</files>
  <behavior>
Tests to write first in app/api/guild-count/__tests__/route.test.ts, then make pass:
    - Test 1: the route module exports `dynamic` with the value `'force-dynamic'`.
    - Test 2: `Object.keys(routeModule)` does not contain an ISR revalidate binding, which is the export that made Next.js prerender the handler at build time.
    - Test 3: with the service role client mocked to resolve distinct counts per table, `GET()` returns status 200 and a body of `{ guilds, raiders, loot }` carrying the guilds, character_guild_memberships, and loot_history counts in that mapping.
    - Test 4: the same 200 response carries header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
    - Test 5 (edge case): when the mocked `createServiceRoleClient` throws, `GET()` resolves to status 500 with a JSON body containing an `error` key, and does not reject.
  </behavior>
  <action>
Part A, rewrite app/api/guild-count/route.ts to mirror app/api/landing-stats/route.ts,
which is the sibling route that already does the same three DB counts without breaking
the build.

  - Delete the module-level ISR export that pins a 3600 second cache window. That export
    is the root cause: with no request, cookie, or header read anywhere in the handler,
    Next.js 16 classifies the route as statically prerenderable and runs `GET()` during
    "Generating static pages", where `createServiceRoleClient()` throws
    `NEXT_PUBLIC_SUPABASE_URL is required` on any machine without Supabase env vars.
  - Add `export const dynamic = 'force-dynamic'` so the route is never prerendered.
  - Preserve the one hour caching intent at the CDN instead of at build time by passing
    `headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }`
    as the second argument to `NextResponse.json(...)` on the success path. This is the
    landing-stats pattern with the window widened from 300 to 3600 to match the original
    intent.
  - Wrap the whole handler body in try/catch. In catch, `console.error('Error in GET
    /api/guild-count:', error)` and return `NextResponse.json({ error: 'Internal server
    error' }, { status: 500 })`, matching landing-stats exactly.
  - Keep the three `Promise.all` count queries and their table order unchanged, and keep
    the response keys exactly `guilds`, `raiders`, `loot`. app/components/landing/
    LandingHero.tsx line 20 types its state on those three keys, so renaming any of them
    silently breaks the landing hero counter.
  - Add a JSDoc header block above `GET` in the landing-stats style, stating that the
    route is public, that it is force-dynamic on purpose, and that the cache window
    lives in the response header. Reference GH-257 in that comment. No em dashes.

Do not edit utils/supabase/service-role.ts, .env.example, .env.local, or next.config.ts.
Do not introduce any new environment variable.

Part B, create app/api/guild-count/__tests__/route.test.ts covering the `<behavior>`
list above. There are currently no tests under app/api, so follow the general repo test
convention from app/customers/[slug]/__tests__/page.test.tsx: explicit named imports
from `vitest` (`describe`, `it`, `expect`, `vi`, plus `beforeEach` if needed) even though
`globals: true` is set, and a short scoped comment explaining any environment shim.

  - Mock the dependency with `vi.mock('@/utils/supabase/service-role', ...)`. The factory
    should return a client whose `from(table)` returns an object with a `select()` that
    resolves to `{ count, error: null }`, keying the count off the table name so the
    three values are distinguishable in the assertion.
  - For the failure case use `vi.mocked(createServiceRoleClient).mockImplementationOnce`
    to throw, then assert the 500.
  - Import the module namespace (`import * as route from '../route'`) so Test 1 and
    Test 2 can inspect the exported bindings.
  - vitest.config.ts sets `environment: 'jsdom'` globally, and jsdom does not provide the
    web `Response` that `next/server` relies on. If the test fails on a missing global,
    add a `// @vitest-environment node` docblock as the very first lines of the file and
    a one line comment saying why. Do not change vitest.config.ts to fix this.
  </action>
  <verify>
    <automated>npx vitest run app/api/guild-count</automated>
    <automated>npm run typecheck</automated>
    <automated>npm run lint; echo "lint_exit=$?"  # required: lint_exit=0</automated>
    <automated>grep -v '^\s*\(//\|\*\|/\*\)' app/api/guild-count/route.ts | grep -Ec '^export const revalidate'  # required: 0</automated>
    <automated>grep -Ec "^export const dynamic = 'force-dynamic'" app/api/guild-count/route.ts  # required: 1</automated>
    <automated>grep -Ec "s-maxage=3600, stale-while-revalidate=86400" app/api/guild-count/route.ts  # required: 1</automated>
    <automated>npm run build  # required: completes; the "Generating static pages" step no longer fails on /api/guild-count. Allow up to 10 minutes. If the sandbox cannot run a full Next build, record that in the SUMMARY and treat the typecheck plus vitest gates above as the blocking gates.</automated>
    <human-check>Developer confirms `npm run build` finishes locally with no Supabase env vars present, and that the landing hero counter still renders real numbers against a dev server.</human-check>
  </verify>
  <done>
`npx vitest run app/api/guild-count` passes all five behaviors, `npm run typecheck`
passes, and `npm run build` gets past static generation with no Supabase env vars set.
The route still answers `{ guilds, raiders, loot }` and carries the one hour
Cache-Control header.
Commit atomically:
`fix(build): stop prerendering /api/guild-count at build time (#257)`
with a body explaining the ISR to force-dynamic swap and the header-based cache
replacement, ending with the line
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser to /api/guild-count | Unauthenticated public request crosses here. Handler takes no input, returns aggregate counts only. |
| Next.js build to Supabase | Build-time prerender previously opened a service-role DB connection. Task 2 closes that path. |
| developer workstation to eslint config | Local-only lint surface. Nothing here ships to users. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QUICK-01 | Tampering | eslint.config.mjs globalIgnores | low | accept | Ignoring .claude, .codex, .gsd, and .agents removes lint coverage for local agent tooling scripts. Those dirs are gitignored, never shipped, and were never linted by CI, so effective coverage does not regress. Change B keeps the config correct even if a .cjs file is linted again later. |
| T-QUICK-02 | Denial of Service | GET /api/guild-count | medium | mitigate | force-dynamic routes every uncached request to Supabase instead of serving a build-time snapshot. Mitigated by the `public, s-maxage=3600, stale-while-revalidate=86400` response header so the Vercel CDN absorbs traffic, which is the same posture as /api/landing-stats. |
| T-QUICK-03 | Information Disclosure | GET /api/guild-count catch block | low | mitigate | The new catch returns a fixed `Internal server error` string and logs details server side only, so Supabase URLs, env var names, and stack traces never reach an unauthenticated client. |
| T-QUICK-04 | Information Disclosure | aggregate counts response | low | accept | Guild, raider, and loot totals are already public on the landing page and are repo-wide aggregates, not per-guild segments, so the privacy floor in CLAUDE.md does not apply. |
| T-QUICK-SC | Tampering | npm/pip/cargo installs | low | accept | This plan installs no packages and adds no dependencies, so the package legitimacy gate does not apply. Any executor that finds itself needing an install must stop and escalate. |
</threat_model>

<verification>
Run from the repo root after both tasks:

1. `npm run lint` exits 0 with the untracked agent tooling dirs present on disk.
2. `npx eslint eslint.config.mjs` exits 0.
3. `npx vitest run app/api/guild-count` passes.
4. `npm run typecheck` passes.
5. `npm run build` gets past "Generating static pages" with no Supabase env vars set.
6. `git log --oneline -2` shows exactly two commits, one referencing #258 and one
   referencing #257, each touching only its own files.
7. `git status --short` shows no unintended edits to .env.example, .env.local,
   .gitignore, utils/supabase/service-role.ts, or vitest.config.ts.
</verification>

<success_criteria>
- A developer with no Supabase credentials can run `npm run lint` and `npm run build`
  back to back with zero errors and zero workaround flags.
- CI behavior is unchanged: the lint job still enforces the react-hooks rules as errors
  on every tracked source file.
- The landing hero counter contract `{ guilds, raiders, loot }` is unchanged, and the
  one hour cache window survives as a CDN header.
- Two atomic commits exist, each naming its GitHub issue.
</success_criteria>

<output>
Create `.planning/quick/260910-oaz-fix-258-repo-wide-npm-run-lint-fails-on-/260910-oaz-SUMMARY.md` when done.
Record in it: whether `npm run build` was runnable in this environment, the final lint
warning count, and whether the `// @vitest-environment node` docblock was needed.
</output>
