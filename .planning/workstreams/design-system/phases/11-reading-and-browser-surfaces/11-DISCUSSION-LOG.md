# Phase 11: Reading and Browser Surfaces - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md, this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 11-reading-and-browser-surfaces
**Areas discussed:** Prose container mechanism, Selection and caret color, Content-area scrollbar scope, Tabular-numerals mechanism

Live inventory presented before the discussion: 13 files (10 blog posts, research, compare) sharing an identical inline prose-typography block at two different outer widths (max-w-3xl vs max-w-4xl); the Pricing FAQ using plain `<p>` tags with no shared prose treatment at all; zero `::selection`/`caret-color` rules anywhere in `app/globals.css`; only the sidebar's scrollbar themed; `[data-score]` confirmed to have zero real consumers while `.tabular-nums` is already hand-applied across 19 files.

---

## Prose container mechanism

**Q1. How should the repeated prose-typography block become reusable?**

| Option | Description | Selected |
|--------|-------------|----------|
| Measure-only class | One new class controlling only reading width; today's typography block stays untouched | ✓ |
| Full prose class | Consolidate the entire duplicated block (measure + all typography overrides) into one shared class | |

**Q2. How should the Pricing FAQ get the new measure treatment?**

| Option | Description | Selected |
|--------|-------------|----------|
| Same shared class | Apply the new measure class to FAQ answers alongside their existing distinct typography | ✓ |
| FAQ-specific wrapper | Give the FAQ its own separate, independent width class | |

**Q3. How should the measure be expressed?**

| Option | Description | Selected |
|--------|-------------|----------|
| ch-unit | max-width in ch, scales with font-size, self-documenting | ✓ |
| Fixed rem/px | A concrete pixel value tuned to today's font-size | |

**User's choices:** the recommended option on all three.
**Notes:** All three converged around "smallest diff that satisfies TYPE-04's literal wording" — the measure is treated as orthogonal to each page's own typography, which is why the same class can apply to blog/research/compare/FAQ despite their differing type styles.

---

## Selection and caret color

**Q1. What should selected text look like?**

| Option | Description | Selected |
|--------|-------------|----------|
| Accent wash, readable text | Translucent accent background, text color mostly preserved | ✓ |
| Solid accent, inverted text | Full-strength accent background with inverted foreground text | |
| Neutral (muted/border-based) | Skip the accent, use a neutral tint | |

**Q2. Caret color?**

| Option | Description | Selected |
|--------|-------------|----------|
| Match accent | caret-color: hsl(var(--accent)) | ✓ |
| Neutral (foreground) | Closer to browser default, avoids competing with focus rings | |

**User's choices:** the recommended option on both.
**Notes:** Both extend the single-accent-color language Phase 10 established for COLOR-07, applied to a new surface (browser chrome) rather than component UI.

---

## Content-area scrollbar scope

**Q1. Which scrollable regions get the themed treatment?**

| Option | Description | Selected |
|--------|-------------|----------|
| Global default | Every scrollable region inherits it (main content, modals, dropdowns, tables) | ✓ |
| Main content only | Just the page-level vertical scroll | |

**Q2. Same style as the sidebar, or something distinct?**

| Option | Description | Selected |
|--------|-------------|----------|
| Same as sidebar | Reuse the exact existing --border-based treatment | ✓ |
| Distinct, more subtle | A separate, lighter treatment for wide content areas | |

**User's choices:** the recommended option on both.
**Notes:** Chosen for a single scrollbar language app-wide with zero new tokens, generalizing the existing `.sidebar-scrollable` block rather than authoring a second visual treatment.

---

## Tabular-numerals mechanism

**Q1. How should SURF-02 close the dead-rule/hand-applied-class gap?**

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the dead rule | Remove [data-score] from globals.css; keep the existing hand-applied .tabular-nums usage | ✓ |
| Wire it up | Add data-score attributes onto real elements app-wide as a semantic hook | |

**Q2. Should this phase also audit for numeric displays missing tabular-nums entirely?**

| Option | Description | Selected |
|--------|-------------|----------|
| Dead-code cleanup only | Match ROADMAP's literal scope, no broader audit | ✓ |
| Full audit | Grep the app for every numeric display and fix gaps found | |

**User's choices:** the recommended option on both.
**Notes:** Matches this phase's own "lowest risk in the milestone" framing from ROADMAP; a completeness sweep was explicitly declined to keep the phase small.

---

## Claude's Discretion

- Exact CSS selector mechanics for making the scrollbar styling apply globally (wildcard vs body/html vs @layer base rule)
- Exact class name for the new measure-only prose class
- Whether the measure class lives in globals.css under @layer components or as a Tailwind theme.extend utility
- The exact alpha value for the ::selection accent wash (named as ~0.3, not locked)
- Whether ::selection needs an explicit foreground/text-color override

## Deferred Ideas

- A full app-wide audit of numeric displays for missing .tabular-nums coverage
- Wiring data-score onto real elements as a semantic hook (the rejected branch of the tabular-numerals decision)
- Consolidating the full duplicated prose-typography block beyond just the measure (the rejected branch of the prose-mechanism decision)
- `app/pricing/page.tsx`'s FAQ answers use a raw `text-[#bababa]` hex literal, noticed while scouting — not one of Phase 10's five named colors, flagged for Phase 12's exception-list documentation rather than fixed here
