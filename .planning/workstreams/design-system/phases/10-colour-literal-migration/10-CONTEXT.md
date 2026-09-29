# Phase 10: Colour Literal Migration - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

No colour in the authenticated app is spelled as a literal, and the surface ramp has one card level instead of two. This phase deletes `--background-inset` and migrates its 12 uses onto Card's `nested` variant (the 6 genuinely card-shaped sites) or `--muted` (the progress-bar tracks, pills and one hover state that are not cards at all); wires the existing `--alliance`/`--horde` tokens into GuildSettingsContent.tsx's hardcoded faction-color toggle, including its raw-rgba hover glow; centralizes the 5 WoW item-quality/brand hex literals (`#a335ee`, `#1eff00`, `#0074E0`, `#5865F2`, `#e35e15`) behind a shared constants module; and removes every purple/violet/pink gradient and flat color from the authenticated app (6 sites across 5 files), replacing them with the app's existing accent color. Marketing pages under `landing/` keep their purple by explicit decision and are out of scope. Requirements: COLOR-03, COLOR-04, COLOR-05, COLOR-07.

Live re-inventory at discussion time (2026-09-20): 12 `bg-background-inset` uses across 6 files (`ProfileContent.tsx`, `DashboardContent.tsx` x4, `LootListSummaryView.tsx` x3, `EditCharacterModal.tsx`, `horizontal-scroll.tsx`, `skeletons.tsx` x2): 7 are card-shaped (border + radius), 4 are borderless pills/tracks, 1 is a hover-state swap on an already-bordered element. This is a 7/5 split, not the "5 card shapes / other" split the discussion started from; `LootListSummaryView.tsx:206` was found mid-discussion and grouped with its file's other 2 pills rather than treated as an 8th card site. 6 purple/gradient sites confirmed across `Sidebar.tsx`, `AppLayout.client.tsx`, `OnboardingModal.tsx` (x2), `MasterSheetContent.tsx`, `ScoreComparisonModal.tsx`. `--alliance` (`217 91% 60%`) and `--horde` (`0 84% 60%`) already exist from Phase 07 and are byte-identical to the hardcoded `blue-500`/`red-500` they replace: this migration is provably a rename for those two tokens. The planner re-measures at plan time; these are the discussion's baseline, not the plan's.

</domain>

<decisions>
## Implementation Decisions

### Purple/gradient replacements (COLOR-07)
- **D-01:** `Sidebar.tsx:795` and `AppLayout.client.tsx:236`'s identical avatar-fallback gradient (`from-purple-500 to-pink-500`) becomes a flat `bg-accent`, not a gradient. Both sites get the identical treatment since they are the same component pattern in two places.
- **D-02:** `OnboardingModal.tsx:95`'s background wash (`from-accent/20 via-purple-500/15 to-accent/20`) becomes `from-accent/20 via-accent/10 to-accent/20`: same three-stop shimmer, single hue family, purple removed without losing the animated wash.
- **D-03:** `OnboardingModal.tsx:261`'s animated border gradient (`from-purple-500/50 via-accent/50 to-purple-500/50 animate-gradient-x`) becomes `from-accent/30 via-accent/70 to-accent/30`, keeping `animate-gradient-x`. The pulsing motion is preserved; only the hue changes.
- **D-04:** `MasterSheetContent.tsx:1742`'s violet button (`bg-violet-600 hover:bg-violet-500`) and `ScoreComparisonModal.tsx:73`'s purple rank-icon color (`bg-purple-500/20 text-purple-500`) both become accent: `bg-accent`/`hover:bg-accent-hover` for the button, `bg-accent/20 text-accent` for the icon. One consistent single-accent-color language across all 6 sites, not a per-site palette.
- **D-05:** Marketing purple on public pages (`landing/`) is untouched by this phase, per ROADMAP's own scope line. The guard this phase adds (`grep -rE "(from-purple-|to-pink-|bg-violet-|text-purple-|via-purple-)"`) excludes `landing/` explicitly.

