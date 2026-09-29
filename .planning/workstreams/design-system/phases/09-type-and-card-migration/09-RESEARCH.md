# Phase 09: Type and Card Migration - Research

**Researched:** 2026-09-18
**Domain:** Mechanical Tailwind class migration (type-size codemod + card-primitive codemod) in a Next.js 16 / React 19 / TypeScript 5 app
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Hard constraints inherited from the roadmap: no user-facing copy changes; nothing is edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint, where the executor presents the batch plan (files per batch, the full pixel mapping table, the list of every site whose rendering changes) and waits; CI green on every commit; screenshot comparison before the first edit and after the last.

- **D-01:** Extend `tailwind.config.js` `fontSize` with eight display aliases, `text-28`, `text-40`, `text-44`, `text-48`, `text-56`, `text-64`, `text-72`, `text-80`, as literal steps in the same authoring style as the Phase 07 aliases. The codemod maps every one of the 44 display-size sites (landing hero and sections, pricing, about, six app stat tiles, the UpgradeModal price) onto its exact-value alias, so the sacred hero H1 renders pixel-identical and success criterion 1 reaches zero. | Reversibility: costly.
- **D-02:** Midpoint sizes round up: `text-[17px]` (one site, `LandingLootDecision`) becomes `text-18`; `text-[22px]` (one site, `PremiumItemTooltip`) becomes `text-24`. No `text-17` or `text-22` alias is added. Both deltas are named at the checkpoint.
- **D-03:** The two `text-[8px]` sites in `app/(app)/master-sheet/components/BossSection.tsx` (the "tied" chip and the gap number) rise to `text-11`, the TYPE-01 floor. This is a visible change on the master sheet and is named at the checkpoint.
- **D-04:** The alias line-height is accepted as the scale's intent. About 51 heading-sized sites (18px to 80px) with no `leading-*` class tighten from inherited 1.5 to the scale's value; they are listed by file at the checkpoint and reviewed in the screenshot gate, not pinned with `leading-normal`. The new display aliases follow their neighbours: 28, 40, 44 and 48 carry line-height 1.2; 56, 64, 72 and 80 carry 1.02.
- **D-05:** Per-screen density tuning after the Phase 07 11px raise is out of this phase, milestone C only. The sweep targets pixel-identical rendering for everything at 16px and below. Anything the screenshot gate flags as cramped, clipped or wrapped is recorded by screen and routed to milestone C, never fixed inline.
- **D-06:** `Card`'s base radius changes from `rounded-lg` to `rounded-xl`, matching the 136 of 149 exact-string hand-rolled cards that already draw 12px. The 13 `rounded-lg` hand-rolled sites and the cards in the 11 files that already import `Card` gain 4px of radius; every such site is listed at the checkpoint. | Reversibility: reversible in isolation, costly in aggregate.
- **D-07:** Padding, gap, layout and every other class on a migrated site pass through unchanged via `className`. The codemod replaces only the surface classes, keeping the rest verbatim. Padding normalisation onto a Card padding contract is milestone C.
- **D-08:** A hand-rolled card is any class string containing `bg-background-elevated`, a `rounded-*` utility, and either `border-border` or `border-border-strong`, in any order. `border-border-strong` containers keep their emphasis. The ~29 lines with `bg-background-elevated` and `rounded-*` but no border token are excluded from both sweep and guard. The guard regex is order-independent.
- **D-09:** `components/ui/skeletons.tsx`'s 20 hand-rolled card shells migrate to `Card` like every other site, with no guard exemption.
- **D-10:** `nested` paints a divider only: no fill, no border, no radius. It uses `border-t border-border` (the app's existing 59-use divider idiom), with padding passed through.
- **D-11:** `nested` is exposed as `<Card variant="nested">`, extending the existing `CardVariant` union (`default | unified`). No separate `CardSection` export, no alias.
- **D-12:** Cards inside cards are handled in two steps: the sweep batches turn every in-scope string into plain `Card` mechanically (pixel-identical, double borders preserved); a final, separate plan uses a DOM-ancestry check to convert confirmed card-in-card sites (`ExpansionManager`, `GuildSettingsContent`, `SettingsModal`, plus any others found) to `variant="nested"` at its own checkpoint.
- **D-13:** Phase 09's card guard matches `bg-background-elevated` shapes only. The 5 card-shaped `bg-background-inset` lines are not flagged here; Phase 10 widens the guard when it migrates them.
- **D-14:** Batches are cut by concern, then by directory: type sweep first (landing/public, `app/components`, `app/(app)` split into 2-3 route groups, `components/ui`), then card sweep over the same boundaries, then the enumerated nested plan. Roughly 8-10 batch commits, each green on lint, typecheck and test.
- **D-15:** Two Node scripts under `scripts/codemods/`, no new dependencies. `text-sizes.mjs` (regex + committed JSON table, `--dry-run`, scoped path arg, per-file/per-value report). `hand-rolled-cards.mjs` (already-installed `typescript` compiler API, `--dry-run`, per-element report). Both idempotent and re-runnable per directory.
- **D-16:** Guards ratchet from batch one to zero at the last. Two new files, `__tests__/arbitrary-text-sizes.test.ts` (TYPE-03) and `__tests__/hand-rolled-cards.test.ts` (PRIM-01), reuse `sourceFiles`/`matchesIn`. Each batch lowers the ceiling; the final batch of each sweep sets it to zero and removes the ceiling constant. The type guard also rejects interpolated `text-[${...}px]`.
- **D-17:** `baseline.mjs` gains `/guild-settings` (expansion manager panel expanded) and `/loot-management` (click step opens `SettingsModal`), giving 5 pages x 2 themes x 2 widths = 20 images, before/after. Precondition: user runs `npm run test:users:create` with the service-role key in their own shell; agent never reads/prints/writes it. If unmet at checkpoint, fallback is Home-only plus end-of-phase UAT, recorded in the evidence doc.

### Claude's Discretion
- Exact batch order across the `app/(app)` route groups and where the two-or-three-way split falls; report file counts per batch at the checkpoint.
- The codemod report's exact format, as long as it lists every file, every pixel value, the alias it became, and (for cards) every element rewritten.
- The ratchet ceilings per batch (D-16); whatever the live count is after that batch.
- Whether `nested` suppresses its own top divider when it is the first child of a `Card` (e.g. `first:border-t-0`) or leaves that to the call site; propose at the nested plan's checkpoint.
- Widening `type-scale-floor.test.ts`'s sub-11px scan from the literal 9px/10px check to any `N < 11`.
- Whether the 13 `bg-card` one-offs outside `card.tsx` are card shapes; if they carry a border token and a radius, treat `bg-card` as a synonym of `bg-background-elevated` in both codemod and guard and report at the checkpoint, otherwise inventory with the borderless lines.
- The mechanics of the `SettingsModal` click step and the expansion-panel expansion in `baseline.mjs` (selectors, waits), and file naming for the three new pages.
- Whether the mapping table JSON lives beside the codemod or under `__tests__/design-tokens/fixtures/`.

### Deferred Ideas (OUT OF SCOPE)
- Per-screen chip density tuning after the 11px raise (Sidebar, BossSection, MemberManager, changelog): milestone C (D-05).
- Padding normalisation of migrated cards onto a Card padding contract: milestone C (D-07).
- The five card-shaped `bg-background-inset` lines and widening the card guard to cover the inset token: Phase 10, COLOR-03 (D-13).
- Documenting `nested`, the eight display steps and the `rounded-xl` radius on the design-system page and in DESIGN.md: Phase 12, ENF-01 and ENF-03.
- The ~29 borderless `bg-background-elevated` + `rounded-*` lines: inventoried at plan time, not scheduled to any phase (D-08).
- Whether `nested` should suppress its top divider as a first child: decided inside this phase's nested plan.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| TYPE-03 | Arbitrary `text-[Npx]` classes in `app/` and `components/` are reduced from about 1,044 (audit) / 932 (live re-measurement, confirmed this session) to zero by a codemod that maps each pixel value onto the nearest scale step, with a test that fails if a new one is introduced. | Live-verified `tailwind.config.js` fontSize block (Standard Stack, Code Examples) confirms the alias targets already exist for every step except the 8 new D-01 display aliases; `text-sizes.mjs` codemod pattern (Architecture Pattern 1) and the `arbitrary-text-sizes.test.ts` guard pattern (Validation Architecture, reusing `sourceFiles`/`matchesIn`) give the planner an exact, reusable test scaffold; live per-value breakdown (Summary, Code Examples) gives the exact site counts per pixel value for batch sizing. |
| PRIM-01 | `components/ui/card.tsx` is the only card: the ~166 (audit) / 227 (live re-measurement) hand-rolled containers in `app/` and `components/` are replaced by `Card` (or `nested`), and a test fails on any new hand-rolled card string. | Full `card.tsx` read confirms `CardVariant` union and base class string exactly as CONTEXT.md states, so D-06/D-11 land cleanly (Standard Stack, Architecture Patterns); D-08 regex re-verified live at 227 sites/73 files (Code Examples); Pitfall 1 flags a real discrepancy in D-06's "13 rounded-lg" count the planner must reconcile via dry-run, not by copying either count; Pitfall 2 identifies template-literal `className` sites the AST codemod must specifically handle; the three named cards-in-cards screens (`ExpansionManager`, `GuildSettingsContent`, `SettingsModal`) were read directly this session and confirmed to contain the exact nested-card pattern D-12 describes. |
</phase_requirements>

## Summary

This is not a framework-research phase. All 17 implementation decisions are locked in `09-CONTEXT.md`; this document's job is to ground those decisions against the current, exact state of the five files the phase edits or reuses, and to re-measure the live counts the planner needs to cut batches. Every number below was re-measured this session with `grep`/`node` against the working tree at commit `4a9b0099` (HEAD at research time, no phase-09 code yet committed).

The live re-inventory in `09-CONTEXT.md` (dated 2026-09-18, the same day as this research) is **confirmed accurate** for the type-sweep target (932 sites / 100 files, exact match) and very close for the card-sweep target (this session measured 227 order-independent hand-rolled-card lines across 73 files against CONTEXT's stated "about 228" — a 1-line difference, immaterial). Two sub-claims inside D-06 do not reproduce exactly on re-measurement (detailed in Pitfall 1) and must be re-confirmed by the planner's own script run before the checkpoint, not copied from either CONTEXT.md or this document.

**Primary recommendation:** Build both codemods as thin, idempotent Node scripts around `ts` (already a dependency) for the card sweep and a plain regex+JSON-table replacer for the type sweep; do not introduce jscodeshift, ts-morph, or any new AST-diffing library. Reuse `sourceFiles`/`matchesIn` from `__tests__/design-tokens/source-files.ts` verbatim for both new guard tests — their signatures need no changes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Type-size mapping (pixel → alias) | Build-time tooling (`scripts/codemods/`) | Frontend (React components consume the resulting classes) | The mapping table and rewrite logic live entirely outside the runtime; components only ever see the post-codemod class string |
| Card surface primitive | Frontend / Component library (`components/ui/card.tsx`) | — | `Card` is a pure presentational React component; no server or data-layer involvement |
| Hand-rolled-card detection/rewrite | Build-time tooling (`scripts/codemods/`) | Frontend (JSX call sites rewritten) | AST rewrite is a dev-time operation; the guard test that prevents regression runs in the same tier as the existing token guards (Vitest, Node) |
| Regression guard (ratchet tests) | Test tier (`__tests__/`) | — | Runs in CI (Vitest via `npm run test`), not in the browser or server runtime |
| Visual regression evidence | Build-time tooling (`scripts/visual/baseline.mjs`) + Browser (Puppeteer-driven Chrome) | — | Puppeteer drives a real browser against a local Next.js dev server; output is static PNGs committed to the repo, no production surface touched |

## Standard Stack

### Core
No new runtime libraries. This phase adds two dev-only Node scripts and two Vitest test files; both dependencies are already installed.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | `^5` [VERIFIED: package.json:94, `"typescript": "^5"`] | Compiler API (`ts.createSourceFile`, `ts.forEachChild`, `ts.factory`, `ts.createPrinter`) used by `hand-rolled-cards.mjs` to parse JSX and rewrite the matched elements | Already the project's TS toolchain; using its own parser avoids a second JS parser dependency (D-15's "no new dependencies" premise) |
| `vitest` | `4.1.0` [CITED: package.json devDependencies, confirmed present] | Runs the two new guard tests (`arbitrary-text-sizes.test.ts`, `hand-rolled-cards.test.ts`) | Existing test runner for every guard in this workstream (`type-scale-floor.test.ts` precedent) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `puppeteer` | devDependency since Phase 07 [CITED: `.github/workflows/ci.yml` comment: "puppeteer is a devDependency for the Phase 07 visual baseline script"] | Drives the D-17 screenshot gate extension | Only for `scripts/visual/baseline.mjs`, not for the codemods themselves |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `typescript` compiler API (parse → mutate AST → print) | `jscodeshift` | jscodeshift is the de-facto codemod tool and has a friendlier API (`j(source).findJSXElements(...)`), but it is not currently a dependency; D-15 explicitly rules out new dependencies, and the project's own `typescript` package is sufficient for the narrow "find this class string, swap tag, adjust import" task this phase needs |
| `typescript` compiler API's `ts.transform()` custom-transformer pipeline | Direct AST mutation via `ts.factory.update*` + `ts.createPrinter()` | `ts.transform()` is intended for emit-time transforms and has a documented compiler limitation where JSX attribute-level transforms don't apply the way `tsc`'s own emit does [CITED: github.com/microsoft/TypeScript/issues/57054]. The parse-mutate-print pattern (no `ts.transform()` call at all) sidesteps this entirely — see Pitfall 3. |
| Plain string/regex replace for the card codemod | AST-based rewrite (chosen, D-15) | A regex-only card rewrite cannot safely handle multi-line `className` template literals, conditional class strings (`\`bg-card border ... ${cond ? 'x' : 'y'}\``), or distinguish a matching string that is itself inside a comment or a non-JSX string literal. The AST approach the CONTEXT.md D-15 decision specifies is correct for this reason; several real matched sites in this codebase are template-literal `className`s (see Pitfall 2) |

**Installation:**
No install step — both dependencies are already present. Confirm before starting:
```bash
npm ls typescript
```

**Version verification:** `typescript` is pinned as `^5` project-wide in `package.json` and used by the app's own `tsc --noEmit` (`npm run typecheck`) — no separate version to track for the codemod.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new packages (D-15: "no new dependencies"). The one package the card codemod depends on, `typescript`, is a pre-existing production/dev dependency (`package.json:94`, `"typescript": "^5"`) already exercised by `npm run typecheck` on every commit — no legitimacy check is required for an already-adopted, already-audited dependency.

**Packages removed due to [SLOP] verdict:** none — no packages evaluated.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │   scripts/codemods/text-sizes.mjs         │
                    │   (regex + committed JSON mapping table)  │
                    └───────────────┬───────────────────────────┘
                                    │ rewrites text-[Npx] → alias
                                    ▼
   app/**/*.tsx, components/**/*.tsx  ──────────────┐
   (932 sites / 100 files, live count)               │  batch commit, CI green
                                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  __tests__/arbitrary-text-sizes.test.ts   │
                    │  (ratchets ceiling → 0, reuses            │
                    │   sourceFiles()/matchesIn())              │
                    └─────────────────────────────────────────┘

                    ┌─────────────────────────────────────────┐
                    │ scripts/codemods/hand-rolled-cards.mjs    │
                    │ (ts.createSourceFile → find JSX el. with  │
                    │  D-08 class match → ts.factory.update →   │
                    │  ts.createPrinter().printFile)            │
                    └───────────────┬───────────────────────────┘
                                    │ rewrites <div className="bg-background-elevated
                                    │ border border-border rounded-*"> → <Card className="...">
                                    ▼
   app/**/*.tsx, components/**/*.tsx  ──────────────┐
   (227 sites / 73 files, live count)                │  batch commit, CI green
                                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  __tests__/hand-rolled-cards.test.ts      │
                    │  (ratchets ceiling → 0, reuses            │
                    │   sourceFiles()/matchesIn())              │
                    └─────────────────────────────────────────┘
                                    │
                                    ▼ (separate, later plan — D-12)
                    ┌─────────────────────────────────────────┐
                    │  DOM-ancestry check (JSX parent chain)    │
                    │  finds <Card> directly inside <Card>      │
                    │  → variant="nested" on the 3 named        │
                    │    screens + any others found             │
                    └─────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │  scripts/visual/baseline.mjs (extended)   │
                    │  --label before/after → 5 pages x 2       │
                    │  themes x 2 widths = 20 PNGs, committed   │
                    │  to .planning/…/baselines/                │
                    └─────────────────────────────────────────┘
```

A reader can trace both sweeps end to end: source files → codemod script (mapping table or AST rewrite) → batch commit → guard test ratchet → (cards only) a second, judgement-requiring pass for nesting → screenshot evidence.

### Recommended Project Structure
```
scripts/
└── codemods/                     # new directory, does not exist yet [VERIFIED: `ls scripts/codemods` → "No such file or directory"]
    ├── text-sizes.mjs            # D-15: regex + JSON table, --dry-run, scoped path arg
    ├── hand-rolled-cards.mjs     # D-15: TS compiler API, --dry-run, scoped path arg
    └── mapping-table.json        # or under __tests__/design-tokens/fixtures/ — Claude's Discretion (CONTEXT.md, last bullet)
__tests__/
├── arbitrary-text-sizes.test.ts  # new, D-16, TYPE-03
├── hand-rolled-cards.test.ts     # new, D-16, PRIM-01
└── design-tokens/
    ├── source-files.ts           # REUSED verbatim — sourceFiles()/matchesIn(), no signature change needed
    └── fixtures/                 # existing dir, currently only holds accent-probe.txt [VERIFIED: `ls __tests__/design-tokens/fixtures/`]
```

### Pattern 1: Regex + committed JSON table for the type sweep
**What:** `text-sizes.mjs` reads a JSON table (`{"8": "11", "17": "18", "22": "24", "28": "28", ...}`), globs `app/` and `components/`, and replaces every `text-[Npx]` literal whose `N` is a table key with `text-{alias}`.
**When to use:** Any site where the class is a plain string literal — the large majority (932 sites are almost all inside JSX `className="..."` string literals per the live grep; no interpolation was found — see Pitfall 4 on how the guard catches interpolation going forward).
**Example (table shape, not yet created):**
```json
{
  "8": "11", "11": "11", "12": "12", "13": "13", "14": "14",
  "15": "15", "16": "16", "17": "18", "18": "18", "20": "20",
  "22": "24", "24": "24", "28": "28", "32": "32", "40": "40",
  "42": "42", "44": "44", "48": "48", "56": "56", "64": "64",
  "72": "72", "80": "80"
}
```
This table shape is inferred from D-01 through D-04's mapping rule and the live per-value breakdown below — it is not yet committed anywhere in the repo; the executor authors it, the guard test (per Claude's Discretion) may assert every value in it resolves to a real Tailwind `fontSize` key.

### Pattern 2: Parse-mutate-print with the TypeScript compiler API (no `ts.transform()`)
**What:** For the card codemod, parse each file with `ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TSX)`, walk the tree with `ts.forEachChild`/a recursive visitor looking for `ts.isJsxOpeningElement`/`ts.isJsxSelfClosingElement` nodes whose `className` attribute's string value matches the D-08 regex, build a new node via `ts.factory.updateJsxOpeningElement` (rename tag to `Card`, replace the `className` string literal, per D-07 keep the non-surface classes), then print the whole mutated `SourceFile` with `ts.createPrinter().printFile(...)` and write the result back.
**When to use:** For every card codemod site — this is D-15's specified mechanism.
**Why not `ts.transform()`:** `ts.transform()`'s custom-transformer pipeline is designed for compiler emit hooks and has a documented open issue where JSX-level attribute transforms don't apply the way `tsc`'s own emit does [CITED: github.com/microsoft/TypeScript/issues/57054]. The parse→mutate→print pattern above never calls `ts.transform()`, so this limitation does not apply to it.
```typescript
// Source: TypeScript compiler API — standard parse/print pattern, no ts.transform()
// [CITED: TypeScript's own printer API surface, cross-referenced against the
// github.com/microsoft/TypeScript/issues/57054 discussion of what NOT to use]
import * as ts from 'typescript'

