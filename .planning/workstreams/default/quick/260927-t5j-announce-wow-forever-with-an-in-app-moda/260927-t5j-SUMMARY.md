---
phase: quick-260927-t5j
plan: 01
subsystem: ui
tags: [react, nextjs, supabase-auth, posthog, tailwind, localStorage, updates-data]

requires:
  - phase: quick-260926-lj6
    provides: domain/expansion/game.ts (getGuildGame, guilds.game column) that this plan's DEFAULT_SIGNUP_GAME/parseGameParam build on
  - phase: quick-260925-f5j
    provides: WoW Forever guild signup and expansion seeding (PR #274) that this plan announces
provides:
  - Forever-first signup pickers with a working ?game= preselect that survives sign-in
  - In-app WoW Forever announcement dialog (once per signed-in Classic-guild user)
  - Public, CLS-safe, dismissible WoW Forever announcement bar on every marketing page
  - announcement_viewed / announcement_cta_clicked / announcement_dismissed analytics events
  - Updates entry (Sep 27, 2026) and a public-copy sweep naming WoW Forever first
affects: [marketing-pages, guild-select, updates-changelog, analytics-funnel]

actuals:
  tokens: 19400
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Safe-storage helpers (getBrowserStorage/safeSetItem, try/catch on every localStorage call) so a throwing Storage never breaks render"
    - "Pre-paint inline <script> in app/layout.tsx head + a plain CSS attribute-selector rule, so dismissed-state hides both a bar and its spacer before first paint with zero CLS"
    - "Open-redirect closure via isSafeNextPath/resolvePostAuthRedirect/buildSignInPath as a dependency-free lib module, unit-tested independently of the callback route"

key-files:
  created:
    - lib/post-auth-redirect.ts
    - lib/__tests__/post-auth-redirect.test.ts
    - lib/announcements.ts
    - lib/__tests__/announcements.test.ts
    - app/components/ForeverAnnouncementModal.tsx
    - app/components/__tests__/ForeverAnnouncementModal.test.tsx
    - app/components/landing/ForeverAnnouncementBar.tsx
    - app/components/landing/__tests__/ForeverAnnouncementBar.test.tsx
  modified:
    - domain/expansion/game.ts
    - domain/expansion/__tests__/game.test.ts
    - app/guild-select/create/page.tsx
    - app/components/CreateGuildModal.tsx
    - app/auth/callback/route.js
    - app/auth/callback/__tests__/route.test.ts
    - utils/analytics/client.ts
    - app/(app)/AppLayout.client.tsx
    - app/components/landing/LandingNav.tsx
    - app/layout.tsx
    - app/globals.css
    - lib/updates-data.ts
    - data/content-dates.json
    - app/components/landing/LandingHero.tsx
    - app/pricing/page.tsx
    - app/about/page.tsx
    - README.md

key-decisions:
  - "ForeverAnnouncementBar uses inline nowrap/ellipsis styles instead of the truncate Tailwind class, because two existing page tests forbid /truncate|line-clamp/ classes anywhere in the rendered page (Task 1 deviation, no Rule number - a plan-writing constraint conflict resolved in favor of the pre-existing test contract)"
  - "D-07's 'update the lj6 tests that assumed a Classic signup default' finding: no such test existed at execution time (grepped __tests__ for resolveSignupExpansion and picker defaults); the requirement was satisfied by adding new parseGameParam/DEFAULT_SIGNUP_GAME tests rather than editing any pre-existing test"
  - "Task 2 date resolved to September 27, 2026 (the actual sign-off/merge date) instead of the plan's September 28 placeholder, per the user's explicit 2026-09-27 sign-off; content-dates bumps use 2026-09-27 throughout (not the plan's 2026-09-28 default)"
  - "Task 3 applied the user's two sign-off edits: S-01 ships the shorter hero trust line ('...WoW Forever and WoW Classic') instead of the longer draft, to avoid bad wrapping at 390px; S-03 drops the trailing raids sentence so the /about paragraph ends at '...in-game distribution workflows.'"
  - "Adjusted the plan's own verify-gate literals (which still encoded the Sep 28 placeholder date and the pre-edit S-01/S-03 strings) to check the actually-approved text instead of re-running the plan's stale gate; documented here per the constraint rather than silently diverging"

requirements-completed: [AN-01, AN-02, AN-03, AN-04, AN-05, AN-06, AN-07, AN-08]

coverage:
  - id: D1
    description: "Both signup pickers (guild-select/create, CreateGuildModal) list and preselect WoW Forever first; ?game=classic selects Classic; ?game= garbage falls back to Forever; the sign-in redirect preserves the full create path (including query) through Discord OAuth for brand-new users; unsafe next values fall back safely (closes a pre-existing open redirect)"
    requirement: "AN-03, AN-07"
    verification:
      - kind: unit
        ref: "domain/expansion/__tests__/game.test.ts (parseGameParam/DEFAULT_SIGNUP_GAME cases)"
        status: pass
      - kind: unit
        ref: "lib/__tests__/post-auth-redirect.test.ts (isSafeNextPath/resolvePostAuthRedirect/buildSignInPath)"
        status: pass
      - kind: integration
        ref: "app/auth/callback/__tests__/route.test.ts (node env, mocked Supabase, asserts Location headers)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Signed-in dialog: eligible Classic-guild users see the accessible WoW Forever dialog once (focus trap, Escape/backdrop/CTA all dismiss and persist per-user, never reappears); ineligible users (Forever guild, no guild, loading, onboarding unseen, already-seen, throwing storage) never see it"
    requirement: "AN-01"
    verification:
      - kind: unit
        ref: "app/components/__tests__/ForeverAnnouncementModal.test.tsx"
        status: pass
    human_judgment: true
    rationale: "Unit tests cover eligibility, focus trap and event firing in jsdom, but visual layout at 390px/1440px, light/dark theme legibility of the Forever logo, and a live click-through of the CTA through real Discord sign-in require a human (listed under Outstanding Human Checks below, per the plan's own human-check block)."
  - id: D3
    description: "Public bar: renders on every LandingNav marketing page, never in the signed-in app, CLS-safe via an in-flow spacer plus a pre-paint script/CSS rule pair that hides bar+spacer together before first paint for returning dismissers"
    requirement: "AN-02"
    verification:
      - kind: unit
        ref: "app/components/landing/__tests__/ForeverAnnouncementBar.test.tsx"
        status: pass
    human_judgment: true
    rationale: "Actual CLS (Lighthouse/DevTools Performance) and cross-page visual placement at 390px/1440px in the dark marketing theme require a human/browser measurement, not just jsdom assertions."
  - id: D4
    description: "announcement_viewed, announcement_cta_clicked and announcement_dismissed fire through trackClientEvent with exactly { announcement: 'wow-forever', surface }, no PII, on both surfaces"
    requirement: "AN-06"
    verification:
      - kind: unit
        ref: "app/components/__tests__/ForeverAnnouncementModal.test.tsx, app/components/landing/__tests__/ForeverAnnouncementBar.test.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "Updates entry (Sep 27, 2026) added at the top of lib/updates-data.ts with the locked feature item and five approved fix items; '/' content date bumped to 2026-09-27"
    requirement: "AN-04"
    verification:
      - kind: unit
        ref: "app/__tests__/content-dates.test.ts, app/__tests__/sitemap.test.ts"
        status: pass
      - kind: other
        ref: "plan grep gate (adjusted for the approved Sep 27 date) run via Bash, all checks printed *-ok"
        status: pass
    human_judgment: false
  - id: D6
    description: "Public-surface sweep: hero trust line, /pricing free-feature list, /about paragraph, site metadata keywords and README lead with WoW Forever; no blog/research/customers/in-flight-branch files touched; no em dash or raid/loot-table promise added anywhere in the diff"
    requirement: "AN-05, AN-08"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 78 files / 1617 tests)"
        status: pass
      - kind: other
        ref: "plan grep gate (adjusted for the two user sign-off edits) run via Bash, all checks printed *-ok including em-dash and excluded-path checks"
        status: pass
    human_judgment: false

