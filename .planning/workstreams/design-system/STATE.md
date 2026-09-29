---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Design System Foundation
current_phase: 12
status: completed
stopped_at: Phase 12 complete — all phases complete
last_updated: "2026-09-24T20:57:03.261Z"
last_activity: 2026-09-24
last_activity_desc: Phase 12 complete
state_head: 4cfcef2f582adbcb957e56f7a1a0a3a19c5885e8
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 41
  completed_plans: 41
  percent: 100
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (shared, read-only for this workstream)
Milestone requirements: `.planning/workstreams/design-system/REQUIREMENTS.md`
Audit evidence: `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md`

**Core value:** Every screen inherits a correct, enforceable design system, so the token and primitive defaults the 2026-09-15 audit found cannot recur silently.
**Current focus:** Phase 12 — Enforcement and Documentation

## Current Position

Phase: 12
Plan: Not started
Status: All phases complete
Last activity: 2026-09-24 — Phase 12 complete

Progress: [█████████████████░░░] 5/6 phases (83%) · 34/34 planned plans complete

## Standing Constraints

1. **No user-facing copy changes** in this milestone. Tokens, primitives and classes only. Copy changes go to milestone B with separate sign-off.
2. **Confirm before change.** Nothing in the codebase is edited without the user's explicit confirmation. Every phase plan carries a blocking checkpoint before its first code commit.
3. **CI green per commit** (lint, typecheck, test on Node 20). Mass migrations land in batches; no red intermediate commits.
4. **Screenshot comparison** before the first edit and after the last edit of each phase, at 1440 and 390, light and dark.

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 07 P01 | 22 min | 2 tasks | 1 files |
| Phase 07 P02 | 22min | 3 tasks | 8 files |
| Phase 07 P03 | 35min | 2 tasks | 29 files |
| Phase 07 P04 | 55min | 3 tasks | 6 files |
| Phase 07 P05 | 26min | 3 tasks | 10 files |
| Phase 07 P06 | 14min | 2 tasks | 8 files |
| Phase 08 P01 | 8min | 3 tasks | 2 files |
| Phase 08 P02 | 25min | 3 tasks | 5 files |
| Phase 08 P03 | 12min | 2 tasks | 4 files |
| Phase 08 P04 | 13min | 2 tasks | 2 files |
| Phase 08 P05 | 13min | 3 tasks | 8 files |
| Phase 08 P06 | 44min | 3 tasks | 6 files |
| Phase 08 P07 | 55min | 3 tasks | 11 files |
| Phase 09 P01 | 55min | 3 tasks | 5 files |
| Phase 09 P02 | 47min | 3 tasks | 6 files |
| Phase 09 P03 | 42min | 3 tasks | 44 files |
| Phase 09 P04 | 18min | 3 tasks | 58 files |
| Phase 09 P05 | 48min | 3 tasks | 33 files |
| Phase 09 P06 | 55min | 2 tasks | 41 files |
| Phase 09 P07 | 25min | 3 tasks | 6 files |
| Phase 09 P08 | 22min | 2 tasks | 6 files |
| Phase 10 P01 | 20min | 3 tasks | 4 files |
| Phase 10 P02 | 35min | 3 tasks | 6 files |
| Phase 10 P04 | 15min | 2 tasks | 3 files |
| Phase 10 P03 | 40min | 3 tasks | 12 files |
| Phase 10 P05 | 30min | 3 tasks | 7 files |
| Phase 10 P06 | 25min | 4 tasks | 7 files |
| Phase 10 P07 | 50min | 2 tasks | 6 files |
| Phase 11 P01 | 45min | 3 tasks | 4 files |
| Phase 11-reading-and-browser-surfaces P02 | 30min | 3 tasks | 12 files |
| Phase 11-reading-and-browser-surfaces P03 | 24min | 3 tasks | 2 files |
| Phase 11 P04 | 35min | 2 tasks | 3 files |
| Phase 11 P05 | 23min | 2 tasks | 23 files |
| Phase 11 P06 | 24min | 3 tasks | 7 files |

## Accumulated Context

**Decisions (from the 2026-09-15 audit session):**

