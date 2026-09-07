---
phase: quick-260906-ure
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - proxy.ts
  - lib/public-routes.ts
  - lib/__tests__/public-routes.test.ts
  - .planning/phases/04-verified-guild-case-study/04-UAT.md
autonomous: true
requirements: [EVID-03, EVID-04, G-04-2]

estimate:
  tokens: 45000
  raw_tokens: 26000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "A logged-out request for /research/wow-classic-loot-systems-2026 is answered by the app itself, not a 307 redirect to /?next=..."
    - "A logged-out request for /customers/example-guild-fixture is answered by the app itself, not a 307 redirect to /?next=..."
    - "A logged-out request for /overview still receives the 307 redirect to /?next=%2Foverview"
    - "Every route that was public before this change is still public afterward"
    - "The public-route decision is a pure exported function with direct vitest coverage"
  artifacts:
    - "lib/public-routes.ts exporting isPublicPathname(pathname: string): boolean"
    - "lib/__tests__/public-routes.test.ts"
    - "proxy.ts delegating its public-route branch to isPublicPathname"
    - ".planning/phases/04-verified-guild-case-study/04-UAT.md with G-04-2 marked resolved"
  key_links:
    - "proxy.ts imports isPublicPathname from @/lib/public-routes and uses its return value as the sole condition of the public-route bypass branch"
    - "lib/public-routes.ts imports nothing from next/server or @supabase/ssr, so it loads cleanly in the jsdom vitest environment"
    - "The predicate matches /research and /customers on a path boundary, so a lookalike path such as /researchers stays gated"
---

<objective>
Make `/research` and `/customers` public in the Next.js middleware so logged-out officers and search crawlers receive the page instead of a 307 redirect to the landing page, and lock that behavior in with a real regression test.

Purpose: closes UAT gap G-04-2 (severity blocker). The Phase 3 research report is live in production and currently answers crawlers with a 307 to `/?next=...`, which makes the sprint's flagship evidence page unindexable. The Phase 4 case-study route has the same defect and would ship broken the moment the interview clears.

Output: a pure, tested `isPublicPathname` predicate in `lib/public-routes.ts`, a `proxy.ts` that delegates to it, a vitest regression suite, and an updated 04-UAT.md ledger.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@proxy.ts
@.planning/phases/04-verified-guild-case-study/04-UAT.md
@app/__tests__/sitemap.test.ts
@vitest.config.ts
</context>

<decisions>
Two shape decisions are settled here so the executor does not re-litigate them:

**Boundary matching, not bare prefix.** The predicate admits `/research` and `/customers` using an exact-or-child form (`pathname === '/research' || pathname.startsWith('/research/')`), not the loose `startsWith('/research')` used elsewhere in the existing allowlist. Two reasons: (1) a lookalike path such as `/researchers` must not be silently un-gated, and (2) admitting the bare `/customers` and `/research` paths means Next returns its own 404 for them, which is the correct crawler signal, instead of a 307 into an auth wall. There is no bare index page at either path today and none is being added.