duration: ~78min wall-clock across two sessions (Task 1: 21:29-21:40; sign-off wait; Tasks 2-3 this session: ~22:20-22:47), ~15min of actual Task 2/3 execution
completed: 2026-09-27
status: complete
---

# Quick Task 260927-t5j: Announce WoW Forever Summary

**Forever-first signup with a safe cross-sign-in `?game=` preselect, an accessible once-per-user in-app dialog, a CLS-safe public announcement bar, and a copy sweep that leads with WoW Forever across the homepage, pricing, about, metadata, README and Updates.**

## Performance

- **Duration:** ~78 min wall-clock (includes a user sign-off wait between Task 1 and Tasks 2/3); active execution across the three tasks was roughly 25-30 min
- **Started:** 2026-09-27T21:29:25-07:00 (Task 1, commit A)
- **Completed:** 2026-09-27T22:47:39-07:00 (Task 3 commit)
- **Tasks:** 3 (Task 1 shipped as two commits: tracer step A, then step B)
- **Files modified:** 25 (17 modified, 8 new; see key-files above)

## Accomplishments

- WoW Forever is now the default and first-listed option in both signup pickers (`/guild-select/create`, `CreateGuildModal`); `?game=classic` still selects Classic and reveals all five expansions; any other `?game=` value falls back to Forever
- Closed a pre-existing open-redirect in `app/auth/callback/route.js`: `next` is now validated by `isSafeNextPath` before it decides the post-auth destination, and a brand-new user's `/guild-select/create?game=forever` link now survives Discord sign-in end to end
- Signed-in Classic-guild users see a focus-trapped, keyboard-accessible WoW Forever dialog once, ~800ms after the app shell loads, with the approved copy verbatim; it is fully suppressed for Forever guilds, signed-out visitors, no-guild users, and after any dismissal path
- Every marketing page (via `LandingNav`) shows a CLS-safe, dismissible WoW Forever bar with a same-height in-flow spacer and a pre-paint head script + CSS rule that hide bar and spacer together before first paint for returning dismissers; the bar never renders inside the signed-in app
- Three new analytics events (`announcement_viewed`, `announcement_cta_clicked`, `announcement_dismissed`) fire with exactly `{ announcement: 'wow-forever', surface }` and nothing else, on both surfaces
- Added the September 27, 2026 Updates entry (WoW Forever feature item plus five approved fix items) and bumped `data/content-dates.json` for `/`
- Swept the homepage hero trust line, `/pricing` free-feature list, `/about` product paragraph, site metadata keywords and the README supported-expansions table so WoW Forever is named first everywhere a public page lists supported games, applying the user's two sign-off edits (shorter S-01, S-03 without the trailing raids sentence)

