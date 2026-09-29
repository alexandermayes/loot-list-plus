# Phase 09: Type and Card Migration - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Every screen sizes its text through the Tailwind scale and draws its cards through `components/ui/card.tsx`, with a committed codemod, guard tests that fail on the next hand-rolled one, and a new `nested` Card variant that Phase 10 will migrate the inset sites onto. This phase edits `tailwind.config.js` (additive display aliases only), `components/ui/card.tsx`, the roughly 100 files carrying arbitrary `text-[Npx]` classes and the roughly 55 files carrying hand-rolled card strings under `app/` and `components/`, adds `scripts/codemods/`, two new guard tests under `__tests__/`, and extends `scripts/visual/baseline.mjs`. It does not delete `--background-inset` or migrate its 12 uses (Phase 10), does not tune per-screen density (milestone C), does not normalise card padding (milestone C), does not document the new variant on the design-system page (Phase 12), and changes no user-facing copy.

Live re-inventory at discussion time (2026-09-18), superseding the audit's numbers: 932 `text-[Npx]` sites in 100 files (879 map onto an existing alias, 53 do not); about 228 hand-rolled card lines under the order-independent scope defined in D-08 (160 in the audit's exact string order, 34 using `border-border-strong`). The planner re-measures at plan time; these are the discussion's baseline, not the plan's.

Requirements: TYPE-03, PRIM-01.

</domain>

<decisions>
## Implementation Decisions

Hard constraints inherited from the roadmap: no user-facing copy changes; nothing is edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint, where the executor presents the batch plan (files per batch, the full pixel mapping table, the list of every site whose rendering changes) and waits; CI green on every commit; screenshot comparison before the first edit and after the last.

### Off-scale sizes and the mapping rule
- **D-01:** Extend `tailwind.config.js` `fontSize` with eight display aliases, `text-28`, `text-40`, `text-44`, `text-48`, `text-56`, `text-64`, `text-72`, `text-80`, as literal steps in the same authoring style as the Phase 07 aliases. The codemod maps every one of the 44 display-size sites (landing hero and sections, pricing, about, six app stat tiles, the UpgradeModal price) onto its exact-value alias, so the sacred hero H1 renders pixel-identical and success criterion 1 reaches zero. | Reversibility: costly: once the landing files are on the aliases, removing a step means re-sweeping those files.
- **D-02:** Midpoint sizes round up: `text-[17px]` (one site, `LandingLootDecision`) becomes `text-18`; `text-[22px]` (one site, `PremiumItemTooltip`) becomes `text-24`. No `text-17` or `text-22` alias is added. Both deltas are named at the checkpoint.
- **D-03:** The two `text-[8px]` sites in `app/(app)/master-sheet/components/BossSection.tsx` (the "tied" chip and the gap number) rise to `text-11`, the TYPE-01 floor. This is a visible change on the master sheet and is named at the checkpoint.
- **D-04:** The alias line-height is accepted as the scale's intent. Arbitrary `text-[Npx]` sets only font-size; the aliases set font-size plus line-height (1.5 through 16px, 1.2 from 18px to 32px, 1.02 at 42px). Sites at 16px and below are unaffected (inherited 1.5 equals alias 1.5). About 51 heading-sized sites (18px to 80px) with no `leading-*` class tighten from inherited 1.5 to the scale's value; they are listed by file at the checkpoint and reviewed in the screenshot gate, not pinned with `leading-normal`. The new display aliases follow their neighbours: 28, 40, 44 and 48 carry line-height 1.2; 56, 64, 72 and 80 carry 1.02.
- **D-05:** Per-screen density tuning after the Phase 07 11px raise is out of this phase, milestone C only. The sweep targets pixel-identical rendering for everything at 16px and below. Anything the screenshot gate flags as cramped, clipped or wrapped is recorded by screen and routed to milestone C, never fixed inline.

