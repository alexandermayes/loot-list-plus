# Phase 12: Enforcement and Documentation - Evidence Record

Closes the phase with evidence rather than assertion, following the shape 11-EVIDENCE.md set. Every
number below is the verbatim output of a named, committed (or freshly re-run, and named as such)
command; nothing here was typed from memory. Criteria 1 through 3 are answered with reproducible
command output. Criteria 4 and 5 are not met: both are Blocked on the deploy, recorded here and in
REQUIREMENTS.md, ROADMAP.md and WINDOWS.md. Criterion 5 additionally carries a LOCAL subsection,
measuring ENF-05's substance on a local dev server without ever claiming to satisfy the requirement.

## Criterion 1: DESIGN.md format, tokens match exactly, context.mjs reports it as authority

> "`DESIGN.md` at the repo root follows the impeccable document format (frontmatter tokens plus the
> eight canonical sections per `.claude/skills/impeccable/reference/document.md`), its token values
> match `tailwind.config.js` and `globals.css` exactly, and impeccable `context.mjs` reports it as
> the design authority"

**Format.** `DESIGN.md` carries block-style YAML frontmatter (`name`, `description`, 13 `colors`
keys, `typography.display`/`typography.body`/`typography.scale` at 19 numeric-only pixel steps,
`rounded` at all 11 `borderRadius` keys, `spacing` at all 4 spacing-extension keys) followed by all
eight canonical sections in order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes,
Components, Do's and Don'ts (12-02, 12-03).

```
$ grep -n "^## " DESIGN.md
## Overview
## Colors
## Typography
## Layout
## Elevation & Depth
## Shapes
## Components
## Do's and Don'ts
```

**Parity guard's test list, re-run this session:**

```
$ npx vitest run __tests__/design-tokens/design-md-parity.test.ts
 Test Files  1 passed (1)
      Tests  22 passed (22)
```

22 tests: 11 frontmatter-layer assertions (12-02 -- colours, typography.display/body/scale, rounded,
spacing, both directions where applicable, plus a family-coverage assertion and a fail-loud
missing-file test) and 11 body/structural assertions (12-03 -- the 45-row Colors table, the 29-row
Contrast record, the 29-row Typography table, the 11-row Shapes table, section-heading order,
token/class fabrication, the em-dash prohibition, and the `boxShadow`/`transitionDuration` tables).

**Six red observations, recorded before each guard layer was accepted green** (verbatim in
12-02-SUMMARY.md and 12-03-SUMMARY.md, restated here as a count and cause, not re-derived):

| # | Plan | Perturbation | Result |
|---|------|--------------|--------|
| 1 | 12-02 | `DESIGN.md`, one hex digit of `border` | `AssertionError: border: documented="#d7d2cd" computed="#d7d2cc"` |
| 2 | 12-02 | `app/globals.css`, `--border` lightness +1pp | `AssertionError: border: documented="#d7d2cc" computed="#d9d5ce"` |
| 3 | 12-02 | `tailwind.config.js`, `borderRadius.lg` 12px to 13px | `AssertionError: lg: documented="12px" source="13px"` |
| 4 | 12-03 | `app/globals.css`, `.dark --border` lightness 18% to 19% | `AssertionError: --border: Dark documented="#2e2e2e" computed="#303030"` (Colors table and Contrast record both caught it independently) |
| 5 | 12-03 | `tailwind.config.js`, `fontSize.15` 15px to 17px | `AssertionError: text-15: size documented="15px" source="17px"` (both the frontmatter and body-layer guards caught it independently) |
| 6 | 12-03 | `DESIGN.md`, `## Layout`/`## Shapes` headings swapped | Structural collection failure: `Error: parseTable: no table found with first header cell "Class"` -- every downstream section boundary broke, a stronger fail-loud signal than a single assertion diff |

Every perturbation was restored with `git checkout --` (or a saved copy for the whole-file swap)
before the corresponding commit; `git diff --stat` was empty in each case.

