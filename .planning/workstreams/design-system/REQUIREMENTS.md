# Requirements: LootList+ v1.1 Design System Foundation

**Defined:** 2026-09-15
**Core Value:** Every screen inherits a correct, enforceable design system, so the token and primitive defaults that the 2026-09-15 impeccable and SlopMonster audit found (10px type floor, failing muted and accent contrast, invisible surface ramp, nested-card token, hand-rolled cards, kicker primitives, missing focus and dialog semantics) cannot recur silently.

Source: `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` (findings, root causes, sanctioned exceptions, decisions).

## v1.1 Requirements

### Type scale (TYPE)

- [x] **TYPE-01**: A raider or officer never reads functional UI text smaller than 11px: the Tailwind `xs` step is 11px, the scale gains a 15px step, and no `text-[9px]` or `text-[10px]` remains in `app/` or `components/`.
- [x] **TYPE-02**: The `Label` primitive and the `Heading`/`Text` typography components express their sizes through scale steps, not arbitrary `text-[Npx]` values.
- [x] **TYPE-03**: Arbitrary `text-[Npx]` classes in `app/` and `components/` are reduced from about 1,044 to zero by a codemod that maps each pixel value onto the nearest scale step, with a test that fails if a new one is introduced.
- [x] **TYPE-04**: Long-form prose on public pages (research, compare, blog, pricing FAQ) has a measure of 65 to 75 characters, expressed as a reusable prose container class, not per-page widths.

### Colour and surface tokens (COLOR)

- [x] **COLOR-01**: Dark-mode `--foreground-muted` measures at least 4.5:1 against `--background`, `--background-elevated` and `--background-subtle`, and light-mode `text-accent` on white measures at least 4.5:1 (or a dedicated accent-text token is introduced and used for text).
- [x] **COLOR-02**: On dark, a card is distinguishable from the page without relying on nesting: `--border` and the `background` to `background-elevated` step are widened so each measures at least 1.2:1, and the values are recorded in DESIGN.md.
- [x] **COLOR-03**: `--background-inset` (the "nested cards inside elevated" token) is removed and its 12 uses migrate to dividers or padding inside a single card level.
- [x] **COLOR-04**: Faction colours use the existing `--alliance` and `--horde` tokens everywhere (currently zero uses; `GuildSettingsContent.tsx` hard-codes blue-500/red-500 and a raw rgb glow).
- [x] **COLOR-05**: WoW item-quality colours (Poor through Legendary) and third-party brand colours (Battle.net, Discord, Warcraft Logs) are tokens, and every hard-coded `#a335ee`, `#1eff00`, `#0074E0`, `#5865F2`, `#e35e15` in `app/` and `components/` uses them.
- [x] **COLOR-06**: The `status-badge` and `alert` primitives use `--warning`, `--success`, `--error` and `--info` instead of Tailwind palette classes (yellow-500, orange-500), and a `--standby` token replaces the three duplicated orange-500 literals in raid tracking.
- [x] **COLOR-07**: No `from-purple-*`, `to-pink-*`, `bg-violet-*`, `text-purple-*` or `via-purple-*` class remains inside the authenticated app (`app/(app)/`, `app/components/` excluding `landing/`): the sidebar and layout avatar fallback, the onboarding modal gradients and animated borders, the score comparison tile hues and the master-sheet violet button move to accent, class colour or neutrals. Marketing purple on public pages is out of scope by decision.

### Primitives (PRIM)

- [x] **PRIM-01**: `components/ui/card.tsx` is the only card: the 166 hand-rolled `bg-background-elevated border border-border rounded-*` containers in `app/` are replaced by `Card` (or its new `nested` variant, which uses padding and a divider rather than a second border), and a test fails on any new hand-rolled card string.
- [x] **PRIM-02**: There is exactly one label convention: a single `Label` component for form fields and one non-uppercase section heading style; `LabelText` in `typography.tsx` and `.section-label` in `globals.css` are deleted and their uses migrated.
- [x] **PRIM-03**: Every focusable primitive (Input, Textarea, Select, Switch, Checkbox, Radio, Button, links in nav) shows a visible `focus-visible` ring using `--ring`, at least 3:1 against its surface; `input.tsx` no longer removes the outline in favour of a border colour change.
- [x] **PRIM-04**: The `Modal` primitive has `role="dialog"`, `aria-modal="true"`, a labelled title, a focus trap, focus return on close, and Escape handling, verified by a component test.
- [x] **PRIM-05**: Skeleton primitives reflect the layouts they stand in for (guild settings renders 8 cards, not 2; the raid-tracking legend renders the real swatch count) so loading does not cause layout shift, and `skeletons.tsx:486` drops its 4px side border.