**The pre-existing allowlist entries are moved verbatim.** This is an extract-and-extend refactor. Every path already treated as public keeps behaving identically, including the loose-prefix entries. Do not tighten, reorder, or drop any existing entry while moving it: that would be an unrelated behavior change riding on a blocker fix.
</decisions>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Extract the public-route predicate, admit /research and /customers, prove it end to end</name>
  <files>lib/public-routes.ts, lib/__tests__/public-routes.test.ts, proxy.ts</files>
  <precondition>`npm run dev` binds port 3100 using the repo's existing `.env.local`. Placeholder Supabase values are sufficient for this task, because the middleware routing decision happens before any page renders, so a public route may answer 200 or 500 but must never answer 307. If the dev server cannot bind, halt and report rather than skipping the end-to-end gate.</precondition>
  <read_first>
    - `proxy.ts` lines 294 to 322: the `isPublicRoute` expression, the bypass branch, and the unauthenticated redirect that follows it.
    - `app/__tests__/sitemap.test.ts` for the house test style: named vitest imports, a short header comment explaining why the suite exists, one behavior per `it`.
    - `lib/__tests__/loot-items-query.test.ts` for the `lib/__tests__/` placement convention.
  </read_first>
  <behavior>
    The new suite `lib/__tests__/public-routes.test.ts` covers `isPublicPathname` directly. Write these assertions before the predicate exists, watch them fail, then implement.

    Returns true (newly public, the actual fix):
    - `/research/wow-classic-loot-systems-2026`
    - `/research`
    - `/customers/example-guild-fixture`
    - `/customers`

    Returns true (regression guard, every path that was public before this change stays public):
    - `/`
    - `/login`
    - `/guild-select`
    - `/updates`
    - `/dev-login`
    - `/compare`
    - `/about`
    - `/premium`
    - `/pricing`
    - `/landing`
    - the two static-file paths already in the allowlist, asserted by reading them from the moved allowlist rather than retyping them
    - `/legal/privacy-policy`
    - `/guild-select/create`
    - `/blog/some-post`
    - `/changelog`
    - `/terms`
    - `/privacy`
    - `/reserve/abc123`

    Returns false (still gated):
    - `/overview`
    - `/master-sheet`
    - `/loot-submissions`
    - `/settings`

    Returns false (boundary, the reason for exact-or-child matching):
    - `/researchers`
    - `/customersecret`

    One structural assertion: importing the module must not require any Next.js or Supabase runtime, which the suite proves implicitly by importing it in the jsdom environment with no mocks and no `vi.mock` calls.
  </behavior>
  <action>
    Create `lib/public-routes.ts` exporting a single pure function `isPublicPathname(pathname: string): boolean`, plus the exact-match allowlist as a named exported readonly array so the test can assert over it instead of retyping literals. Move the entire existing public-route expression out of `proxy.ts` and into this module unchanged, keeping both the exact-match array and every chained prefix branch exactly as they are today. Add a short file header comment stating the module's purpose and that it must stay free of framework imports so it loads in the test environment.

    Extend the moved predicate with the two new route families using the boundary form settled in `<decisions>`: `/research` and its children, `/customers` and its children. Follow the repo's comment convention of explaining why rather than what: note that these two families are public evidence pages reached from search results by visitors who have no session, and reference G-04-2.

    The module imports nothing. It must not import from `next/server`, `@supabase/ssr`, or any app module. Use `import type` only if a type is genuinely needed, which it should not be.

    Then rewrite the branch in `proxy.ts`: add `import { isPublicPathname } from '@/lib/public-routes'` at the top with the other imports, delete the inline expression entirely (the array literal and every chained branch), and replace it with a call to the imported predicate. The surrounding structure stays byte-identical in behavior: the same guard for non-API and non-auth paths, the same early `NextResponse.next({ request })` bypass, the same `refreshSupabaseSession` fall-through, the same redirect and stale-cookie cleanup. Leave the comment above the bypass branch about skipping `getUser()` to reduce TTFB in place.

    Do not touch the rate-limit branch, the cron branch, the landing-host rewrite, or the `config.matcher` export. Do not touch `.env.local` or any Supabase credential.

    House style reminders: no em dashes in any code comment or string you write, use commas or colons or two hyphens; kebab-case filename; camelCase function; named export; JSDoc above the exported function with a parameter description and a note on the boundary-matching choice.
  </action>
  <verify>
    <automated>
      # 1. The new suite passes on its own
      npm test -- lib/__tests__/public-routes.test.ts

      # 2. The predicate is actually wired into the middleware, and the old
      #    inline expression is gone. Comment lines are filtered so prose in
      #    the file cannot satisfy or break either gate.
      test "$(grep -cF 'isPublicPathname' proxy.ts)" -ge 2 && echo WIRED_PASS
      test "$(grep -v '^[[:space:]]*//' proxy.ts | grep -cF '].includes(pathname)')" -eq 0 && echo INLINE_REMOVED_PASS
      # Anchored to line-start `import` so a header comment describing this
      # constraint cannot accidentally trip the gate.
      test "$(grep -cE '^[[:space:]]*import .*(next/server|@supabase|@/)' lib/public-routes.ts)" -eq 0 && echo PURE_MODULE_PASS

      # 3. Scoped lint and full typecheck
      npx eslint proxy.ts lib/public-routes.ts lib/__tests__/public-routes.test.ts
      npm run typecheck

      # 4. Full suite still green (was 887 passing before this change; the
      #    new file adds tests, so the total must go up and failures stay 0)
      npm test

      # 5. END TO END: the real middleware decision against a running server.
      #    A public route must answer anything other than 307. A gated route
      #    must still answer 307.
      LOGDIR="$(mktemp -d)"
      npm run dev > "$LOGDIR/dev.log" 2>&1 &
      DEV_PID=$!
      for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3100/about && break; sleep 2; done
      echo "research: $(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: text/html' http://localhost:3100/research/wow-classic-loot-systems-2026)"
      echo "customers: $(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: text/html' http://localhost:3100/customers/example-guild-fixture)"
      echo "overview: $(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: text/html' http://localhost:3100/overview)"
      kill $DEV_PID
      # Expected: research and customers are NOT 307; overview IS 307.
    </automated>
  </verify>
  <done>
    `lib/public-routes.ts` exports `isPublicPathname`; `proxy.ts` imports and calls it and contains no inline allowlist expression; `lib/__tests__/public-routes.test.ts` passes and covers the four newly public paths, every previously public path, four still-gated paths, and two boundary lookalikes; `npm run typecheck` and scoped `npx eslint` are clean; the full `npm test` suite passes with zero failures and a higher total than 887; against a running dev server `/research/wow-classic-loot-systems-2026` and `/customers/example-guild-fixture` return a status other than 307 while `/overview` still returns 307. Committed as a single atomic commit.
  </done>
