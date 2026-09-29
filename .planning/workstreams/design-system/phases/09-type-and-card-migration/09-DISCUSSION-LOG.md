# Phase 09: Type and Card Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-18
**Phase:** 09-type-and-card-migration
**Areas discussed:** Off-scale pixel mapping, Card contract, What counts as a card, The nested variant and cards-in-cards, Batches and the screenshot gate, Cross-session reconciliation

**Process note.** Two Claude Code sessions ran `/gsd-discuss-phase 09 --ws design-system` concurrently on the evening of 2026-09-18 (both started within a minute of each other at about 15:33 PDT, discovered at about 18:20 when the checkpoint file changed under one of them). The user chose the `claude --continue` session to finish. Where both sessions asked the same question the answers agreed; the three divergences (padding, card-match definition, nested timing) were put back to the user in the finishing session and are marked below. Questions asked only in the other session are included from its checkpoint so the log is complete.

---

## Off-scale pixel mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve every value | Add 28, 40, 44, 48, 56, 64, 72, 80 as pixel-named steps; zero visual change; scale grows to 19 sizes | ✓ |
| Curated display ramp | Add 28, 40, 48, 56, 64, 72; snap 44 to 42 and 80 to 72 | |
| Tight ramp, snap the rest | Add 48, 56, 72 only; snap about 40 sites including the hero at mobile | |

**User's choice:** Preserve every value (also chosen in the other session as "Add display aliases").

| Option | Description | Selected |
|--------|-------------|----------|
| Ties round up | 17 to 18, 22 to 24, 8 to 11 | ✓ |
| Ties round down | 17 to 16, 22 to 20, 8 to 11 | |
| Add 17 and 22 as steps too | Zero change, two one-off steps | |

**User's choice:** Ties round up (both sessions).

| Option | Description | Selected |
|--------|-------------|----------|
| Accept the scale's line-height | Unstyled heading sites tighten from inherited 1.5 to 1.2/1.02; new display steps follow neighbours; sites listed and reviewed at the gate | ✓ |
| Pin old behaviour with leading-normal | Add leading-normal to every affected site | |
| Split by surface | Different rule for landing vs app | |

**User's choice:** Accept the scale's line-height (asked in the other session; premise verified in the finishing session: 37 lines at 18px+ without a leading class).

| Option | Description | Selected |
|--------|-------------|----------|
| Strictly mechanical | Size remap only; anything cramped goes to a milestone C list | ✓ |
| Fix breakage, defer taste | Fix clipped/overflowing text in a follow-up commit inside the phase | |
| Tune the named hotspots | Also tune changelog chips, sidebar labels, master-sheet badges | |

**User's choice:** Strictly mechanical (both sessions).

| Option | Description | Selected |
|--------|-------------|----------|
| Any arbitrary font-size | Guard fails on text-[<length>] for px, rem, em, unitless | ✓ |
| Pixel values only | Guard matches text-[Npx] literally | |

**User's choice:** Any arbitrary font-size.

---

## Card contract

| Option | Description | Selected |
|--------|-------------|----------|
| Card becomes rounded-xl | Matches the majority and the Modal panel; existing Card sites gain 4px | ✓ |
| Card stays rounded-lg | 177 hand-rolled sites tighten on migration | |
| Add a radius prop | Every site keeps its corner; two styles stay legal | |

**User's choice:** Card becomes rounded-xl (both sessions).

| Option | Description | Selected |
|--------|-------------|----------|
| Padding prop with a small set | none/sm/md/lg, nearest-step mapping | (finishing session, first pass) |
| Everything onto unified | p-4 sm:p-6 everywhere | |
| className override per site / Pass-through | Only surface classes replaced; p-* kept verbatim; pixel-identical | ✓ (other session; confirmed on reconciliation) |

**User's choice:** Pass-through via className. **Divergence resolved:** the finishing session had first chosen the padding prop; when the two answers were put side by side the user kept pass-through and deferred padding normalisation to milestone C.

| Option | Description | Selected |
|--------|-------------|----------|
| Wrapper only | Replace the outer div; children including headings untouched | ✓ |
| Wrapper plus header where obvious | Also wrap a leading heading in CardHeader/CardTitle (resizes it) | |

**User's choice:** Wrapper only.

---

## The nested variant and cards-in-cards

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width divider lines / Divider only | No fill, no border, no radius; border-t border-border edge to edge | ✓ |
| Inset divider lines | Line indented to content padding | |
| Tinted well | bg-background-subtle, no border | |
| Spacing only, no lines | Vertical gap alone | |

**User's choice:** Divider only, full width (both sessions).

| Option | Description | Selected |
|--------|-------------|----------|
| `<Card variant="nested">` | Extend the CardVariant union | ✓ |
| A separate `<CardSection>` export | New sub-component | |
| Both | Variant plus alias | |

**User's choice:** `<Card variant="nested">` (asked in the other session).

| Option | Description | Selected |
|--------|-------------|----------|
| Inner cards become nested now, inside the sweep | Each batch decides nested vs plain | (finishing session, first pass) |
| Final enumerated plan, own checkpoint | Plain Card in batches; DOM-ancestry list; second approval | (other session) |
| Final enumerated plan, one go-ahead | Plain Card in batches; DOM-ancestry list part of plan-01 go-ahead; before/after at the phase gate | ✓ |
| Plain Card everywhere; nested ships unused | Nesting fix left to Phase 10 | |