### Non-card `--background-inset` sites (COLOR-03)
- **D-06:** `DashboardContent.tsx:2088` and `:2167`'s progress-bar track fills become `--muted`. `LootListSummaryView.tsx:224`, `:235` and `:206` (a 7th site found mid-discussion: a bordered chip in the same flex-wrap player-list, grouped with its file's other two pills rather than treated as a card) become `--muted` as well. `horizontal-scroll.tsx:68`'s hover-state swap becomes `hover:bg-muted`. All four non-card categories (progress track, pill, chip-with-border, hover swap) get the same single replacement token rather than four different ones, since none of them are actually a second card level. | Reversibility: reversible: a single token swap on 5 lines, no structural change.
- **D-07:** The 6 genuinely card-shaped `--background-inset` sites (`ProfileContent.tsx:908`, `DashboardContent.tsx:2239`/`2411`, `EditCharacterModal.tsx:405`, `skeletons.tsx:69`/`133`: each carries both a border and a radius, sitting inside another card) become `<Card variant="nested">`, identical to Phase 09's 7 SettingsModal conversions. No new pattern is introduced; this is the reason Phase 09 built `nested` with the first-child divider suppression already baked in. | Reversibility: costly: reverting after the sweep means re-touching 6 sites plus whatever depends on their rendered structure.
- **D-08:** `--background-inset` itself is deleted from `app/globals.css` (both `:root` and `.dark`, lines 136 and 224 per the live re-check) and from any `tailwind.config.js` reference, once all 12 uses are migrated. This is the literal ROADMAP success criterion 1.