### Card fidelity: radius, padding, scope
- **D-06:** `Card`'s base radius changes from `rounded-lg` to `rounded-xl`, matching the 136 of 149 exact-string hand-rolled cards that already draw 12px. The 13 `rounded-lg` hand-rolled sites and the cards in the 11 files that already import `Card` (`sheet-import`, `admin/addon`, `admin/analytics`, `reserve`, `reserve/runs/[id]`, `design-system`, `dev-login`, `ExpansionGuard`, `guild-select/discord-join`, `reserve/join/[token]`, `SettingsModal`) gain 4px of radius; every such site is listed at the checkpoint. | Reversibility: reversible: one class in `card.tsx`, but reverting after the sweep changes 200-plus sites at once.
- **D-07:** Padding, gap, layout and every other class on a migrated site pass through unchanged via `className`. The codemod replaces only the surface classes (`bg-background-elevated`, `border`, `border-border` or `border-border-strong`, `rounded-*`) with `<Card className="...">`, keeping the rest verbatim, so the swap is pixel-identical by construction and criterion 5 holds for the card sweep without judgement. Padding normalisation onto a Card padding contract is milestone C.
- **D-08:** A hand-rolled card, for both the codemod and the guard, is any class string containing `bg-background-elevated`, a `rounded-*` utility, and either `border-border` or `border-border-strong`, in any order. `border-border-strong` containers (34 lines, concentrated in `SettingsModal.tsx` and `GuildSettingsContent.tsx`) become `<Card className="border-border-strong ...">` so their emphasis is kept. The roughly 29 lines with `bg-background-elevated` and `rounded-*` but no `border-border` token (pills, wells, inputs) are inventoried at plan time and excluded from both the sweep and the guard. The guard regex is order-independent.
- **D-09:** `components/ui/skeletons.tsx`'s 20 hand-rolled card shells migrate to `Card` like every other site, padding passed through, with no guard exemption, so a loading card and its loaded card share radius and border by construction.