</task>

<task type="auto">
  <name>Task 2: Mark G-04-2 resolved in the Phase 4 UAT ledger</name>
  <files>.planning/phases/04-verified-guild-case-study/04-UAT.md</files>
  <!-- planner-discipline-allow: status: failed -->
  <!-- planner-discipline-allow: result: issue -->
  <action>
    Capture the Task 1 commit hash first with `git rev-parse --short HEAD`, then edit the ledger with scoped `Edit` calls. Do not rewrite the whole file. The two literals quoted below are search targets inside a markdown ledger, not text to reproduce anywhere else.

    In the `## Gaps` block, on the `gap_id: G-04-2` entry: change `status: failed` to `status: resolved` and add two sibling keys at the same indentation immediately after it, `resolved_by: quick-260906-ure` and `resolved_at: 2026-09-06`. Leave `truth`, `reason`, `severity`, `test`, `root_cause`, `artifacts`, `missing`, and `debug_session` exactly as written: they are the historical record of the failure and must not be edited to match the fix.

    In `### 2. Case-study page reachable while logged out`: change `result: issue` to `result: pass`, keep the existing `reported:` line as history, delete the now-stale `severity: blocker` line, and add a `note:` line recording the fix commit. Write the note as a single quoted line naming the commit hash captured above, the quick task id `quick-260906-ure`, the new module `lib/public-routes.ts`, and the regression test `lib/__tests__/public-routes.test.ts`.

    In `## Summary`: change `passed: 0` to `passed: 1` and `issues: 1` to `issues: 0`. Leave `total`, `pending`, `skipped`, and `blocked` alone: Test 1 is still an open end-of-phase visual review.

    Do not touch the `## Current Test` block, which still describes the pending Test 1. Do not touch `.planning/STATE.md`: the quick-task orchestrator owns that file.

    No em dashes anywhere in the text you add.
  </action>
  <verify>
    <automated>
      UAT=.planning/phases/04-verified-guild-case-study/04-UAT.md
      test "$(grep -cF 'status: resolved' "$UAT")" -eq 1 && echo STATUS_PASS
      test "$(grep -cF 'resolved_by: quick-260906-ure' "$UAT")" -eq 1 && echo RESOLVED_BY_PASS
      test "$(grep -cF 'resolved_at: 2026-09-06' "$UAT")" -eq 1 && echo RESOLVED_AT_PASS
      test "$(grep -cF 'result: pass' "$UAT")" -eq 1 && echo TEST2_PASS
      test "$(grep -cF 'result: issue' "$UAT")" -eq 0 && echo NO_ISSUE_PASS
      test "$(grep -cF 'lib/__tests__/public-routes.test.ts' "$UAT")" -ge 1 && echo NOTE_PASS
      test "$(grep -cF 'status: failed' "$UAT")" -eq 0 && echo NO_FAILED_PASS
      grep -c 'passed: 1' "$UAT"
      # The gap's original failure record must survive untouched
      test "$(grep -cF 'root_cause:' "$UAT")" -eq 1 && echo HISTORY_PASS
    </automated>
  </verify>
  <done>
    G-04-2 reads `status: resolved` with `resolved_by: quick-260906-ure` and `resolved_at: 2026-09-06`; its `reason`, `root_cause`, `artifacts`, and `missing` fields are unchanged; Test 2 reads `result: pass` with a `note:` line naming the Task 1 commit hash and the regression test path; the Summary counts read `passed: 1` and `issues: 0`; Test 1 stays pending. Committed as a docs commit.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| unauthenticated internet to Next.js middleware | Every page request, including crawlers and logged-out officers, crosses here; the middleware is the only thing standing between an anonymous request and a page render |