## Task Commits

Each task was committed atomically (Task 1 as two commits per its tracer-first structure):

1. **Task 1, step A (tracer): Forever-first signup + working `?game=` preselect through sign-in** - `2acfd943` (feat)
2. **Task 1, step B: in-app dialog, public bar, analytics** - `06da2f40` (feat)
3. **Task 2: Add the WoW Forever Updates entry** - `ab5f2f19` (feat)
4. **Task 3: Sweep public surfaces to name WoW Forever first** - `b5dc3fcd` (feat)

No plan-metadata commit was made from the code worktree per the task instructions (SUMMARY/STATE/PLAN are intentionally left uncommitted there; ROADMAP.md was not touched).

## Files Created/Modified

- `lib/post-auth-redirect.ts` - `isSafeNextPath`, `resolvePostAuthRedirect`, `buildSignInPath`; closes the open redirect on `/auth/callback`
- `lib/announcements.ts` - announcement id/surface types, storage keys, pre-paint script string, safe-storage helpers, `shouldShowForeverModal`, `announcementEventProps`
- `app/components/ForeverAnnouncementModal.tsx` - the in-app WoW Forever dialog, mounted in `app/(app)/AppLayout.client.tsx`
- `app/components/landing/ForeverAnnouncementBar.tsx` - the public bar + spacer pair, rendered by `LandingNav.tsx`
- `domain/expansion/game.ts` - added `DEFAULT_SIGNUP_GAME` and `parseGameParam`
- `app/guild-select/create/page.tsx`, `app/components/CreateGuildModal.tsx` - Forever tile first/preselected, safe redirect to sign-in with the full path+query
- `app/auth/callback/route.js` - redirect path now derived from `resolvePostAuthRedirect`
- `utils/analytics/client.ts` - three new `ClientEvent` union members
- `app/layout.tsx` - pre-paint script in `<head>` (Task 1) + `"WoW Forever"` keyword added first (Task 3)
- `app/globals.css` - CSS rule hiding `[data-announcement='wow-forever']` when the bar was dismissed
- `lib/updates-data.ts` - new top entry dated September 27, 2026
- `data/content-dates.json` - `/`, `/about`, `/pricing` bumped to 2026-09-27
- `app/components/landing/LandingHero.tsx`, `app/pricing/page.tsx`, `app/about/page.tsx`, `README.md` - copy sweep naming WoW Forever first

