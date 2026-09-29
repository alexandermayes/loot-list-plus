# Roadmap: LootList+ v1.1 Design System Foundation

**Workstream:** design-system (parallel to the sprint workstream, which owns Phases 01 to 06)
**Milestone:** v1.1
**Source of truth for findings:** `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md`

## Hard Constraints (apply to every phase)

1. **No user-facing copy changes.** This milestone moves pixels, tokens and primitives only. Every visible string stays byte-identical. If a change appears to require new or reworded copy, stop, leave the string alone, and record it as milestone B scope (marketing surface) where copy sign-off happens. The audit's copy findings (rule-of-three lists, em dashes in JSX, throat-clearing openers) are explicitly out of scope here.
2. **Confirm before change.** Nothing in the codebase is edited without the user's explicit confirmation. Every phase plan carries a blocking checkpoint before its first code commit: the executor presents the concrete diff plan (files, token values, expected visual effect) and waits for the user's go-ahead. Batched sweeps present their batch boundaries at the same checkpoint. A phase that reaches its first edit without a recorded confirmation is a failed phase, not a fast one.

## Overview

The 2026-09-15 audit found one shape of problem repeated at every level: the defaults are wrong, so every screen inherits the wrong thing. The type scale starts at 10px, so 108 places render 9px and 10px functional text. Dark `--foreground-muted` is 3.35:1, so 143 direct uses are under-contrast. `--background-inset` exists as a "nested cards" token, so cards grow inside cards. `Card` is imported 10 times and its class string is hand-copied 166 times. Nothing in CI notices any of it.

That dictates the order. Tokens go first because both primitives and the migration sweeps resolve against them, and because changing a token after a 100-file sweep means sweeping twice. Primitives go second because the sweeps need one correct thing to migrate onto. The two mass migrations follow, split by concern so each has its own guard test, its own screenshot comparison and its own user confirmation: type and cards first (101 and 75 files), then colour literals, which depends on the nested `Card` variant landing first. Reading and browser surfaces come next because they are page-level and would otherwise collide with the sweeps in the same files. Enforcement is last by necessity: `DESIGN.md` must match the tokens that actually shipped, and the rendered detector can only prove zero findings after everything else is in.

Phases 09 and 10 touch many of the same files and must run in sequence, not in parallel, even though their requirements are independent.

## Phases

**Phase Numbering:**

- Phases 01 to 06 belong to the sprint workstream (`.planning/workstreams/default/`). This milestone starts at Phase 07.
- Integer phases (07, 08, 09): planned milestone work
- Decimal phases (09.1, 09.2): urgent insertions (marked with INSERTED)

- [x] **Phase 07: Token Foundation** - The type scale and colour tokens every screen inherits are correct and contrast-verified (completed 2026-09-16)
- [x] **Phase 08: Primitive Contracts** - Label, focus, Modal and skeleton primitives are correct on their own, so the sweeps have one right thing to migrate onto (completed 2026-09-18)
- [x] **Phase 09: Type and Card Migration** - The 1,043 arbitrary text sizes and the hand-rolled cards move onto the scale and the `Card` primitive, guarded by tests (completed 2026-09-19)
- [x] **Phase 10: Colour Literal Migration** - Faction, quality, brand and app-side purple literals resolve to tokens, and the inset surface level is deleted (completed 2026-09-20)
- [x] **Phase 11: Reading and Browser Surfaces** - Prose measure, selection, caret, scrollbars and tabular numerals obey the palette (completed 2026-09-22)
- [x] **Phase 12: Enforcement and Documentation** - DESIGN.md, sanctioned detector exceptions, the design-system page, and a CI gate that fails on regression (completed 2026-09-24)

## Phase Details

### Phase 07: Token Foundation

