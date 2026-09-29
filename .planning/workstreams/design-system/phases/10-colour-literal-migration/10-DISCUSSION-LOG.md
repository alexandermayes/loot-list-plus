# Phase 10: Colour Literal Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md, this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 10-colour-literal-migration
**Areas discussed:** Purple/gradient replacements, Non-card --background-inset sites, Faction color fidelity (--alliance/--horde), Item-quality/brand token naming

Live inventory presented before the discussion: 12 `bg-background-inset` uses across 6 files (later found to be 7 card-shaped / 5 non-card, not the 6/6 split first estimated); 6 purple/gradient sites across 5 files; `--alliance`/`--horde` already existing from Phase 07 at values byte-identical to the hardcoded `blue-500`/`red-500` they replace; 5 item-quality/brand hex literals across 8+ files.

---

## Purple/gradient replacements

**Q1. Sidebar.tsx:795 and AppLayout.client.tsx:236's avatar-fallback gradient (from-purple-500 to-pink-500)?**

| Option | Description | Selected |
|--------|-------------|----------|
| Accent solid | Flat bg-accent instead of a gradient, simplest, matches existing accent usage | ✓ |
| Neutral gradient | Gradient from a neutral hue (slate/zinc) instead of purple/pink | |
| Accent gradient | Two-stop gradient using accent at different opacities/shades | |

**Q2. OnboardingModal.tsx:95's background wash (from-accent/20 via-purple-500/15 to-accent/20)?**

| Option | Description | Selected |
|--------|-------------|----------|
| All-accent | from-accent/20 via-accent/10 to-accent/20, same shimmer, single hue | ✓ |
| Remove the via-stop entirely | from-accent/20 to-accent/20, simpler two-stop gradient | |
| Neutral middle stop | from-accent/20 via-white/10 to-accent/20 | |

**Q3. OnboardingModal.tsx:261's animated border gradient (from-purple-500/50 via-accent/50 to-purple-500/50 animate-gradient-x)?**

| Option | Description | Selected |
|--------|-------------|----------|
| All-accent animated border | from-accent/30 via-accent/70 to-accent/30, keeps the pulse motion | ✓ |
| Static accent border, drop the animation | Plain border-accent, removes animate-gradient-x | |

**Q4. MasterSheetContent.tsx:1742's violet button and ScoreComparisonModal.tsx:73's purple rank-icon color?**

| Option | Description | Selected |
|--------|-------------|----------|
| Accent for both | bg-accent/hover:bg-accent-hover for the button, bg-accent/20 text-accent for the icon | ✓ |
| Neutral/class-color for both | Neutral gray for the button, an existing semantic color for the icon | |
| Different treatment per site | User specifies each individually | |

**User's choices:** the recommended option on all four.
**Notes:** all four questions converged on the same answer, accent replacing purple everywhere, consistent with the app's existing single-accent-color language.

---

## Non-card --background-inset sites

**Q1. DashboardContent.tsx:2088/:2167 progress-bar track fill?**

| Option | Description | Selected |
|--------|-------------|----------|
| --muted | The app's existing muted/neutral surface token | ✓ |
| --background-subtle | A different existing neutral token | |
| New dedicated token | A purpose-named --track token | |

**Q2. LootListSummaryView.tsx:224/:235 borderless pill/chip background?**

| Option | Description | Selected |
|--------|-------------|----------|
| --muted | Same treatment as the progress bar, one consistent replacement | ✓ |
| --background-subtle | Match whichever the progress-bar question resolved to, if different | |

**Q3. horizontal-scroll.tsx:68 hover-state background swap?**

| Option | Description | Selected |
|--------|-------------|----------|
| hover:bg-muted | Matches the hover-darkening pattern used elsewhere | ✓ |
| Keep a distinct hover shade | Preserve a visually distinct hover color for this control | |

**Q4. The ~6 genuinely card-shaped --background-inset sites?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, variant="nested" | Consistent with Phase 09's precedent, same primitive | ✓ |
| Something else for these | User describes a different treatment | |