**`context.mjs` before and after (12-02, re-confirmed live this session):**

Before DESIGN.md existed, `grep -c '^# DESIGN.md'` on `context.mjs`'s output returned `0`. Live
re-run this session:

```
$ node .claude/skills/impeccable/scripts/context.mjs | grep -n "^# DESIGN.md"
17:# DESIGN.md
```

```
$ node .claude/skills/impeccable/scripts/context.mjs | sed -n '17,20p'
# DESIGN.md

---
name: "LootList+"
```

`context.mjs` reports DESIGN.md as the design authority where it printed nothing for that file
before. The `EXISTING_VISUAL_SYSTEM` directive still prints alongside it (gated on `PRODUCT.md`'s
absence, not `DESIGN.md`'s presence, per `context.mjs`'s own branch logic) -- an out-of-ENF-01-scope
finding recorded at **WINDOWS entry 40**, not re-litigated here.

**Corrected figure carried forward:** Card's base radius is `rounded-xl` at **16px**, not the 12px
`09-EVIDENCE.md`'s prose states (that document measured against Tailwind's own unmodified defaults,
not this project's `tailwind.config.js`, where `lg` is 12px and `xl` is 16px). DESIGN.md's guarded
Shapes table carries the correct figure; **WINDOWS entry 57** (below) names the source document's
stale prose so it is not cited again.

## Criterion 2: `.impeccable/config.json` records every sanctioned exception, hook stops flagging them

> "`.impeccable/config.json` records every sanctioned exception from the audit as a scoped
> `ignore-value` with a stated reason (raid-tracking legend rails, item-quality colours, third-party
> brand colours, animate-pulse on skeletons, monospace on type-to-confirm targets and invite codes),
> and the pre-edit hook no longer flags any of them"

**Clarification carried from gate item 2.5 (D-16):** the hook this repo wires
(`.claude/skills/impeccable/scripts/hook.mjs`, via `.claude/settings.local.json`) fires on
`PostToolUse`/`Stop` -- it is **post-edit and advisory**, not a blocking pre-edit gate. The
Cursor-only `hook-before-edit.mjs` is not wired here. "The pre-edit hook no longer flags any of
them" is read against the wired hook's actual two-tier post-edit behaviour, per the phase gate's
own resolution of this exact wording gap.

**The committed entry list -- first commit ever, `git ls-files .impeccable` was empty before 12-06:**

```
$ git log --oneline -- .impeccable/config.json | tail -1
df881abd feat(12-06): write and commit the ENF-02 exception list, route unsuppressed findings
```

13 entries, canonical order, re-confirmed present this session:

| # | Rule | Value | File | Status |
|---|------|-------|------|--------|
| 1 | `side-tab` | `*` | `app/(app)/raid-tracking/_client.tsx` | KEEP -- 2026-09-15 audit + 07-05-PLAN.md |
| 2-11 | `design-system-color` | 10 WOW_CLASSES hex values | `app/reserve/join/[token]/page.tsx` | provisional -- each already exists as a `class-*` Tailwind token; WINDOWS 48 routes the migration that retires all 10 |
| 12 | `design-system-color` | `#9940ec` | `app/globals.css` | KEEP -- 2026-09-15 audit, marketing purple |
| 13 | `side-tab` | `*` | `components/ui/__tests__/skeletons.test.tsx` | re-labelled -- false positive on a negative assertion |

3 pre-existing entries removed with D-07 provenance preserved verbatim in `12-CONFIG-BEFORE.json`:
`ai-color-palette`/`OnboardingModal.tsx` (Phase 10 already migrated the gradient it was guarding,
commit `5967189e`), `side-tab`/`LootListContent.tsx` (the audit lists this line as a P1 finding, not
a legitimate exception -- Decision B), `ai-color-palette`/`app/reserve/join/[token]/page.tsx` (was
actively suppressing a live, unmigrated literal -- Decision A).