**Goal**: The scale steps and colour tokens that every primitive, sweep and page resolves against are correct, contrast-verified, and no functional text can be smaller than 11px
**Mode:** mvp
**Depends on**: Nothing (first phase of this milestone)
**Requirements**: TYPE-01, COLOR-01, COLOR-02, COLOR-06
**Success Criteria** (what must be TRUE):

  1. `tailwind.config.js` defines `xs` at 11px and adds a 15px step, and `grep -rE "text-\[(9|10)px\]" app components` returns zero matches (108 occurrences today: 95 at 10px, 13 at 9px)
  2. A committed contrast check reports dark `--foreground-muted` at 4.5:1 or better against `--background`, `--background-elevated` and `--background-subtle`, and accent text on white at 4.5:1 or better in light mode, either by moving `--accent` or by adding a dedicated accent-text token that the 305 `text-accent` uses can adopt
  3. Dark `--border` measures at least 1.2:1 against `--background-elevated`, and the `--background` to `--background-elevated` step measures at least 1.2:1, with the before and after values written down for DESIGN.md to pick up in Phase 12
  4. `components/ui/status-badge.tsx` and `components/ui/alert.tsx` contain no Tailwind palette colour class; they render from `--warning`, `--success`, `--error` and `--info`, and a new `--standby` token replaces the three duplicated orange-500 literals in raid tracking
  5. `npm run lint`, `npm run typecheck` and `npm run test` pass, and a fixed screenshot set (one public page, one app page, light and dark, 1440 and 390) is captured before and after so later phases have a comparison baseline

**Why the 9px and 10px purge sits here and not in the Phase 09 codemod**: raising those 108 call sites to 11px is a judgement change that visibly alters density on chip-heavy screens (the changelog alone has 241 10px chips), so it ships with the floor change it belongs to and gets its own visual review. The remaining 935 arbitrary sizes are a mechanical remap and belong to the sweep.
**Risk**: Highest leverage and highest blast radius per line changed. Every token edit repaints every screen at once, and contrast fixes to `--foreground-muted` (143 direct uses) and accent text (305 uses) are exactly the kind of change that looks fine in isolation and washed out in context. Mitigation: numeric contrast evidence before and after, the fixed screenshot set in both themes, and one token family per commit so a bad value is one revert.
**Plans**: 6/6 plans executed

Plans:
**Wave 1**

- [x] 07-01-PLAN.md: Gate: resolve the four open items, record the go-ahead, approve the puppeteer pin (no source edits)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md: Instrument: pin puppeteer, keep the download out of CI, build the baseline script, capture the before set

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-03-PLAN.md: Tracer: 11px floor end to end, pixel-named aliases, the 15px step, the 109-site sweep, the scale guard

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-04-PLAN.md: Muted contrast in both themes, the new `--accent-text` token and its `text-accent` wiring, the dark surface and border ramp

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 07-05-PLAN.md: The new `--standby` token, status-badge and alert off the Tailwind palette, the three raid-tracking literals migrated

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 07-06-PLAN.md: Close-out: the matching after baseline, the fixed-order contrast record, the five success criteria answered with evidence

**Cross-cutting constraints:**

- npm run lint, npm run typecheck and npm run test pass on each of this plan's three commits (ROADMAP hard constraint 3, D-12)

**UI hint**: yes

### Phase 08: Primitive Contracts

**Goal**: The shared primitives are correct, accessible and singular, so the migration sweeps have exactly one right thing to migrate onto
**Mode:** mvp
**Depends on**: Phase 07 (scale steps and tokens must exist before primitives express sizes and colours through them)
**Requirements**: TYPE-02, PRIM-02, PRIM-03, PRIM-04, PRIM-05
**Success Criteria** (what must be TRUE):

  1. `components/ui/label.tsx` and `components/ui/typography.tsx` contain no `text-[Npx]`; every size is a scale step
  2. Exactly one label convention survives: `LabelText` (typography.tsx:135-148) and `.section-label` (globals.css:570-573) are deleted, a grep for either returns nothing outside documentation, and each former use renders either the single form `Label` or the single non-uppercase section heading
  3. Every focusable primitive (Input, Textarea, Select, Switch, Checkbox, Radio, Button, nav links) shows a visible `focus-visible` ring drawn from `--ring` at 3:1 or better against its surface, and `input.tsx:23` no longer removes the outline in favour of a border colour change; a keyboard walk through one real form reaches every control with visible focus
  4. `Modal` has `role="dialog"`, `aria-modal="true"`, an accessible name from its title, a focus trap, focus return to the trigger on close, and Escape handling, each asserted by a vitest component test
  5. Skeletons match the layouts they stand in for (guild settings renders 8 cards rather than 2, the raid-tracking legend renders the real swatch count) so loading does not shift layout, and `skeletons.tsx:486` has no 4px side border

