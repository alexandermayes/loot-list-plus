# Phase 09 Plan 07: Cards-in-Cards Ancestry Enumeration: Checkpoint

**Status:** Task 1 complete and committed. Task 2 (`type="checkpoint:decision" gate="blocking-human"`) reached and halted here, per this plan's own `autonomous: false` frontmatter. Task 3 (conversion) has not run and will not run until the user answers this checkpoint.

**Commit:** `f1a5dfe6`: `feat(09-07): add JSX parent-chain ancestry check for cards inside cards`

**Corrected after the original halt:** DI-1 (a live functional regression found while preparing this checkpoint) was fixed in commit `e002f947` before this document was finalized. That fix changed the live ancestry count from 9 to 8 hits (removing `characters/[id]/edit/_client.tsx:474`, whose outer ancestor is a real `<form>` again, not a `<Card>`). This document reflects the corrected, current state throughout; see the "Out-of-scope discovery" section for the full story.

---

## Task 1: what was built

`scripts/codemods/nested-card-ancestry.mjs`: a read-only, 338-line script that:

- Resolves the same out-of-scope-path rejection, `app`/`components` scoping, and `node_modules`/`.next`/`.git` walk as `hand-rolled-cards.mjs` and `text-sizes.mjs`.
- For every `.tsx` file, first checks whether the file imports `Card` from `@/components/ui/card`; if not, skips the file entirely, so a locally-defined `Card` is never counted.
- Walks every `<Card>` opening/self-closing element and climbs its real `.parent` chain (via `ts.createSourceFile(..., /* setParentNodes */ true, ...)`) looking for the nearest enclosing JSX element whose own tag is also `Card`.
- Splits hits into `DIRECT` (immediately inside another `Card`, nothing in between) and `INDIRECT` (a `Card` ancestor exists, with other JSX elements/fragments between the two).
- Deliberately does **not** read `hand-rolled-card-pattern.json`'s `scanExclusions`: that list is D-08's guard-scope mechanism, an unrelated concern. `SettingsModal.tsx` is fully scanned despite being a `scanExclusions` entry (for one unrelated `<Button>` still matching the hand-rolled-card regex string).

Verified this session:
- `node scripts/codemods/nested-card-ancestry.mjs app` and `.../components` both exit 0.
- Two consecutive runs over `app` produce byte-identical stdout.
- `node scripts/codemods/nested-card-ancestry.mjs package.json` exits 1, naming the out-of-scope path.
- `git status --porcelain app components` is empty after every run (writes nothing).
- `npm run typecheck` exits 0; `npm run lint` reports 0 errors, 397 pre-existing warnings (unchanged baseline).

## 1. The enumerated list, verbatim

**Re-run after DI-1 was fixed (see below).** The version below is current; an earlier 9-hit run (before the fix) included `characters/[id]/edit/_client.tsx:474`, whose outer ancestor at line 386 was, at that time, a `<Card>` due to the DI-1 regression (a real `<form>` had been mis-converted to `<Card>`). Once DI-1 was fixed and that element reverted to `<form>`, that site is no longer a Card-inside-Card at all -- it is now a Card inside a form, outside this check's scope. The count below (8) is correct and current.

```
== DIRECT ==
(none)

DIRECT TOTAL: 0

== INDIRECT ==
app/(app)/loot-management/components/SettingsModal.tsx:200 (outer Card at :105) [Card > CardContent > Card] variant=absent className="border-border-strong p-4"
app/(app)/loot-management/components/SettingsModal.tsx:219 (outer Card at :105) [Card > CardContent > Card] variant=absent className="border-border-strong p-4"
app/(app)/loot-management/components/SettingsModal.tsx:306 (outer Card at :105) [Card > CardContent > Card] variant=absent className="border-border-strong p-4"
app/(app)/loot-management/components/SettingsModal.tsx:760 (outer Card at :704) [Card > CardContent > Card] variant=absent className="border-border-strong p-4"
app/(app)/loot-management/components/SettingsModal.tsx:805 (outer Card at :781) [Card > CardContent > Card] variant=absent className="border-border-strong p-4 space-y-3"
app/(app)/loot-management/components/SettingsModal.tsx:907 (outer Card at :781) [Card > CardContent > Card] variant=absent className="border-border-strong p-4 space-y-3"
app/(app)/loot-management/components/SettingsModal.tsx:948 (outer Card at :781) [Card > CardContent > Card] variant=absent className="border-border-strong p-4"
app/(app)/overview/components/DashboardContent.tsx:2365 (outer Card at :2341) [Card > div > Card] variant=absent className="p-3 sm:p-4"

INDIRECT TOTAL: 8

GRAND TOTAL: 8 card-in-card hit(s)
```