### Faction color fidelity (COLOR-04)
- **D-09:** GuildSettingsContent.tsx's Alliance/Horde toggle's selected-state pattern (border at full token color, background at the token's `/20` opacity, text at a lighter shade) is preserved exactly when swapping `blue-500`/`red-500` classes to `--alliance`/`--horde`: same visual weight and hierarchy, provably unchanged rendering.
- **D-10:** The hover-only glow effect (a `<style jsx>` block with raw `box-shadow`/`background` `rgba()` values, shown only to the guild creator) keeps its exact visual effect but is rebuilt from `hsl(var(--alliance))`/`hsl(var(--horde}))` instead of hardcoded `rgba(59,130,246,...)`/`rgba(239,68,68,...)`. The CSS-in-JS block itself is not removed, only its color source.
- **D-11:** `--alliance` and `--horde` each have exactly one shade defined (`217 91% 60%` / `0 84% 60%`, matching `blue-500`/`red-500` exactly). The current label text uses a lighter shade (`blue-400`/`red-400`) that has no token equivalent. Rather than add a new lighter variant token, the label text reuses the single existing token: a small, barely-noticeable darkening of the text is accepted in exchange for exactly one faction color per side and zero new tokens. | Reversibility: reversible: a text-color class swap, easily revisited if the darkening reads poorly in practice.

### Item-quality/brand token naming (COLOR-05)
- **D-12:** The 5 hex literals are consumed as JS/TS data (a quality-color array in `AccentColorContext.tsx`, a CSS `filter` lookup keyed by hex for icon tinting) across 8+ files, not as Tailwind classes: a different mechanism from `--alliance`/`--horde`'s CSS custom properties. "Tokenized" means a shared constants module (e.g. `QUALITY_COLORS.epic`, `BRAND_COLORS.discord`) that every consuming file imports, not new CSS custom properties. This matches how the data is actually used (JS logic: filter calculations, conditional style objects) rather than forcing a CSS-variable mechanism that doesn't fit plain data arrays.
- **D-13:** Naming uses `quality-*` and `brand-*` prefixes: `quality-epic` (`#a335ee`), `quality-legendary` or the correct WoW-classic tier name for `#1eff00` (verify against `AccentColorContext.tsx`'s own naming: it currently calls this shade "Uncommon" at a darkened value, `#15b300`, not the literal `#1eff00`; the planner must reconcile which hex the 34-occurrence count actually refers to before naming it), `brand-battlenet` (`#0074E0`), `brand-discord` (`#5865F2`), `brand-wcl` (`#e35e15`, Warcraft Logs). Exact current hex values are preserved verbatim: this migration is provably a rename, per ROADMAP's own risk mitigation.
- **D-14:** WoW item-quality colours beyond the 5 explicitly named hex values (Poor/gray, Common/white, Rare/blue, Artifact/gold, and any other tier already in `AccentColorContext.tsx`'s array) are NOT in scope for this phase's 34-occurrence count: only the 5 named literals get centralized. Do not expand scope to tokenize the full quality-tier palette unless the planner finds those other tiers are ALSO spelled as raw hex literals elsewhere (as opposed to living only inside the already-centralized `AccentColorContext.tsx` array, which is not itself a literal-spelling problem).

### Claude's Discretion
- The exact TypeScript module path and export shape for the quality/brand constants module (e.g. `lib/constants/quality-colors.ts` vs `lib/design-tokens/quality.ts`), provided it is a single source of truth every consuming file imports from.
- Whether `quality-legendary` or a different name is correct for the `#1eff00`/`#15b300` shade once the planner reconciles which hex the 34-occurrence count actually targets (see D-13).
- The exact class list for the purple/violet/pink guard's regex and which files besides the 6 named sites it should scan (the ROADMAP's own grep pattern is a starting point, not the final guard implementation).
- Whether the `--muted` sites (D-06) need per-site opacity/shade adjustment once viewed in context, versus a uniform `bg-muted` class everywhere.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Findings and scope
- `.planning/workstreams/design-system/ROADMAP.md` §Phase 10: goal, success criteria 1-5, the risk note (purple replacements as a visual proposal at the phase checkpoint), and the dependency note that Phase 10 is sequenced after Phase 09 because both rewrite overlapping files
- `.planning/workstreams/design-system/REQUIREMENTS.md`: COLOR-03, COLOR-04, COLOR-05, COLOR-07 wording

### Prior phase decisions this phase builds on
- `.planning/workstreams/design-system/phases/07-token-foundation/07-EVIDENCE.md` §Carried forward items 1-2: `--horde`/`--alliance`'s exact contrast numbers against the lifted card (4.360/4.545), and `--background-inset`'s exact current values (dark `228 12% 10%`, light `35 25% 96%`), both explicitly routed to this phase
- `.planning/workstreams/design-system/phases/07-token-foundation/07-05-PLAN.md`: the palette-literal guard's explicit scope boundary: raw hex/`rgb()`/`oklch()`/arbitrary-value classes and the WoW item-quality/class/brand colors were deliberately NOT covered by Phase 07's guard, reserved for this phase under COLOR-03 through COLOR-07
- `.planning/workstreams/design-system/phases/09-type-and-card-migration/09-CONTEXT.md` D-10/D-11: the `nested` Card variant's exact contract (divider-only, no fill/border/radius, `first:border-t-0` first-child suppression) this phase's 6 card-shaped sites migrate onto
- `.planning/workstreams/design-system/phases/09-type-and-card-migration/09-EVIDENCE.md` §Carried forward item 3: Phase 09's own explicit hand-off: "the 5 card-shaped `bg-background-inset` lines and widening the card guard to cover that token" is this phase's job

### Code this phase changes or reuses
- `app/globals.css`: `--background-inset` (lines ~136, ~224 per live re-check), `--alliance` (`217 91% 60%`), `--horde` (`0 84% 60%`)
- `tailwind.config.js`: `theme.extend.colors.alliance`/`.horde` (already wired to `hsl(var(--alliance))`/`hsl(var(--horde))`); any `background-inset` reference to remove
- `components/ui/card.tsx`: the `nested` variant this phase's 6 card sites consume as-is, no changes expected
- `app/(app)/guild-settings/components/GuildSettingsContent.tsx` lines ~560-611: the Alliance/Horde toggle buttons and their `<style jsx>` hover-glow block
- `app/contexts/AccentColorContext.tsx`: the existing quality-color array and CSS filter lookup; natural home for or importer of the new shared constants module
- `__tests__/design-tokens/source-files.ts`: `sourceFiles`/`matchesIn` helpers this phase's new guards (purple/gradient guard, `--background-inset` absence guard) should reuse, matching every prior phase's guard pattern
- `scripts/visual/baseline.mjs`: the screenshot gate this phase's success criterion 5 requires; already extended through Phase 09 to `/overview`, `/guild-settings`, `/loot-management`; may need `/master-sheet` or another page added to reach `MasterSheetContent.tsx`'s violet button and the raid-tracking-adjacent sites

### Design quality bar
- `.claude/skills/impeccable/reference/craft-floor.md`: relevant sections on color usage and semantic tokens
- `.planning/PROJECT.md` §Key Decisions: the hero H1 is sacred (unaffected by this phase, no type changes); marketing purple is the established public-page brand color, untouched here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx`: `CardVariant` already includes `"nested"` (Phase 09): this phase's 6 card-shaped sites are a drop-in consumer, no primitive changes needed
- `tailwind.config.js` `theme.extend.colors`: `alliance`/`horde` already resolve to `hsl(var(--alliance))`/`hsl(var(--horde))`: Tailwind utility classes (`bg-alliance`, `border-alliance`, `text-alliance`, and their `horde` equivalents) already work today, just unused at the two hardcoded sites
- `__tests__/design-tokens/source-files.ts`: `sourceFiles(roots)` and `matchesIn(files, regex)`: the scan primitives every existing guard (type scale, hand-rolled cards, palette literals) uses; this phase's new guards should reuse them verbatim
- `app/contexts/AccentColorContext.tsx`: already has a `{name, value}` quality-color array structure and a hex-keyed CSS filter lookup: the shared constants module (D-12) should either live here or be imported by this file, not duplicate its data

### Established Patterns
- CSS custom properties (`--token-name`) defined in `app/globals.css` under both `:root` and `.dark`, wired into `tailwind.config.js`'s `theme.extend.colors` as `hsl(var(--token-name))`: this is the mechanism for `--alliance`/`--horde` (already exists) and would be the mechanism for any NEW CSS-variable-based token, but D-12 explicitly chose a different mechanism (shared constants module) for the quality/brand colors since they're consumed as JS data, not Tailwind classes
- Guard tests as `__tests__/*.test.ts` files importing `sourceFiles`/`matchesIn`, each with a header comment documenting the requirement ID and scope boundary (see `__tests__/type-scale-floor.test.ts`, `__tests__/hand-rolled-cards.test.ts` for the established shape)
- Screenshot gate via `scripts/visual/baseline.mjs`'s `PAGES` array with optional `afterGoto` hooks for click-through steps, committed under `.planning/workstreams/design-system/baselines/`

### Integration Points
- The purple/gradient guard (COLOR-07) and the `--background-inset` absence guard (COLOR-03) are new files following the exact pattern Phase 09's two guards established
- The faction-color and quality/brand migrations (COLOR-04, COLOR-05) are narrow, named-site fixes (2 files for faction, 8+ files for quality/brand) rather than a sweep-and-guard codemod pattern, since the total site count is small enough for direct, individually-verified edits

</code_context>

<specifics>
## Specific Ideas

All four areas resolved toward "accent" as the unifying replacement for purple (D-01 through D-04) and "muted" as the unifying replacement for non-card inset uses (D-06): the user consistently chose the option that introduces the fewest new visual languages/tokens over options that preserved more of the exact prior visual character. This consistency is itself a signal: when the planner or a future phase hits an ambiguous color-replacement choice not explicitly covered here, "prefer the existing semantic token over a new one" is the pattern to follow.

</specifics>

<deferred>
## Deferred Ideas

- Item-quality tiers beyond the 5 named hex values (D-14): explicitly not expanded into this phase's scope unless the planner finds a genuine literal-spelling problem beyond the named 5.
- Any lighter-shade faction color variant (`--alliance-light`/`--horde-light`, D-11): not introduced this phase; revisit only if the reused single-shade text color reads poorly in the screenshot gate.
- `--muted` per-site opacity/shade tuning (see Claude's Discretion): left to plan-time or execution-time judgment, not a locked decision.

### Reviewed Todos (not folded)
None: discussion stayed within phase scope.

</deferred>

---

*Phase: 10-colour-literal-migration*
*Context gathered: 2026-09-20*