| middleware to page render | A path admitted as public skips `refreshSupabaseSession` entirely, so the page and its data layer receive no session and must be safe to render for anyone |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-Q-01 | Elevation of Privilege | `isPublicPathname` prefix matching in `lib/public-routes.ts` | high | mitigate | Boundary matching (`=== '/research'` or `startsWith('/research/')`), not bare `startsWith`, so a lookalike path cannot slip through the auth gate. Enforced by the `/researchers` and `/customersecret` false-assertions in the test suite, and by the `/overview`, `/master-sheet`, `/loot-submissions`, `/settings` still-gated assertions. |
| T-Q-02 | Information Disclosure | `app/customers/[slug]/page.tsx` rendered with no session | medium | accept | The route serves only from `data/case-studies`: `publishedCaseStudies` is empty, and the fixture registry resolves only when `isFixtureRouteEnabled()` is true, which is false in production. Content is interview-approved public marketing copy by construction. Accepted because publishing anything here already requires the Phase 4 written-approval gate. |
| T-Q-03 | Information Disclosure | `app/research/wow-classic-loot-systems-2026/page.tsx` rendered with no session | low | accept | Static, already-published aggregate report with a minimum 10-guild floor per segment and no guild or player names. It is already public content that was unreachable only by middleware accident. |
| T-Q-04 | Tampering | The extract refactor in `proxy.ts` | medium | mitigate | Moving the allowlist could silently drop an entry and de-publish a working route. Mitigated by asserting every pre-existing allowlist path returns true in the new suite, with the two static-file entries read from the exported array rather than retyped. |
| T-Q-05 | Denial of Service | Public routes skip `refreshSupabaseSession` and reach the page directly | low | accept | Two additional static content paths join an allowlist that already contains the blog and changelog; the existing rate-limit branch and its configuration are untouched by this task. |

No package-manager installs occur in this task, so no supply-chain (`SC`) row applies.
</threat_model>

<verification>
1. `npm test` passes with zero failures and a total above the 887 baseline.
2. `npm run typecheck` is clean.
3. `npx eslint proxy.ts lib/public-routes.ts lib/__tests__/public-routes.test.ts` is clean.
4. Against a running dev server on port 3100: `/research/wow-classic-loot-systems-2026` and `/customers/example-guild-fixture` return a status other than 307, and `/overview` still returns 307 to `/?next=%2Foverview`.
5. `git diff --stat` for the two commits touches only the four files in `files_modified`.
</verification>

<success_criteria>
- A logged-out request for the research report or a case-study slug is no longer redirected to the landing page.
- Every route that was public before this change is still public, proven by explicit test assertions rather than by inspection.
- Protected app routes and prefix lookalikes remain gated.
- The public-route decision lives in one pure, imported, tested function instead of an inline expression inside the middleware.
- UAT gap G-04-2 is marked resolved with the fix commit recorded, and the original failure record is preserved.
</success_criteria>

<followups>
Not in scope for this quick task, surface to the user on completion:
- The fix only takes effect in production after a deploy. Until then the live research report keeps answering crawlers with a 307. The Phase 5 recrawl pass should run after this deploys, not before.
</followups>

<output>
Create `.planning/quick/260906-ure-make-research-and-customers-public-route/260906-ure-SUMMARY.md` when done.
</output>