**Grouped by screen:**

| Screen | DIRECT | INDIRECT | Total |
|---|---|---|---|
| `app/(app)/guild-settings/components/ExpansionManager.tsx` | 0 | 0 | **0** |
| `app/(app)/guild-settings/components/GuildSettingsContent.tsx` | 0 | 0 | **0** |
| `app/(app)/loot-management/components/SettingsModal.tsx` | 0 | 8 | **8** |
| `app/(app)/overview/components/DashboardContent.tsx` | 0 | 1 | **1** |
| `app/(app)/characters/[id]/edit/_client.tsx` (post-DI-1-fix) | 0 | 0 | **0** |

## 2. Reconciliation against what was expected

CONTEXT.md D-12 names three screens: `ExpansionManager`, `GuildSettingsContent`, `SettingsModal`. The 2026-09-15 audit names `ExpansionManager.tsx:438-583`, `GuildSettingsContent.tsx:768-815`, and `SettingsModal.tsx` ("7 cards, 65 controls"). The live ancestry check does **not** reproduce this list cleanly: every discrepancy below is named, not silently resolved:

- **`ExpansionManager.tsx`: 0 hits, not the audit's named region.** The audit's 438-583 range is the guild-expansion tile: a per-expansion-colored outer container (`<div className="relative overflow-hidden rounded-xl border" style={{ background: visuals.bgColor, borderColor: ... }}>`, dynamic inline style, no static `bg-background-elevated`/`border-border` classes) wrapping an accordion whose expanded body is a real `<Card className="mx-3 mt-3 mb-3 p-4 space-y-5">` (line 584). That outer container was correctly **never migrated onto `<Card>`** by 09-05/09-06: it can't be, since `Card`'s fixed surface classes can't express a per-expansion dynamic background/border color, and the D-08 detection regex only matches static `bg-background-elevated`/`bg-card` classes. So today this is a `Card` nested inside a plain, dynamically-styled `<div>`, not a `Card`-inside-`Card`: invisible to a literal JSX-tag ancestry check, and correctly so: there is no second `<Card>` here to convert.
- **`GuildSettingsContent.tsx`: 0 hits, not the audit's named region.** The audit's 768-815 range is the "Danger Zone" panel (`isGuildCreator &&` block): an outer `<div className="bg-background-elevated border border-destructive/30 rounded-xl overflow-hidden">` (uses `border-destructive/30`, not `border-border`/`border-border-strong`: outside D-08's scope) wrapping three `<div className="rounded-lg border border-warning/30 bg-warning/10 p-4">` / `border-destructive/30 bg-destructive/10` boxes. None of these four elements use `bg-background-elevated`/`bg-card` + `border-border`/`border-border-strong` together, so none were ever migrated onto `<Card>`. Same conclusion as above: a real visual "boxes inside a box" pattern exists here today, but it is not `Card`-inside-`Card` in the literal tag sense this script (and D-12's own text: "a `Card` rendered directly inside another `Card`") is scoped to.
- **`SettingsModal.tsx`: 8 hits, not the audit's "7 cards."** All 8 are `INDIRECT` (`Card > CardContent > Card`): an outer `variant="unified"` settings-section `Card` whose `CardContent` wraps a conditionally-rendered inner `<Card className="border-border-strong p-4">` (or `p-4 space-y-3`) sub-panel. The live count is one more than the audit's estimate; per this workstream's established convention (Pitfall 1 in 09-RESEARCH.md; the ceiling-discrepancy pattern in every 09-0X SUMMARY so far), the live, script-produced count is authoritative and named here rather than forced to match "7."
- **One site neither CONTEXT.md nor the audit named, found live:**
  - `app/(app)/overview/components/DashboardContent.tsx:2365`: inside the "Recently received" panel, `receivedItems.map(...)` renders a `<Card className="p-3 sm:p-4">` per item inside the outer panel `Card`'s `<div className="space-y-2 sm:space-y-3">` list wrapper.