**User's choice:** Final enumerated plan under the single go-ahead. **Divergence resolved:** the two sessions agreed inner cards become nested in Phase 09 and differed on sequencing and on whether a second checkpoint exists; the user chose the enumerated final plan with no second pause.

| Option | Description | Selected |
|--------|-------------|----------|
| No: guard matches elevated only; Phase 10 extends it | The five card-shaped bg-background-inset lines are Phase 10's | ✓ |
| Yes, with a temporary allowlist | | |
| Yes, and migrate the five to nested now | | |

**User's choice:** No (asked in the other session).

---

## What counts as a card

| Option | Description | Selected |
|--------|-------------|----------|
| All of app/, components/ui exempt | Public and authenticated pages migrate; primitives keep their own chrome | ✓ |
| Authenticated app only | Mirror Phase 10's COLOR-07 scoping | |
| app/ and components/ both | Primitives compose Card too | |

**User's choice:** All of app/, components/ui exempt (except card.tsx and skeletons.tsx).

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate them onto Card | 20 skeleton shells track Card's radius | ✓ |
| Leave them, exempt file | | |
| Migrate, but keep a Skeleton-specific wrapper | | |

**User's choice:** Migrate onto Card (both sessions).

| Option | Description | Selected |
|--------|-------------|----------|
| Finishing session: elevated or bg-card + border-border + rounded-(lg\|xl\|2xl), .tsx only, ui exempt, allow-list | | (first pass) |
| Other session: any order, border-border or border-border-strong, no ui exemption stated | | (first pass) |
| Union, with the ui exemption | Either background spelling, either border token, any order, rounded-(lg\|xl\|2xl), .tsx only; border-strong becomes Card className; ui exempt except card.tsx and skeletons.tsx | ✓ |
| border-border only | Leave the 23 border-strong containers | |

**User's choice:** Union with the ui exemption. **Divergence resolved.**

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow the pattern, allow-list the rest | .tsx only, no rounded-full; reasoned allow-list for leftovers | ✓ |
| Allow-list only | Broad pattern, every non-card an entry | |
| Migrate them anyway | Treat table cells and chips as cards | |

**User's choice:** Narrow the pattern, allow-list the rest.

---

## Batches and the screenshot gate

| Option | Description | Selected |
|--------|-------------|----------|
| One go-ahead, both batch plans | Plan 01 presents everything, blocks once | ✓ |
| Two go-aheads, one per sweep | | |
| Go-ahead per batch | | |

**User's choice:** One go-ahead.

| Option | Description | Selected |
|--------|-------------|----------|
| Extend the script, you run the capture | baseline.mjs drives dev-login into the three screens; user runs it with their own env | ✓ |
| Manual side-by-side at UAT | Home-only automated baseline | |
| Script it, fall back if blocked | | |

**User's choice:** Extend the script, user runs the capture. The other session added the `npm run test:users:create` precondition and "fallback recorded, not assumed"; both folded into D-18.

| Option | Description | Selected |
|--------|-------------|----------|
| One directory per commit / By concern, then by directory | Type sweep first over directory batches, then cards over the same batches, then the nested plan | ✓ |
| Whole sweep per commit | | |
| Interleave per directory | | |

**User's choice:** One directory per commit, type before cards (both sessions; the other session named the batch order).

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side with an expected-change list | Written list of allowed deltas; anything else is a finding | ✓ |
| Pixel diff, tolerance zero outside listed regions | pixelmatch dependency, region masking | |
| Side-by-side, no list | | |

**User's choice:** Side-by-side with an expected-change list.

Asked only in the other session, adopted as decided:
- Codemod: `scripts/codemods/text-sizes.mjs` (regex, JSON table, dry-run, per-file report) and `scripts/codemods/hand-rolled-cards.mjs` (TypeScript compiler API), no new deps (D-07).
- Guards: ratchet ceilings from batch one to zero at the last, in `__tests__/arbitrary-text-sizes.test.ts` and `__tests__/hand-rolled-cards.test.ts` (D-20).

---

## Claude's Discretion

- Codemod internals within D-07 (mapping table shape, report format, idempotency proof, `cn()`/template-literal wrappers).
- The exact split of `app/(app)` into route-group batches.
- Guard regexes and ceiling bookkeeping within D-06, D-13, D-20.
- How the nested divider is applied (parent `divide-y` vs per-child `border-t`), provided it is full width and uses `border-border`.
- The design-system docs page receives only what typecheck and the sweeps force.

## Deferred Ideas

- Per-screen chip density tuning: milestone C, seeded by the gate's named list.
- Padding normalisation onto a Card padding contract: milestone C.
- CardHeader/CardTitle adoption: unscheduled.
- Broader skeletons.tsx fidelity audit: still deferred from Phase 08.
- The ~29 borderless elevated + rounded containers: inventoried, unscheduled.
- `--background-inset` deletion, its 12 sites onto nested, and widening the card guard: Phase 10.