- Marketing purple (#9940ec) stays on public pages; app-side purple is removed.
- Scope approved now is Phase A (design-system foundation) only. Milestones B, C and D await later approval.
- This workstream runs in parallel with the sprint workstream's calendar-bound Phase 06 (Sep 20 to 24).

**Known blockers and dependencies:**

- ENF-04 and ENF-05 (Phase 12) need the public pages deployed; `origin/main` is at `2e0587ee` (2026-09-13), **264 commits** behind local `main`, with zero `prose-measure` and zero `font-tabular` in its `app/globals.css` — so no part of Phases 07-11 is live. The sprint workstream owns that deploy. Phase 12's 12-CONTEXT.md D-01 records both requirements as **blocked on deploy** rather than deferred by choice.
- The rendered detector needs Puppeteer. **Resolved since this was written:** Puppeteer 24.43.1 has been a pinned devDependency since Phase 07, so the Phase 12 checkpoint no longer has to decide its home.
- ~~Authenticated routes cannot be rendered locally without the two public Supabase env vars; the authenticated rendered pass is milestone D.~~ **CORRECTED 2026-09-22 (Phase 11 UAT).** This was mis-scoped for five phases. The local dev server targets the same *hosted* Supabase project, so an existing personal account reaches an authenticated local session directly — no `npm run test:users:create`, no service-role key, no credential crossing into the agent. What the `GET /api/dev/test-users` 404 blocked was test-user **provisioning**, not authentication. Six WINDOWS.md entries (10, 15, 20, 22, 24, 34) recorded the harder blocker. An authenticated capture is available to Phase 12 and does not need to wait for milestone D; `scripts/visual/baseline.mjs`'s PAGES matrix still has no authenticated entry, so adding one is the remaining work.

## Session Continuity

**Last session:** 2026-09-22T18:56:37.690Z

**Stopped At:** Phase 12 complete — all phases complete
**Resume File:** .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-UI-SPEC.md

## Decisions

- [Phase 07]: OI-1 resolved option-b: dark card at 228 12% 13%, dark muted text at 0 0% 53% (real margin on every floor, integer card lightness).
- [Phase 07]: OI-2 resolved option-a: light --accent-text at 30 100% 36%, exactly as D-06 named it (4.613 on white card); accent-on-cream and accent-on-sidebar remain under 4.5 by design, recorded as a known gap.
- [Phase 07]: OI-3 resolved accept-and-record: --destructive, --error and --horde drop from 4.910 to 4.360 against the lifted dark card; accepted rather than expanding scope to a token family the user did not approve.
- [Phase 07]: OI-6 resolved user-shell-export: user exports the two NEXT_PUBLIC_SUPABASE_* vars in their own shell for the authenticated capture; the agent never reads, writes or prints either value.
- [Phase 07]: GO-AHEAD recorded: approved 2026-09-16 by Alexander Mayes, covering the complete diff plan and the puppeteer 24.43.1 devDependency together, with no requested changes.
- [Phase 07]: Accepted the D-16 fallback for the Overview capture: npm run test:users:create needs SUPABASE_SERVICE_ROLE_KEY, a credential out of scope for OI-6, so the before baseline is Home-only (4 of 8 images) with the skip recorded in manifest.json.
- [Phase 07]: Resolved the 07-02 Task 3 auth-redirect-loop blocker: root cause was a disabled legacy Supabase anon key on the dev server, not the app or the baseline script; orchestrator supplied the project's current publishable key via a gitignored .env.local write, no value read/printed/committed.
- [Phase 07]: Raised Tailwind fontSize.xs from 10px to 11px, added a 15px step and ten pixel-named aliases; kept aliases as literal duplicate tuples of their semantic twin rather than references. — Matches the file's existing array-tuple authoring style and lets the guard test's deep-equal assertion prove the twin relationship structurally.
- [Phase 07]: Moved all 109 sub-11px text-[9px]/text-[10px] call sites across 26 files onto the text-11 alias uniformly, verified with a re-measured live grep before and after (84/13/25 to 0/0/0). — D-03 requires a mechanical, uniform raise with per-screen density tuning deferred to Phase 09; a class-only diff check proved no visible string moved.
- [Phase 07]: Phase 07 Plan 04: followed OI-1 option-b, OI-2 option-a, OI-3 accept-and-record exactly; corrected the plan's stated --muted hex comment (#262626) to the arithmetically accurate #292929 for 0 0% 16% grey.
- [Phase 07]: Phase 07 Plan 05: shipped the --standby value table exactly as planned (light 38 92% 42%, dark 38 92% 50%), followed OI-7's badge/alert mapping exactly, and widened the palette-literal guard from two files to five. — No deviations; every contrast and guard assertion proven non-vacuous by temporary revert.
- [Phase 07]: Phase 07 Plan 06: captured the post-phase-07 baseline (Home-only, matching before) without restarting the orchestrator-owned dev server, and extended report.ts additively with a second table for the four D-11 pairs the primary nine-row table did not cover, rather than typing them by hand.
- [Phase 07]: Phase 07 closed: TYPE-01, COLOR-01, COLOR-02 and COLOR-06 all shipped and evidenced in 07-EVIDENCE.md with a verbatim contrast report, all five ROADMAP success criteria answered, and seven carried-forward findings routed to Phase 09, Phase 10, Phase 12 and milestones B/C by number.
- [Phase 08]: GO-AHEAD recorded: approved 2026-09-17 by Alexander Mayes, covering the corrected 61-site label scope, the three input primitives' focus rings, the modal accessibility work, the three skeleton fixes, and the label.tsx alias swap, with defaults for every open item except the two with no safe default (OI-4, OI-5).
- [Phase 08]: OI-1 resolved as-planned: corrected 61-site label scope stays inside Phase 08 with the same batching (production sites in one commit/plan, docs page in another).
- [Phase 08]: OI-2 resolved corrected-string: the focus-ring class string carries all four `focus-visible:`-prefixed ring utilities, not D-06's three-prefix draft; Input/Textarea/Select keep their existing unconditional `focus:outline-none` (minimal-diff, no forced parity with Button).
- [Phase 08]: OI-3 resolved accept-and-record: dark mode clears 3:1 against all three ring surfaces; light mode clears it only against the card surface (3.093), falling short against the page (2.913) and modal surface (2.726); the --ring token fix is carried forward, not applied in Phase 08.
- [Phase 08]: OI-4 resolved option-b: Sidebar.tsx's four hand-rolled label sites are migrated AND recased (GUILD→Guild, GUILDS→Guilds, CHARACTER→Character, ADMIN SETTINGS→Admin settings), an explicit user-facing copy sign-off granted by Alexander Mayes for plan 08-06 Task 3.
- [Phase 08]: OI-5 resolved as-proposed: UpgradeModal's visually-hidden ModalTitle reads "Upgrade to LootList+ Pro"; OnboardingModal's converted heading picks up ModalTitle's text-balance styling as an accepted side effect.
- [Phase 08]: OI-6 resolved fixed-five: the raid-tracking legend skeleton always renders exactly 5 placeholder swatches, never speculating the conditional sixth signup indicator.
- [Phase 08]: OI-7 resolved as="span": all 55 former LabelText sites pass as="span" to Text; the two .section-label sites and four Sidebar sites keep the default p element.
- [Phase 08]: Phase 08 Plan 02: read 08-DECISIONS.md's OI-5 resolution before writing UpgradeModal's ModalTitle text ('Upgrade to LootList+ Pro') rather than assuming the plan's proposed default; fixed the focus-return test to use waitFor since Modal's unmount-tied focus restore happens TRANSITION_MS after open flips false, not synchronously.
- [Phase 08]: Phase 08 Plan 03: copied the OI-2-corrected four-utility focus-visible ring string onto Input/Textarea/Select, left focus:outline-none unchanged per D-07, and extended report.ts additively with PRIM03_RING_ROWS matching 08-DECISIONS.md's measured --ring contrast numbers exactly.
- [Phase 08]: Phase 08 Plan 04: read 08-DECISIONS.md's OI-6 resolution (5 legend swatches, always) at execution time rather than assuming the plan's default; the two matched, no deviation needed.
- [Phase 08]: Phase 08 Plan 05: migrated all 29 production LabelText sites across 7 files to Text size="sm" weight="semibold" color="secondary" as="span" (OI-7 default); typography.tsx LabelText export and globals.css .section-label rule left untouched for the docs-page/Sidebar migration in 08-06.
- [Phase 08]: Phase 08 Plan 06: resolved OI-4 branch (b) exactly per the GO-AHEAD before/after table (Sidebar.tsx GUILD->Guild, GUILDS->Guilds, CHARACTER->Character, ADMIN SETTINGS->Admin settings), swapped label.tsx's alias trio, deleted LabelText/.section-label now that all 61 sites were migrated, and added two permanent guard tests.
- [Phase 08]: Diagnosed npm run test's default-concurrency 10-failed-file result as vitest worker-pool resource exhaustion, not a regression: the 8 affected files touch nothing this plan changed, pass 77/77 in isolation, and the full suite passes 1188/1188 at --maxWorkers=2.
- [Phase 08]: Phase 08 closed: TYPE-02, PRIM-02, PRIM-03, PRIM-04 and PRIM-05 all shipped and evidenced in 08-EVIDENCE.md, with the light-mode --ring shortfall (routed to Phase 12's DESIGN.md), the deferred broader skeletons.tsx audit (unscheduled, per 08-CONTEXT.md's Deferred Ideas section), the post-phase-08 baseline's Home-only scope (routed to end-of-phase UAT), and the two Manual-Only Verifications from 08-VALIDATION.md -- the PRIM-03 keyboard Tab walk and the PRIM-04 click-through of JoinGuildModal/OnboardingModal/UpgradeModal (both routed to end-of-phase UAT before /gsd-ship) -- carried forward by name and destination. Sidebar.tsx's OI-4 outcome (branch b, migrated and recased fully inside the phase) required no carry-forward.
- [Phase 08]: Post-close-out code review (08-REVIEW.md) found a CRITICAL bug not caught by 08-02's original tests: `getTopmostModalId()`'s tie-break used strict `>`, so two Modals sharing the same DEFAULT zIndex (the common case) had the first-registered one win instead of the most-recently-mounted one, contradicting D-04. Fixed in commit 027129cd (`>=` tie-break) with a same-zIndex regression test verified to fail against the old code and pass against the fix; a stale docs-page caption (pre-migration 10px/uppercase claims) was also corrected.
- [Phase 08]: End-of-phase UAT (08-UAT.md) passed 2/2: the PRIM-03 keyboard Tab walk and the PRIM-04 modal click-through (including the stacked default-zIndex case CR-01 found broken) both confirmed working post-fix. A user side note ("can't delete a guild") was investigated and triaged as pre-existing/out-of-scope -- the delete-guild confirm dialog is a standalone Modal, never stacked, gated by an unrelated exact-text-match input untouched by Phase 08.
- [Phase 08]: Security review (08-SECURITY.md) closed all 11 register entries (0 open at or above the "high" block threshold) via the ASVS L1 short-circuit -- register was authored at plan time across all 7 plans, ASVS level 1, threats_open: 0. T-08-04's WCAG 2.1.2 keyboard-trap mitigation reflects the post-fix state.
- [Phase 09]: Phase 09 Plan 01: type sweep's combined 932-site figure is 851 sites/89 files under app/ plus 81 sites/11 files under components/, not a single app-only dry-run; named rather than forced to match the plan's acceptance-criteria wording.
- [Phase 09]: Phase 09 Plan 01: hand-rolled-cards.mjs treats bg-card as a bg-background-elevated synonym in both detection and stripping (Claude's Discretion, resolved as proposed), confirmed correct against LootListContent.tsx:509/:596.
- [Phase 09]: Phase 09 Plan 01: card codemod's live dry-run (225 rewrites/68 files, 6 SKIPPED cn(...) sites, 25 RADIUS DELTA, 29/18 EXCLUDED) is authoritative per the plan's must_haves backstop, superseding CONTEXT.md's 227-232 and RESEARCH.md's 24/19 radius re-measurements; full reconciliation recorded in 09-01-SUMMARY.md.
- [Phase 09]: Phase 09 Plan 02 Tasks 1-2: both ratchet guards live at their measured LINE-count ceilings (878 arbitrary-text-size lines, 232 hand-rolled-card lines), matching the plan's own ratchet-schedule table exactly; distinct from the codemods' REWRITE/occurrence counts (932/225).
- [Phase 09]: D-17 precondition checked read-only against the running dev server's /api/dev/test-users (404 = not seeded); before-capture fell back to Home-only (4 images), recorded as WINDOWS.md entry 10; the agent never touched SUPABASE_SERVICE_ROLE_KEY.
- [Phase 09]: Phase 09 Plan 02 reached Task 3, the phase's single blocking human gate (batch plan, pixel mapping table, every visibly-changing site, four named discrepancies including a newly-found D-04 heading-count delta of 34 live vs CONTEXT.md's ~51 estimate), and halted there per its autonomous:false frontmatter -- awaiting the user's answer before any app/ or components/ edit.
- [Phase 09]: Phase 09 Plan 02 Task 3's blocking checkpoint answered 'approve as presented' -- batch plan, full pixel mapping table, all four named discrepancies (radius-delta 13->25, display-alias 44->49, card scope 227/73->232/74, D-04 heading count ~51->34), and both discretion calls (bg-card synonym, batch order) accepted exactly as proposed; the Home-only screenshot-gate fallback (WINDOWS.md entry 10) confirmed; and the 6 skipped cn(...) hand-rolled-card sites newly excluded from the guard and sweep entirely, same treatment as the 29 borderless lines, not scheduled within Phase 09 and not routed to Phase 10 -- flagged (WINDOWS.md entry 11) as needing reconciliation with 09-06-PLAN.md's guard-closure acceptance criteria before that batch executes.
- [Phase 09]: Phase 09 Plan 03 Tasks 2-3: swept app/(app) group A (6 dirs, 233 matching lines, ceiling 840->607) and group B (11 dirs, 184 matching lines, ceiling 607->423); both batches' measured line totals matched the plan's plan-time table exactly; BossSection.tsx's two 8px sub-floor sites raised to text-11 (D-03) and type-scale-floor.test.ts's SUB_11_PATTERN widened to any value below 11 in the same commit; no file under app/(app)/ carries an arbitrary text-[Npx] class.
- [Phase 09]: Phase 09 Plan 04: swept app/components (excl. landing, 28 files/213 lines, ceiling 423->210), then landing+public pages (19 files/137 lines, ceiling 210->73, sacred hero confirmed pixel-identical via pre-apply identity assertion), then components/ (11 files/73 lines, ratchet closed to plain toHaveLength(0), fail-first proof performed); TYPE-03 fully shipped, repo-wide grep for arbitrary text-[Npx] returns zero matches.
- [Phase 09]: Phase 09 Plan 05 Task 1: Card's base radius moved rounded-lg->rounded-xl and CardVariant gained the nested member (border-t border-border only, padding passthrough, no sub-component branch), executed as TDD (RED then GREEN), proven by the first-ever components/ui/*.test.tsx for Card.
- [Phase 09]: Phase 09 Plan 05 Task 2: migrated components/ui/{skeletons,searchable-dropdown,info-tooltip}.tsx onto Card (25 sites); widened scanExclusions to the 09-02-approved 6-entry set; ceiling 232->201. Found and fixed a real hand-rolled-cards.mjs bug on its first real application: printer.printFile() on a mutated tree reformatted whole files and placed the new import before a leading 'use client' directive, breaking the Next.js client-boundary contract -- rewrote the mutation mechanism to exact-offset text splicing.
- [Phase 09]: Phase 09 Plan 05 Task 3: migrated app/components/ (18 files) and the 5 public-page dirs onto Card (42 sites); ceiling 201->159, not the plan's 154 estimate -- 4 sites (2 custom-component-tag <Button>/<Link>, 1 native interactive <button>) are permanently excepted after two more real codemod bugs were found and fixed (would have discarded component semantics / broken disabled: Tailwind variants that need the real :disabled pseudo-class). Delta named, not forced to match; carried forward for whoever plans the next card-sweep batch.
- [Phase 09]: [Phase 09]: Phase 09 Plan 06 Task 1: swept app/(app) group A (7 dirs, 75 live lines, ceiling 159->86, 73 migrated); LootListContent.tsx:509's template-literal ternary left byte-identical; SettingsModal.tsx's 7 strong-border containers migrated with the token preserved. This batch's own first sweep of previously-untouched files surfaced 2 new interactive-trigger exceptions (SettingsModal.tsx:409's Button, DashboardContent.tsx:1905's native button), same category 09-05 Task 3 established.
- [Phase 09]: [Phase 09]: Phase 09 Plan 06 Task 2: swept the remaining 12 route groups + AppLayout.client.tsx (84 live lines, 73 migrated) plus app/(app)/sheet-import/ (1 site, not in the plan's own file list but required to reach the stated repo-wide-zero criterion); GuildSettingsContent.tsx's strong-border containers preserved. scanExclusions widened from 6 to 16 entries (plan's 3 named files/4 sites plus 7 new files/8 sites this plan's own sweep discovered in the identical already-approved interactive-trigger category, each independently verified); HAND_ROLLED_CARD_CEILING deleted, guard closed to toHaveLength(0), proven by a live fail-first check. PRIM-01 fully shipped.
- [Phase 09]: Phase 09 Plan 07 Task 1: nested-card-ancestry.mjs (JSX parent-chain walk, setParentNodes true) enumerated the repo's real card-in-card sites -- 0 DIRECT, 9 INDIRECT (SettingsModal.tsx x8, DashboardContent.tsx x1, characters/[id]/edit/_client.tsx x1). ExpansionManager.tsx and GuildSettingsContent.tsx (CONTEXT.md's other two named screens) have zero hits: their audit-cited regions use dynamic inline styles or non-D-08 color tokens and were never migrated onto literal <Card>, so there is no second <Card> there to convert. Found and logged (not fixed, out of scope) DI-1: 09-06 Task 2 renamed a real <form onSubmit> to <Card onSubmit>, breaking the Save button on characters/[id]/edit -- see deferred-items.md.
- [Phase 09]: Checkpoint 09-07: convert SettingsModal's 7 nested-card sites to variant="nested" (accepting loss of border-border-strong emphasis token); leave DashboardContent.tsx:2365 unconverted, routed forward by name; suppress the nested variant's top divider on first-child via first:border-t-0 in the primitive.
- [Phase 09]: DI-1 fixed during 09-07 checkpoint prep: reverted a codemod-introduced <Card onSubmit> back to <form onSubmit> on characters/[id]/edit/_client.tsx, which had silently broken the Save button.
- [Phase 09]: Phase 09 Plan 08: re-checked the D-17 precondition read-only this session (GET /api/dev/test-users still returns 404); the after-capture falls back to Home-only, symmetric with the before-capture.
- [Phase 09]: Phase 09 Plan 08: all four after-capture image pairs confirmed byte-identical to the before-capture via md5, closing the unintended-and-unexplained bucket for Home; the three authenticated screens remain unverified by screenshot, recorded as WINDOWS.md entries 10 and 13, routed to end-of-phase UAT.
- [Phase 09]: Phase 09 closed: TYPE-03 and PRIM-01 both shipped and evidenced in 09-EVIDENCE.md, all five ROADMAP success criteria answered by command output, three measured discrepancies (13 vs 24/19/25 radius-delta, 44 vs 49 display-alias, 227/73 vs 232/74 card-sweep scope) recorded as deltas, and every unfixed finding carried forward to milestone C, Phase 10 (COLOR-03) or Phase 12 (ENF-01/ENF-03) by name.
- [Phase 10]: Phase 10 Plan 01: COLOR-04 guard built as two independent regexes (Tailwind blue/red palette class, numeric rgb()/rgba()) so a failure names which mechanism regressed; fail-first proof observed both failing at named file+line (566, 603) before restore.
- [Phase 10]: Phase 10 Plan 01: --alliance/--horde round-trip to #3c83f6/#ef4343 against blue-500/red-500's #3b82f6/#ef4444 -- one 8-bit step per channel, not byte-identical; stated as the measured delta.
- [Phase 10]: Gate approved as presented: all six purple sites migrated to accent per D-01-D-04, master-sheet button text moved to accent-foreground (gate-confirmed addition to D-04)
- [Phase 10]: COLOR-07 guard scans app/(app) and app/components as a directory walk with landing/ filtered by path prefix, matching any shade/variant-prefix across purple/violet/pink/fuchsia
- [Phase 10]: Followed 10-02's locked gate answer: uniform bg-muted for all six non-card inset sites, no per-site opacity tuning
- [Phase 10]: LootListSummaryView.tsx:206 kept as a chip (border+radius intact), not converted to a Card, per D-06's contextual override
- [Phase 10]: COLOR-05 class sites (10-03): wide/34-occurrence scope with LandingLootDecision.tsx:72 included; separate brand-discord key (not reusing existing discord); AccentColorContext.tsx comment reword flagged as out of this plan's declared scope, not actioned
- [Phase 10]: 10-05: Executed the WIDE/34-occurrence COLOR-05 scope locked at 10-02's gate, including all ten landing-subtree sites and the AccentColorContext.tsx:14 comment reword flagged unrouted by 10-03.
- [Phase 10]: 10-05: ACCENT_FILTERS' Epic key rewired to a computed property referencing QUALITY_COLORS.epic so the array value and lookup key can no longer drift apart.
- [Phase 10]: 10-05: COLOR-05's absence guard has no landing carve-out (unlike sibling COLOR-07's D-05 exclusion), since REQUIREMENTS.md's COLOR-05 wording covers app/ and components/ with no exception.
- [Phase 10]: [Phase 10]: Phase 10 Plan 06: converted the six card-shaped --background-inset sites to Card variant="nested" per 10-02's gate answer (hover:bg-muted replacing hover:border-accent/50 on the two clickable rows), deleted the token from both definition sites (ROADMAP success criterion 1), and stood up the COLOR-03 absence guard covering all three spellings with a four-part fail-first proof.
- [Phase 10]: [Phase 10]: WINDOWS.md entry 19 opened: npm run build is broken repo-wide by a pre-existing, phase-unrelated /blog/* static-page-data bug (TypeError: c.createContext is not a function), independently reproduced at commit 27b3df5e (before any Phase 10 work). Substitute proof accepted for 10-06 Task 3 only (tailwindcss CLI compile-and-grep); the broken build itself needs a separate, urgent investigation.
- [Phase 10]: [Phase 10]: Phase 10 Plan 07: took the post-phase-10 after-capture (Home-only fallback, WINDOWS.md entry 20), hashed all four before/after pairs -- two 1440 pairs differ, traced via pixel-diff to LandingHero.tsx's autoplaying hero-demo.mp4 video frame-timing nondeterminism, not a Phase 10 code change; all five ROADMAP success criteria answered by verbatim command output, with criterion 5's screenshot half explicitly stated as not met (routed to end-of-phase UAT) and its lint/typecheck/test third fully green (72 files/1213 tests, 0 lint errors, exit 0 typecheck); full 9-guard family green (40/40).
- [Phase 11]: Phase 11 gate Section 1: approved the .prose-measure narrowing (70ch) as presented for all twelve TYPE-04 call sites, no value adjustment or deferral. — User reviewed the pre-phase-11 before-capture and accepted the above-the-fold risk framing; the mechanism was proven end-to-end on one tracer page before applying to the rest.
- [Phase 11]: Phase 11 gate Section 2: delete the five redundant .sidebar-scrollable rules once 11-03 lands the universal scrollbar rule, keep the className as an inert marker. — No visual difference either way; deletion keeps one source of truth. Implemented by 11-03, not 11-01.
- [Phase 11]: Phase 11 gate Section 3: confirmed the ::selection alpha at 0.3 (hsl(var(--accent) / 0.3)) with no explicit foreground override. — UI-SPEC already locked this value; 0.3 sits one step brighter than --accent-subtle for a transient selection state. Implemented by 11-03, not 11-01.
- [Phase 11]: Phase 11 gate Section 5: use the plain master-sheet capture (no ItemCandidateModal click-through hook) for ROADMAP criterion 4's score-dense app page. — BossSection.tsx and RaidModeView.tsx render tabular-nums on page load with no interaction needed; simpler than adding a new afterGoto hook. Implemented by 11-05, not 11-01.
- [Phase 11]: Task 3's guard header comment avoids spelling out SCANNED_PATHS in prose before its declaration, since the plan's own verify regex is anchored on that identifier
- [Phase 11]: SURF-01: text selection (0.3 accent alpha), caret and universal scrollbar rules shipped in app/globals.css; five redundant .sidebar-scrollable rules deleted per 11-01 gate Section 2; SURF-01 presence guard stood up as repo's first presence-direction test.
- [Phase 11]: Phase 11 Plan 04: deleted the dead [data-score] attribute selector from app/globals.css's shared tabular-numerals rule (one-line diff), stood up the SURF-02 absence-plus-sibling-survival guard observed red in both failure modes, and recorded the stale design-system doc-page prose as WINDOWS.md entry 23 routed to Phase 12 ENF-03. — D-08 (locked): delete outright rather than wire to real elements, since a live grep confirmed zero functional [data-score] consumers under app/ or components/.
- [Phase 11]: [Phase 11]: Phase 11 Plan 05: captured the post-phase-11 after-baseline (20 images, matrix-matched, before-capture byte-unchanged), precisely named three above-the-fold crossings via fold-line-marked crop comparison -- blog-post's H2 'Where DKP Falls Apart' and its body paragraph, research's '18.0 median items per approved list' stat card, and compare's 'Built-in attendance tracking'/'Attendance feeds the loot score' table rows -- all routed to the sprint workstream's conversion-cohort measurement owner (WINDOWS.md entries 25-27), and closed the phase with 11-EVIDENCE.md answering all four ROADMAP success criteria (12-file/52-test full guard family green, lint/typecheck/test/build all green). The universal scrollbar rule's visual confirmation was inconclusive in headless Puppeteer capture and is honestly recorded as unconfirmed (entry 28) rather than asserted; master-sheet remained unreachable (test:users:create still not run, entry 24).
- [Phase 11]: Phase 11 Plan 06: shipped Figtree as the numeral face for .tabular-nums, chosen at the Task 2 checkpoint for texture coherence with Poppins (x-height ratio 0.912, cap-height ratio 1.005) over Inter's closer ratio match (0.996/1.044); the rendered glyph-advance probe (scripts/visual/numeral-probe.mjs) observed red before the fix (exit 1, weight-600 decimal jitter 10.125px) and green after (exit 0, jitter 0px on both public surfaces, rasterised family matching declared), closing gap G-11-1. — The plan's must_haves required a rendered measurement rather than a CSS-declaration or computed-style check, because that exact substitution -- reading the tabular-nums rule back as proof -- was what let G-11-1 ship in Phase 11's own original verification.
- [Phase 11]: Phase 11 closed 2026-09-22: UAT 4/4 passed. Test 4 (authenticated score-dense surfaces) discharged the workstream's single longest-standing gap by human attestation, closing the authenticated half of ROADMAP criteria 3 and 4 and WINDOWS.md entry 34. Test 1's original `issue` result (which found G-11-1) resolved as the pre-fix instance of the same checkpoint; its defect evidence is preserved in place as `original_result`/`original_evidence` rather than overwritten. — The closure's real value is the correction it forced: the `GET /api/dev/test-users` 404 that six WINDOWS entries treated as blocking authenticated verification only ever blocked test-user provisioning. Authentication was reachable the whole time via an existing personal account against the local dev server.
- [Phase 11]: Phase 11 security verified (11-SECURITY.md, 2026-09-22): 22 of 23 threats closed with first-hand evidence (guards re-run, diff line counts re-measured, probe JSON read directly, origin refusal exercised live), `threats_open: 0`. Four accepted risks logged (R-11-01..04). — R-11-04 accepts T-11-13 with its declared scope narrowed: the mitigation claimed a clean negative-grep for external font hosts over `app/`, `components/` and `next.config.ts`, which does not hold (2 pre-existing hits in `opengraph-image.tsx`). The threat is genuinely mitigated for the browser-loaded surface; only the control's stated breadth was wrong.

### Blockers

Nothing currently blocking. Reviewed at the Phase 11 → 12 transition (2026-09-22).

- [Phase 09] 4 hand-rolled card sites (`app/components/MultiSelectDropdown.tsx`, `Navigation.tsx` x1 each, `app/reserve/join/[token]/page.tsx` x2) are permanently excepted from the card sweep — custom-component-tag or native-interactive-element correctness exceptions found in 09-05. **Still open as a decision, not as a blocker:** whoever plans the next card-sweep batch must either accept them as a permanent named exception (like the 6 `cn(...)` sites) or schedule a manual wrap-in-Card conversion. Note the count in the original wording (159) is stale — `HAND_ROLLED_CARD_CEILING` was deleted in 09-06 Task 2 and the guard closed to `toHaveLength(0)` with these sites in `scanExclusions`.

**Cleared at this transition** (both were recorded as open but the Decisions log above shows them answered):

- ~~Phase 09 Plan 02 Task 3's blocking human gate~~ — answered "approve as presented"; 09-03 onward executed.
- ~~Phase 09 Plan 07 Task 2's blocking checkpoint on the 9 card-in-card sites~~ — answered at the 09-07 checkpoint (convert SettingsModal's 7 to `variant="nested"`, leave `DashboardContent.tsx:2365`, suppress the top divider on first child).

### Open Items Carried Forward

- ~~WINDOWS.md entry 11 (deviation): the 6 skipped `cn(...)` hand-rolled-card sites not yet structurally excluded from `HAND_ROLLED_CARD_CEILING`'s regex match.~~ **RESOLVED** — 09-06 Task 2 widened `scanExclusions` from 6 to 16 entries, deleted the ceiling and closed the guard to `toHaveLength(0)`, proven by a live fail-first check. Cleared at the Phase 11 → 12 transition.

**Phase 11 residue routed to Phase 12** (all named in `.planning/WINDOWS.md`):

- Entry 23 → ENF-03: stale prose at `app/(app)/design-system/_client.tsx:1801` still describes the deleted `[data-score]` selector as "applied globally".
- Entry 32: the `td, th` half of the shared tabular-numerals rule carries no `font-family`, so table numerals do not get the Figtree face — only hand-applied `.tabular-nums` sites do.
- Entry 33: `app/research/wow-classic-loot-systems-2026/page.tsx:461`'s stat callout carries no `.tabular-nums` class.
- Entry 35: `app/reserve/join/[token]/opengraph-image.tsx:14-15` fetches Poppins from `fonts.gstatic.com` at request time (server-side `next/og`, pre-existing, not a Phase 11 regression). Accepted as R-11-04 in `11-SECURITY.md` with the font-host control's scope narrowed; re-plumbing to self-hosted bytes is optional Phase 12 work.
- `11-SECURITY.md` F-11-01: 11-06's plan required the numeral probe's non-local-origin refusal to be exercised by hand and recorded; no record was ever written and the security auditor had to exercise it itself. Worth a process note — evidence obligations that live only in plan prose are the failure mode that let G-11-1 ship.
- Criterion 4's app-page screenshot artifact does not exist. The behaviour is attested by UAT Test 4, but no authenticated image is in `baselines/` and the capture matrix has no authenticated entry, so a future capture has nothing same-named to diff. Now unblocked (see the corrected authentication note above).