**No-entry categories, recorded with the evidence that nothing fires** (D-13/D-15, checked against
the same green-arm transcript used below, not a separate run): item-quality/brand hex source module,
Tailwind config, and the three highest-usage call-site files (0/0 each); skeleton pulse (0/0,
`pulsing-dot` never fires on `animate-pulse`); monospace on all three D-14-sanctioned files (0/0
each, `design-system-font` reads a computed font-family, never a Tailwind class, so a value-scoped
entry would silently suppress all twenty `font-mono` sites, not just the eight sanctioned ones);
`ScoreComparisonModal` big numbers and numbered how-it-works steps (both D-13 audit extras,
consciously dropped, 0/0).

**Green-arm verify-mode run, re-confirmed this session (`12-HOOK-PROBES-GREEN.json`):**

```
$ shasum -a 256 .impeccable/config.json
6738edffd82c16f5ed83ae1faad162b3620a9115a521dc752ab3d3e7746deb77  .impeccable/config.json
```

Matches the transcript's recorded `startHash` and `endHash` exactly -- the config has not moved
since 12-06's commit. `mode: "verify"`, `controlFailures: []`, `verifyFailures: []`, all 19 probes
valid.

**Both controls still flag (proving the hook was live and discriminating during the run, not just
quiet):**

- **C1** (`app/reserve/join/[token]/page.tsx`, watch `ai-color-palette`) -- Stop-tier finding at
  line 866 fired.
- **C2** (`app/components/KonamiEasterEgg.tsx`, watch `design-system-color`) -- PostToolUse-tier
  fired 4 times (`#ff8000` x3, `#0070dd` x1).

**Per-entry discrimination** (proof shape `findings > 0 && freshFindings === 0`, never
`findings === 0` alone -- a suppressed entry with no underlying finding proves nothing):

- `side-tab`/raid-tracking rails: findings 5, freshFindings 0. Clean.
- `design-system-color`/10 WOW_CLASSES values: findings 11, freshFindings 0. Clean.
- `side-tab`/skeletons.test.tsx: findings 1, freshFindings 0. Clean.
- `design-system-color` `#9940ec`/globals.css: findings 3, freshFindings 2 -- does **not** hit the
  clean shape, because the same file also carries the unsanctioned `#ff8000` literal (WINDOWS 43)
  and a `design-system-radius` finding (WINDOWS 44), both of which also trigger and the coarse
  rule-only check cannot separate them from the now-filtered `#9940ec` finding. Proven correct by
  finer-grained evidence instead: rendered finding text drops from 3 issues to 2 once the entry is
  live, a delta of exactly one, matching the single value-scoped entry. Left as documented evidence
  in 12-06-SUMMARY.md, not forced clean by loosening the entry or editing the harness.

**Source-side DESIGN.md census** (`12-DETECTOR-SOURCE-DS.json`, `detect.mjs` over `app/`,
`components/`, `lib/` with DESIGN.md active, filtered to `design-system-*`): **73 findings in 31
files** (`design-system-color` 67, `design-system-radius` 3, `design-system-font-size` 3), close to
the plan-time synthetic estimate of ~79 in 31 files (file count matches exactly, the per-rule split
differs slightly -- both figures recorded, not forced to agree). All 73 are unsuppressed by design
(none is a sanctioned exception) and are routed by count across WINDOWS entries 41-46, split between
milestone B (public/shared files, 49 colour findings across 27 files plus the 3 radius and 3
font-size findings) and milestone C (app-screen files, 7 colour findings across 3 files). None
migrated this phase per gate Section 6.

**COLOR-07 widened to a two-sided ratchet, re-confirmed this session:**