### Browser surfaces (SURF)

- [x] **SURF-01**: Text selection, caret colour and content-area scrollbars are themed from the palette in `globals.css` for both themes, not only the sidebar scrollbar.
- [x] **SURF-02**: Numeric data (scores, attendance percentages, ranks, prices) renders with tabular numerals through a class or utility the app actually applies; the dead `[data-score]` rule is removed or wired to real elements.

### Enforcement and documentation (ENF)

- [x] **ENF-01**: A `DESIGN.md` at the repo root follows the impeccable/design.md format (frontmatter tokens plus the eight canonical sections) and matches the shipped tokens exactly; impeccable `context.mjs` reports it as the design authority.
- [x] **ENF-02**: `.impeccable/config.json` records every sanctioned exception from the audit as a scoped `ignore-value` with a reason (raid-tracking legend rails, item-quality colours, third-party brand colours, skeleton pulse, monospace on type-to-confirm and invite codes), so the hook stops flagging intentional design and only flags regressions.
- [x] **ENF-03**: The in-app design-system page (`app/(app)/design-system`) documents the revised type scale, colour and surface tokens, Card variants, the single Label, focus ring and Modal behaviour, and no longer shows removed primitives.
- [ ] **ENF-04**: CI runs the impeccable rendered detector against the deployed public pages (home, pricing, compare, about, research, one blog post, changelog) and fails on any non-advisory finding outside the recorded exceptions; the baseline count at milestone start and the target of zero are recorded. **Status: Blocked** on the deploy (remote main at 2e0587ee, 304 commits behind; owner: sprint workstream; WINDOWS 53).
- [ ] **ENF-05**: The rendered detector, run against the same public pages after the milestone, reports zero `undersized-ui-text`, `tiny-text`, `low-contrast` and `nested-cards` findings that trace to tokens or primitives (findings caused by page-level layout stay tracked for milestone B). **Status: Blocked** on the deploy (remote main at 2e0587ee, 304 commits behind; owner: sprint workstream; WINDOWS 52).

## Future Requirements (deferred to later milestones)

- Marketing surface (milestone B): hero eyebrow chip, FREE/PREMIUM kickers, glyph icons, changelog chips and timeline, hero-metric stat cards, headline rewrite, SlopMonster copy cleanse. Needs copy sign-off.
- App screens (milestone C): loot-list bracket rails and rank gradients, emoji icons, member manager selects and confirm/undo on role changes, first-run modal stacking and SetupGuide prominence, `window.confirm` replacement, faction toggle glow, chip soup in member rows and candidate cells, overview icon tiles.
- Authenticated rendered pass (milestone D): detector and screenshots across the 30 app routes once they can be rendered locally or via a logged-in browser.

## Out of Scope

- Marketing purple (`#9940ec`) as a brand accent on public pages: kept by decision on 2026-09-15.
- User-facing copy changes of any kind: require separate sign-off; none in this milestone.
- Redesign or rebrand: this milestone refines the incumbent visual system, it does not replace it.
- Performance audit: not measured in the 2026-09-15 audit.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | Phase 07 | Complete |
| TYPE-02 | Phase 08 | Complete |
| TYPE-03 | Phase 09 | Complete |
| TYPE-04 | Phase 11 | Complete |
| COLOR-01 | Phase 07 | Complete |
| COLOR-02 | Phase 07 | Complete |
| COLOR-03 | Phase 10 | Complete |
| COLOR-04 | Phase 10 | Complete |
| COLOR-05 | Phase 10 | Complete |
| COLOR-06 | Phase 07 | Complete |
| COLOR-07 | Phase 10 | Complete |
| PRIM-01 | Phase 09 | Complete |
| PRIM-02 | Phase 08 | Complete |
| PRIM-03 | Phase 08 | Complete |
| PRIM-04 | Phase 08 | Complete |
| PRIM-05 | Phase 08 | Complete |
| SURF-01 | Phase 11 | Complete |
| SURF-02 | Phase 11 | Complete |
| ENF-01 | Phase 12 | Complete |
| ENF-02 | Phase 12 | Complete |
| ENF-03 | Phase 12 | Complete |
| ENF-04 | Phase 12 | Blocked (deploy) |
| ENF-05 | Phase 12 | Blocked (deploy) |

**Coverage:** 23 of 23 requirements mapped to phases 07 to 12. No orphans, no duplicates. See `.planning/workstreams/design-system/ROADMAP.md`.