**Note**: deleting `LabelText` forces a minimal edit to `app/(app)/design-system/_client.tsx` so typecheck stays green. Keep that edit to the deletion only; the full documentation pass is ENF-03 in Phase 12.
**Risk**: The focus ring is visible on every interactive surface at once, and a focus trap added to `Modal` can break existing flows (nested modals, the stacked first-run modals at DashboardContent.tsx:531-535, the type-to-confirm dialogs). Mitigation: component tests for trap, return and Escape before the migration phases build on top; walk each modal entry point manually at the phase checkpoint. Skeleton counts drift when real layouts change later; accept that and record the coupling in DESIGN.md.
**Plans**: 7/7 plans executed

Plans:
**Wave 1**

- [x] 08-01-PLAN.md: Gate: re-measure the corrected 61-site label scope and the `--ring` contrast numbers, resolve seven open items, record the go-ahead (no source edits)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-02-PLAN.md: Modal accessibility end to end: `role`/`aria-modal`, `ModalTitle` id-wiring via Context, a hand-rolled focus trap, focus return, stacking-aware Escape (PRIM-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-03-PLAN.md: Focus-visible ring on `Input`, `Textarea` and `Select`, matching `Button`/`Switch`/`Checkbox`/`RadioGroup` (PRIM-03)
- [x] 08-04-PLAN.md: Skeleton fidelity: guild-settings card count, raid-tracking legend swatch count, bracket-header border removal (PRIM-05)
- [x] 08-05-PLAN.md: Migrate the 29 production `LabelText` call sites across 7 files to `Text` (PRIM-02)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 08-06-PLAN.md: Close out PRIM-02/TYPE-02: migrate the design-system docs page's 28 sites and `Sidebar.tsx`'s 4 hand-rolled sites per the recorded OI-4 branch, delete `LabelText`/`.section-label`, swap `label.tsx`'s pixel aliases, add the repo-wide closing guard tests

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 08-07-PLAN.md: Close-out: after-baseline capture, EVIDENCE.md answering all five ROADMAP success criteria, carried-forward findings list

**UI hint**: yes

### Phase 09: Type and Card Migration

**Goal**: Every screen sizes its text through the scale and draws its cards through the `Card` primitive, with tests that stop the next hand-rolled one
**Mode:** mvp
**Depends on**: Phase 07 (scale steps), Phase 08 (primitive contracts)
**Requirements**: TYPE-03, PRIM-01
**Success Criteria** (what must be TRUE):

  1. `grep -rE "text-\[[0-9]+px\]" app components` returns zero matches, down from 1,043 across 101 files, with a committed codemod script that shows how each pixel value mapped onto its nearest scale step
  2. A vitest test fails when a new `text-[Npx]` class or a new hand-rolled card string is introduced anywhere in `app/` or `components/`
  3. `components/ui/card.tsx` is the only card: the hand-rolled `bg-background-elevated border border-border rounded-*` containers are gone from `app/` (audit count 166 strings across 75 files, re-inventoried at plan time), replaced by `Card` or by its new `nested` variant, which uses padding and a divider instead of a second border
  4. `npm run lint`, `npm run typecheck` and `npm run test` pass on every commit in the phase, not only at the end
  5. Before and after screenshots at 1440 and 390 in both themes, across the fixed page set plus the three heaviest card screens (ExpansionManager, GuildSettingsContent, SettingsModal), show no unintended layout, spacing or density change

**Risk**: The largest-blast-radius phase in the milestone. Two mass migrations over roughly 150 distinct files, where a codemod that is 99% right is still wrong in a dozen places, and where a mechanical `Card` substitution silently changes padding and border-radius on screens nobody opens during review. Mitigation: land in reviewable batches by directory with CI green per commit, keep the codemod script in the repo so a batch can be re-run rather than hand-patched, add the guard tests before the final batch so the sweep cannot regress behind itself, and treat the screenshot comparison as a gate rather than a courtesy. The user checkpoint covers the batch plan, not just the first file.
**Plans**: 8/8 plans executed
**UI hint**: yes

Plans:

**Wave 1**

- [x] 09-01-PLAN.md: Display aliases plus both codemods and their committed data files (instruments only, no `app/` or `components/` edits)

**Wave 2** *(blocked on Wave 1)*

- [x] 09-02-PLAN.md: Both ratcheting guards at their live ceilings, the extended screenshot gate, the before-capture, and the blocking batch-plan gate

**Wave 3** *(blocked on Wave 2)*

- [x] 09-03-PLAN.md: Type sweep, tracer batch on `/overview` then both `app/(app)` route groups, plus the widened sub-11px floor scan

**Wave 4** *(blocked on Wave 3)*

- [x] 09-04-PLAN.md: Type sweep, `app/components`, landing and public pages, `components/`, ceiling to zero

**Wave 5** *(blocked on Wave 4)*

- [x] 09-05-PLAN.md: Card base radius plus the `nested` variant with a component test, then the `components/` and `app/components` card batches

**Wave 6** *(blocked on Wave 5)*

- [x] 09-06-PLAN.md: Card sweep across both `app/(app)` route groups, ceiling to zero

**Wave 7** *(blocked on Wave 6)*

- [x] 09-07-PLAN.md: JSX parent-chain enumeration of every card-in-card, its own blocking gate, then the confirmed conversions to `variant="nested"`

**Wave 8** *(blocked on Wave 7)*

- [x] 09-08-PLAN.md: After-capture, image-for-image comparison, and the 09-EVIDENCE.md record

### Phase 10: Colour Literal Migration

**Goal**: No colour in the authenticated app is spelled as a literal, and the surface ramp has one card level instead of two
**Mode:** mvp
**Depends on**: Phase 09 (the `nested` Card variant is what the 12 `--background-inset` uses migrate onto). Independent of Phase 09 in requirements, but sequenced after it because both rewrite the same files.
**Requirements**: COLOR-03, COLOR-04, COLOR-05, COLOR-07
**Success Criteria** (what must be TRUE):

  1. `--background-inset` is absent from `app/globals.css` (lines 136 and 213) and from `tailwind.config.js`, and its 12 uses render as a single card level using padding or a divider
  2. Faction surfaces use `--alliance` and `--horde` everywhere, up from zero uses today, including the hard-coded blue-500 and red-500 at `GuildSettingsContent.tsx:565,585` and the raw rgb glow at 600-611
  3. WoW item-quality colours and the three third-party brand colours are named tokens, and the 34 `#a335ee`, `#1eff00`, `#0074E0`, `#5865F2` and `#e35e15` occurrences in `app/` and `components/` reference them
  4. `grep -rE "(from-purple-|to-pink-|bg-violet-|text-purple-|via-purple-)" "app/(app)" app/components` with `landing/` excluded returns zero matches: the sidebar and layout avatar fallback, the onboarding modal gradients and animated borders, the score comparison tile hues and the master-sheet violet button now read as accent, class colour or neutral, while marketing purple on public pages is untouched by decision
  5. Lint, typecheck and test pass, and dark and light screenshots confirm faction, item-quality and brand colours read the same or better than before

**Risk**: Quality and class colours carry domain meaning a reviewer can misread as a bug, and tokenizing them wrong makes an Epic item look Rare. The avatar and onboarding gradients are decorative, so their replacements are judgement calls that need the user's eye, not a grep. Mitigation: token names mirror the domain vocabulary (quality tier, brand name), the item-quality and brand tokens keep their exact current hex values so the migration is provably a rename, and the purple replacements are presented as a visual proposal at the phase checkpoint before any edit.
**Plans**: 7/7 plans executed

Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Tracer: extend the screenshot gate, take the before-capture, and ship COLOR-04's faction tokens end-to-end with a guard

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — Blocking gate on the six-site purple visual proposal plus four newly-surfaced decisions, then COLOR-07's replacements and guard

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-03-PLAN.md — COLOR-05 part 1: the quality/brand constants module, five named Tailwind colour keys, the 15 arbitrary-value class sites, and the parity guard
- [x] 10-04-PLAN.md — COLOR-03 part 1: the six non-card inset uses move to the neutral fill

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 10-05-PLAN.md — COLOR-05 part 2: the 19 JS/TS data sites and the hex-literal absence guard
- [x] 10-06-PLAN.md — COLOR-03 part 2: one-way-door gate, the six nested-Card conversions, the token deletion, and the absence guard

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 10-07-PLAN.md — After-capture, visual comparison, and all five success criteria answered by re-run command output

**UI hint**: yes

### Phase 11: Reading and Browser Surfaces

**Goal**: Long-form reading and the browser's own chrome obey the palette instead of the user agent defaults
**Mode:** mvp
**Depends on**: Phase 07 (tokens), Phase 10 (sequenced after the sweeps so page-level edits do not collide in the same files)
**Requirements**: TYPE-04, SURF-01, SURF-02
**Success Criteria** (what must be TRUE):

  1. A single reusable prose container class exists, and long-form text on research, compare, blog and the pricing FAQ measures 65 to 75 characters at 1440, down from the audited 87 to 112ch, with no per-page max-width literals left on those pages
  2. `::selection`, `caret-color` and content-area scrollbars are themed from the palette in both light and dark, not only the sidebar scrollbar (globals.css:338-360)
  3. Scores, attendance percentages, ranks and prices render with tabular numerals through a class the app actually applies, and the dead `[data-score]` rule (globals.css:298-303) is removed or wired to real elements
  4. Screenshots in both themes of one public reading page and one score-dense app page show the intended measure and no numeric column jitter, and lint, typecheck and test pass

**Risk**: Lowest risk in the milestone, with one trap: narrowing the measure re-flows public marketing pages, and a re-flow that pushes a proof element below the fold is a conversion change disguised as a typography change. The sprint workstream is actively measuring those same pages against a cohort baseline. Mitigation: screenshot the full public page at 1440 and 390 before and after, and flag any change to above-the-fold content at the checkpoint rather than absorbing it.
**Plans**: 6/6 plans executed (11-06 closes UAT gap G-11-1)

Plans:

**Wave 1**

- [x] 11-01-PLAN.md: Instrument the screenshot gate for the four public reading pages, take the before-capture, hold the blocking gate, then wire `.prose-measure` end to end on one blog post

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-02-PLAN.md: Expand the measure to the remaining eleven call sites and stand up the TYPE-04 guard on the corrected eleven-file scope
- [x] 11-03-PLAN.md: Theme selection, caret and every content-area scrollbar from the palette, and stand up the SURF-01 presence guard

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 11-04-PLAN.md: Delete the dead `[data-score]` selector, guard the deletion and its surviving siblings, route the stale doc-page prose forward

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 11-05-PLAN.md: Close-out: the matching after-capture, the named above-the-fold comparison, the four success criteria answered with evidence

**Wave 5** *(gap closure, blocked on Wave 4 completion)*

- [x] 11-06-PLAN.md: Close UAT gap G-11-1 — build the rendered glyph-advance probe, observe it red, scope a screened tnum-capable face to the numerals class only, prove it green

**Cross-cutting constraints:**

- No user-facing copy change on any touched page; every visible string stays byte-identical (ROADMAP hard constraint 1)
- `npm run lint`, `npm run typecheck` and `npm run test` pass on every commit (ROADMAP hard constraint 3)
- No file under `app/` is edited before 11-01 Task 2's blocking gate is answered (standing constraint 2)

**UI hint**: yes

### Phase 12: Enforcement and Documentation

**Goal**: As a developer changing LootList+'s UI, I want the design system written down where my tools can read it and a detector that knows what is intentional, so that the next regression fails a guard at my commit instead of surfacing in an audit a year later
**Mode:** mvp
**Depends on**: Phases 07 to 11 (DESIGN.md must match the tokens that actually shipped, and zero-findings can only be proven after every fix is in)
**Requirements**: ENF-01, ENF-02, ENF-03, ENF-04, ENF-05
**Success Criteria** (what must be TRUE):

  1. `DESIGN.md` at the repo root follows the impeccable document format (frontmatter tokens plus the eight canonical sections per `.claude/skills/impeccable/reference/document.md`), its token values match `tailwind.config.js` and `globals.css` exactly, and impeccable `context.mjs` reports it as the design authority
  2. `.impeccable/config.json` records every sanctioned exception from the audit as a scoped `ignore-value` with a stated reason (raid-tracking legend rails, item-quality colours, third-party brand colours, animate-pulse on skeletons, monospace on type-to-confirm targets and invite codes), and the pre-edit hook no longer flags any of them
  3. `app/(app)/design-system/_client.tsx` documents the revised type scale, the colour and surface tokens, the Card variants, the single Label, the focus ring and Modal behaviour, and shows no primitive that this milestone deleted
  4. CI runs the rendered detector against the seven deployed public pages (home, pricing, compare, about, research, one blog post, changelog) and fails on any non-advisory finding outside the recorded exceptions, with the milestone-start baseline count and the target of zero written into the workflow or DESIGN.md (not met, blocked on deploy: see WINDOWS 53)
  5. The rendered detector run over those same seven URLs reports zero `undersized-ui-text`, `tiny-text`, `low-contrast` and `nested-cards` findings that trace to tokens or primitives, and any remaining finding is attributed in writing to page-level layout and carried into milestone B (not met, blocked on deploy: see WINDOWS 52)

**Risk**: The CI gate is the only piece of this milestone with an external dependency it does not control. The rendered detector needs Puppeteer, which is not a project dependency, so it cannot join the existing Node 20 lint/typecheck/test job without slowing every PR; it also needs the pages deployed, and `origin/main` is currently far behind local `main` with none of the sprint work live. Mitigation: plan the gate as a separate post-deploy job against deployed URLs rather than a pre-merge blocker, decide Puppeteer's home (devDependency versus job-scoped install) at the phase checkpoint, and if the deploy has not happened when this phase runs, record ENF-04 and ENF-05 as blocked with the reason rather than asserting a passing gate that never ran.
**Plans**: 7 plans
**UI hint**: yes

Plans:

**Wave 1**

- [x] 12-01-PLAN.md: Gate: pre-phase-12 capture, live re-measurement, and the phase gate settling every collision between a locked decision and a plan-time measurement (no code edits)

**Wave 2** *(blocked on Wave 1)*

- [x] 12-02-PLAN.md: Tracer: DESIGN.md frontmatter end to end (parity guard observed red, `context.mjs` authority, hook design-system enforcement), then typography, rounded and spacing (ENF-01)

**Wave 3** *(blocked on Wave 2)*

- [x] 12-03-PLAN.md: DESIGN.md body: all eight sections, both-theme colour table, 29-step type table, guarded contrast record and routed carry-forwards (ENF-01)
- [x] 12-04-PLAN.md: Design-system page: deleted-primitive guard, typed numbers removed, missing tokens, Card `nested`, focus ring and Modal documented (ENF-03)
- [x] 12-05-PLAN.md: ENF-02 measurement: two-pass hook harness, red arm with controls, local seven-page detector run, classification gate (ENF-02, ENF-05 local)

**Wave 4** *(blocked on Wave 3)*

- [x] 12-06-PLAN.md: Write and commit the approved exception list, green arm with per-entry discrimination, COLOR-07 widened with the yellow ratchet (ENF-02, D-08)

**Wave 5** *(blocked on Wave 4)*

- [x] 12-07-PLAN.md: Close-out: ENF-04/ENF-05 Blocked in three places with the unblock recipe, final local run, after-capture, 12-EVIDENCE.md (ENF-04, ENF-05)

## Progress

**Execution Order:**
Phases execute in numeric order: 07 to 08 to 09 to 10 to 11 to 12. No two phases run in parallel; 09, 10 and 11 rewrite overlapping files.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 07. Token Foundation | 6/6 | Complete    | 2026-09-16 |
| 08. Primitive Contracts | 7/7 | Complete    | 2026-09-18 |
| 09. Type and Card Migration | 8/8 | Complete    | 2026-09-19 |
| 10. Colour Literal Migration | 7/7 | Complete    | 2026-09-20 |
| 11. Reading and Browser Surfaces | 6/6 | Complete    | 2026-09-22 |
| 12. Enforcement and Documentation | 7/7 | Complete    | 2026-09-24 |

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| TYPE-01 | Phase 07 |
| COLOR-01 | Phase 07 |
| COLOR-02 | Phase 07 |
| COLOR-06 | Phase 07 |
| TYPE-02 | Phase 08 |
| PRIM-02 | Phase 08 |
| PRIM-03 | Phase 08 |
| PRIM-04 | Phase 08 |
| PRIM-05 | Phase 08 |
| TYPE-03 | Phase 09 |
| PRIM-01 | Phase 09 |
| COLOR-03 | Phase 10 |
| COLOR-04 | Phase 10 |
| COLOR-05 | Phase 10 |
| COLOR-07 | Phase 10 |
| TYPE-04 | Phase 11 |
| SURF-01 | Phase 11 |
| SURF-02 | Phase 11 |
| ENF-01 | Phase 12 |
| ENF-02 | Phase 12 |
| ENF-03 | Phase 12 |
| ENF-04 | Phase 12 |
| ENF-05 | Phase 12 |

23 of 23 v1.1 requirements mapped. No orphans, no duplicates.

## Cross-Phase Notes

- **Blocking checkpoint before every first edit**: constraint 2 above is a per-phase gate, not a milestone-level preference. Plans state it as an explicit step with a recorded user response.
- **No copy changes**: constraint 1 above. A sweep that rewrites a string is a defect even if the string reads better.
- **CI stays green per commit**: lint, typecheck and test on Node 20 (`.github/workflows/ci.yml`). Mass migrations land in batches, each batch a commit that passes on its own. A red intermediate commit is not acceptable "because the next commit fixes it".
- **Screenshot comparison is a phase gate**: capture a fixed page set (one public page, one app page, plus the phase's own heaviest screens) at 1440 and 390 in light and dark, before the first edit and after the last. Phases 07, 09 and 10 cannot be verified any other way, because their tests prove absence of literals, not correctness of appearance.
- **Authenticated routes cannot be rendered locally** without the two public Supabase env vars, which is why the rendered detector gate in Phase 12 covers public pages only. The authenticated rendered pass is milestone D.
- **Deploy dependency**: ENF-04 and ENF-05 need the public pages deployed. `origin/main` is behind local `main` per `.planning/PROJECT.md`; the sprint workstream owns that deploy.
- **UI hint on every phase**: every phase here changes rendered appearance. The design contract for this milestone is the audit plus the DESIGN.md produced in Phase 12, so a separate per-phase UI-SPEC is optional and should be skipped unless a phase's visual proposal needs its own artifact (Phase 10's purple replacements are the likeliest candidate).
- **Out of scope by decision**: marketing purple (#9940ec) on public pages; marketing surface work (milestone B); app screen work (milestone C); the authenticated rendered pass (milestone D).

---
*Roadmap created: 2026-09-15*