- **A second such site, `app/(app)/characters/[id]/edit/_client.tsx:474`, was found on the first run of this script but is no longer a hit as of this checkpoint.** Its outer ancestor at line 386 was, at that time, a `<Card>` -- the DI-1 regression (09-06's codemod had mis-converted a real `<form onSubmit={handleSubmit}>` to `<Card onSubmit={handleSubmit}>`, breaking the Save button). DI-1 was found and fixed during this same checkpoint's preparation (see below): line 386 is now a real `<form>` again, so the membership-row `Card` at line 474 is a Card inside a form, not a Card inside a Card, and correctly no longer appears in this enumeration.
- **Every DIRECT hit acceptance criterion in the plan's own Task 1 text does not hold on live measurement.** The plan expected "at least one `DIRECT` hit in each of `ExpansionManager.tsx`, `GuildSettingsContent.tsx` and `SettingsModal.tsx`." The live count is **zero `DIRECT` hits anywhere in the tree**. Every real hit found is `INDIRECT`: there is always at least `CardContent`, or a plain layout `div`, between the outer and inner `Card`. This is named here rather than adjusted after the fact; the script was not changed to manufacture a `DIRECT` result.
- **A named limitation, not a finding:** this check walks one file's AST at a time, so it cannot see a card-in-card relationship that crosses a component boundary (e.g., a component whose own top-level element is `<Card>`, rendered as a child *inside* another file's `<Card>`). Spot-checked for this phase's own three named screens: `MemberManager` (rendered inside `GuildSettingsContent`'s `<Card>`) does not itself render a `Card`; `BillingSection` and `InviteCodeManager` (both start with their own top-level `<Card>`) are rendered as top-level siblings in `GuildSettingsContent`, not nested inside another `Card`. No cross-component nesting was found in the three named screens by this spot check, but this is not an exhaustive repo-wide claim the way the single-file AST walk itself is.

## 3. Before/after for each candidate

**No screenshot evidence is available for this checkpoint.** The committed `.planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/` capture is Home-only (WINDOWS.md entry 10: `GET /api/dev/test-users` returned 404 at capture time, so `/guild-settings`, `/loot-management` and `/overview` were all skipped, exactly the D-17 fallback path). There is no "before" image of any of these three screens to compare against. Per the D-17 fallback and this workstream's 07/08 precedent, the visual comparison for these screens is textual here and routed to end-of-phase UAT, not assumed.