## Decisions Made

- Task 1's bar uses inline `nowrap`/ellipsis styles rather than Tailwind's `truncate` class, because two page-level tests forbid `truncate|line-clamp` classes anywhere in the rendered page.
- D-07's "update the lj6 tests" instruction turned out to require no test edits: a grep for `resolveSignupExpansion` and picker-default assertions found none at execution time, so the requirement was met purely by adding new default-behavior tests.
- Task 2 shipped with the actual sign-off date (September 27, 2026) rather than the plan's placeholder (September 28, 2026), and all content-dates bumps (`/`, `/about`, `/pricing`) use 2026-09-27, per the user's explicit instruction.
- Task 3 applied the user's two approved edits verbatim: the shorter hero trust line for S-01, and dropping the trailing "Forever raids aren't in LootList+ yet." sentence for S-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Constraint-directed - verify-gate correction] Adjusted stale grep literals in the plan's own Task 2 and Task 3 `<verify>` blocks**

- **Found during:** Task 2 and Task 3
- **Issue:** The plan's automated verify commands hard-coded the pre-sign-off placeholder date ("September 28, 2026" / "2026-09-28") and the pre-edit S-01/S-03 copy strings (the longer hero trust line, and the /about paragraph including the trailing raids sentence). Running the gates as literally written against the actually-approved text would have failed even though the approved text was correctly implemented.
- **Fix:** Ran the equivalent checks against the approved text instead: date checks against "September 27, 2026" / `"2026-09-27"` for Task 2; the shorter S-01 string, the S-03 text without the trailing sentence, and `"2026-09-27"` for `/about` and `/pricing` for Task 3. All other gate clauses (title/description content, em-dash check, excluded-path checks) ran unchanged and passed.
- **Files modified:** None (verification-only; the task instructions explicitly authorized this per "Adjust any plan grep gate that encodes the old S-01/S-03/date placeholder text so it checks the APPROVED text instead, and say so in the SUMMARY").
- **Verification:** All adjusted checks printed their `*-ok` / `TASK2_OK` / `TASK3_OK` markers; full `npx vitest run` (78 files, 1617 tests), `npm run typecheck`, and `npx eslint` on every changed file also passed.
- **Committed in:** n/a (documentation-only deviation, no code change)

---

**Total deviations:** 1 (verify-gate correction, explicitly pre-authorized by the task instructions). Task 1's inline-style and D-07 findings were already recorded and carried forward from the prior session per the task's `<state>` block; no new Rule 1-4 deviations occurred in Tasks 2-3.
**Impact on plan:** No scope creep. All code changes match the user's exact sign-off text; only the plan's own verification literals needed correcting to match that sign-off.

## Issues Encountered

None beyond the verify-gate literal mismatch documented above.

## Outstanding Human Checks (carried from Task 1, still outstanding)

The following require a human/browser and were not automatable by the executor, per the plan's `<human-check>` block:

1. **Dialog** - as a member of a Classic guild with `lootlist_onboarding_seen` set and no seen-key for that user, load `/overview`: confirm the dialog appears after ~1s with the Forever logo, title, both paragraphs, and two buttons; buttons stack full-width (primary on top) at 390px and sit side by side at 1440px; check light and dark themes for logo/text contrast; Escape closes it, Tab/Shift+Tab stay inside, focus returns to the trigger, a reload does not bring it back; a Forever-guild user never sees it; `/guild-select/create` never shows it.
2. **Bar** - on `/`, `/pricing`, `/about`, `/blog` and one blog post at 390px and 1440px: confirm the bar sits above the nav without covering the hero or page title (hero H1 unchanged); Chrome DevTools Performance/Lighthouse shows CLS 0 on first load and on a reload after dismissal (no flash); dismiss hides bar and spacer together and moves focus to the logo; no bar anywhere in the signed-in app.
3. **Live click-through** - in a private window, click "Set up your guild": confirm sign-in page -> Discord -> `/guild-select/create` opens with WoW Forever selected.
4. **Pickers** - confirm WoW Forever is first/selected and WoW Classic second (revealing the five expansions when picked) on both `/guild-select/create` and the Create a guild modal; confirm `?game=classic` opens on Classic and `?game=nonsense` opens on Forever.

## Follow-ups Outside This Plan (from the plan's orchestrator notes)

- `app/(app)/help/_client.tsx` is being edited on `fix/forever-expansion-wording`; re-check its tip wording after that branch merges.
- README row "Warlords of Draenor through The War Within | Phase definitions only | Coming soon" is a pre-existing promise the user may want removed (not touched by this plan).
- `BattlenetCharacterPickerModal` offers Classic Era, TBC Anniversary and Cataclysm Classic only; whether Forever characters can import from Battle.net is a product question, not copy, and was left untouched.
- `proxy.ts` drops the query string from `next` for protected routes; this plan's CTA path (`/guild-select/*`) is public and unaffected, but this pre-existing behavior was not changed.
- For brand-new users the callback now honors only `/guild-select/create`; invite links for brand-new users still land on `/guild-select` as before.
- Discord channels, GitHub repo description, Reddit and CurseForge listings, Stripe product text were explicitly out of scope for the D-05 sweep and were not touched.

## User Setup Required

None - no external service configuration required. No package installs, env vars or migrations in this plan.

## Next Phase Readiness

- Branch `feat/forever-announcement` (worktree `wt-announce`) holds four clean commits, each scoped to its task's file list, on top of `origin/main` at merge-base `86c74ce3`.
- Full verification passed: `npm run typecheck`, `npx eslint` (0 errors on every changed file), the full `npx vitest run` (78 files / 1617 tests), and every plan grep gate (adjusted per the sign-off, as documented above).
- No file owned by the in-flight `fix/forever-expansion-wording` branch was touched; `data/expansion-phases.ts` and its two seeder tests appear in a origin/main-relative diff only because `origin/main` has advanced past this branch's merge-base with unrelated commits (`08575468` et al.) - this branch does not modify those files (confirmed via `git diff 86c74ce3..HEAD`).
- Ready for the orchestrator to open the PR from `feat/forever-announcement` and route the outstanding human-check list above to the user before merge.

---
*Phase: quick-260927-t5j*
*Completed: 2026-09-27*

## Self-Check: PASSED

All four commit hashes (`2acfd943`, `06da2f40`, `ab5f2f19`, `b5dc3fcd`) found in `git log --oneline --all` in the code worktree. All fifteen spot-checked created/modified files (`lib/post-auth-redirect.ts`, `lib/announcements.ts`, `app/components/ForeverAnnouncementModal.tsx`, `app/components/landing/ForeverAnnouncementBar.tsx`, `domain/expansion/game.ts`, `app/auth/callback/route.js`, `utils/analytics/client.ts`, `app/layout.tsx`, `app/globals.css`, `lib/updates-data.ts`, `data/content-dates.json`, `app/components/landing/LandingHero.tsx`, `app/pricing/page.tsx`, `app/about/page.tsx`, `README.md`) confirmed present on disk.