### The nested variant and cards-in-cards
- **D-10:** `nested` paints a divider only: no fill, no border, no radius. It is a transparent region inside its parent `Card`, separated by `border-t border-border` (the app's existing 59-use divider idiom), with padding passed through like every other site. | Reversibility: costly once Phase 10 has moved the inset sites onto it.
- **D-11:** `nested` is exposed as `<Card variant="nested">`, extending the existing `CardVariant` union (`default | unified`). `Card`'s base surface classes (background, border, radius) are switched off for this variant. No separate `CardSection` export, no alias.
- **D-12:** Cards inside cards are handled in two steps. The sweep batches turn every in-scope string into plain `Card` mechanically, leaving today's double borders exactly where they are (pixel-identical). A final, separate plan uses a DOM-ancestry check (JSX parent chain, not regex) to enumerate every `Card` rendered directly inside another `Card`, converts that list to `variant="nested"` on the three named screens (`ExpansionManager`, `GuildSettingsContent`, `SettingsModal`) plus any others the check finds, and presents before/after at its own checkpoint. Phase 10's 12 `bg-background-inset` sites stay Phase 10's.
- **D-13:** Phase 09's card guard matches `bg-background-elevated` shapes only. The five card-shaped `bg-background-inset` lines are not flagged here; Phase 10, whose criterion 1 already asserts the token is gone, widens the guard when it migrates them. No temporary allowlist.

### Batching, codemod, guards and the screenshot gate
- **D-14:** Batches are cut by concern, then by directory. The type sweep lands first in directory batches (landing and public pages; `app/components`; `app/(app)` split into two or three route groups; `components/ui`), then the card sweep runs over the same batch boundaries, then the enumerated nested plan (D-12). Roughly 8 to 10 batch commits, each one kind of diff, each green on lint, typecheck and test.
- **D-15:** The codemod is two Node scripts under `scripts/codemods/` with no new dependencies. `text-sizes.mjs` rewrites `text-[Npx]` from a committed JSON mapping table (pixel value to alias, including D-01 to D-03), supports `--dry-run` and a scoped path argument, and prints a per-file, per-value report that the checkpoint and the evidence doc cite. `hand-rolled-cards.mjs` uses the already-installed `typescript` package's compiler API to locate the JSX element, swap the tag to `Card`, strip the surface classes per D-07/D-08, and add or extend the `@/components/ui/card` import. Both are idempotent and re-runnable per directory so a batch can be regenerated rather than hand-patched. | Reversibility: reversible.
- **D-16:** Guards ratchet from batch one and reach zero at the last. Two new files, `__tests__/arbitrary-text-sizes.test.ts` (TYPE-03) and `__tests__/hand-rolled-cards.test.ts` (PRIM-01), reuse `sourceFiles` and `matchesIn` from `__tests__/design-tokens/source-files.ts`. Each asserts the live count is at most a committed ceiling; every batch commit lowers its ceiling in the same commit; the final batch of each sweep sets it to zero and removes the ceiling constant. The type guard also rejects interpolated `text-[${...}px]` as the TYPE-01 scan already does.
- **D-17:** The screenshot gate is met by extending `scripts/visual/baseline.mjs`. `PAGES` gains `/guild-settings` (with the expansion manager panel expanded) and `/loot-management` with a click step that opens `SettingsModal`, giving 5 pages x 2 themes x 2 widths = 20 images per capture, before the first edit and after the last, committed under `.planning/workstreams/design-system/baselines/` per Phase 07 D-15. Precondition: the user runs `npm run test:users:create` with the service-role key in their own shell before the before-capture so `/api/dev/test-users` returns a user; the agent never reads, prints or writes that value (Phase 07 OI-6 precedent). If the precondition is not met at the plan's checkpoint, the capture falls back to Home-only plus an end-of-phase UAT walkthrough of the three screens, and that fallback is recorded in the evidence doc, not assumed.

### Claude's Discretion
- Exact batch order across the `app/(app)` route groups and where the two-or-three-way split falls; report the file counts per batch at the checkpoint.
- The codemod report's exact format, as long as it lists every file, every pixel value, the alias it became, and (for cards) every element rewritten.
- The ratchet ceilings per batch (D-16); they are whatever the live count is after that batch.
- Whether `nested` suppresses its own top divider when it is the first child of a `Card` (for example `first:border-t-0`) or leaves that to the call site; propose at the checkpoint of the nested plan.
- Widening `type-scale-floor.test.ts`'s sub-11px scan from the literal 9px/10px check to any `N < 11` so the 8px case (D-03) cannot recur; small, in the spirit of TYPE-01.
- Whether the 13 `bg-card` one-offs outside `card.tsx` are card shapes; if they carry a border token and a radius, treat `bg-card` as a synonym of `bg-background-elevated` in both codemod and guard and report them at the checkpoint, otherwise inventory them with the borderless lines.
- The mechanics of the `SettingsModal` click step and the expansion-panel expansion in `baseline.mjs` (selectors, waits), and the file naming for the three new pages.
- Whether the mapping table JSON lives beside the codemod or under `__tests__/design-tokens/fixtures/` so the guard can assert the table's values are all valid aliases.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Findings and scope
- `.planning/workstreams/design-system/ROADMAP.md` §Phase 09 - goal, success criteria 1 to 5, the risk note (batch plan at the checkpoint, guards before the final batch, screenshot gate), the hard constraints, and §Phase 10's dependency on the `nested` variant
- `.planning/workstreams/design-system/REQUIREMENTS.md` - TYPE-03 and PRIM-01 wording
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` - the audit: the 1,044 arbitrary sizes by value, the 166 hand-rolled card strings, the cards-in-cards locations (ExpansionManager 438-583, GuildSettingsContent 768-815, SettingsModal)

### Prior phase decisions this phase builds on
- `.planning/workstreams/design-system/phases/07-token-foundation/07-CONTEXT.md` - D-02 pixel aliases (the codemod's targets), D-03 density deferral, D-14/D-15 baseline set and storage, D-16 and OI-6 credential boundary
- `.planning/workstreams/design-system/phases/07-token-foundation/07-EVIDENCE.md` - the shipped alias table and `## Carried forward` item 6 (the alias line-height consequence, routed here)
- `.planning/workstreams/design-system/phases/08-primitive-contracts/08-CONTEXT.md` - the sibling-consistency and scope-discipline throughline
- `.planning/workstreams/design-system/phases/08-primitive-contracts/08-EVIDENCE.md` - the `## Guard inventory` table format this phase's evidence must extend, and the Home-only baseline limitation

### Code this phase changes or reuses
- `components/ui/card.tsx` - `CardVariant` union, `CardContext`, base class string (`rounded-lg border border-border bg-card text-card-foreground`)
- `tailwind.config.js` §`fontSize` - the Phase 07 alias block and its comment convention
- `__tests__/type-scale-floor.test.ts` and `__tests__/design-tokens/source-files.ts` - the guard-test pattern and the `sourceFiles`/`matchesIn` helpers
- `scripts/visual/baseline.mjs` - `PAGES`, `VIEWPORTS`, `fetchTestUser`, the dev-login flow
- `app/api/dev/test-users/route.ts` and `scripts/create-test-users.ts` - what the authenticated capture depends on
- `.github/workflows/ci.yml` - the single lint/typecheck/test job, `PUPPETEER_SKIP_DOWNLOAD=1`

### Design quality bar
- `.claude/skills/impeccable/reference/craft-floor.md` - the Verify and Refuse lists (type floor, nested cards)
- `.claude/skills/impeccable/reference/document.md` - the DESIGN.md schema Phase 12 needs; record the eight display steps, the radius change and the `nested` contract in a shape it can consume

### Project conventions
- `.claude/CLAUDE.md` - no em dashes, kebab-case files, vitest in `__tests__`, CI facts
- `.planning/PROJECT.md` §Key Decisions - the hero H1 is sacred; D-01 exists so its rendering intent does not change

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx`: `CardVariant` plus `CardContext` already let sub-components react to the variant; `nested` (D-10/D-11) is a third union member that switches the base surface classes off, not a new component
- `tailwind.config.js` `fontSize`: eleven pixel aliases (`11` to `42`) shipped in Phase 07 in literal-tuple style with an explanatory comment; the eight display aliases (D-01) follow the same shape
- `__tests__/design-tokens/source-files.ts`: `sourceFiles(roots)` and `matchesIn(files, regex)` are the scan primitives every existing guard uses; the two new guards (D-16) reuse them
- `__tests__/design-tokens/report.ts`: the committed-script-not-hand-typed-numbers convention for evidence; the codemod report (D-15) plays the same role for the mapping
- `scripts/visual/baseline.mjs`: `PAGES` array, `--label` argument, dev-login flow, skip recording in `manifest.json`; D-17 extends `PAGES` and adds a click step
- `typescript` is already a dependency, so the card codemod (D-15) can parse JSX without adding jscodeshift or ts-morph
- The app's divider idiom is already `border-t border-border` (59 uses) and `divide-y divide-border` (31 uses); `nested` (D-10) uses the former
- `--card` equals `--background-elevated` in both themes (`app/globals.css` 135/144 light, 222/236 dark), so swapping `bg-background-elevated` for `Card`'s `bg-card` paints identically

### Established Patterns
- Guard tests live at the repo's `__tests__/` root, scan `app/` and `components/`, and reject interpolated escapes; Phase 08 extended `type-scale-floor.test.ts`, this phase adds sibling files (D-16)
- Every phase in this workstream ships a numbered evidence doc with a `## Guard inventory` table and a `## Carried forward` list with named destinations; the planner should reserve a final evidence plan as Phases 07 and 08 did
- Credentials never pass through the agent: Phase 07 OI-6 set the user-shell-export precedent that D-17 follows for the service-role key
- Baselines are committed under `.planning/workstreams/design-system/baselines/<date>-<label>/` (07 D-15); the three existing captures are `2026-09-16-pre-phase-07`, `2026-09-16-post-phase-07`, `2026-09-18-post-phase-08`
- The user has approved the recommended option in every gray area across three phases when it meant reusing an existing sibling and keeping sweeps mechanical; deviations belong at a checkpoint, not in a batch

### Integration Points
- Phase 10 depends on `nested` existing with the D-10 contract; the 12 `bg-background-inset` sites (5 card shapes, 2 progress tracks, 3 pills, 1 hover state, per the discussion inventory) are its migration targets, not this phase's
- `app/(app)/design-system/_client.tsx` documents Card today; the `nested` entry and the display-step table update are Phase 12 ENF-03, not this phase, unless a typecheck forces a minimal edit (Phase 08 precedent)
- `SettingsModal` opens from `showSettingsModal` state in `app/(app)/loot-management/components/LootSettingsContent.tsx:181`; the baseline click step (D-17) drives that button
- `.planning/WINDOWS.md` holds the open unrun-verify entries; any capture skipped under the D-17 fallback is recorded there as Phases 07 and 08 did
- The landing files (`app/components/landing/*`, `app/pricing/page.tsx`, `app/about/page.tsx`) are inside criterion 1's scope for the mechanical alias swap but are otherwise milestone B territory; the type sweep changes their classes, never their layout or copy

</code_context>

<specifics>
## Specific Ideas

- The throughline of every answer: pixel-identical mechanical sweeps, with the only judgement (cards-in-cards to `nested`) isolated in one enumerated plan behind its own checkpoint, and the only accepted visual deltas (D-02, D-03, D-04, D-06) named per file before any edit.
- The checkpoint must carry lists, not counts: every site whose radius, size or line-height changes, per file and line, and the batch boundaries with file counts.
- Guards should be live from the first commit (the ratchet), so "CI green per commit" means the sweep is provably monotonic, not just compiling.
- The service-role key stays in the user's shell; the agent's job is to make the capture script work once a test user exists, and to record honestly when it did not.

</specifics>

<deferred>
## Deferred Ideas

- Per-screen chip density tuning after the 11px raise (Sidebar, BossSection, MemberManager, changelog): milestone C, confirmed out of Phase 09 (D-05).
- Padding normalisation of migrated cards onto a Card padding contract (a `padding` prop or the `unified` variant): milestone C (D-07).
- The five card-shaped `bg-background-inset` lines and widening the card guard to cover the inset token: Phase 10, COLOR-03 (D-13).
- Documenting `nested`, the eight display steps and the `rounded-xl` radius on the design-system page and in DESIGN.md: Phase 12, ENF-01 and ENF-03.
- The roughly 29 borderless `bg-background-elevated` + `rounded-*` lines: inventoried at plan time, not scheduled to any phase (D-08).
- Whether `nested` should suppress its top divider as a first child: decided inside this phase's nested plan, noted here only so the planner does not drop it.

</deferred>

---

*Phase: 09-type-and-card-migration*
*Context gathered: 2026-09-18*