**SettingsModal.tsx (8 sites, one shape).** Today: an outer `variant="unified"` `Card` (default border + `bg-card` fill) renders a `CardHeader` then a `CardContent`; conditionally, `CardContent` renders an inner `<Card className="border-border-strong p-4">`: a second full border/fill/radius box, directly adjacent (only the `CardContent`'s own padding between the outer border and the inner one). Every one of the 8 sites is a conditional "when this setting is on, show its sub-fields in a distinguished box" panel: none is the first thing rendered in its `CardContent` (each is preceded by other fields; see item 5). As `variant="nested"`: the inner region loses its own border, fill and radius, replaced by a single `border-t border-border` top divider; the outer `Card`'s single border becomes the only full border in the row. **Named visual delta:** `nested` has no equivalent of `border-border-strong`: converting these sites accepts losing that emphasis token, not just "removing the second border." This is a real, visible change (a full boxed sub-panel becomes a divided section) and needs explicit sign-off, not just the padding-preserved framing D-07 covers for the rest of the phase.

**`DashboardContent.tsx:2365` (list-of-item-cards).** Today: the outer "Recently received" `Card` contains a `<div className="space-y-2 sm:space-y-3">` list of per-item `<Card className="p-3 sm:p-4">` rows, each independently bordered/radiused: a stack of boxed rows inside a bordered container. As `variant="nested"`: each row would lose its own border/radius and gain a top divider instead, turning the stack of separate boxes into a single divided list (like a table). This changes the read from "cards in a container" to "list rows in a container": a bigger structural read change than a simple border removal, and it is a repeating pattern (one per received item), not a single fixed panel.

**`characters/[id]/edit/_client.tsx:474`: no longer a candidate.** DI-1 (below) was fixed during this checkpoint's preparation: line 386 is a real `<form>` again, not a `<Card>`, so the membership-row `Card` at line 474 sits inside a form, not inside another Card. It is out of scope for this checkpoint entirely, not merely a "leave alone" disposition.

## 4. The INDIRECT hits, individually: proposed disposition

| Site | Ancestry | What's between | Proposed disposition | Reason |
|---|---|---|---|---|
| SettingsModal.tsx:200, :219, :306, :760, :805, :907, :948 (7 sites, one outer at :105/:704/:781 each) | `Card > CardContent > Card` | Only `CardContent`'s own padding: no border, no fill of its own | **Convert to `variant="nested"`** | `CardContent` draws nothing visually; the outer border and inner `border-border-strong` box read as a genuine, adjacent double border today. This is exactly the pattern D-10/D-11's `nested` variant exists for. |
| DashboardContent.tsx:2365 | `Card > div > Card` | A layout-only `div` (`space-y-2 sm:space-y-3`), but the inner `Card` repeats once per list item via `.map()` | **Leave as a real separate card level (do not convert)**: recommended, not decided | This is a list-of-item-cards pattern, not a single fixed sub-panel. Converting to `nested` turns a stack of boxed rows into a divided list, a bigger structural change than "remove the second border": a call the checkpoint should make explicitly, not inherit from the panel-conversion default. |

## 5. The first-child divider question, now decidable

**Count of enumerated sites that are first children of their parent `Card`: 0 of 8.** Every one of the 8 hits is preceded by other rendered content inside its immediate JSX parent (form fields in every SettingsModal case; nothing in DashboardContent's case is literally "first" either: the panel header `div` at line 2342 precedes the list). So neither answer to this question changes anything about *this* plan's own converted screens: the choice only sets policy for Phase 10's 12 inset-surface sites, which will migrate onto this same `nested` contract next.

**Recommendation: suppress it in the primitive** (a `first:border-t-0`-style modifier on the `nested` class string). This matches D-11's "no call site has to remember" principle and costs nothing today since no current site is affected either way; it only helps Phase 10 avoid re-discovering the same edge case per call site.

## 6. What stays untouched

- Phase 10's 12 `bg-background-inset` sites are not in this list and are not converted here; they migrate onto the `nested` contract in Phase 10 under COLOR-03 (D-12, D-13).
- Padding, gap and layout on every converted site pass through unchanged; conversion removes the second border (and, for the `border-border-strong` sites, the emphasis token: named explicitly in item 3 above, not silently folded into "spacing unchanged"). Card padding normalisation is milestone C.

---

## Out-of-scope discovery found during reconciliation (fixed, not left for later)

**DI-1** (full detail in `deferred-items.md`, ledger entry `.planning/WINDOWS.md#12`): `app/(app)/characters/[id]/edit/_client.tsx:386`: 09-06 Task 2's codemod run renamed a real `<form onSubmit={handleSubmit}>` to `<Card onSubmit={handleSubmit}>`. `Card` renders a `<div>`; a `<div onSubmit={...}>` never fires, and the "Save changes" button on this page (a bare `type="submit"` with no `onClick`) did nothing when clicked. This was a live functional regression from a prior plan, unrelated to this plan's own `files_modified` and to the card-in-card conversion decision. **Fixed** (commit `e002f947`, before this checkpoint's ancestry re-run above): reverted the element to `<form>` with its original surface classes, added `form` to `hand-rolled-cards.mjs`'s interactive-tag denylist, and added the file to `hand-rolled-card-pattern.json`'s `scanExclusions` (17 entries). Full suite green after. `.planning/WINDOWS.md`'s ledger CLI was also broken this session (entry 11 had an invalid `"resolved"` status, not a valid ledger enum value) and was repaired as part of closing this out; DI-1 is now logged as ledger entry 12, `status: fixed`.

---

## Decision needed

Reply with one of:
- `approve-direct-only`: converts nothing (0 `DIRECT` hits exist today; this option is a no-op for this plan, though it keeps the rule simple for future sweeps).
- `approve-with-indirect`: convert all 8 `INDIRECT` hits, including the DashboardContent list-of-item-cards site this checkpoint recommends leaving alone.
- **A hybrid option this checkpoint recommends:** convert the 7 SettingsModal panel sites only (item 4's row), leave DashboardContent's list-of-item-cards site unconverted this plan, routed forward by name.
- `narrow`: convert nothing beyond exactly `ExpansionManager`/`GuildSettingsContent`/`SettingsModal` as CONTEXT.md named them; since `ExpansionManager` and `GuildSettingsContent` have zero ancestry hits today, this converts only SettingsModal's 7 sites (identical outcome to the hybrid option above, minus its "routed forward" framing for DashboardContent's site).
- `defer`: convert nothing; record the enumerated list and route it forward. `nested` still exists, satisfying Phase 10's dependency.

Plus, independently: `suppress-first-child` or `call-site-first-child` for item 5 (recommendation: `suppress-first-child`).

Name any individual site to exclude from whichever option is chosen.