const sourceFile = ts.createSourceFile(
  filePath,
  fileText,
  ts.ScriptTarget.Latest,
  /* setParentNodes */ true,
  ts.ScriptKind.TSX
)

function isHandRolledCard(attrs: ts.JsxAttributes): boolean {
  const classNameAttr = attrs.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.text === 'className'
  )
  // ... extract string value, test against the D-08 order-independent regex
}

// After locating and rewriting matched nodes via ts.factory.update*, print:
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
const output = printer.printFile(mutatedSourceFile)
```

### Anti-Patterns to Avoid
- **Global find-and-replace of `bg-background-elevated`/`rounded-*`/`border-border` strings via `sed`/plain regex across whole files:** several matched card sites use template-literal `className`s with embedded conditionals (see Pitfall 2) — a naive text substitution will silently corrupt the conditional expression or match inside an unrelated string. Use the AST approach for every card site, not just the visually-obvious ones.
- **Treating `components/ui/*` as out of scope for the card sweep:** it is explicitly in scope. 8 of the 73 files carrying D-08-matching hand-rolled-card strings are themselves inside `components/ui/` (`skeletons.tsx` — 20 sites per D-09, plus `searchable-dropdown.tsx`, `dropdown-menu.tsx`, `info-tooltip.tsx`, `empty-state.tsx`, `error-state.tsx`, `segmented-control.tsx`, `radio-group.tsx`). Only `components/ui/card.tsx` itself is excluded (it's the primitive being edited, not a call site).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive source-file enumeration + line-matching for the two new guard tests | A new file-walker or a second `matchesIn`-like helper | `sourceFiles(['app', 'components'])` and `matchesIn(files, pattern)` from `__tests__/design-tokens/source-files.ts` | These are the exact helpers `type-scale-floor.test.ts` already uses; their signatures (`sourceFiles(roots: string[]): string[]`, `matchesIn(files: string[], pattern: RegExp): SourceMatch[]`) [VERIFIED: `__tests__/design-tokens/source-files.ts:37,88`] need zero changes to serve both new guards |
| JSX parsing for the card codemod | jscodeshift, ts-morph, Babel | `typescript`'s own compiler API (already a dependency) | D-15's explicit "no new dependencies" constraint; the TS compiler API is sufficient for a narrow find/rewrite task and the project already trusts it (it type-checks the whole app) |
| Contrast/evidence reporting conventions | A new ad hoc report format | The `__tests__/design-tokens/report.ts` pattern (a runnable, fixed-order script, not hand-typed numbers) [VERIFIED: `__tests__/design-tokens/report.ts:1-14`, comment: "Runnable, fixed-order contrast report... computed by ./contrast.ts... no number in this milestone is asserted from memory"] | The codemod's own `--dry-run` report (D-15) plays the identical role for the pixel-mapping and card-rewrite evidence; don't invent a separate ad hoc format when this workstream already has a committed-script-not-hand-typed-numbers convention |

**Key insight:** Every other phase in this workstream (07, 08) has already established "the number in the evidence doc is computed by a committed script, never typed by hand." This phase's codemod `--dry-run` reports are that same convention applied to the two new sweeps — the planner should require the codemod's own report output to be what gets pasted into the checkpoint and the evidence doc, not a hand-run grep.

## Runtime State Inventory

Not applicable — this is a code/class-string migration phase with no rename of an identifier that has a life outside the source tree (no database keys, no external service config, no OS-registered state, no secrets, no build artifacts carry `text-[Npx]` or `bg-background-elevated` as a name). Confirmed: this phase's target strings are Tailwind utility classes compiled at build time; they leave no runtime footprint outside `app/`/`components/` source.

## Common Pitfalls

### Pitfall 1: D-06's "13 rounded-lg hand-rolled sites" does not reproduce on live re-measurement — re-measure, don't copy the CONTEXT.md number
**What goes wrong:** The planner writes the D-06 checkpoint list ("every rounded-lg site that gains 4px") using CONTEXT.md's count of 13, and either omits real sites or the checkpoint list undercounts.
**Why it happens:** This session's re-measurement of the D-08 order-independent hand-rolled-card regex (`bg-background-elevated` + any `rounded-*` + (`border-border`|`border-border-strong`), any order) found **24** lines containing `rounded-lg` among the 227 matched card sites, not 13. Restricting to the audit's original literal adjacency order (`bg-background-elevated border border-border(-strong)? rounded-*`, in that exact left-to-right order) narrows it to **19**, still not 13. Neither re-measurement matches CONTEXT.md's D-06 number exactly. This is very likely a scope difference (e.g., CONTEXT's "13" may exclude sites where `rounded-lg` co-occurs with `border-border-strong` — those 34 sites are counted separately under D-08 — or may only be counting a narrower directory scope), not an error in this research, but the discrepancy is real and material to the checkpoint list.
**How to avoid:** The planner's own plan-time codemod dry-run is the authority, not this document or CONTEXT.md. Have the executor generate the exact list of `rounded-lg`-bearing hand-rolled-card sites from the actual `hand-rolled-cards.mjs --dry-run` report before presenting the D-06 checkpoint list, and reconcile against CONTEXT's "13" explicitly (name the delta) rather than silently trusting either number.
**Warning signs:** If the checkpoint's per-file radius-delta list has fewer than ~19-24 entries, the count is stale.

### Pitfall 2: Several matched `className` strings are template literals, not plain string literals
**What goes wrong:** A regex-only codemod (or an AST codemod that only handles `ts.isStringLiteral` className values) either misses these sites entirely or corrupts the conditional expression when it tries to string-replace inside the template.
**Why it happens:** At least two of the 227 D-08-matching card sites use a template literal with an embedded ternary, e.g.:
```
app/(app)/loot-list/components/LootListContent.tsx:509:
  <div className={`bg-card border border-border rounded-lg overflow-hidden ${hasCardError ? 'border-destructive/50 bg-red-900/10' : ''}`}>
```
[VERIFIED: grep output this session, `app/(app)/loot-list/components/LootListContent.tsx:509`, quoted verbatim above]
**How to avoid:** The `hand-rolled-cards.mjs` AST visitor must handle `ts.isJsxExpression`-wrapped `ts.isTemplateExpression` className values (extract the leading static `TemplateHead` text for pattern matching, and when rewriting, replace only the static surface-class segment while leaving the `${...}` substitution and its surrounding template structure intact). Flag any site the codemod cannot safely rewrite (rather than skip-silently or corrupt) in its `--dry-run` report so the executor hand-reviews it.
**Warning signs:** A file where the codemod's diff touches a line inside a template-literal expression container.

### Pitfall 3: Using `ts.transform()` for the JSX rewrite instead of parse-mutate-print
**What goes wrong:** A custom transformer registered via `ts.transform(sourceFile, [myTransformer])` may not apply cleanly to JSX-specific nodes the way `tsc`'s own emit pipeline does.
**Why it happens:** This is a known, currently-open TypeScript compiler API limitation: JSX doesn't transform the same way through the public transformer API as it does inside `tsc`'s internal emit [CITED: github.com/microsoft/TypeScript/issues/57054].
**How to avoid:** Don't call `ts.transform()` at all for this codemod. Parse with `ts.createSourceFile(..., ts.ScriptKind.TSX)`, mutate nodes directly via `ts.factory.update*` calls (which don't go through the transform/emit pipeline), and print the mutated tree with `ts.createPrinter().printFile()`. This is the pattern in Architecture Pattern 2 above.
**Warning signs:** JSX attributes silently reverting to their pre-transform value in the codemod's output, or the printer emitting `React.createElement(...)` calls instead of JSX syntax (a sign the wrong API surface was used).

### Pitfall 4: Guard-test regex bypass via string interpolation
**What goes wrong:** A future PR builds a `text-[${size}px]` class from a variable instead of a literal, silently reintroducing an arbitrary text size that a plain `text-\[\d+px\]` regex never catches.
**Why it happens:** This exact bypass is already named as "the reintroduction vector" in the existing `type-scale-floor.test.ts` file's own comment [VERIFIED: `__tests__/type-scale-floor.test.ts:85-90`, comment: "The reintroduction vector RESEARCH.md named (Pitfall 4): a literal-string scan is bypassed the moment a site builds the pixel value from a variable instead of a literal, e.g. className={`text-[${n}px]`}. This pattern catches that bypass so the literal scan above cannot quietly stop being sufficient." — that file already has a `DYNAMIC_INTERPOLATION_PATTERN = /text-\[\$\{/` test].
**How to avoid:** D-16 explicitly requires the new `arbitrary-text-sizes.test.ts` guard to "also reject interpolated `text-[${...}px]` as the TYPE-01 scan already does" — copy the existing `DYNAMIC_INTERPOLATION_PATTERN` regex verbatim rather than re-deriving it. Live re-check this session found zero current interpolation sites (both scans in `type-scale-floor.test.ts` currently pass), so this is purely a forward-guard, not a cleanup task.
**Warning signs:** N/A today — this is a "keep it from ever happening" guard, not a live violation.

### Pitfall 5: `npm run test`'s default concurrency can produce false-negative-looking failures unrelated to this phase's changes
**What goes wrong:** A batch commit's `npm run test` run shows several failed files that have nothing to do with the files the batch touched, making it look like the sweep broke something.
**Why it happens:** This is a pre-existing, already-diagnosed characteristic of this repo's Vitest setup, not something Phase 09 introduces: Phase 08's close-out diagnosed vitest's default-concurrency worker-pool as capable of producing resource-exhaustion failures on files untouched by the current change, confirmed by both isolated-file passes and a full-suite pass at `--maxWorkers=2` [VERIFIED: STATE.md line 123: "Diagnosed npm run test's default-concurrency 10-failed-file result as vitest worker-pool resource exhaustion, not a regression: the 8 affected files touch nothing this plan changed, pass 77/77 in isolation, and the full suite passes 1188/1188 at --maxWorkers=2."]. `vitest.config.ts` has no `maxWorkers` override [VERIFIED: `vitest.config.ts:1-19`, full file contents — no `maxWorkers`, `poolOptions`, or concurrency key present].
**How to avoid:** If a batch commit's CI or local `npm run test` run shows unrelated failures, re-run with `npx vitest run --maxWorkers=2` before concluding the batch introduced a regression, per the Phase 08 precedent.
**Warning signs:** Failures in files the current batch's diff never touched.

## Code Examples

### The exact D-08 hand-rolled-card detection regex, order-independent
```javascript
// Source: this session's live re-measurement, matches CONTEXT.md D-08's
// stated contract ("any class string containing bg-background-elevated, a
// rounded-* utility, and either border-border or border-border-strong, in
// any order")
function isHandRolledCard(classString) {
  const hasElevated = /bg-background-elevated/.test(classString)
  const hasRounded = /rounded-\S*/.test(classString)
  const hasBorderToken = /border-border-strong/.test(classString) || /\bborder-border\b/.test(classString)
  return hasElevated && hasRounded && hasBorderToken
}
```
Re-run against `app/` and `components/` this session (excluding `components/ui/card.tsx`): **227 matching lines across 73 files.**

### The existing guard-test scan primitives (reuse verbatim)
```typescript
// Source: __tests__/design-tokens/source-files.ts:37-49, 88-107 (read in full this session)
export function sourceFiles(roots: string[]): string[]
export function matchesIn(files: string[], pattern: RegExp): SourceMatch[]
```
Both new guards (`arbitrary-text-sizes.test.ts`, `hand-rolled-cards.test.ts`) call these exactly as `type-scale-floor.test.ts` does:
```typescript
// Source: __tests__/type-scale-floor.test.ts:93-98 (pattern to replicate, not the same regex)
it('finds no [violation] anywhere under app/ or components/', () => {
  const files = sourceFiles(['app', 'components'])
  const matches = matchesIn(files, SOME_PATTERN)
  const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
  expect(matches, report).toHaveLength(0) // or toHaveLength(ceiling) mid-ratchet, per D-16
})
```

### `baseline.mjs`'s current PAGES array (D-17 extends this)
```javascript
// Source: scripts/visual/baseline.mjs:29-32 (read in full this session)
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
]
```
D-17 adds two entries: `{ name: 'guild-settings', path: '/guild-settings', auth: true }` (with an added post-navigation step to expand the expansion-manager panel) and `{ name: 'loot-management', path: '/loot-management', auth: true }` (with an added click step to open `SettingsModal`, per `showSettingsModal` state in `app/(app)/loot-management/components/LootSettingsContent.tsx` — confirmed present at that file's `useState` declaration this session, though the exact button selector/line the click targets was not independently traced further than the state hook this session). The `auth: true` flag already routes a page through the existing `fetchTestUser`/dev-login flow (lines 143-166, 199-209) with no structural change needed beyond adding a post-navigation interaction step per page — `PAGES` entries do not currently support a "click step" field, so `main()`'s per-page loop (lines 211-276) needs a small, additive per-page hook (e.g., an optional `afterGoto: async (page) => {...}` field) rather than a rewrite.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `text-[Npx]` arbitrary Tailwind values | Named `fontSize` scale steps (`text-11` through `text-42`, now extending to `text-80`) | Phase 07 (2026-09) introduced the pixel-named alias steps specifically so this phase's codemod could map onto them by name [VERIFIED: `tailwind.config.js:43-46` comment: "Pixel-named aliases (TYPE-01, D-02): each one is a twin of the semantic step above it... so the Phase 09 codemod can map an arbitrary text-[Npx] literal onto a scale step by name, mechanically, without inventing a value."] | This phase is the reason the aliases exist; no further waiting on ecosystem changes |
| `Card`'s two variants (`default`, `unified`) | Three variants after this phase (`default`, `unified`, `nested`) | This phase (D-11) | Purely additive; existing call sites (11 files already importing `Card`) are unaffected by the new variant, only by the base radius change (D-06) |

**Deprecated/outdated:** None — this phase's dependencies (`typescript`, `vitest`, `puppeteer`) are current and already pinned project-wide; no version bump is part of this phase's scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact selector/click mechanics for opening `SettingsModal` from `/loot-management` and expanding the expansion-manager panel on `/guild-settings` are left to Claude's Discretion per CONTEXT.md and were not traced past the `showSettingsModal` state hook this session | Code Examples (baseline.mjs section) | The D-17 baseline script's click-step implementation may need one extra round of trial-and-error at execution time to find the right button text/selector; low risk, self-correcting via `--dry-run`-equivalent local testing of the script itself |
| A2 | The TypeScript compiler API code pattern shown in Architecture Pattern 2 (parse-mutate-print, avoiding `ts.transform()`) is standard practice, cross-referenced against one GitHub issue describing why the transform-pipeline alternative is risky, but was not verified by running an actual working codemod script this session | Architecture Patterns, Code Examples | If the exact `ts.factory.update*` call signatures used by the executor don't match the installed `typescript` version's API surface precisely, the executor will hit a compile error immediately (low risk — `tsc` will catch it at write time) rather than a silent bad rewrite |
| A3 | The ~51 heading-sized D-04 line-height-tightening sites and the exact D-06 "13 rounded-lg" / "11 files already importing Card" counts inherited from `09-CONTEXT.md`'s 2026-09-18 live re-inventory were only independently re-verified for the "11 files" claim (confirmed exact) — the "13 rounded-lg" claim did NOT reproduce (see Pitfall 1) and the 51-heading-site count was not independently re-measured this session | Common Pitfalls (Pitfall 1) | The planner must re-run the actual dry-run codemod report before the checkpoint rather than trusting either CONTEXT.md's or this document's counts for anything not explicitly marked `[VERIFIED]` above |

## Open Questions

1. **Does the D-06 "13 rounded-lg hand-rolled sites" figure use a narrower scope than this session's regex?**
   - What we know: order-independent re-measurement finds 24 `rounded-lg` lines among the 227 D-08 matches; exact-literal-order re-measurement finds 19; CONTEXT.md states 13.
   - What's unclear: whether CONTEXT's 13 excludes the 34 `border-border-strong` sites, a specific directory, or was computed before some Phase 08 edit shifted line content.
   - Recommendation: the planner's `hand-rolled-cards.mjs --dry-run` report is the authority; present its actual list at the checkpoint and name the delta from CONTEXT's "13" explicitly rather than resolving the discrepancy in this document.

2. **Whether `nested` should suppress its own top divider as a first child (`first:border-t-0`)** — already flagged in CONTEXT.md's Claude's Discretion and Deferred sections as "decided inside this phase's nested plan"; not re-litigated here, just confirmed present and unresolved as of this research.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `typescript` | `hand-rolled-cards.mjs` compiler-API codemod | ✓ [VERIFIED: `package.json:94`] | `^5` | — |
| `vitest` | Two new guard tests | ✓ [VERIFIED: existing test suite runs via `npm run test`] | `4.1.0` | — |
| `puppeteer` | `baseline.mjs` screenshot gate (D-17) | ✓ [CITED: `.github/workflows/ci.yml` comment referencing it as a Phase-07-added devDependency] | — (devDependency, version not re-checked this session) | — |
| Service-role key for `npm run test:users:create` | D-17's authenticated screenshot capture (dev test user seeding) | Not checked — per Phase 07 OI-6 precedent, the agent never reads/prints/writes this value; its presence in the user's shell is out of scope for this research | — | D-17's own documented fallback: Home-only capture plus end-of-phase UAT walkthrough |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** the service-role-key-gated authenticated capture has an explicit, already-decided fallback (D-17); not this research's concern to resolve further.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 [VERIFIED: `vitest.config.ts` present and used by existing `type-scale-floor.test.ts`] |
| Config file | `vitest.config.ts` (jsdom environment, `globals: true`, `@` alias to repo root; no `maxWorkers` override [VERIFIED: `vitest.config.ts:1-19`, full contents read]) |
| Quick run command | `npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/hand-rolled-cards.test.ts` |
| Full suite command | `npm run test` (= `vitest run` [VERIFIED: `package.json:18`, `"test": "vitest run"`]) — if unrelated failures appear, re-run with `npx vitest run --maxWorkers=2` per Pitfall 5 |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-03 | No `text-[Npx]` remains in `app/`/`components/`; ratchets to 0 across batches | unit (guard/regex scan) | `npx vitest run __tests__/arbitrary-text-sizes.test.ts` | ❌ Wave 0 — file does not exist yet |
| PRIM-01 | `components/ui/card.tsx` is the only card; no new hand-rolled card string; ratchets to 0 across batches | unit (guard/regex scan) | `npx vitest run __tests__/hand-rolled-cards.test.ts` | ❌ Wave 0 — file does not exist yet |
| PRIM-01 (nested variant) | `Card variant="nested"` renders only a top divider, no fill/border/radius | component test | new test file, e.g. `components/ui/__tests__/card.test.tsx` (no existing card component test found this session — none of `components/ui/*.test.tsx` currently cover `Card`) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/hand-rolled-cards.test.ts` plus `npm run lint` and `npm run typecheck` (Standing Constraint 3: CI green per commit)
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the D-17 screenshot gate as a non-test evidence artifact

### Wave 0 Gaps
- [ ] `__tests__/arbitrary-text-sizes.test.ts` — covers TYPE-03 (does not exist; D-16)
- [ ] `__tests__/hand-rolled-cards.test.ts` — covers PRIM-01 (does not exist; D-16)
- [ ] A component test asserting the `nested` variant's rendered output (base surface classes off, only `border-t border-border` present) — no existing `Card` component test found under `components/ui/__tests__/` or elsewhere this session
- [ ] `scripts/codemods/` directory itself does not exist yet [VERIFIED: `ls scripts/codemods` → error, no such directory]
- No framework install needed — Vitest, `typescript`, and Puppeteer are all already present.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Phase touches no auth code; `baseline.mjs`'s dev-login flow is pre-existing and gated on `NODE_ENV === 'development'`, unchanged by this phase except adding two more authenticated pages to the existing capture loop |
| V3 Session Management | no | No session code touched |
| V4 Access Control | no | No permission/RLS code touched — this phase edits only Tailwind classes, one component's base class string, and adds dev-only scripts/tests |
| V5 Input Validation | no | No user input path is created or modified; the codemod scripts run against the repo's own source files, not against any request or user-controlled data |
| V6 Cryptography | no | Not touched |

**No security-relevant surface is changed by this phase.** The one item worth naming explicitly: `scripts/visual/baseline.mjs` already refuses to run against any origin other than `localhost`/`127.0.0.1` [CITED: `scripts/visual/baseline.mjs:58-72`, `resolveOrigin()`] and never logs the service-role key (D-17 / Phase 07 OI-6 precedent) — this phase's extension of `PAGES` does not touch that guard.

### Known Threat Patterns for {stack}
Not applicable — no threat pattern from this phase's change surface (Tailwind class strings, one component's base class, two Node dev scripts, two Vitest test files, an extended screenshot script) maps to a STRIDE category in a security-relevant way. This section is intentionally near-empty; `security_enforcement: true` in `.planning/config.json` was checked and the section is included per policy, not because a threat was found.

## Sources

### Primary (HIGH confidence)
- `tailwind.config.js:28-57` — full `fontSize` block, read this session
- `components/ui/card.tsx:1-127` — full file, read this session
- `__tests__/design-tokens/source-files.ts:1-108` — full file, read this session
- `__tests__/type-scale-floor.test.ts:1-138` — full file, read this session
- `scripts/visual/baseline.mjs:1-298` — full file, read this session
- `__tests__/design-tokens/report.ts:1-117` — full file, read this session
- `vitest.config.ts:1-19` — full file, read this session
- `package.json`, `.github/workflows/ci.yml` — grepped/read this session for scripts, CI job structure, `typescript` dependency
- Live `grep`/`node` re-measurements this session: 932 `text-[Npx]` sites / 100 files; 227 D-08-matching card lines / 73 files; 24 order-independent `rounded-lg` matches (19 exact-order); 34 `border-border-strong` matches; 29 borderless matches / 18 files; 11 files already importing `Card` (exact list match to CONTEXT.md's named 11); 11 `bg-card` one-offs outside `card.tsx`; 12 `bg-background-inset` sites; 59 `border-t border-border` uses; 31 `divide-y divide-border` uses

### Secondary (MEDIUM confidence)
- github.com/microsoft/TypeScript/issues/57054 — "Compiler API doesn't transform JSX but tsc does", used to justify avoiding `ts.transform()` in favor of parse-mutate-print (WebSearch this session, not independently reproduced against this repo's exact TS version)

### Tertiary (LOW confidence)
- None — no claim in this document rests solely on unverified web search or training-data recall; the one WebSearch-sourced claim (Pitfall 3 / Alternatives Considered) is corroborated by a specific, named GitHub issue rather than general recollection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, both existing packages confirmed present and already exercised by CI
- Architecture: HIGH — every file this phase touches or reuses was read in full this session; the diagram and patterns are grounded in that reading plus live re-measurement
- Pitfalls: HIGH for Pitfalls 1, 2, 4, 5 (all directly reproduced or quoted from source this session); MEDIUM for Pitfall 3 (corroborated by a named external issue, not reproduced against a working script)

**Research date:** 2026-09-18
**Valid until:** Effectively the start of phase execution — this is a live-count-dependent migration phase; if execution starts more than a few days after this research (or after any further commits touch `app/`/`components/`), re-run the live `grep`/dry-run counts before finalizing the checkpoint's file lists, per CONTEXT.md's own instruction that "the planner re-measures at plan time; these are the discussion's baseline, not the plan's."