**Q5 (found mid-discussion). LootListSummaryView.tsx:206, a 7th site with both border and radius, in the same flex-wrap chip list as the pills from Q2?**

| Option | Description | Selected |
|--------|-------------|----------|
| Group with the pills, --muted | Same file, same list, consistent treatment | ✓ |
| Treat as a card, variant="nested" | Apply the mechanical border+radius rule literally | |

**User's choices:** the recommended option on all five.
**Notes:** the mid-discussion discovery of the 7th site changed the phase's own working count from "6 card / 6 non-card" to "6 card / 7 non-card" (later reconciled to 7 card in CONTEXT.md after a fuller recount confirmed `LootListSummaryView.tsx:206` was already counted among the 12 total, not additional to it). The exact card/non-card split is left for the planner's own live re-measurement per this workstream's established convention.

---

## Faction color fidelity (--alliance/--horde)

**Q1. Selected-state opacity/shade pattern preservation when swapping blue-500/red-500 to tokens?**

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve the exact pattern | border-alliance/bg-alliance/20/text-alliance-ish shade, same visual weight | ✓ |
| Simplify to a single shade per state | One value used consistently for border+text | |

**Q2. The hover-only glow effect (style jsx block, raw rgba box-shadow)?**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the glow, swap rgba() for the token's HSL | Same effect, hsl(var(--alliance))/hsl(var(--horde)) instead of hardcoded rgba | ✓ |
| Drop the glow, use a simpler hover state | Plain hover:border-alliance/horde, removes the style jsx block | |

**Q3. No lighter faction token exists; label text uses blue-400/red-400, a lighter shade than the single --alliance/--horde token?**

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the single token for text too | text-alliance/text-horde at the same shade, zero new tokens | ✓ |
| Add a lighter variant token | --alliance-light/--horde-light matching blue-400/red-400 exactly | |

**User's choices:** the recommended option on all three.
**Notes:** `--alliance` and `--horde` were confirmed to already be byte-identical to `blue-500`/`red-500` (217 91% 60% and 0 84% 60% respectively) via a live check of app/globals.css and tailwind.config.js during the discussion.

---

## Item-quality/brand token naming

**Q1. Tokenization mechanism, given hex codes are consumed as JS/TS data, not Tailwind classes?**

| Option | Description | Selected |
|--------|-------------|----------|
| Shared constants module | One exported constant every consuming file imports, matches how the data is actually used | ✓ |
| CSS custom properties | --quality-epic in globals.css like --alliance/--horde | |

**Q2. Naming convention prefix style?**

| Option | Description | Selected |
|--------|-------------|----------|
| quality-* and brand-* prefixes | quality-epic, brand-discord, etc, makes the domain immediately clear | ✓ |
| No prefix, bare names | epic, discord, etc, shorter but less obvious | |

**User's choices:** the recommended option on both.
**Notes:** found that `AccentColorContext.tsx` already has a `{name, value}` quality-color array and a CSS filter lookup, and that its own "Uncommon" entry uses a darkened `#15b300` rather than the literal `#1eff00` ROADMAP names, a reconciliation flagged for the planner (CONTEXT.md D-13) rather than resolved in discussion.

---

## Claude's Discretion

- The exact TypeScript module path and export shape for the quality/brand constants module.
- Whether "quality-legendary" or a different name is correct for the #1eff00/#15b300 shade, pending the planner's reconciliation of which hex the 34-occurrence count targets.
- The exact class list for the purple/violet/pink guard's regex and which files besides the 6 named sites it should scan.
- Whether the --muted sites need per-site opacity/shade adjustment once viewed in context.

## Deferred Ideas

- Item-quality tiers beyond the 5 named hex values: not expanded into this phase's scope.
- A lighter-shade faction color variant (--alliance-light/--horde-light): not introduced this phase, revisit only if the reused single-shade text color reads poorly.
- --muted per-site opacity/shade tuning: left to plan-time or execution-time judgment.