```
$ npx vitest run __tests__/purple-gradient-guard.test.ts
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

`SCAN_ROOTS` widened from `['app/(app)', 'app/components']` to `['app']` (landing filtered by path);
a `YELLOW_CLASS_PATTERN` was added alongside the pre-existing purple pattern; both assertions moved
from `toHaveLength(0)` to `toEqual` against a pinned per-file ceiling map, observed red in both
directions (a count rising on an unceilinged file; a count falling without its ceiling being
lowered) before being accepted green -- verbatim outputs in 12-06-SUMMARY.md. Neither of the two
D-08 literals (`app/reserve/join/[token]/page.tsx:866`, `app/components/OnboardingModal.tsx:299`)
nor the remaining yellow ramp was migrated this phase; all three route to milestone C via WINDOWS
entries 49-51.

## Criterion 3: the design-system page documents what shipped, shows no deleted primitive

> "`app/(app)/design-system/_client.tsx` documents the revised type scale, the colour and surface
> tokens, the Card variants, the single Label, the focus ring and Modal behaviour, and shows no
> primitive that this milestone deleted"

**Page guard, re-confirmed this session:**

```
$ npx vitest run __tests__/design-system-page-absence.test.ts
 Test Files  1 passed (1)
      Tests  28 passed (28)
```

28 tests: 5 absence assertions (`LabelText`, `.section-label`, `[data-score]`, `--background-inset`,
`.sidebar-scrollable`), 4 sibling-survival assertions, 1 fail-loud missing-path assertion, and
region-scoped assertions for every UI-SPEC item.

**Red observation, recorded before the page was touched** (12-04-SUMMARY.md, verbatim):

```
FAIL __tests__/design-system-page-absence.test.ts > design-system page absence guard (ENF-03, D-12)
> finds no "data-score" anywhere in the page (className, selector, code, or prose)
AssertionError: .../_client.tsx:1801: <p>Applied globally to <code>td</code>, <code>th</code>, and
<code>[data-score]</code>.</p>: expected [ { ...(3) } ] to have a length of +0 but got 1
```

**UI-SPEC items delivered** (12-04, D1-D9 in its coverage block): the type scale's two clusters now
show class names only, no typed pixel value, with `text-15` added as the eleventh row; a Reading
Measure subsection renders a real `.prose-measure` paragraph; the standby, faction, item-quality and
brand-colour swatches render from source (`text-standby-foreground`, `bg-alliance`, `bg-horde`,
`QUALITY_COLORS`, `BRAND_COLORS`); a Card `nested` example demonstrates `first:border-t-0`; the
focus-ring caption names the light-mode contrast shortfall with both numbers (`2.913`, `2.726`)
recomputed live from `contrast.ts`'s `ratio()`; a Modal Behaviour callout lists all six proven
behaviours including the stacked-modal Escape tie-break (commit `027129cd`); the stale Tabular
Numbers sentence now names `.tabular-nums` instead of the deleted `[data-score]` selector, with a
new sentence documenting the Figtree numeral face and its `td`/`th` caveat; a `DESIGN.md` pointer
sits at the top of `<main>`.

**Human-check observations** (per `workflow.human_verify_mode = end-of-phase`, not walked through a
browser session by the executor, listed here for the phase-level UAT consolidation, per
12-04-SUMMARY.md): at 1440 and 390 in both themes, confirm the eleven-row type scale and no pixel
labels; the reading-measure paragraph wraps correctly; the standby/faction/quality/brand swatch
labels are legible; the nested Card stack shows the correct divider pattern with no horizontal
scroll at 390; Tab reaches every control with a visible ring; a modal traps Tab, closes on Escape,
and returns focus.

**Remaining hand-typed numeric labels** (gate item 2.10's default branch, left untouched, per
12-04-SUMMARY.md's own list) are named at **WINDOWS entry 54**, not fixed here -- expanding the page
beyond UI-SPEC's seven items was explicitly out of this phase's agreed scope.

## Criterion 4: CI gate against the deployed pages -- not met, Blocked on the deploy

> "CI runs the rendered detector against the seven deployed public pages (home, pricing, compare,
> about, research, one blog post, changelog) and fails on any non-advisory finding outside the
> recorded exceptions, with the milestone-start baseline count and the target of zero written into
> the workflow or DESIGN.md"

**Not met. Blocked on the deploy.** Re-verified live this session, not restated from plan time:

```
$ git ls-remote origin refs/heads/main
2e0587eef51ec80b7d9fbf71321620b2af1ab752	refs/heads/main
$ git rev-list --count 2e0587eef51ec80b7d9fbf71321620b2af1ab752..HEAD
304
```

Remote `main` remains at `2e0587ee`, dated 2026-09-13. Local `main` is now 304 commits ahead (up
from 275 at plan time and 284 at 12-01), but **the remote head itself has not moved** since either
of those checkpoints. D-01's premise is unchanged. No part of Phases 07 through 12 is deployed;
none of Phases 07-12's public-page fixes are live.

**Recorded in three places, each for a different reader** (D-02):

1. **`REQUIREMENTS.md`** -- ENF-04's line and its traceability row both read "Blocked (deploy)",
   naming the remote sha, the commit count and the sprint workstream as owner.
2. **`ROADMAP.md`** -- Phase 12 success criterion 4 carries the inline marker
   `(not met, blocked on deploy: see WINDOWS 53)`.
3. **`.planning/WINDOWS.md` entry 53** -- names the gate (the deploy), the owner (the sprint
   workstream) and the full seven-point unblock recipe: (1) capture the milestone-start baseline
   against production before the deploy lands, since no detector JSON baseline was ever committed
   and the only way back afterward is serving commit `2e0587ee` locally; (2) run the gate as a
   separate post-deploy job, not folded into the Node 20 lint/typecheck/test job; (3) the bundled
   impeccable skill under `.claude/` is gitignored, so the job must run the published detector via
   `npx impeccable` at a pinned version (bundled `4.1.1`, npm resolves `4.1.0`, re-confirmed live
   this session via `npm view impeccable version`) or vendor a copy; (4) `.impeccable/config.json`
   is committed as of 12-06, so the job sees the recorded exceptions; (5) http(s) targets load no
   design system, so `design-system-*` rules never fire in this gate (confirmed by code read of
   `detector/cli/main.mjs`'s `urlOptions` branch: a remote http(s) URL always gets `baseScanOptions`,
   never a resolved design system, which only `file://` targets receive); (6) the job fails on exit
   code 2 (one or more non-advisory findings survive config filtering) and passes on exit code 0
   (confirmed by code read of the same file's `partitionAdvisory`/`process.exit` tail);
   `em-dash-overuse` is the only rule carrying `advisory: true` in the registry (confirmed by
   grep of `detector/registry/antipatterns.mjs`); (7) mirror
   `scripts/design-system/local-detector-run.mjs`'s page list (the seven pages), viewports
   (`1440x900`, `390x844`) and output shape, and record the baseline count and the target of zero in
   the CI workflow or DESIGN.md.

**Gate 2.12's baseline window, stated precisely:** the milestone-start baseline can only be taken
against production **before** the deploy lands, because production remains the pre-milestone site
(commit `2e0587ee`) until then. Once the deploy lands, that window closes permanently -- production
will show the fixed state, and the only way to reconstruct the pre-milestone baseline afterward is
to check out commit `2e0587ee` and serve it locally. This procedure is recorded for its owner (the
sprint workstream); it is **not** run by this plan, which never points any capture or detector at a
non-local origin (see the two probes' origin-refusal behaviour, re-confirmed structurally in
`assertLocalOrigin` in `scripts/design-system/local-detector-run.mjs` and `scripts/visual/baseline.mjs`).

## Criterion 5: zero token/primitive findings on the deployed pages -- not met, Blocked on the deploy

> "The rendered detector run over those same seven URLs reports zero `undersized-ui-text`,
> `tiny-text`, `low-contrast` and `nested-cards` findings that trace to tokens or primitives, and any
> remaining finding is attributed in writing to page-level layout and carried into milestone B"

**Not met. Blocked on the deploy**, for the same reason as Criterion 4 -- the seven URLs this
criterion names are not deployed. Recorded in the same three places: `REQUIREMENTS.md` (ENF-05's
line and traceability row read "Blocked (deploy)"), `ROADMAP.md` (criterion 5's inline marker,
`(not met, blocked on deploy: see WINDOWS 52)`), and `.planning/WINDOWS.md` entry 52 (gate, owner,
and the pointer to this section's LOCAL figures as interim substance evidence that does not satisfy
the requirement).

### LOCAL measurement -- interim substance evidence, does NOT satisfy ENF-05

Every figure below is labelled `local` in its own JSON, in this document, and in the WINDOWS entry
that carries it. **This subsection never satisfies ENF-05.** It measures whether the token and
primitive work actually cleared the four gating finding types, on a local dev server standing in for
the deployed pages ENF-05's letter requires.

**Run parameters** (from `12-DETECTOR-LOCAL-FINAL.json`, so a later deployed run can be compared like
for like): detector version `4.1.1` (the bundled `.claude/skills/impeccable` copy this repo actually
runs; `npm view impeccable version` resolves `4.1.0` on the published registry, a version gap
recorded at WINDOWS entry 53); origin `http://localhost:3100`; git HEAD at capture time
`eaae8711f4b50dea6215817853e67a0d44130f50`; mode `config` (the committed `.impeccable/config.json`
applied, as opposed to `--no-config`); viewports `1440x900` and `390x844`; the exact seven ENF-04
pages (`/`, `/pricing`, `/compare`, `/about`,
`/research/wow-classic-loot-systems-2026`, `/blog/dkp-is-dead-what-classic-guilds-use-in-2026`,
`/changelog`); theme not controlled by the run (each page renders in its request-time default
theme, light and dark are not both measured by this pass).

```
$ node scripts/design-system/local-detector-run.mjs --mode config \
    --out .../12-DETECTOR-LOCAL-FINAL.json
Local detector run (config) complete: 1230 non-advisory / 0 advisory finding(s)
across 7 pages x 2 viewports.
  undersized-ui-text: 0
  tiny-text: 0
  low-contrast: 6
  nested-cards: 70
```

**What the committed config removed, per rule -- nothing, and why that is the correct, expected
result:** comparing `12-DETECTOR-LOCAL-FINAL.json` (config mode) against `12-DETECTOR-LOCAL-RAW.json`
(12-05's `--no-config` run) shows **zero** change in every rule's count (`ai-color-palette` 1050 in
both, `low-contrast` 6 in both, `line-length` 100 in both, `cramped-padding` 4 in both, `nested-cards`
70 in both; `undersized-ui-text` and `tiny-text` 0 in both). This is expected, not a gap: (a) Gate 2.3
means `design-system-*` rules never attach to an http(s) target regardless of config, and (b) none of
the 13 committed `.impeccable/config.json` entries scope to a file among the seven ENF-04 pages or to
a gating rule -- all 13 entries scope to `app/reserve/join/[token]/page.tsx` (not one of the seven),
`app/globals.css` (a source file, not a rendered page), `app/(app)/raid-tracking/_client.tsx`
(authenticated, not public) or a test file. **No rendered-path-scoped entry exists in the committed
config, so there is nothing for this check to discriminate** -- the "every gate-approved entry scoped
to a rendered page path removes a finding present in the raw run" must-have is satisfied vacuously,
and is recorded as such rather than glossed over.

**Attribution table, every remaining gating finding, corrected page attribution** (see the note
below on a wrapper bug found this session):

| Page | Viewport | Rule | Detail | Attribution |
|---|---|---|---|---|
| `/pricing` | both | low-contrast | `3.4:1 (need 4.5:1) -- text #ff8000 on #50495f` | token/primitive: accent-orange literal on a non-token background |
| `/pricing` | both | low-contrast | `4.4:1 (need 4.5:1) -- text #bababa on #50495f` | token/primitive: `#bababa` is the pre-existing off-token marketing literal named at WINDOWS entry 46 (60 uses across 16 files, routed to milestone B) |
| `/research/wow-classic-loot-systems-2026` | both | low-contrast | `2.5:1 (need 4.5:1) -- text #ffffff on #ff8000` | token/primitive |
| `/changelog` | both | nested-cards | `Card inside card` (35 occurrences per viewport) | page-level layout: a repeated structural pattern on the changelog page, carried to milestone B per ENF-05's own wording |

Zero gating findings on `/`, `/compare`, `/about` and
`/blog/dkp-is-dead-what-classic-guilds-use-in-2026`, at either viewport. `undersized-ui-text` and
`tiny-text`: zero findings on any of the seven pages, at either viewport.

**A wrapper bug found and corrected for, not fixed in place (WINDOWS entry 55):**
`scripts/design-system/local-detector-run.mjs`'s `pageKeyFor` helper loops the seven-page list and
returns the first page whose URL is a string-prefix of the finding's `file` field; since `/`'s URL is
a prefix of every other page's URL and `/` is checked first, **every finding in both
`12-DETECTOR-LOCAL-RAW.json` (12-05) and `12-DETECTOR-LOCAL-FINAL.json` (this plan) was bucketed
under `/` in the `findings` object and in `gatingCounts.byPage`**, even though each finding's own
`file` field (the true URL) was always correct. 12-05-SUMMARY.md's own attribution table, written
against that buggy bucketing, states all four gating findings are "confined to the home page (`/`)"
-- **this is incorrect**; recomputing directly from `finding.file` (as the table above does) shows
zero gating findings on `/` and all of them on `/pricing`, `/research/...` and `/changelog` instead.
The finding **totals** (`gatingCounts.total`, `perRuleCounts`) are unaffected by this bug -- only the
per-page breakdown is wrong. Not fixed in the script itself: outside this plan's declared
`files_modified` and its own no-code-change constraint (12-01 gate, Standing Constraint 2's
discharge). The table above is built by reading each finding's raw `file` field directly, bypassing
the buggy grouping.

**Not one legitimate token/primitive fix remains unattributed:** all four distinct findings above
trace to a named element (an accent-orange or `#bababa` literal, or a repeated card-in-card layout
pattern), each already carried to a numbered WINDOWS entry (43, 46, or the general milestone-B/C
`nested-cards` routing named in 12-05's own gate answer). None require new investigation here.

**This measurement does not satisfy ENF-05.** It proves the token and primitive work cleared
`undersized-ui-text` and `tiny-text` entirely, and narrowed `low-contrast`/`nested-cards` to four
named, already-routed findings, on a local stand-in for the seven pages. ENF-05 itself requires the
deployed pages, which are not live (Criterion 4 above). The deployed run, once the deploy lands, is
expected to reproduce these same findings (or fewer, if any interim fix lands) plus whatever the
deployed environment's own differences introduce; it is not assumed identical.

## Carried forward

Every phase-12 WINDOWS entry, by id and destination:

| Entry | Kind | Destination |
|---|---|---|
| 39 | unrun-verify | pre-phase-12 authenticated-capture fallback, end-of-phase UAT |
| 40 | deviation | `context.mjs`'s `EXISTING_VISUAL_SYSTEM` directive, open for a human/future-phase decision |
| 41 | deviation | 15 unsanctioned `font-mono` sites, legitimacy review |
| 42 | deviation | 7 `design-system-color` findings in app-screen files, milestone C |
| 43 | deviation | 49 `design-system-color` findings in public/shared files, milestone B |
| 44 | deviation | 3 `design-system-radius` findings, milestone B |
| 45 | deviation | 3 `design-system-font-size` findings (static OG-image renderer), milestone B |
| 46 | deviation | `#bababa`/`#080808` arbitrary-value marketing literals, milestone B |
| 47 | deviation | `LootListContent.tsx` `side-tab` rail fix, milestone C |
| 48 | deviation | WOW_CLASSES token migration, retires the 10 provisional entries |
| 49 | deviation | `app/reserve/join/[token]/page.tsx:866` purple-to-pink gradient (D-08), milestone C |
| 50 | deviation | `OnboardingModal.tsx:299` yellow gradient stop (D-08), milestone C |
| 51 | deviation | remaining 18 yellow ramp lines (D-08), milestone C |
| 52 | unmet-truth | ENF-05 Blocked on the deploy (this plan) |
| 53 | unmet-truth | ENF-04 Blocked on the deploy, with the unblock recipe (this plan) |
| 54 | deviation | gate item 2.10's remaining hand-typed numeric labels on the docs page (this plan) |
| 55 | deviation | `local-detector-run.mjs`'s `pageKeyFor` prefix-match bug (this plan) |
| 56 | unrun-verify | post-phase-12 after-capture's authenticated fallback and `/design-system`, end-of-phase UAT (this plan) |
| 57 | deviation | `09-EVIDENCE.md`'s stale Card-radius figure (this plan, see below) |

**`09-EVIDENCE.md`'s Card-radius figure** (12-03's own finding, not previously given its own WINDOWS
entry): `09-EVIDENCE.md`'s prose states Card's base radius (`rounded-xl`) is 12px. That figure was
measured against Tailwind's own unmodified defaults, not this project's `tailwind.config.js`, where
`lg` is 12px and `xl` is 16px -- the correct figure, confirmed live against the config and carried
into DESIGN.md's guarded Shapes table by 12-03, is **16px**. `09-EVIDENCE.md`'s own prose was never
corrected and will be cited again if left unrecorded; entry 57 below names it.

**Phase goal's MVP/UAT framing** (12-CONTEXT.md Deferred Ideas, explicitly not this plan's or any
phase-12 plan's work): Phase 12's ROADMAP entry is marked `**Mode:** mvp` but its goal is not in "As
a ..., I want ..., so that ..." user-story form. The `mvp-uat-framing` guard halts UAT generation on
that combination. This must be resolved before `/gsd-verify-work 12` runs -- either give the phase a
user-story goal via `/gsd-mvp-phase 12` or drop the `Mode:` line. This is the orchestrator's fix, made
after this plan closes, per the 12-01 gate's Section 5 and this plan's own narrow ROADMAP.md
permission (success criteria 4 and 5 only).

## CI, re-run at this plan's final code state

```
$ npm run lint
...
✖ 397 problems (0 errors, 397 warnings)
```
0 errors, 397 pre-existing warnings, unchanged from every prior phase's own baseline.

```
$ npm run typecheck
> tsc --noEmit
(exit 0)
```

```
$ npm test
 Test Files  83 passed (83)
      Tests  1396 passed (1396)
```
Default-concurrency run: 83/83 files, 1396/1396 tests, all green, no flakiness observed (the two
`raid-tracking` tests 12-04-SUMMARY.md names as occasionally worker-pool-flaky did not fail on this
run). Re-run at `--maxWorkers=2` for symmetry with prior EVIDENCE documents: also 83/83 files,
1396/1396 tests.

```
$ npm run build
...
(exit 0)
```
Exit 0. All routes compile; the public pages this phase's evidence measures
(`/`, `/pricing`, `/compare`, `/about`, `/research/wow-classic-loot-systems-2026`,
`/blog/dkp-is-dead-what-classic-guilds-use-in-2026`, `/changelog`) prerender as static content.

---
*Phase: 12-enforcement-and-documentation*
*Recorded: 2026-09-23*
