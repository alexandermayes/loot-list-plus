---
schema_version: 1
open_count: 53
waived_count: 0
fixed_count: 4
total_count: 57
last_updated: 2026-09-23T18:34:15.080Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | quick-260901-hkj | unrun-verify | app/api/cron/sync-discord-premium/route.ts |  | Task 3 human-check not run: trigger the new cron once post-deploy with the CRON_SECRET bearer token and confirm the JSON tally / Server Members Intent log line, per PLAN.md | open |  | 2026-09-01T19:52:10.739Z |  |
| 2 | 03 | unrun-verify | eslint.config.mjs |  | npm run lint (full project) fails with pre-existing config error: rule react-hooks/purity references missing plugin react-hooks (unrelated to plan 03-01; scoped eslint on this plan's files passes clean) | open |  | 2026-09-04T18:24:46.583Z |  |
| 3 | 03 | unrun-verify | app/api/guild-count/route.ts |  | npm run build (full project) cannot complete in this sandbox: pre-existing /api/guild-count route requires SUPABASE_SERVICE_ROLE_KEY at prerender time, not present here; verified instead via successful Turbopack compile and a grep of the emitted server chunk confirming the aggregates JSON binding for this plan's page resolved correctly before the unrelated route failed | open |  | 2026-09-04T18:25:03.470Z |  |
| 4 | 07 | unrun-verify | app/globals.css |  | 07-04 Task 3 <human-check> not run: visual density/card-readability review of the dark surface ramp against the committed pre-phase-07 baseline at 1440/390, both themes; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | open |  | 2026-09-16T19:05:30.576Z |  |
| 5 | 07 | unrun-verify | app/(app)/raid-tracking/_client.tsx |  | 07-05 Task 3 <human-check> not run: visual review of the standby cell rail, legend swatch and member pill in dark mode (1440/390) and light mode against the committed pre-phase-07 baseline, confirming standby reads distinct from late yellow and accent orange and that benched is not mistakable for late; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | open |  | 2026-09-16T19:22:42.391Z |  |
| 6 | 07 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/ |  | 07-06 Task 1 <human-check> not fully resolvable: the post-phase-07 baseline is Home-only (no cards/borders/hover surfaces/standby chips in view), so the card-lift/border-ramp/standby visual judgments WINDOWS entries 4 and 5 wait on still need a card-dense authenticated screen; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | open |  | 2026-09-16T19:38:29.634Z |  |
| 7 | 08 | unrun-verify | app/(app)/reserve/runs/[id]/_client.tsx |  | 08-07 PRIM-03 keyboard Tab walk not run: confirm a visible focus-visible ring on every focusable control (Input/Textarea/Select/Switch/Checkbox/Radio/Button/nav links) in both light and dark mode on one real form, per 08-VALIDATION.md's Manual-Only Verifications table; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | open |  | 2026-09-18T00:36:27.634Z |  |
| 8 | 08 | unrun-verify | app/components/JoinGuildModal.tsx |  | 08-07 PRIM-04/D-05 click-through not run: open JoinGuildModal, OnboardingModal and UpgradeModal in the running app and confirm each has an accessible name, Escape closes it, and focus returns to the trigger in the real stacking context (e.g. DashboardContent.tsx's stacked first-run modals), per 08-VALIDATION.md's Manual-Only Verifications table; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | open |  | 2026-09-18T00:36:40.525Z |  |
| 9 | 08 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-18-post-phase-08/ |  | 08-07 Task 1 <human-check> not fully resolvable: the post-phase-08 baseline is Home-only (no Modal, Input/Textarea/Select, skeleton, or migrated label call site in view), so it confirms no regression on Home but cannot itself verify PRIM-02/03/04/05's real behavior, which lives on authenticated screens; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | open |  | 2026-09-18T00:36:54.261Z |  |
| 10 | 09 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/ |  | 09-02 Task 2 D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404), so the before-capture fell back to Home-only (4 images); overview, guild-settings and loot-management were skipped. End-of-phase UAT walkthrough of /overview, /guild-settings and /loot-management replaces the visual comparison for those three screens per D-17. | open |  | 2026-09-19T19:17:31.395Z |  |
| 11 | 09 | deviation | 09-06-PLAN.md |  | 09-02 Task 3 checkpoint excluded the 6 SKIPPED cn(...) hand-rolled-card sites (dropdown-menu.tsx:58/:75, empty-state.tsx:77, error-state.tsx:67, radio-group.tsx:28, segmented-control.tsx:33) from the guard entirely, same treatment as the 29 borderless lines -- but these 6 lines currently match HAND_ROLLED_CARD_CEILING's live regex (unlike the structurally-excluded borderless lines), so 09-06-PLAN.md Task 2's acceptance criteria (zero-total dry-run, unwidened scanExclusions, plain toHaveLength(0) closure) need reconciling with this exclusion before that batch executes. | fixed | 09-05-PLAN.md Task 2 (the batch that actually touches the 5 affected files) now widens scanExclusions to the 6-entry set (card.tsx plus the 5 named files) in the same commit that migrates the batch's other 25 real sites, so the plan's original ceiling arithmetic (232 -> 201 -> 154 -> 79 -> 0) is unaffected. 09-06-PLAN.md Task 2's closing assertion now checks scanExclusions equals that finalized 6-entry set instead of asserting it was never widened. Threat model entries T-09-16/T-09-19 and the prohibitions in both plans updated to describe this as a disclosed, checkpoint-approved exception rather than a violation of the no-allowlist rule. | 2026-09-19T20:02:29.132Z | 2026-09-19T20:45:00.000Z |
| 12 | 09 | deviation | app/(app)/characters/[id]/edit/_client.tsx | 386 | 09-06 Task 2's hand-rolled-cards.mjs codemod renamed a real <form onSubmit={handleSubmit}> to <Card onSubmit={handleSubmit}>. Card renders a plain div, so the type="submit" Save button on /characters/[id]/edit did nothing when clicked (no submit event to catch). Found by the 09-07 executor while building the cards-in-cards ancestry check; verified independently before fixing (git blame to commit c6a4f8e6, confirmed no other file has the same <Card ...onSubmit pattern repo-wide). | fixed | Reverted the element to <form> with its original card-shaped surface classes restored (commit e002f947). Added 'form' to hand-rolled-cards.mjs's INTERACTIVE_INTRINSIC_TAGS denylist so a future codemod run cannot reintroduce this. Added the file to hand-rolled-card-pattern.json's scanExclusions (17 entries) since the restored <form> once again carries the classes PRIM-01's guard matches on. Full suite (67 files / 1198 tests), typecheck and lint all green after the fix. | 2026-09-19T21:43:18.606Z | 2026-09-19T21:50:00.000Z |
| 13 | 09 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-19-post-phase-09/ |  | 09-08 Task 1 <human-check> not fully resolvable: the post-phase-09 baseline is Home-only (no Card, no migrated hand-rolled-card site, no nested variant, no display-alias heading, no radius change in view; symmetric with WINDOWS entry 10's before-capture, all 4 images byte-identical pre/post), so it confirms no regression on Home itself but cannot itself verify TYPE-03/PRIM-01's real behavior (the rounded-xl radius increase, the type sweep's heading line-height tightening, the 7 nested SettingsModal conversions), which lives on the three authenticated screens (/overview, /guild-settings, /loot-management); deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase, same limitation WINDOWS entry 10 already named | open |  | 2026-09-19T21:56:34.321Z |  |
| 14 | 09 | deviation | app/(app)/help/_client.tsx |  | Code review WR-03: several <Card onClick> fake-button sites (help/_client.tsx, DashboardContent.tsx, reserve/_client.tsx, LootSubmissionsContent.tsx, CharacterCard.tsx) lack role=button/tabIndex/onKeyDown, unlike RaidModeView.tsx:106-111 in this same migration which does it correctly. Pre-existing gap (these were divs with onClick before this phase too); the mechanical Card migration neither introduced nor fixed it. Adding keyboard/ARIA semantics is behavior-adding work outside phase 09's mechanical-migration mandate. | open |  | 2026-09-19T22:28:38.739Z |  |
| 15 | 10 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-20-pre-phase-10/ |  | 10-01 Task 1 D-16/D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404), so the before-capture fell back to Home-only (4 images); overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped. End-of-phase UAT walkthrough of the six authenticated screens replaces the visual comparison for those screens per D-17. | open |  | 2026-09-20T08:09:42.160Z |  |
| 16 | 10 | unrun-verify | app/components/OnboardingModal.tsx |  | 10-01 Task 1: OnboardingModal.tsx (two of the six COLOR-07 sites, gated on first-run user state) and ScoreComparisonModal.tsx (opens from a per-row action) remain unreachable by scripts/visual/baseline.mjs's fixed-route capture; no synthetic click hook was added. Routed to end-of-phase UAT. | open |  | 2026-09-20T08:09:42.233Z |  |
| 17 | 10 | unrun-verify | app/(app)/overview/components/DashboardContent.tsx | 2088 | 10-04 Task 1 human-check (screenshot comparison of progress-bar track fill contrast in both themes against pre-phase-10 capture) not run by executor; needs end-of-phase UAT | open |  | 2026-09-20T09:19:52.217Z |  |
| 18 | 10 | unrun-verify | components/ui/horizontal-scroll.tsx | 68 | 10-04 Task 2 human-check (hover fill visual check across the three call-site screens in both themes) not run by executor; needs end-of-phase UAT | open |  | 2026-09-20T09:19:52.510Z |  |
| 19 | 10 | deviation | app/globals.css |  | 10-06 Task 3's npm run build acceptance criterion could not be met: production build is broken repo-wide by a pre-existing, phase-unrelated bug -- TypeError: c.createContext is not a function during static page-data collection for /blog/* pages (nondeterministic which slug fails across the 9-worker parallel collection, a Turbopack SSR bundling issue). Confirmed present before any Phase 10 work: reproduced identically at commit 27b3df5e (last commit before Phase 10 started) and on the Task-2-only state (six conversions committed, token deletion stashed). Substituted proof used instead, accepted by user in place of npm run build for this task only: direct tailwindcss CLI compile against the full app/+components/ content glob, exit 0, zero background-inset references in generated CSS -- proving the deletion introduces no unresolved colour reference, which is what the acceptance criterion actually targets. The broken blog build is a separate, real, urgent issue needing its own investigation outside this phase's scope; it is NOT fixed or further investigated here. | fixed | Root-caused and fixed by /gsd-debug session blog-build-createcontext (archived at .planning/workstreams/design-system/debug/resolved/blog-build-createcontext.md), fix commit 50a91c9e. Cause was an AND-gate, not a Turbopack bundling bug as originally suspected: components/ui/card.tsx called React.createContext (to share its variant with CardHeader/CardContent/CardFooter) without a 'use client' directive, and commit 5688967e (09-05) introduced the first real Server Component importers of Card (BlogRelatedPosts, rendered by all 10 blog posts, plus app/blog, app/research and app/customers). React 19.2.3 resolves the react-server export condition to react/react.react-server.js, which exports no createContext or useContext, so Turbopack compiled the real module into the RSC layer and module evaluation threw. The nondeterministic slug was only which of the 9 parallel page-data workers reported first; all 12 affected routes failed every build. Fix: added the directive to card.tsx (matching the existing modal.tsx precedent) and to app/components/ItemLink.tsx, which carried the identical latent defect. Added components/ui/__tests__/react-server-client-directive.test.ts, a derived-oracle guard that reads the installed react-server export surface at test time and fails any module under components/ui, app/components or app/contexts that uses a missing React API without the directive. Verified: clean rm -rf .next && npm run build exits 0 with all 10 blog posts plus /blog, /research and /customers prerendering (independently re-run by the orchestrator and confirmed by the user); 1219 tests green; lint 0 errors, 397 pre-existing warnings unchanged; removing the directive reproduces the failure. 10-06 Task 3's original npm run build acceptance criterion can now be run directly, so the substituted tailwindcss-CLI proof is no longer load-bearing. | 2026-09-21T00:51:56.414Z | 2026-09-21T18:03:35.538Z |
| 20 | 10 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/ |  | 10-07 Task 1: npm run test:users:create still had not been run (GET /api/dev/test-users returned 404, re-checked live this session against a freshly restarted local dev server), so the after-capture falls back to Home-only (4 images), symmetric with the before-capture (WINDOWS.md entry 15). Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again. ROADMAP success criterion 5's screenshot half is NOT met by this plan for those six authenticated screens and is routed to end-of-phase UAT, same as entry 15. | open |  | 2026-09-21T01:08:07.348Z |  |
| 21 | 10 | unrun-verify | app/(app)/overview/components/DashboardContent.tsx | 2234 | Code review WR-01 (10-REVIEW.md), independently confirmed real by 10-VERIFICATION.md's direct code read: Card variant="nested" rendered inside a space-y-2/space-y-3/space-y-4 parent (.map() lists in DashboardContent.tsx's two widgets, ProfileContent.tsx's guild list, EditCharacterModal.tsx's guild-membership list) produces a gap-then-divider composition never exercised before this phase and never screenshotted. Accepted via override in 10-VERIFICATION.md rather than fixed inline; routed to end-of-phase UAT (10-UAT.md) to confirm whether it reads as an intentional divided list or a floating-line defect. | open |  | 2026-09-21T01:50:47.162Z |  |
| 22 | 11 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/ |  | 11-01 Task 1 D-16/D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404), so the before-capture fell back to public-pages-only (20 images: home plus the four new blog-post/research/compare/pricing entries); overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped. This phase's primary need -- the four public reading pages TYPE-04 touches -- captured successfully regardless. End-of-phase UAT walkthrough of the six authenticated screens replaces the visual comparison for those screens, same posture as WINDOWS.md entries 10, 15 and 20. | open |  | 2026-09-21T21:23:40.530Z |  |
| 23 | 11 | deviation | app/(app)/design-system/_client.tsx | 1801 | SURF-02 (11-04-PLAN.md) deleted [data-score] from app/globals.css. The in-app design-system doc page at this line still reads: "Applied globally to td, th, and [data-score]." -- descriptive prose with zero functional [data-score] DOM usage, now stale. Not fixed here per this workstream established name-and-route convention (Pitfall 5, 11-RESEARCH.md); routed to Phase 12 ENF-03, whose own success criterion already covers "shows no primitive that this milestone deleted" for this exact page. | open |  | 2026-09-21T23:24:01.750Z |  |
| 24 | 11 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/ |  | 11-05 Task 1: npm run test:users:create still had not been run (GET /api/dev/test-users returned 404, re-checked live this session against a freshly restarted local dev server), so the after-capture falls back to public-pages-only (20 images), symmetric with the before-capture (WINDOWS.md entry 22). Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again. ROADMAP success criterion 4's score-dense master-sheet half is NOT met by this plan and is routed to end-of-phase UAT, same as entry 22. | open |  | 2026-09-21T23:44:04.019Z |  |
| 25 | 11 | deviation | app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx |  | 11-05 Task 1 fold comparison: at 1440px, both themes (layout is theme-invariant, confirmed by identical light/dark image dimensions), the prose-measure narrowing (already measured by 11-01 as an H1 1-to-2-line gain, +38.39px) compounds with an extra wrap on the intro paragraph (2 to 3 lines) to a total +65px shift by the byline. Net effect at the fold (900px): the H2 heading 'Where DKP Falls Apart', fully above the fold before, now straddles the fold line; its body paragraph ('The longer a guild runs DKP, the more its flaws start to show...'), previously half-visible (first line straddling), is now entirely below the fold. At 390px both themes the capture is byte-identical (zero height delta) -- nothing crosses on mobile. Not fixed here per D-09/Phase-09-D-05 route-do-not-fix convention; routed to the sprint workstream's conversion-cohort measurement owner. | open |  | 2026-09-21T23:44:04.208Z |  |
| 26 | 11 | deviation | app/research/wow-classic-loot-systems-2026/page.tsx |  | 11-05 Task 1 fold comparison: at 1440px, both themes (theme-invariant layout), the prose-measure narrowing reflows the research page's intro copy enough that the '18.0 / median items per approved list' stat card -- a proof/evidence element -- moves from fully above the fold (900px) to straddling it: its caption line 'median items per approved list' and rounded bottom edge now sit below the fold. At 390px both themes the capture is byte-identical (zero height delta) -- nothing crosses on mobile. Not fixed here per D-09/Phase-09-D-05 route-do-not-fix convention; routed to the sprint workstream's conversion-cohort measurement owner. | open |  | 2026-09-21T23:44:04.356Z |  |
| 27 | 11 | deviation | app/compare/page.tsx |  | 11-05 Task 1 fold comparison: at 1440px, both themes (theme-invariant layout), the 896px-to-70ch narrowing (the phase's largest single re-flow, +533px total document height) reflows the comparison table itself: before, the table header plus the 'Ranked loot lists', 'Automated scoring formula', 'Built-in attendance tracking' and 'Attendance feeds the loot score' rows are all fully above the 900px fold. After, 'Built-in attendance tracking' straddles the fold and 'Attendance feeds the loot score' -- a full row of the page's core proof content -- moves entirely below the fold, along with 'Score breakdown per item' and 'Bad luck protection' which were already below the fold before. At 390px both themes the capture is byte-identical (zero height delta) -- nothing crosses on mobile (the table's own horizontal overflow-x-auto scroll affordance at 390 is unchanged by this phase, per 11-02-SUMMARY.md's prior finding). Not fixed here per D-09/Phase-09-D-05 route-do-not-fix convention; routed to the sprint workstream's conversion-cohort measurement owner. | open |  | 2026-09-21T23:44:04.490Z |  |
| 28 | 11 | unrun-verify | app/globals.css |  | 11-05 Task 1 SURF-01 visual confirmation: the ::selection accent wash (0.3 alpha, legible text over it) and the caret-color accent tint were both confirmed live in a real browser (Puppeteer against the running dev server) in both light and dark themes -- screenshots attached to this plan's execution. The universal themed scrollbar rule could NOT be visually confirmed the same way: two independent attempts to screenshot the compare page's overflow-x-auto table at 390px (where the table provably overflows, scrollWidth 670 vs clientWidth 340) rendered no visible scrollbar affordance in headless Puppeteer, despite 11-03's rendered-CSS compile already proving the rule is emitted and resolves against --border/--border-strong. This reads as a headless-screenshot limitation (custom scrollbar rendering is known to be inconsistent in headless Chromium), not a functional gap, but it was not fabricated as confirmed. Routed to end-of-phase UAT: open a real browser window and confirm the themed thin scrollbar on a horizontally-scrolling table and on the main content area, in both themes. | open |  | 2026-09-21T23:44:04.614Z |  |
| 29 | quick-260921-ut5 | unrun-verify | app/api/billing/checkout/route.ts |  | Human-checks A/B/C (Stripe test-mode card-field omission, trial-pause-at-day-15, gift-path-stays-active) not run in this execution - requires live sk_test_ key, browser, Stripe test clock, and test Supabase project | open |  | 2026-09-22T05:20:10.058Z |  |
| 30 | quick-260921-ut5 | deviation | app/components/UpgradeModal.tsx |  | Trial copy in UpgradeModal.tsx, PremiumPricing.tsx and BillingSection.tsx implies Premium continues unless cancelled; after this change a cardless trial pauses on day 15 instead. Copy is still literally true but the implied default is inverted. Flagged for user sign-off, not edited (CLAUDE.md requires copy sign-off). | fixed | Copy revised in fast task 260921-v1f (commit 43defb8d). All three strings now lead with "no credit card required" and state that Premium pauses at trial end. Wording approved by the user, satisfying the CLAUDE.md copy sign-off rule. | 2026-09-22T05:20:16.656Z | 2026-09-22T06:01:35.024Z |
| 31 | quick-260921-vns | unrun-verify | app/(app)/guild-settings/components/BillingSection.tsx |  | Human-checks A-D for the paused Premium state not run: no live Stripe test-mode key, test clock, or running dev server in the execution environment. Check B is decisive and determines whether a server-side subscriptions.resume path is required: does the Stripe billing portal actually resume a subscription paused via trial_settings end_behavior missing_payment_method, or does it stay paused after a payment method is added. Check D is copy sign-off, blocking per CLAUDE.md. No guild can reach the paused state before approximately 2026-10-05, so there is runway. | open |  | 2026-09-22T06:01:50.242Z |  |
| 32 | 11 | deviation | app/globals.css |  | G-11-1 (11-06-PLAN.md) gave .tabular-nums its own font-family (Figtree, via --font-tabular). The td, th half of the same shared rule keeps only its font-variant-numeric declaration and gains no family -- text cells that carry no .tabular-nums class are unaffected, so a table cell without the class still renders numerals in Poppins with no tabular-nums texture change. Not fixed here: putting a second face on every table cell would change the face of text cells too, not just numerals. Confirmed as a decided non-fix at the Task 2 checkpoint (2026-09-21). | open |  | 2026-09-22T06:04:04.558Z |  |
| 33 | 11 | deviation | app/research/wow-classic-loot-systems-2026/page.tsx | 461 | G-11-1 (11-06-PLAN.md): the public stat callout at this line ('18.0 / median items per approved list') renders a figure without the .tabular-nums class, so it is unaffected by the Figtree wiring. Measured and named at plan time, not given the class here, per D-09's route-do-not-fix convention: a static single figure does not jitter the way a column does, and D-09 excludes auditing for missing .tabular-nums coverage from this phase. | open |  | 2026-09-22T06:04:04.629Z |  |
| 34 | 11 | unrun-verify | app/(app)/master-sheet |  | G-11-1 (11-06-PLAN.md) Task 3 human-check not run: confirm the numeral columns on the authenticated score-dense surfaces (master-sheet BossSection score/score-breakdown columns, attendance percentage column, overview dashboard figures, the score-comparison modal) hold alignment as values change, read as the same apparent size/weight as Poppins in the same row, and sit on the same baseline in table cells, in both light and dark. Could not be verified in this environment: GET /api/dev/test-users returns 404 (loadtest/test-users.json absent) and npm run test:users:create writes real users into a hosted Supabase project, so it must not be run. Routed to end-of-phase UAT, same posture as WINDOWS.md entries 10, 15, 20, 22 and 24. | open |  | 2026-09-22T06:04:04.697Z |  |
| 35 | 11 | deviation | app/reserve/join/[token]/opengraph-image.tsx | 14 | 11-06-PLAN.md Task 3's acceptance criterion 'grep -rn fonts.googleapis.com\|fonts.gstatic.com app components next.config.ts \| wc -l is 0' fails against the live tree: this pre-existing, unrelated OG-image route (predates this plan, git log confirms) fetches two Poppins TTF files directly from fonts.gstatic.com at request time for next/og ImageResponse rendering -- a server-side Satori render, not a browser document load, so it is not governed by next.config.ts's font-src CSP directive the criterion protects. Scoped re-verification confirms zero external-font-host references in the files this plan actually touched (app/layout.tsx, app/globals.css). Not fixed here: out of scope for G-11-1, not in this plan's files_modified, and changing an unrelated route's font-loading strategy is a separate concern. | open |  | 2026-09-22T06:04:04.767Z |  |
| 36 | quick-260921-w4u | unrun-verify | app/api/webhooks/stripe/route.ts |  | Human-checks A-D and the operator action (enable payment_method.attached on we_1U8UUlFV7dhwtnIjYXou6I5i) were NOT RUN - no Stripe Dashboard/browser access in this autonomous execution | open |  | 2026-09-22T06:24:14.961Z |  |
| 37 | quick-260921-wiy | unrun-verify | app/api/webhooks/stripe/route.ts |  | Operator action NOT RUN: live webhook endpoint we_1U8UUlFV7dhwtnIjYXou6I5i not yet subscribed to customer.subscription.trial_will_end (or payment_method.attached); code is dead in production until a human adds both events in the Stripe Dashboard | open |  | 2026-09-22T09:03:55.518Z |  |
| 38 | quick-260921-wiy | unrun-verify | lib/billing/trial-ending.ts |  | Human-checks B, C, D NOT RUN: real trial_will_end DM delivery, quiet no-linked-Discord degradation, and no-DM-when-card-on-file, all require live Stripe test clocks and a real Discord account not available to autonomous execution | open |  | 2026-09-22T09:03:59.837Z |  |
| 39 | 12 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/ |  | 12-01 Task 1 D-16/D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404, re-checked live this session against a freshly restarted local dev server), so the before-capture falls back to public-pages-only (20 images: home, blog-post, research, compare, pricing). Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again, same posture as WINDOWS.md entries 10, 15, 20, 22 and 24. This phase's only changed screen, /design-system, has no working authenticated capture path either (baseline.mjs's PAGES matrix has no /design-system entry and the same test-user blocker applies); its before and after states are routed to the end-of-phase UAT walkthrough rather than a screenshot pair. | open |  | 2026-09-22T21:42:53.280Z |  |
| 40 | 12 | deviation | .claude/skills/impeccable/scripts/context.mjs |  | context.mjs's EXISTING_VISUAL_SYSTEM directive prints unconditionally whenever PRODUCT.md is absent and the repo has an incumbent visual implementation (gated on ctx.hasProduct only, not ctx.hasDesign); it still appears alongside the new '# DESIGN.md' authority block after 12-02 Task 1, so 12-02-PLAN.md's acceptance sub-clause 'no EXISTING_VISUAL_SYSTEM directive' cannot be satisfied without creating PRODUCT.md or editing the shared impeccable skill script, both out of ENF-01's scope. The substantive claim (context.mjs now prints DESIGN.md as authority where it printed nothing before) is proven; only this one sub-clause is unmet. | open |  | 2026-09-22T23:13:10.118Z |  |
| 41 | 12 | deviation | components/addon/AddonImportDialog.tsx | 83 | 12-06 ENF-02 routing: 15 unsanctioned font-mono sites outside the 8 D-14 sites, for a legitimacy review per gate item 2.4's default branch (design-system-font never fires on a Tailwind font-mono class, only on font-family/fontFamily literals, so the hook cannot gate these). Full site list: app/(app)/admin/addon/_client.tsx:128, app/(app)/help/[slug]/_client.tsx:68, app/(app)/loot-list/components/LootListContent.tsx:2158, app/(app)/raid-tracking/components/ImportModal.tsx:104,137,173, app/(app)/raid-tracking/components/LootItemSelectionModal.tsx:47, app/(app)/reserve/runs/[id]/_client.tsx:821, app/(app)/sheet-import/_client.tsx:291,322, app/components/BisImportModal.tsx:285, app/components/WowSimsImportModal.tsx:170, app/dev-login/page.tsx:175, components/addon/AddonExportDialog.tsx:84, components/addon/AddonImportDialog.tsx:83. | open |  | 2026-09-23T17:07:12.087Z |  |
| 42 | 12 | deviation | app/(app)/loot-management/components/ItemRow.tsx |  | 12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-color findings in app-screen files (milestone C), 7 findings across 3 files, not suppressed. app/(app)/loot-management/components/ItemRow.tsx:110,113,116 (#ef4444, #eab308, #22c55e); app/(app)/loot-management/components/LootSettingsContent.tsx:1492,1493,1494 (same three values); app/(app)/loot-management/components/PriorityListTab.tsx:803 (#888888). | open |  | 2026-09-23T17:07:12.185Z |  |
| 43 | 12 | deviation | app/reserve/join/[token]/opengraph-image.tsx |  | 12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-color findings in public-page and shared-component files (milestone B), 49 findings across 27 files, not suppressed. Counts by file: app/api/guild-members/route.ts 1, app/components/BattlenetCharacterPickerModal.tsx 1, 10 blog post pages (app/blog/*) 1 each (dkp-is-dead-what-classic-guilds-use-in-2026, guild-recruitment-guide-find-raiders-who-stay, how-to-handle-loot-drama-without-losing-raiders, how-to-onboard-new-raiders-without-killing-morale, how-to-run-loot-without-a-spreadsheet, how-to-set-up-a-fair-loot-system-for-your-wow-guild, loot-priority-lists-vs-loot-council, blog/page.tsx, the-officer-burnout-problem-and-how-to-fix-it, why-attendance-tracking-matters-more-than-loot-rules), app/compare/page.tsx 1, app/customers/[slug]/page.tsx 1, app/research/wow-classic-loot-systems-2026/page.tsx 1, app/components/CreateGuildModal.tsx 8, app/components/KonamiEasterEgg.tsx 4, app/globals.css 1 (#ff8000, distinct from the sanctioned #9940ec entry), app/reserve/join/[token]/opengraph-image.tsx 7, app/components/Navigation.tsx 1, app/components/Sidebar.tsx 2, app/components/UpgradeModal.tsx 1, app/components/landing/ClickEffects.tsx 6, app/components/landing/LandingHowItWorks.tsx 1 (#17151B), app/components/landing/LandingValueProps.tsx 1, app/components/landing/PremiumFeatures.tsx 1, app/pricing/page.tsx 1. | open |  | 2026-09-23T17:07:12.296Z |  |
| 44 | 12 | deviation | app/globals.css | 339 | 12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-radius findings, 3 across 2 files, not suppressed, routed to milestone B. app/globals.css:339 *::-webkit-scrollbar-thumb border-radius: 3px (pre-existing Phase 11 work, commit 37a5b0d3, one of gate item 2.6's three predicted radius findings, named per 12-05's WINDOWS routing item 4). app/reserve/join/[token]/opengraph-image.tsx:117,184 border-radius: 24px (x2, static OG-image renderer, not a UI type-scale surface). | open |  | 2026-09-23T17:07:12.451Z |  |
| 45 | 12 | deviation | app/reserve/join/[token]/opengraph-image.tsx |  | 12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-font-size findings, 3 at app/reserve/join/[token]/opengraph-image.tsx:107,164,167 (22px), not suppressed, routed to milestone B. Gate item 2.6 was CHANGED from its stated default (DESIGN.md's typography frontmatter carries the full 19-step typography.scale map, not display-plus-body-only), so these are not the anticipated 'six false findings on legitimate type-scale steps' the default branch would have produced; measured is 3, not 6, and they are real off-scale literals in a static next/og image renderer, unrelated to the app's UI type scale. | open |  | 2026-09-23T17:07:12.567Z |  |
| 46 | 12 | deviation | app/pricing/page.tsx |  | 12-06 ENF-02 routing per gate item 2.11: text-[#bababa] (60 live uses across 16 files, close to the 2026-09-15 UI audit's measured 59) and the audit's other off-token marketing literal text-[#080808]/bg-[#080808] (19 uses across 18 files, matching the audit exactly), routed to milestone B. The design-system-color source checker never flags a Tailwind arbitrary-value class (it reads a bracketed hex as a CSS attribute selector, not a color literal), so neither is visible to ENF-02's hook and no suppression entry applies. #bababa files: app/(landing)/landing/page.tsx, app/about/page.tsx, app/changelog/page.tsx, app/premium/page.tsx, app/pricing/page.tsx, app/privacy/page.tsx, app/terms/page.tsx, app/components/PremiumItemTooltip.tsx, app/components/landing/{LandingCompare,LandingCTA,LandingFeatures,LandingFooter,LandingHero,LandingHowItWorks,LandingLootDecision,LandingNav,LandingValueProps,ParallaxItem,PremiumFeatures,PremiumHero,PremiumPricing}.tsx. #080808 files: the same landing/marketing set plus app/(landing)/landing/page.tsx, app/about, app/changelog, app/premium, app/pricing, app/privacy, app/terms pages. | open |  | 2026-09-23T17:07:12.712Z |  |
| 47 | 12 | deviation | app/(app)/loot-list/components/LootListContent.tsx | 599 | 12-06 ENF-02 routing (Decision B, 12-05's classification gate): the side-tab entry on app/(app)/loot-list/components/LootListContent.tsx was REMOVED (not re-added) because the 2026-09-15 UI audit lists this exact line under its P1 findings, not its legitimate exceptions, and the entry's stated reason (Phase 10 COLOR-04 scope) was wrong. The live rank/quality-tier border-colour-coding rail at line 599 (plus its configs at 2022-2077) is unsuppressed as of this commit and routes to milestone C's bracket colour work. | open |  | 2026-09-23T17:07:12.828Z |  |
| 48 | 12 | deviation | app/reserve/join/[token]/page.tsx | 30 | 12-06 ENF-02 routing (Decision A, 12-05's classification gate): the 10 WOW_CLASSES literal hex values at app/reserve/join/[token]/page.tsx:30-40 already exist byte-identical as class-* Tailwind theme keys (class-warrior, class-paladin, class-hunter, class-rogue, class-deathknight, class-shaman, class-mage, class-warlock, class-monk, class-druid, confirmed in tailwind.config.js). Migrate the WOW_CLASSES array onto those existing tokens, then delete the 10 provisional design-system-color ignoreValues entries this commit adds to .impeccable/config.json (each entry's own reason names this same migration). Not done this phase per gate Section 6 (guards widen and route, fixes are separate work). | open |  | 2026-09-23T17:07:12.921Z |  |
| 49 | 12 | deviation | app/reserve/join/[token]/page.tsx | 866 | D-08, 12-06 Task 3: purple-to-pink avatar-fallback gradient (bg-gradient-to-br from-purple-500 to-pink-500, no Discord avatar case) on a public route, outside COLOR-07's original app/(app)+app/components scan scope until this plan's widening to all of app/. The pre-rewrite .impeccable/config.json ai-color-palette entry that was separately, and incorrectly, suppressing this exact literal at the hook level was removed at 12-05's classification gate (Decision on the approved-removals list). The purple-gradient-guard.test.ts ratchet now pins this file at ceiling 1 and will fail if the count rises or falls without the ceiling being lowered in the same commit. Not migrated this phase (gate Section 6). Routed to milestone C's app-screen colour work. | open |  | 2026-09-23T17:17:05.089Z |  |
| 50 | 12 | deviation | app/components/OnboardingModal.tsx | 299 | D-08, 12-06 Task 3: yellow gradient stop (via-yellow-500/50 in the animated gradient border) covered by no app-wide colour rule until this plan added the yellow pattern to purple-gradient-guard.test.ts. The widened guard pins this file at ceiling 1 and will fail if the count rises or falls without the ceiling being lowered in the same commit. Not migrated this phase (gate Section 6). Routed to milestone C's app-screen colour work. | open |  | 2026-09-23T17:17:05.174Z |  |
| 51 | 12 | deviation | app/(app)/loot-list/components/LootListContent.tsx |  | D-08, 12-06 Task 3: the remaining 18 yellow ramp lines (in 6 files, not counting OnboardingModal.tsx:299 routed separately) covered by no app-wide colour rule until this plan's widened purple-gradient-guard.test.ts yellow assertion. Per-file ceilings now pinned: app/(app)/loot-list/components/LootListContent.tsx 11, app/(app)/loot-submissions/components/LootSubmissionsContent.tsx 2, app/(app)/master-sheet/components/MasterSheetContent.tsx 1, app/(app)/overview/components/DashboardContent.tsx 1, app/compare/page.tsx 1, app/components/ScoreComparisonModal.tsx 2. Each ceiling must be lowered in the same commit that fixes its site. Not migrated this phase (gate Section 6). Routed to milestone C's app-screen colour work (a bracket colour-coding convention shared with the LootListContent.tsx side-tab rail routed at WINDOWS entry 47). | open |  | 2026-09-23T17:17:05.254Z |  |
| 52 | 12 | unmet-truth | .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-FINAL.json |  | ENF-05 is Blocked: gate is the deploy of local main (304 commits ahead) to remote main, which remains at 2e0587ee (dated 2026-09-13, confirmed unmoved via git ls-remote origin refs/heads/main this session); none of Phases 07-12 are live. Owner: sprint workstream. Unblock: run the rendered detector (scripts/design-system/local-detector-run.mjs's page list, viewports and output shape) against the seven deployed URLs and report zero undersized-ui-text, tiny-text, low-contrast and nested-cards findings that trace to tokens or primitives, attributing any remaining finding to page-level layout and carrying it to milestone B. The interim LOCAL figures live in 12-DETECTOR-LOCAL-FINAL.json (labelled local everywhere) and do not satisfy this requirement. | open |  | 2026-09-23T18:21:27.288Z |  |
| 53 | 12 | unmet-truth | .github/workflows/ci.yml |  | ENF-04 is Blocked: same gate (deploy of local main, 304 commits ahead, to remote main at 2e0587ee, dated 2026-09-13) and owner (sprint workstream). Unblock recipe: (1) before the deploy lands, capture the milestone-start baseline against production, which is still the pre-milestone site until then (no detector JSON baseline was ever committed, so no baseline count exists in the repo; after the deploy the only way back is serving commit 2e0587ee locally); (2) run the gate as a separate post-deploy job, not folded into the Node 20 lint/typecheck/test job; (3) the bundled impeccable skill under .claude/ is gitignored, so the job must run the published detector via npx impeccable at a pinned version (bundled 4.1.1, npm resolves 4.1.0) or vendor a copy; (4) .impeccable/config.json is committed as of 12-06, so the job sees the recorded exceptions; (5) http(s) targets load no design system, so design-system-* rules never fire in this gate; (6) the job fails on exit code 2 (one or more non-advisory findings survive config filtering) and passes on exit code 0; em-dash-overuse is the only rule carrying advisory: true in the registry; (7) mirror scripts/design-system/local-detector-run.mjs's page list (the seven pages), viewports (1440x900, 390x844) and output shape, and record the baseline count and the target of zero in the CI workflow or DESIGN.md. | open |  | 2026-09-23T18:21:35.128Z |  |
| 54 | 12 | deviation | app/(app)/design-system/_client.tsx |  | 12-01 gate item 2.10, default branch taken: the hand-typed numeric pixel labels outside UI-SPEC's seven items were left in place (12-04-SUMMARY.md), legitimate today per the gate's own acceptance, not fixed here. Full list (post-12-04 line numbers): 530 Label Text Extra Small (12px, not uppercase); 534 Label Text Small (12px, not uppercase); 559-565 Spacing Scale array (4px, 8px, 12px, 16px, 24px, 32px, 48px); 591 Spacing Page Layout caption (32px); 602 Spacing Card Padding caption (24px); 713-716 Icon size labels (16px, 20px default, 24px, 32px); 741-744 Border Radius labels (sm 4px, md 8px, lg 12px, xl 16px); 1553-1555 Inline Spinner sizes (sm 14px, default 16px, lg 20px); 1573,1577,1581 Loading Spinner branded sizes (sm 24px, default 48px, lg 64px); 1783,1788,1792,1796 Tooltip Sizing descriptions (11-12px, 14px, 12-14px, 14px); 2023,2032 Concentric Radius comparison labels (outer 16px padding 8px inner 8px / outer 16px padding 8px inner 16px); 2045-2047 Concentric Radius guidance lines (16px/8px/8px inner, 16px/12px/4px inner, 16px/24px+). Expanding beyond the agreed UI contract inside a 2051-line file, without those edits going through the contract, is scope this phase did not sign up for; this entry names the drift risk for a future reviewer. | open |  | 2026-09-23T18:21:46.823Z |  |
| 55 | 12 | deviation | scripts/design-system/local-detector-run.mjs | 169 | 12-07 Task 2 found a pre-existing bug in local-detector-run.mjs's pageKeyFor helper (from 12-05, not touched by this plan per its own no-code-changes scope): it loops PAGES and returns the first url where raw.startsWith(url); since / is first and every other page URL starts with the localhost:3100/ base, EVERY finding across all seven pages is bucketed under / in the findings object and in gatingCounts.byPage, even though the underlying finding.file field (the true URL) is correct. Effect verified on both 12-DETECTOR-LOCAL-RAW.json (12-05) and 12-DETECTOR-LOCAL-FINAL.json (12-07): the four gating-rule findings are actually on /pricing (2 low-contrast findings per viewport), /research/wow-classic-loot-systems-2026 (1 low-contrast per viewport) and /changelog (35 nested-cards per viewport), not on / as both summaries' byPage-derived prose stated. Totals (gatingCounts.total, perRuleCounts) are unaffected, only the byPage breakdown and the findings object's page grouping are wrong. Not fixed here: outside 12-07's declared files_modified and its own no-code-change constraint (12-01 gate, Standing Constraint 2 discharge). 12-07-EVIDENCE.md's attribution table uses the corrected per-URL breakdown (recomputed from finding.file directly), not the buggy grouping. Route to whoever next edits this script or builds ENF-04's CI job: fix pageKeyFor to check exact match or same-origin path-segment boundary, not a raw string-prefix test. | open |  | 2026-09-23T18:25:38.161Z |  |
| 56 | 12 | unrun-verify | .planning/workstreams/design-system/baselines/2026-09-23-post-phase-12/ |  | 12-07 Task 2: npm run test:users:create still had not been run (GET /api/dev/test-users returned 404, re-checked live this session against the running local dev server), so the after-capture falls back to public-pages-only (20 images), byte-identical to the before-capture (WINDOWS entry 39) on all 20 pairs -- confirming this phase changed no public page. Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again, same posture as WINDOWS entries 10, 15, 20, 22, 24 and 39. /design-system, this phase's only changed screen, has no working authenticated capture path either (baseline.mjs's PAGES matrix has no /design-system entry); its before and after states are routed to the end-of-phase UAT walkthrough rather than a screenshot pair, per the 12-01 gate's Section 4 default. | open |  | 2026-09-23T18:27:30.372Z |  |
| 57 | 12 | deviation | .planning/workstreams/design-system/phases/09-type-and-card-migration/09-EVIDENCE.md |  | 12-03's own finding, given its own entry at 12-07 close-out: 09-EVIDENCE.md's prose states Card's base radius (rounded-xl) is 12px. That figure was measured against Tailwind's own unmodified defaults, not this project's tailwind.config.js, where lg is 12px and xl is 16px -- the correct figure is 16px, confirmed live against the config and carried into DESIGN.md's guarded Shapes table by 12-03 (12-03-SUMMARY.md key-decisions). 09-EVIDENCE.md's own prose was never corrected and will be cited again with the wrong number if left unrecorded. Not fixed here: 09-EVIDENCE.md is a closed phase's evidence record, out of 12-07's files_modified; DESIGN.md already carries the correct value as the authority a future reader should cite instead. | open |  | 2026-09-23T18:34:15.080Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "quick-260901-hkj",
    "file": "app/api/cron/sync-discord-premium/route.ts",
    "line": null,
    "description": "Task 3 human-check not run: trigger the new cron once post-deploy with the CRON_SECRET bearer token and confirm the JSON tally / Server Members Intent log line, per PLAN.md",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-01T19:52:10.739Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "eslint.config.mjs",
    "line": null,
    "description": "npm run lint (full project) fails with pre-existing config error: rule react-hooks/purity references missing plugin react-hooks (unrelated to plan 03-01; scoped eslint on this plan's files passes clean)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T18:24:46.583Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "app/api/guild-count/route.ts",
    "line": null,
    "description": "npm run build (full project) cannot complete in this sandbox: pre-existing /api/guild-count route requires SUPABASE_SERVICE_ROLE_KEY at prerender time, not present here; verified instead via successful Turbopack compile and a grep of the emitted server chunk confirming the aggregates JSON binding for this plan's page resolved correctly before the unrelated route failed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T18:25:03.470Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "07",
    "file": "app/globals.css",
    "line": null,
    "description": "07-04 Task 3 <human-check> not run: visual density/card-readability review of the dark surface ramp against the committed pre-phase-07 baseline at 1440/390, both themes; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-16T19:05:30.576Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "07",
    "file": "app/(app)/raid-tracking/_client.tsx",
    "line": null,
    "description": "07-05 Task 3 <human-check> not run: visual review of the standby cell rail, legend swatch and member pill in dark mode (1440/390) and light mode against the committed pre-phase-07 baseline, confirming standby reads distinct from late yellow and accent orange and that benched is not mistakable for late; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-16T19:22:42.391Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "07",
    "file": ".planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/",
    "line": null,
    "description": "07-06 Task 1 <human-check> not fully resolvable: the post-phase-07 baseline is Home-only (no cards/borders/hover surfaces/standby chips in view), so the card-lift/border-ramp/standby visual judgments WINDOWS entries 4 and 5 wait on still need a card-dense authenticated screen; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-16T19:38:29.634Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "08",
    "file": "app/(app)/reserve/runs/[id]/_client.tsx",
    "line": null,
    "description": "08-07 PRIM-03 keyboard Tab walk not run: confirm a visible focus-visible ring on every focusable control (Input/Textarea/Select/Switch/Checkbox/Radio/Button/nav links) in both light and dark mode on one real form, per 08-VALIDATION.md's Manual-Only Verifications table; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-18T00:36:27.634Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "08",
    "file": "app/components/JoinGuildModal.tsx",
    "line": null,
    "description": "08-07 PRIM-04/D-05 click-through not run: open JoinGuildModal, OnboardingModal and UpgradeModal in the running app and confirm each has an accessible name, Escape closes it, and focus returns to the trigger in the real stacking context (e.g. DashboardContent.tsx's stacked first-run modals), per 08-VALIDATION.md's Manual-Only Verifications table; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-18T00:36:40.525Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "08",
    "file": ".planning/workstreams/design-system/baselines/2026-09-18-post-phase-08/",
    "line": null,
    "description": "08-07 Task 1 <human-check> not fully resolvable: the post-phase-08 baseline is Home-only (no Modal, Input/Textarea/Select, skeleton, or migrated label call site in view), so it confirms no regression on Home but cannot itself verify PRIM-02/03/04/05's real behavior, which lives on authenticated screens; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-18T00:36:54.261Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "unrun-verify",
    "phase": "09",
    "file": ".planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/",
    "line": null,
    "description": "09-02 Task 2 D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404), so the before-capture fell back to Home-only (4 images); overview, guild-settings and loot-management were skipped. End-of-phase UAT walkthrough of /overview, /guild-settings and /loot-management replaces the visual comparison for those three screens per D-17.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-19T19:17:31.395Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "deviation",
    "phase": "09",
    "file": "09-06-PLAN.md",
    "line": null,
    "description": "09-02 Task 3 checkpoint excluded the 6 SKIPPED cn(...) hand-rolled-card sites (dropdown-menu.tsx:58/:75, empty-state.tsx:77, error-state.tsx:67, radio-group.tsx:28, segmented-control.tsx:33) from the guard entirely, same treatment as the 29 borderless lines -- but these 6 lines currently match HAND_ROLLED_CARD_CEILING's live regex (unlike the structurally-excluded borderless lines), so 09-06-PLAN.md Task 2's acceptance criteria (zero-total dry-run, unwidened scanExclusions, plain toHaveLength(0) closure) need reconciling with this exclusion before that batch executes.",
    "status": "fixed",
    "reason": "09-05-PLAN.md Task 2 (the batch that actually touches the 5 affected files) now widens scanExclusions to the 6-entry set (card.tsx plus the 5 named files) in the same commit that migrates the batch's other 25 real sites, so the plan's original ceiling arithmetic (232 -> 201 -> 154 -> 79 -> 0) is unaffected. 09-06-PLAN.md Task 2's closing assertion now checks scanExclusions equals that finalized 6-entry set instead of asserting it was never widened. Threat model entries T-09-16/T-09-19 and the prohibitions in both plans updated to describe this as a disclosed, checkpoint-approved exception rather than a violation of the no-allowlist rule.",
    "recorded_at": "2026-09-19T20:02:29.132Z",
    "resolved_at": "2026-09-19T20:45:00.000Z"
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "09",
    "file": "app/(app)/characters/[id]/edit/_client.tsx",
    "line": 386,
    "description": "09-06 Task 2's hand-rolled-cards.mjs codemod renamed a real <form onSubmit={handleSubmit}> to <Card onSubmit={handleSubmit}>. Card renders a plain div, so the type=\"submit\" Save button on /characters/[id]/edit did nothing when clicked (no submit event to catch). Found by the 09-07 executor while building the cards-in-cards ancestry check; verified independently before fixing (git blame to commit c6a4f8e6, confirmed no other file has the same <Card ...onSubmit pattern repo-wide).",
    "status": "fixed",
    "reason": "Reverted the element to <form> with its original card-shaped surface classes restored (commit e002f947). Added 'form' to hand-rolled-cards.mjs's INTERACTIVE_INTRINSIC_TAGS denylist so a future codemod run cannot reintroduce this. Added the file to hand-rolled-card-pattern.json's scanExclusions (17 entries) since the restored <form> once again carries the classes PRIM-01's guard matches on. Full suite (67 files / 1198 tests), typecheck and lint all green after the fix.",
    "recorded_at": "2026-09-19T21:43:18.606Z",
    "resolved_at": "2026-09-19T21:50:00.000Z"
  },
  {
    "id": 13,
    "kind": "unrun-verify",
    "phase": "09",
    "file": ".planning/workstreams/design-system/baselines/2026-09-19-post-phase-09/",
    "line": null,
    "description": "09-08 Task 1 <human-check> not fully resolvable: the post-phase-09 baseline is Home-only (no Card, no migrated hand-rolled-card site, no nested variant, no display-alias heading, no radius change in view; symmetric with WINDOWS entry 10's before-capture, all 4 images byte-identical pre/post), so it confirms no regression on Home itself but cannot itself verify TYPE-03/PRIM-01's real behavior (the rounded-xl radius increase, the type sweep's heading line-height tightening, the 7 nested SettingsModal conversions), which lives on the three authenticated screens (/overview, /guild-settings, /loot-management); deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase, same limitation WINDOWS entry 10 already named",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-19T21:56:34.321Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "09",
    "file": "app/(app)/help/_client.tsx",
    "line": null,
    "description": "Code review WR-03: several <Card onClick> fake-button sites (help/_client.tsx, DashboardContent.tsx, reserve/_client.tsx, LootSubmissionsContent.tsx, CharacterCard.tsx) lack role=button/tabIndex/onKeyDown, unlike RaidModeView.tsx:106-111 in this same migration which does it correctly. Pre-existing gap (these were divs with onClick before this phase too); the mechanical Card migration neither introduced nor fixed it. Adding keyboard/ARIA semantics is behavior-adding work outside phase 09's mechanical-migration mandate.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-19T22:28:38.739Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "10",
    "file": ".planning/workstreams/design-system/baselines/2026-09-20-pre-phase-10/",
    "line": null,
    "description": "10-01 Task 1 D-16/D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404), so the before-capture fell back to Home-only (4 images); overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped. End-of-phase UAT walkthrough of the six authenticated screens replaces the visual comparison for those screens per D-17.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-20T08:09:42.160Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "unrun-verify",
    "phase": "10",
    "file": "app/components/OnboardingModal.tsx",
    "line": null,
    "description": "10-01 Task 1: OnboardingModal.tsx (two of the six COLOR-07 sites, gated on first-run user state) and ScoreComparisonModal.tsx (opens from a per-row action) remain unreachable by scripts/visual/baseline.mjs's fixed-route capture; no synthetic click hook was added. Routed to end-of-phase UAT.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-20T08:09:42.233Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "unrun-verify",
    "phase": "10",
    "file": "app/(app)/overview/components/DashboardContent.tsx",
    "line": 2088,
    "description": "10-04 Task 1 human-check (screenshot comparison of progress-bar track fill contrast in both themes against pre-phase-10 capture) not run by executor; needs end-of-phase UAT",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-20T09:19:52.217Z",
    "resolved_at": null
  },
  {
    "id": 18,
    "kind": "unrun-verify",
    "phase": "10",
    "file": "components/ui/horizontal-scroll.tsx",
    "line": 68,
    "description": "10-04 Task 2 human-check (hover fill visual check across the three call-site screens in both themes) not run by executor; needs end-of-phase UAT",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-20T09:19:52.510Z",
    "resolved_at": null
  },
  {
    "id": 19,
    "kind": "deviation",
    "phase": "10",
    "file": "app/globals.css",
    "line": null,
    "description": "10-06 Task 3's npm run build acceptance criterion could not be met: production build is broken repo-wide by a pre-existing, phase-unrelated bug -- TypeError: c.createContext is not a function during static page-data collection for /blog/* pages (nondeterministic which slug fails across the 9-worker parallel collection, a Turbopack SSR bundling issue). Confirmed present before any Phase 10 work: reproduced identically at commit 27b3df5e (last commit before Phase 10 started) and on the Task-2-only state (six conversions committed, token deletion stashed). Substituted proof used instead, accepted by user in place of npm run build for this task only: direct tailwindcss CLI compile against the full app/+components/ content glob, exit 0, zero background-inset references in generated CSS -- proving the deletion introduces no unresolved colour reference, which is what the acceptance criterion actually targets. The broken blog build is a separate, real, urgent issue needing its own investigation outside this phase's scope; it is NOT fixed or further investigated here.",
    "status": "fixed",
    "reason": "Root-caused and fixed by /gsd-debug session blog-build-createcontext (archived at .planning/workstreams/design-system/debug/resolved/blog-build-createcontext.md), fix commit 50a91c9e. Cause was an AND-gate, not a Turbopack bundling bug as originally suspected: components/ui/card.tsx called React.createContext (to share its variant with CardHeader/CardContent/CardFooter) without a 'use client' directive, and commit 5688967e (09-05) introduced the first real Server Component importers of Card (BlogRelatedPosts, rendered by all 10 blog posts, plus app/blog, app/research and app/customers). React 19.2.3 resolves the react-server export condition to react/react.react-server.js, which exports no createContext or useContext, so Turbopack compiled the real module into the RSC layer and module evaluation threw. The nondeterministic slug was only which of the 9 parallel page-data workers reported first; all 12 affected routes failed every build. Fix: added the directive to card.tsx (matching the existing modal.tsx precedent) and to app/components/ItemLink.tsx, which carried the identical latent defect. Added components/ui/__tests__/react-server-client-directive.test.ts, a derived-oracle guard that reads the installed react-server export surface at test time and fails any module under components/ui, app/components or app/contexts that uses a missing React API without the directive. Verified: clean rm -rf .next && npm run build exits 0 with all 10 blog posts plus /blog, /research and /customers prerendering (independently re-run by the orchestrator and confirmed by the user); 1219 tests green; lint 0 errors, 397 pre-existing warnings unchanged; removing the directive reproduces the failure. 10-06 Task 3's original npm run build acceptance criterion can now be run directly, so the substituted tailwindcss-CLI proof is no longer load-bearing.",
    "recorded_at": "2026-09-21T00:51:56.414Z",
    "resolved_at": "2026-09-21T18:03:35.538Z"
  },
  {
    "id": 20,
    "kind": "unrun-verify",
    "phase": "10",
    "file": ".planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/",
    "line": null,
    "description": "10-07 Task 1: npm run test:users:create still had not been run (GET /api/dev/test-users returned 404, re-checked live this session against a freshly restarted local dev server), so the after-capture falls back to Home-only (4 images), symmetric with the before-capture (WINDOWS.md entry 15). Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again. ROADMAP success criterion 5's screenshot half is NOT met by this plan for those six authenticated screens and is routed to end-of-phase UAT, same as entry 15.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T01:08:07.348Z",
    "resolved_at": null
  },
  {
    "id": 21,
    "kind": "unrun-verify",
    "phase": "10",
    "file": "app/(app)/overview/components/DashboardContent.tsx",
    "line": 2234,
    "description": "Code review WR-01 (10-REVIEW.md), independently confirmed real by 10-VERIFICATION.md's direct code read: Card variant=\"nested\" rendered inside a space-y-2/space-y-3/space-y-4 parent (.map() lists in DashboardContent.tsx's two widgets, ProfileContent.tsx's guild list, EditCharacterModal.tsx's guild-membership list) produces a gap-then-divider composition never exercised before this phase and never screenshotted. Accepted via override in 10-VERIFICATION.md rather than fixed inline; routed to end-of-phase UAT (10-UAT.md) to confirm whether it reads as an intentional divided list or a floating-line defect.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T01:50:47.162Z",
    "resolved_at": null
  },
  {
    "id": 22,
    "kind": "unrun-verify",
    "phase": "11",
    "file": ".planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/",
    "line": null,
    "description": "11-01 Task 1 D-16/D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404), so the before-capture fell back to public-pages-only (20 images: home plus the four new blog-post/research/compare/pricing entries); overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped. This phase's primary need -- the four public reading pages TYPE-04 touches -- captured successfully regardless. End-of-phase UAT walkthrough of the six authenticated screens replaces the visual comparison for those screens, same posture as WINDOWS.md entries 10, 15 and 20.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T21:23:40.530Z",
    "resolved_at": null
  },
  {
    "id": 23,
    "kind": "deviation",
    "phase": "11",
    "file": "app/(app)/design-system/_client.tsx",
    "line": 1801,
    "description": "SURF-02 (11-04-PLAN.md) deleted [data-score] from app/globals.css. The in-app design-system doc page at this line still reads: \"Applied globally to td, th, and [data-score].\" -- descriptive prose with zero functional [data-score] DOM usage, now stale. Not fixed here per this workstream established name-and-route convention (Pitfall 5, 11-RESEARCH.md); routed to Phase 12 ENF-03, whose own success criterion already covers \"shows no primitive that this milestone deleted\" for this exact page.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T23:24:01.750Z",
    "resolved_at": null
  },
  {
    "id": 24,
    "kind": "unrun-verify",
    "phase": "11",
    "file": ".planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/",
    "line": null,
    "description": "11-05 Task 1: npm run test:users:create still had not been run (GET /api/dev/test-users returned 404, re-checked live this session against a freshly restarted local dev server), so the after-capture falls back to public-pages-only (20 images), symmetric with the before-capture (WINDOWS.md entry 22). Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again. ROADMAP success criterion 4's score-dense master-sheet half is NOT met by this plan and is routed to end-of-phase UAT, same as entry 22.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T23:44:04.019Z",
    "resolved_at": null
  },
  {
    "id": 25,
    "kind": "deviation",
    "phase": "11",
    "file": "app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx",
    "line": null,
    "description": "11-05 Task 1 fold comparison: at 1440px, both themes (layout is theme-invariant, confirmed by identical light/dark image dimensions), the prose-measure narrowing (already measured by 11-01 as an H1 1-to-2-line gain, +38.39px) compounds with an extra wrap on the intro paragraph (2 to 3 lines) to a total +65px shift by the byline. Net effect at the fold (900px): the H2 heading 'Where DKP Falls Apart', fully above the fold before, now straddles the fold line; its body paragraph ('The longer a guild runs DKP, the more its flaws start to show...'), previously half-visible (first line straddling), is now entirely below the fold. At 390px both themes the capture is byte-identical (zero height delta) -- nothing crosses on mobile. Not fixed here per D-09/Phase-09-D-05 route-do-not-fix convention; routed to the sprint workstream's conversion-cohort measurement owner.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T23:44:04.208Z",
    "resolved_at": null
  },
  {
    "id": 26,
    "kind": "deviation",
    "phase": "11",
    "file": "app/research/wow-classic-loot-systems-2026/page.tsx",
    "line": null,
    "description": "11-05 Task 1 fold comparison: at 1440px, both themes (theme-invariant layout), the prose-measure narrowing reflows the research page's intro copy enough that the '18.0 / median items per approved list' stat card -- a proof/evidence element -- moves from fully above the fold (900px) to straddling it: its caption line 'median items per approved list' and rounded bottom edge now sit below the fold. At 390px both themes the capture is byte-identical (zero height delta) -- nothing crosses on mobile. Not fixed here per D-09/Phase-09-D-05 route-do-not-fix convention; routed to the sprint workstream's conversion-cohort measurement owner.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T23:44:04.356Z",
    "resolved_at": null
  },
  {
    "id": 27,
    "kind": "deviation",
    "phase": "11",
    "file": "app/compare/page.tsx",
    "line": null,
    "description": "11-05 Task 1 fold comparison: at 1440px, both themes (theme-invariant layout), the 896px-to-70ch narrowing (the phase's largest single re-flow, +533px total document height) reflows the comparison table itself: before, the table header plus the 'Ranked loot lists', 'Automated scoring formula', 'Built-in attendance tracking' and 'Attendance feeds the loot score' rows are all fully above the 900px fold. After, 'Built-in attendance tracking' straddles the fold and 'Attendance feeds the loot score' -- a full row of the page's core proof content -- moves entirely below the fold, along with 'Score breakdown per item' and 'Bad luck protection' which were already below the fold before. At 390px both themes the capture is byte-identical (zero height delta) -- nothing crosses on mobile (the table's own horizontal overflow-x-auto scroll affordance at 390 is unchanged by this phase, per 11-02-SUMMARY.md's prior finding). Not fixed here per D-09/Phase-09-D-05 route-do-not-fix convention; routed to the sprint workstream's conversion-cohort measurement owner.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T23:44:04.490Z",
    "resolved_at": null
  },
  {
    "id": 28,
    "kind": "unrun-verify",
    "phase": "11",
    "file": "app/globals.css",
    "line": null,
    "description": "11-05 Task 1 SURF-01 visual confirmation: the ::selection accent wash (0.3 alpha, legible text over it) and the caret-color accent tint were both confirmed live in a real browser (Puppeteer against the running dev server) in both light and dark themes -- screenshots attached to this plan's execution. The universal themed scrollbar rule could NOT be visually confirmed the same way: two independent attempts to screenshot the compare page's overflow-x-auto table at 390px (where the table provably overflows, scrollWidth 670 vs clientWidth 340) rendered no visible scrollbar affordance in headless Puppeteer, despite 11-03's rendered-CSS compile already proving the rule is emitted and resolves against --border/--border-strong. This reads as a headless-screenshot limitation (custom scrollbar rendering is known to be inconsistent in headless Chromium), not a functional gap, but it was not fabricated as confirmed. Routed to end-of-phase UAT: open a real browser window and confirm the themed thin scrollbar on a horizontally-scrolling table and on the main content area, in both themes.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-21T23:44:04.614Z",
    "resolved_at": null
  },
  {
    "id": 29,
    "kind": "unrun-verify",
    "phase": "quick-260921-ut5",
    "file": "app/api/billing/checkout/route.ts",
    "line": null,
    "description": "Human-checks A/B/C (Stripe test-mode card-field omission, trial-pause-at-day-15, gift-path-stays-active) not run in this execution - requires live sk_test_ key, browser, Stripe test clock, and test Supabase project",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T05:20:10.058Z",
    "resolved_at": null
  },
  {
    "id": 30,
    "kind": "deviation",
    "phase": "quick-260921-ut5",
    "file": "app/components/UpgradeModal.tsx",
    "line": null,
    "description": "Trial copy in UpgradeModal.tsx, PremiumPricing.tsx and BillingSection.tsx implies Premium continues unless cancelled; after this change a cardless trial pauses on day 15 instead. Copy is still literally true but the implied default is inverted. Flagged for user sign-off, not edited (CLAUDE.md requires copy sign-off).",
    "status": "fixed",
    "reason": "Copy revised in fast task 260921-v1f (commit 43defb8d). All three strings now lead with \"no credit card required\" and state that Premium pauses at trial end. Wording approved by the user, satisfying the CLAUDE.md copy sign-off rule.",
    "recorded_at": "2026-09-22T05:20:16.656Z",
    "resolved_at": "2026-09-22T06:01:35.024Z"
  },
  {
    "id": 31,
    "kind": "unrun-verify",
    "phase": "quick-260921-vns",
    "file": "app/(app)/guild-settings/components/BillingSection.tsx",
    "line": null,
    "description": "Human-checks A-D for the paused Premium state not run: no live Stripe test-mode key, test clock, or running dev server in the execution environment. Check B is decisive and determines whether a server-side subscriptions.resume path is required: does the Stripe billing portal actually resume a subscription paused via trial_settings end_behavior missing_payment_method, or does it stay paused after a payment method is added. Check D is copy sign-off, blocking per CLAUDE.md. No guild can reach the paused state before approximately 2026-10-05, so there is runway.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T06:01:50.242Z",
    "resolved_at": null
  },
  {
    "id": 32,
    "kind": "deviation",
    "phase": "11",
    "file": "app/globals.css",
    "line": null,
    "description": "G-11-1 (11-06-PLAN.md) gave .tabular-nums its own font-family (Figtree, via --font-tabular). The td, th half of the same shared rule keeps only its font-variant-numeric declaration and gains no family -- text cells that carry no .tabular-nums class are unaffected, so a table cell without the class still renders numerals in Poppins with no tabular-nums texture change. Not fixed here: putting a second face on every table cell would change the face of text cells too, not just numerals. Confirmed as a decided non-fix at the Task 2 checkpoint (2026-09-21).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T06:04:04.558Z",
    "resolved_at": null
  },
  {
    "id": 33,
    "kind": "deviation",
    "phase": "11",
    "file": "app/research/wow-classic-loot-systems-2026/page.tsx",
    "line": 461,
    "description": "G-11-1 (11-06-PLAN.md): the public stat callout at this line ('18.0 / median items per approved list') renders a figure without the .tabular-nums class, so it is unaffected by the Figtree wiring. Measured and named at plan time, not given the class here, per D-09's route-do-not-fix convention: a static single figure does not jitter the way a column does, and D-09 excludes auditing for missing .tabular-nums coverage from this phase.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T06:04:04.629Z",
    "resolved_at": null
  },
  {
    "id": 34,
    "kind": "unrun-verify",
    "phase": "11",
    "file": "app/(app)/master-sheet",
    "line": null,
    "description": "G-11-1 (11-06-PLAN.md) Task 3 human-check not run: confirm the numeral columns on the authenticated score-dense surfaces (master-sheet BossSection score/score-breakdown columns, attendance percentage column, overview dashboard figures, the score-comparison modal) hold alignment as values change, read as the same apparent size/weight as Poppins in the same row, and sit on the same baseline in table cells, in both light and dark. Could not be verified in this environment: GET /api/dev/test-users returns 404 (loadtest/test-users.json absent) and npm run test:users:create writes real users into a hosted Supabase project, so it must not be run. Routed to end-of-phase UAT, same posture as WINDOWS.md entries 10, 15, 20, 22 and 24.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T06:04:04.697Z",
    "resolved_at": null
  },
  {
    "id": 35,
    "kind": "deviation",
    "phase": "11",
    "file": "app/reserve/join/[token]/opengraph-image.tsx",
    "line": 14,
    "description": "11-06-PLAN.md Task 3's acceptance criterion 'grep -rn fonts.googleapis.com|fonts.gstatic.com app components next.config.ts | wc -l is 0' fails against the live tree: this pre-existing, unrelated OG-image route (predates this plan, git log confirms) fetches two Poppins TTF files directly from fonts.gstatic.com at request time for next/og ImageResponse rendering -- a server-side Satori render, not a browser document load, so it is not governed by next.config.ts's font-src CSP directive the criterion protects. Scoped re-verification confirms zero external-font-host references in the files this plan actually touched (app/layout.tsx, app/globals.css). Not fixed here: out of scope for G-11-1, not in this plan's files_modified, and changing an unrelated route's font-loading strategy is a separate concern.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T06:04:04.767Z",
    "resolved_at": null
  },
  {
    "id": 36,
    "kind": "unrun-verify",
    "phase": "quick-260921-w4u",
    "file": "app/api/webhooks/stripe/route.ts",
    "line": null,
    "description": "Human-checks A-D and the operator action (enable payment_method.attached on we_1U8UUlFV7dhwtnIjYXou6I5i) were NOT RUN - no Stripe Dashboard/browser access in this autonomous execution",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T06:24:14.961Z",
    "resolved_at": null
  },
  {
    "id": 37,
    "kind": "unrun-verify",
    "phase": "quick-260921-wiy",
    "file": "app/api/webhooks/stripe/route.ts",
    "line": null,
    "description": "Operator action NOT RUN: live webhook endpoint we_1U8UUlFV7dhwtnIjYXou6I5i not yet subscribed to customer.subscription.trial_will_end (or payment_method.attached); code is dead in production until a human adds both events in the Stripe Dashboard",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T09:03:55.518Z",
    "resolved_at": null
  },
  {
    "id": 38,
    "kind": "unrun-verify",
    "phase": "quick-260921-wiy",
    "file": "lib/billing/trial-ending.ts",
    "line": null,
    "description": "Human-checks B, C, D NOT RUN: real trial_will_end DM delivery, quiet no-linked-Discord degradation, and no-DM-when-card-on-file, all require live Stripe test clocks and a real Discord account not available to autonomous execution",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T09:03:59.837Z",
    "resolved_at": null
  },
  {
    "id": 39,
    "kind": "unrun-verify",
    "phase": "12",
    "file": ".planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/",
    "line": null,
    "description": "12-01 Task 1 D-16/D-17 fallback: npm run test:users:create had not been run (GET /api/dev/test-users returned 404, re-checked live this session against a freshly restarted local dev server), so the before-capture falls back to public-pages-only (20 images: home, blog-post, research, compare, pricing). Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again, same posture as WINDOWS.md entries 10, 15, 20, 22 and 24. This phase's only changed screen, /design-system, has no working authenticated capture path either (baseline.mjs's PAGES matrix has no /design-system entry and the same test-user blocker applies); its before and after states are routed to the end-of-phase UAT walkthrough rather than a screenshot pair.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T21:42:53.280Z",
    "resolved_at": null
  },
  {
    "id": 40,
    "kind": "deviation",
    "phase": "12",
    "file": ".claude/skills/impeccable/scripts/context.mjs",
    "line": null,
    "description": "context.mjs's EXISTING_VISUAL_SYSTEM directive prints unconditionally whenever PRODUCT.md is absent and the repo has an incumbent visual implementation (gated on ctx.hasProduct only, not ctx.hasDesign); it still appears alongside the new '# DESIGN.md' authority block after 12-02 Task 1, so 12-02-PLAN.md's acceptance sub-clause 'no EXISTING_VISUAL_SYSTEM directive' cannot be satisfied without creating PRODUCT.md or editing the shared impeccable skill script, both out of ENF-01's scope. The substantive claim (context.mjs now prints DESIGN.md as authority where it printed nothing before) is proven; only this one sub-clause is unmet.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T23:13:10.118Z",
    "resolved_at": null
  },
  {
    "id": 41,
    "kind": "deviation",
    "phase": "12",
    "file": "components/addon/AddonImportDialog.tsx",
    "line": 83,
    "description": "12-06 ENF-02 routing: 15 unsanctioned font-mono sites outside the 8 D-14 sites, for a legitimacy review per gate item 2.4's default branch (design-system-font never fires on a Tailwind font-mono class, only on font-family/fontFamily literals, so the hook cannot gate these). Full site list: app/(app)/admin/addon/_client.tsx:128, app/(app)/help/[slug]/_client.tsx:68, app/(app)/loot-list/components/LootListContent.tsx:2158, app/(app)/raid-tracking/components/ImportModal.tsx:104,137,173, app/(app)/raid-tracking/components/LootItemSelectionModal.tsx:47, app/(app)/reserve/runs/[id]/_client.tsx:821, app/(app)/sheet-import/_client.tsx:291,322, app/components/BisImportModal.tsx:285, app/components/WowSimsImportModal.tsx:170, app/dev-login/page.tsx:175, components/addon/AddonExportDialog.tsx:84, components/addon/AddonImportDialog.tsx:83.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.087Z",
    "resolved_at": null
  },
  {
    "id": 42,
    "kind": "deviation",
    "phase": "12",
    "file": "app/(app)/loot-management/components/ItemRow.tsx",
    "line": null,
    "description": "12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-color findings in app-screen files (milestone C), 7 findings across 3 files, not suppressed. app/(app)/loot-management/components/ItemRow.tsx:110,113,116 (#ef4444, #eab308, #22c55e); app/(app)/loot-management/components/LootSettingsContent.tsx:1492,1493,1494 (same three values); app/(app)/loot-management/components/PriorityListTab.tsx:803 (#888888).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.185Z",
    "resolved_at": null
  },
  {
    "id": 43,
    "kind": "deviation",
    "phase": "12",
    "file": "app/reserve/join/[token]/opengraph-image.tsx",
    "line": null,
    "description": "12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-color findings in public-page and shared-component files (milestone B), 49 findings across 27 files, not suppressed. Counts by file: app/api/guild-members/route.ts 1, app/components/BattlenetCharacterPickerModal.tsx 1, 10 blog post pages (app/blog/*) 1 each (dkp-is-dead-what-classic-guilds-use-in-2026, guild-recruitment-guide-find-raiders-who-stay, how-to-handle-loot-drama-without-losing-raiders, how-to-onboard-new-raiders-without-killing-morale, how-to-run-loot-without-a-spreadsheet, how-to-set-up-a-fair-loot-system-for-your-wow-guild, loot-priority-lists-vs-loot-council, blog/page.tsx, the-officer-burnout-problem-and-how-to-fix-it, why-attendance-tracking-matters-more-than-loot-rules), app/compare/page.tsx 1, app/customers/[slug]/page.tsx 1, app/research/wow-classic-loot-systems-2026/page.tsx 1, app/components/CreateGuildModal.tsx 8, app/components/KonamiEasterEgg.tsx 4, app/globals.css 1 (#ff8000, distinct from the sanctioned #9940ec entry), app/reserve/join/[token]/opengraph-image.tsx 7, app/components/Navigation.tsx 1, app/components/Sidebar.tsx 2, app/components/UpgradeModal.tsx 1, app/components/landing/ClickEffects.tsx 6, app/components/landing/LandingHowItWorks.tsx 1 (#17151B), app/components/landing/LandingValueProps.tsx 1, app/components/landing/PremiumFeatures.tsx 1, app/pricing/page.tsx 1.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.296Z",
    "resolved_at": null
  },
  {
    "id": 44,
    "kind": "deviation",
    "phase": "12",
    "file": "app/globals.css",
    "line": 339,
    "description": "12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-radius findings, 3 across 2 files, not suppressed, routed to milestone B. app/globals.css:339 *::-webkit-scrollbar-thumb border-radius: 3px (pre-existing Phase 11 work, commit 37a5b0d3, one of gate item 2.6's three predicted radius findings, named per 12-05's WINDOWS routing item 4). app/reserve/join/[token]/opengraph-image.tsx:117,184 border-radius: 24px (x2, static OG-image renderer, not a UI type-scale surface).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.451Z",
    "resolved_at": null
  },
  {
    "id": 45,
    "kind": "deviation",
    "phase": "12",
    "file": "app/reserve/join/[token]/opengraph-image.tsx",
    "line": null,
    "description": "12-06 ENF-02 routing, source-side DESIGN.md census (12-DETECTOR-SOURCE-DS.json): design-system-font-size findings, 3 at app/reserve/join/[token]/opengraph-image.tsx:107,164,167 (22px), not suppressed, routed to milestone B. Gate item 2.6 was CHANGED from its stated default (DESIGN.md's typography frontmatter carries the full 19-step typography.scale map, not display-plus-body-only), so these are not the anticipated 'six false findings on legitimate type-scale steps' the default branch would have produced; measured is 3, not 6, and they are real off-scale literals in a static next/og image renderer, unrelated to the app's UI type scale.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.567Z",
    "resolved_at": null
  },
  {
    "id": 46,
    "kind": "deviation",
    "phase": "12",
    "file": "app/pricing/page.tsx",
    "line": null,
    "description": "12-06 ENF-02 routing per gate item 2.11: text-[#bababa] (60 live uses across 16 files, close to the 2026-09-15 UI audit's measured 59) and the audit's other off-token marketing literal text-[#080808]/bg-[#080808] (19 uses across 18 files, matching the audit exactly), routed to milestone B. The design-system-color source checker never flags a Tailwind arbitrary-value class (it reads a bracketed hex as a CSS attribute selector, not a color literal), so neither is visible to ENF-02's hook and no suppression entry applies. #bababa files: app/(landing)/landing/page.tsx, app/about/page.tsx, app/changelog/page.tsx, app/premium/page.tsx, app/pricing/page.tsx, app/privacy/page.tsx, app/terms/page.tsx, app/components/PremiumItemTooltip.tsx, app/components/landing/{LandingCompare,LandingCTA,LandingFeatures,LandingFooter,LandingHero,LandingHowItWorks,LandingLootDecision,LandingNav,LandingValueProps,ParallaxItem,PremiumFeatures,PremiumHero,PremiumPricing}.tsx. #080808 files: the same landing/marketing set plus app/(landing)/landing/page.tsx, app/about, app/changelog, app/premium, app/pricing, app/privacy, app/terms pages.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.712Z",
    "resolved_at": null
  },
  {
    "id": 47,
    "kind": "deviation",
    "phase": "12",
    "file": "app/(app)/loot-list/components/LootListContent.tsx",
    "line": 599,
    "description": "12-06 ENF-02 routing (Decision B, 12-05's classification gate): the side-tab entry on app/(app)/loot-list/components/LootListContent.tsx was REMOVED (not re-added) because the 2026-09-15 UI audit lists this exact line under its P1 findings, not its legitimate exceptions, and the entry's stated reason (Phase 10 COLOR-04 scope) was wrong. The live rank/quality-tier border-colour-coding rail at line 599 (plus its configs at 2022-2077) is unsuppressed as of this commit and routes to milestone C's bracket colour work.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.828Z",
    "resolved_at": null
  },
  {
    "id": 48,
    "kind": "deviation",
    "phase": "12",
    "file": "app/reserve/join/[token]/page.tsx",
    "line": 30,
    "description": "12-06 ENF-02 routing (Decision A, 12-05's classification gate): the 10 WOW_CLASSES literal hex values at app/reserve/join/[token]/page.tsx:30-40 already exist byte-identical as class-* Tailwind theme keys (class-warrior, class-paladin, class-hunter, class-rogue, class-deathknight, class-shaman, class-mage, class-warlock, class-monk, class-druid, confirmed in tailwind.config.js). Migrate the WOW_CLASSES array onto those existing tokens, then delete the 10 provisional design-system-color ignoreValues entries this commit adds to .impeccable/config.json (each entry's own reason names this same migration). Not done this phase per gate Section 6 (guards widen and route, fixes are separate work).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:07:12.921Z",
    "resolved_at": null
  },
  {
    "id": 49,
    "kind": "deviation",
    "phase": "12",
    "file": "app/reserve/join/[token]/page.tsx",
    "line": 866,
    "description": "D-08, 12-06 Task 3: purple-to-pink avatar-fallback gradient (bg-gradient-to-br from-purple-500 to-pink-500, no Discord avatar case) on a public route, outside COLOR-07's original app/(app)+app/components scan scope until this plan's widening to all of app/. The pre-rewrite .impeccable/config.json ai-color-palette entry that was separately, and incorrectly, suppressing this exact literal at the hook level was removed at 12-05's classification gate (Decision on the approved-removals list). The purple-gradient-guard.test.ts ratchet now pins this file at ceiling 1 and will fail if the count rises or falls without the ceiling being lowered in the same commit. Not migrated this phase (gate Section 6). Routed to milestone C's app-screen colour work.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:17:05.089Z",
    "resolved_at": null
  },
  {
    "id": 50,
    "kind": "deviation",
    "phase": "12",
    "file": "app/components/OnboardingModal.tsx",
    "line": 299,
    "description": "D-08, 12-06 Task 3: yellow gradient stop (via-yellow-500/50 in the animated gradient border) covered by no app-wide colour rule until this plan added the yellow pattern to purple-gradient-guard.test.ts. The widened guard pins this file at ceiling 1 and will fail if the count rises or falls without the ceiling being lowered in the same commit. Not migrated this phase (gate Section 6). Routed to milestone C's app-screen colour work.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:17:05.174Z",
    "resolved_at": null
  },
  {
    "id": 51,
    "kind": "deviation",
    "phase": "12",
    "file": "app/(app)/loot-list/components/LootListContent.tsx",
    "line": null,
    "description": "D-08, 12-06 Task 3: the remaining 18 yellow ramp lines (in 6 files, not counting OnboardingModal.tsx:299 routed separately) covered by no app-wide colour rule until this plan's widened purple-gradient-guard.test.ts yellow assertion. Per-file ceilings now pinned: app/(app)/loot-list/components/LootListContent.tsx 11, app/(app)/loot-submissions/components/LootSubmissionsContent.tsx 2, app/(app)/master-sheet/components/MasterSheetContent.tsx 1, app/(app)/overview/components/DashboardContent.tsx 1, app/compare/page.tsx 1, app/components/ScoreComparisonModal.tsx 2. Each ceiling must be lowered in the same commit that fixes its site. Not migrated this phase (gate Section 6). Routed to milestone C's app-screen colour work (a bracket colour-coding convention shared with the LootListContent.tsx side-tab rail routed at WINDOWS entry 47).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T17:17:05.254Z",
    "resolved_at": null
  },
  {
    "id": 52,
    "kind": "unmet-truth",
    "phase": "12",
    "file": ".planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-FINAL.json",
    "line": null,
    "description": "ENF-05 is Blocked: gate is the deploy of local main (304 commits ahead) to remote main, which remains at 2e0587ee (dated 2026-09-13, confirmed unmoved via git ls-remote origin refs/heads/main this session); none of Phases 07-12 are live. Owner: sprint workstream. Unblock: run the rendered detector (scripts/design-system/local-detector-run.mjs's page list, viewports and output shape) against the seven deployed URLs and report zero undersized-ui-text, tiny-text, low-contrast and nested-cards findings that trace to tokens or primitives, attributing any remaining finding to page-level layout and carrying it to milestone B. The interim LOCAL figures live in 12-DETECTOR-LOCAL-FINAL.json (labelled local everywhere) and do not satisfy this requirement.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T18:21:27.288Z",
    "resolved_at": null
  },
  {
    "id": 53,
    "kind": "unmet-truth",
    "phase": "12",
    "file": ".github/workflows/ci.yml",
    "line": null,
    "description": "ENF-04 is Blocked: same gate (deploy of local main, 304 commits ahead, to remote main at 2e0587ee, dated 2026-09-13) and owner (sprint workstream). Unblock recipe: (1) before the deploy lands, capture the milestone-start baseline against production, which is still the pre-milestone site until then (no detector JSON baseline was ever committed, so no baseline count exists in the repo; after the deploy the only way back is serving commit 2e0587ee locally); (2) run the gate as a separate post-deploy job, not folded into the Node 20 lint/typecheck/test job; (3) the bundled impeccable skill under .claude/ is gitignored, so the job must run the published detector via npx impeccable at a pinned version (bundled 4.1.1, npm resolves 4.1.0) or vendor a copy; (4) .impeccable/config.json is committed as of 12-06, so the job sees the recorded exceptions; (5) http(s) targets load no design system, so design-system-* rules never fire in this gate; (6) the job fails on exit code 2 (one or more non-advisory findings survive config filtering) and passes on exit code 0; em-dash-overuse is the only rule carrying advisory: true in the registry; (7) mirror scripts/design-system/local-detector-run.mjs's page list (the seven pages), viewports (1440x900, 390x844) and output shape, and record the baseline count and the target of zero in the CI workflow or DESIGN.md.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T18:21:35.128Z",
    "resolved_at": null
  },
  {
    "id": 54,
    "kind": "deviation",
    "phase": "12",
    "file": "app/(app)/design-system/_client.tsx",
    "line": null,
    "description": "12-01 gate item 2.10, default branch taken: the hand-typed numeric pixel labels outside UI-SPEC's seven items were left in place (12-04-SUMMARY.md), legitimate today per the gate's own acceptance, not fixed here. Full list (post-12-04 line numbers): 530 Label Text Extra Small (12px, not uppercase); 534 Label Text Small (12px, not uppercase); 559-565 Spacing Scale array (4px, 8px, 12px, 16px, 24px, 32px, 48px); 591 Spacing Page Layout caption (32px); 602 Spacing Card Padding caption (24px); 713-716 Icon size labels (16px, 20px default, 24px, 32px); 741-744 Border Radius labels (sm 4px, md 8px, lg 12px, xl 16px); 1553-1555 Inline Spinner sizes (sm 14px, default 16px, lg 20px); 1573,1577,1581 Loading Spinner branded sizes (sm 24px, default 48px, lg 64px); 1783,1788,1792,1796 Tooltip Sizing descriptions (11-12px, 14px, 12-14px, 14px); 2023,2032 Concentric Radius comparison labels (outer 16px padding 8px inner 8px / outer 16px padding 8px inner 16px); 2045-2047 Concentric Radius guidance lines (16px/8px/8px inner, 16px/12px/4px inner, 16px/24px+). Expanding beyond the agreed UI contract inside a 2051-line file, without those edits going through the contract, is scope this phase did not sign up for; this entry names the drift risk for a future reviewer.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T18:21:46.823Z",
    "resolved_at": null
  },
  {
    "id": 55,
    "kind": "deviation",
    "phase": "12",
    "file": "scripts/design-system/local-detector-run.mjs",
    "line": 169,
    "description": "12-07 Task 2 found a pre-existing bug in local-detector-run.mjs's pageKeyFor helper (from 12-05, not touched by this plan per its own no-code-changes scope): it loops PAGES and returns the first url where raw.startsWith(url); since / is first and every other page URL starts with the localhost:3100/ base, EVERY finding across all seven pages is bucketed under / in the findings object and in gatingCounts.byPage, even though the underlying finding.file field (the true URL) is correct. Effect verified on both 12-DETECTOR-LOCAL-RAW.json (12-05) and 12-DETECTOR-LOCAL-FINAL.json (12-07): the four gating-rule findings are actually on /pricing (2 low-contrast findings per viewport), /research/wow-classic-loot-systems-2026 (1 low-contrast per viewport) and /changelog (35 nested-cards per viewport), not on / as both summaries' byPage-derived prose stated. Totals (gatingCounts.total, perRuleCounts) are unaffected, only the byPage breakdown and the findings object's page grouping are wrong. Not fixed here: outside 12-07's declared files_modified and its own no-code-change constraint (12-01 gate, Standing Constraint 2 discharge). 12-07-EVIDENCE.md's attribution table uses the corrected per-URL breakdown (recomputed from finding.file directly), not the buggy grouping. Route to whoever next edits this script or builds ENF-04's CI job: fix pageKeyFor to check exact match or same-origin path-segment boundary, not a raw string-prefix test.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T18:25:38.161Z",
    "resolved_at": null
  },
  {
    "id": 56,
    "kind": "unrun-verify",
    "phase": "12",
    "file": ".planning/workstreams/design-system/baselines/2026-09-23-post-phase-12/",
    "line": null,
    "description": "12-07 Task 2: npm run test:users:create still had not been run (GET /api/dev/test-users returned 404, re-checked live this session against the running local dev server), so the after-capture falls back to public-pages-only (20 images), byte-identical to the before-capture (WINDOWS entry 39) on all 20 pairs -- confirming this phase changed no public page. Overview, guild-settings, loot-management, master-sheet, raid-tracking and profile were all skipped again, same posture as WINDOWS entries 10, 15, 20, 22, 24 and 39. /design-system, this phase's only changed screen, has no working authenticated capture path either (baseline.mjs's PAGES matrix has no /design-system entry); its before and after states are routed to the end-of-phase UAT walkthrough rather than a screenshot pair, per the 12-01 gate's Section 4 default.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T18:27:30.372Z",
    "resolved_at": null
  },
  {
    "id": 57,
    "kind": "deviation",
    "phase": "12",
    "file": ".planning/workstreams/design-system/phases/09-type-and-card-migration/09-EVIDENCE.md",
    "line": null,
    "description": "12-03's own finding, given its own entry at 12-07 close-out: 09-EVIDENCE.md's prose states Card's base radius (rounded-xl) is 12px. That figure was measured against Tailwind's own unmodified defaults, not this project's tailwind.config.js, where lg is 12px and xl is 16px -- the correct figure is 16px, confirmed live against the config and carried into DESIGN.md's guarded Shapes table by 12-03 (12-03-SUMMARY.md key-decisions). 09-EVIDENCE.md's own prose was never corrected and will be cited again with the wrong number if left unrecorded. Not fixed here: 09-EVIDENCE.md is a closed phase's evidence record, out of 12-07's files_modified; DESIGN.md already carries the correct value as the authority a future reader should cite instead.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-23T18:34:15.080Z",
    "resolved_at": null
  }
]
````
