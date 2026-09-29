# Phase 10: Colour Literal Migration - Research

**Researched:** 2026-09-19
**Domain:** Tailwind/CSS token migration in a Next.js 16 / React 19 app (no new libraries, no backend/API surface)
**Confidence:** HIGH — every count and line number below was re-derived live this session via `Read`/`Bash` against the current working tree, not carried forward from CONTEXT.md or UI-SPEC.md.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `Sidebar.tsx:795` and `AppLayout.client.tsx:236`'s identical avatar-fallback gradient (`from-purple-500 to-pink-500`) becomes a flat `bg-accent`, not a gradient. Both sites get the identical treatment.
- **D-02:** `OnboardingModal.tsx:95`'s background wash (`from-accent/20 via-purple-500/15 to-accent/20`) becomes `from-accent/20 via-accent/10 to-accent/20`.
- **D-03:** `OnboardingModal.tsx:261`'s animated border gradient (`from-purple-500/50 via-accent/50 to-purple-500/50 animate-gradient-x`) becomes `from-accent/30 via-accent/70 to-accent/30`, keeping `animate-gradient-x`.
- **D-04:** `MasterSheetContent.tsx:1742`'s violet button (`bg-violet-600 hover:bg-violet-500`) becomes `bg-accent`/`hover:bg-accent-hover`; `ScoreComparisonModal.tsx:73`'s purple rank-icon (`bg-purple-500/20 text-purple-500`) becomes `bg-accent/20 text-accent`.
- **D-05:** Marketing purple on `landing/` is untouched by this phase; the purple/gradient guard excludes `landing/` explicitly.
- **D-06:** `DashboardContent.tsx:2088`/`:2167`'s progress-bar tracks, `LootListSummaryView.tsx:224`/`:235`/`:206` (a 7th borderline site, grouped with pills not treated as a card), and `horizontal-scroll.tsx:68`'s hover swap all become `--muted` / `hover:bg-muted` — one replacement token, not four.
- **D-07:** The 6 genuinely card-shaped `--background-inset` sites (`ProfileContent.tsx:908`, `DashboardContent.tsx:2239`/`:2411`, `EditCharacterModal.tsx:405`, `skeletons.tsx:69`/`:133`) become `<Card variant="nested">`.
- **D-08:** `--background-inset` is deleted from `app/globals.css` (`:root` and `.dark`) and any `tailwind.config.js` reference once all 12 uses are migrated.
- **D-09:** GuildSettingsContent.tsx's Alliance/Horde toggle selected-state pattern (full-token border, `/20`-opacity fill, lighter text) is preserved exactly when swapping to `--alliance`/`--horde`.
- **D-10:** The hover-only `<style jsx>` glow block keeps its exact visual effect but is rebuilt from `hsl(var(--alliance))`/`hsl(var(--horde))` instead of hardcoded `rgba(...)`. The block itself is not removed.
- **D-11:** `--alliance`/`--horde` each have exactly one shade (`217 91% 60%` / `0 84% 60%`). The current lighter label text (`blue-400`/`red-400`) has no token equivalent; the single existing token is reused for label text too — a small, accepted darkening, reversible if it reads poorly.
- **D-12:** The 5 hex literals are consumed as JS/TS data (a quality-color array, a hex-keyed CSS filter lookup), not Tailwind classes. "Tokenized" means a shared TS constants module (`QUALITY_COLORS.epic`, `BRAND_COLORS.discord`), not new CSS custom properties.
- **D-13:** Naming uses `quality-*`/`brand-*` prefixes: `quality-epic` (`#a335ee`), `quality-legendary` OR the correct WoW-Classic tier name for `#1eff00` (planner must reconcile — see Assumptions Log A1 / Common Pitfalls below, now resolved with live evidence), `brand-battlenet` (`#0074E0`), `brand-discord` (`#5865F2`), `brand-wcl` (`#e35e15`).
- **D-14:** Item-quality colours beyond the 5 named hexes are NOT in scope. `AccentColorContext.tsx`'s own `ACCENT_COLORS` array (a different feature — the user-selectable accent picker) is not itself a literal-spelling problem and is not expanded.

### Claude's Discretion
- Exact TypeScript module path/export shape for the quality/brand constants module, provided it is a single source every consumer imports from.
- Whether `quality-legendary` or another name is correct for `#1eff00`/`#15b300` (see D-13; this research resolves it with evidence — see below).
- Exact class list for the purple/violet/pink guard's regex and which files besides the 6 named sites it should scan.
- Whether `--muted` sites need per-site opacity/shade adjustment versus a uniform `bg-muted` class.

### Deferred Ideas (OUT OF SCOPE)
- Item-quality tiers beyond the 5 named hex values (D-14).
- Any lighter-shade faction color variant (`--alliance-light`/`--horde-light`, D-11).
- `--muted` per-site opacity/shade tuning — left to plan-time/execution-time judgment.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COLOR-03 | `--background-inset` removed, 12 uses migrate to dividers/padding in one card level | Live re-measurement below gives exact 6-card/6-non-card split, confirms UI-SPEC's table over CONTEXT.md's raw 7/5 mechanical count, and identifies a hover-border pitfall on 2 of the 6 card sites. |
| COLOR-04 | Faction colours use `--alliance`/`--horde` everywhere | GuildSettingsContent.tsx lines re-read verbatim (exact match to CONTEXT.md's ~560-611 estimate); `<style jsx>` block confirmed to accept standard CSS, `hsl(var(--x) / alpha)` syntax already used elsewhere in the codebase. |
| COLOR-05 | WoW item-quality + 3 brand colours are named tokens, 34 hex occurrences reference them | Live grep reproduces the ROADMAP's exact "34" figure only when counting matching LINES (not raw string occurrences) across `app/`+`components/` INCLUDING `landing/` and INCLUDING `AccentColorContext.tsx`'s own array — this resolves the scope ambiguity UI-SPEC flagged. D-13's `#1eff00` naming question is resolved to `quality-uncommon` with in-repo evidence. |
| COLOR-07 | No purple/violet/pink gradient class remains in the authenticated app | Live grep of the exact guard pattern returns exactly the 6 named sites at the exact line numbers CONTEXT.md/UI-SPEC state — zero drift since discussion. |
</phase_requirements>

## Summary

This phase is a mechanical, four-track colour-literal migration with zero new dependencies, zero new architecture, and zero new visual language beyond what CONTEXT.md and UI-SPEC.md already locked. All work is confined to the browser/client rendering tier (Tailwind classes, one `<style jsx>` block, and one new TypeScript constants module) — there is no API, database, or server-tier change anywhere in this phase.

Live re-measurement this session confirms **zero drift** on every exact line number CONTEXT.md and UI-SPEC.md cite (GuildSettingsContent.tsx's faction toggle, all 6 purple/gradient sites, all 12 `--background-inset` sites, `--alliance`/`--horde`/`--background-inset`'s exact `globals.css` line numbers). The one place live measurement diverges from CONTEXT.md's prose is the `--background-inset` split: CONTEXT.md's own baseline states "7 card-shaped / 5 non-card," which is exactly what a naive `border-radius` mechanical rule produces (`LootListSummaryView.tsx:206` genuinely has both `border` and `rounded-full`), but the correct **final** classification per D-06's own explicit reasoning is 6 card conversions + 6 muted conversions, matching UI-SPEC's table exactly. This is not a new decision — it is confirmation that UI-SPEC's 6/6 table is the one to build the plan against, not CONTEXT.md's raw 7/5 baseline number.

The most consequential finding is the resolution of the COLOR-05 scope question UI-SPEC explicitly left open for the planner: **counting matching lines** (not raw hex-string occurrences) across `app/` + `components/`, **including** `landing/` and **including** `AccentColorContext.tsx`'s own definitional array, reproduces the ROADMAP's stated "34" figure exactly (14 + 12 + 4 + 2 + 2 = 34). No other scope combination hits 34. This means the COLOR-05 migration is NOT scoped the same way as COLOR-07's purple guard (which explicitly excludes `landing/` per D-05) — COLOR-05 covers all 34 sites, 11 of which are in `app/components/landing/` (`ClickEffects.tsx`, `ParallaxItem.tsx`, `LandingLootDecision.tsx`). This should be confirmed with the user as an explicit scope statement before the plan's first commit, since it roughly doubles the file count from what a "landing-excluded" reading would suggest and touches a public marketing page (though not from a copy or purple-guard perspective — only the WoW quality/brand hex literals in those 3 files are affected).

The second consequential finding is the D-13 naming reconciliation: `#1eff00` is WoW Classic's **Uncommon** (green) quality tier, not Legendary. `AccentColorContext.tsx:11` shows `Legendary` is already `#ff8000` (orange) in this exact codebase, and `PremiumItemTooltip.tsx:21` uses that same `#ff8000` for its own "Legendary"-tier product-name text one line above the `#1eff00` sites — so naming the new constant `quality-legendary` would create a same-file contradiction (two different hex values both claiming to be "Legendary"). `AccentColorContext.tsx:14` and `app/components/landing/ParallaxItem.tsx:35` both already independently label this exact green "Uncommon" in this codebase. The correct constant name is `QUALITY_COLORS.uncommon`.

**Primary recommendation:** Build the constants module as new exports on the existing `lib/design-system/tokens.ts` (already contains an unused `discord: { 500: '#5865F2' }` entry in the exact `brand-*` shape D-13 wants) OR as a dedicated new file — either is viable, but whichever is chosen, every one of the 34 (or 23, if `landing/` is descoped) matching lines must be rewritten to import the constant, not just have the constant declared. `lib/design-system/tokens.ts`'s `primitiveColors` is proven dead code today (zero imports anywhere in `app/` or `components/`), which is exactly why `RaidCardHeader.tsx:154` still hardcodes `#5865F2` a few files away from a tokens file that already has it. Don't repeat that mistake with the new module.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `--background-inset` token removal + Card `nested` variant adoption | Browser / Client (React component classNames) | — | Pure Tailwind class + CSS custom property changes, no data flow change |
| Faction colour token wiring (`--alliance`/`--horde`) | Browser / Client (Tailwind classes + `<style jsx>`) | — | `<style jsx>` compiles to scoped CSS injected client-side by Next.js; no server rendering logic changes |
| WoW item-quality/brand colour constants module | Browser / Client (TS module imported by client components) | — | Consumed only by client components (`'use client'` files); no server-side usage found |
| Purple/gradient removal | Browser / Client (Tailwind classes) | — | Same as above; `landing/` (also Browser/Client tier) is explicitly excluded by product decision |

All four tracks live entirely in the Browser/Client tier. There is no Frontend-Server (SSR), API, or Database tier work in this phase — confirmed by the fact every touched file is either a `'use client'` component or a static CSS/Tailwind config file.

## Live Re-Measurement (all counts re-derived this session)

### 1. `--background-inset` — exact locations

`app/globals.css` [VERIFIED: app/globals.css:136,224]:
```
136:    --background-inset: 35 25% 96%;     /* #f7f5f1 - Nested cards inside elevated */
224:    --background-inset: 228 12% 10%;    /* #18191f - Nested cards. Deliberately untouched: at ... */
```
`tailwind.config.js` [VERIFIED: tailwind.config.js:83]:
```
83:          inset: "hsl(var(--background-inset))",
```
These are the only 3 definitional references; both match CONTEXT.md's stated `~136`/`~224` line numbers exactly (zero drift).

**12 `bg-background-inset` usage sites** [VERIFIED: live grep this session, exact class strings quoted]:

| # | File:Line | Full class string (relevant portion) | Mechanical shape | Final classification |
|---|-----------|----------------------------------------|-------------------|----------------------|
| 1 | `ProfileContent.tsx:908` | `bg-background-inset border border-border rounded-lg` | border + radius | **Card (nested)** |
| 2 | `DashboardContent.tsx:2088` | `bg-background-inset rounded-full mt-3 overflow-hidden` (progress track) | radius only, no border | **muted** |
| 3 | `DashboardContent.tsx:2167` | `bg-background-inset rounded-full mt-3 overflow-hidden` (progress track) | radius only, no border | **muted** |
| 4 | `DashboardContent.tsx:2239` | `bg-background-inset border border-border rounded-xl ... hover:border-accent/50 transition-colors cursor-pointer` | border + radius, **has hover:border** | **Card (nested)** — see Pitfall 1 |
| 5 | `DashboardContent.tsx:2411` | `bg-background-inset border border-border rounded-xl ... hover:border-accent/50 transition-colors cursor-pointer` | border + radius, **has hover:border** | **Card (nested)** — see Pitfall 1 |
| 6 | `LootListSummaryView.tsx:206` | `bg-background-inset border border-border rounded-full` (a chip in a flex-wrap player list) | **border + radius (mechanically qualifies as card-shaped)** | **muted** — D-06 explicitly overrides the mechanical rule, grouping this with its file's other 2 pills |
| 7 | `LootListSummaryView.tsx:224` | `bg-background-inset rounded-full text-12 ...` | radius only, no border | **muted** |
| 8 | `LootListSummaryView.tsx:235` | `bg-background-inset rounded-full text-12 ...` | radius only, no border | **muted** |
| 9 | `EditCharacterModal.tsx:405` | `bg-background-inset border border-border rounded-lg` | border + radius | **Card (nested)** |
| 10 | `horizontal-scroll.tsx:68` | `hover:bg-background-inset hover:border-border-strong` (hover-only swap on an already `bg-background-elevated border border-border` element) | hover swap, not a base state | **hover:bg-muted** |
| 11 | `skeletons.tsx:69` | `bg-background-inset border border-border rounded-xl p-4` | border + radius | **Card (nested)** |
| 12 | `skeletons.tsx:133` | `bg-background-inset border border-border rounded-lg` | border + radius | **Card (nested)** |

**Reconciling the CONTEXT.md "7/5" vs UI-SPEC "6/6" discrepancy (resolved):** Applying the mechanical rule ("has both `border` and a radius class") literally to all 12 sites produces **7** matches (rows 1,4,5,6,9,11,12) and **5** non-matches (rows 2,3,7,8,10) — this is exactly CONTEXT.md's baseline number and is arithmetically correct as a *raw* classification. But D-06 is an explicit, already-locked decision that pulls row 6 (`LootListSummaryView.tsx:206`) out of the card bucket and into the muted bucket for a contextual reason (it renders as one of three chips in the same flex-wrap player list as rows 7 and 8, not as a boxed card) — producing the **final** 6-card/6-muted split UI-SPEC's own table already uses. **The planner should build against UI-SPEC's 6/6 table** (6 `<Card variant="nested">` conversions, 6 `--muted`/`hover:bg-muted` conversions) — this is not a new decision, it is confirmation that the locked D-06 override, not the raw mechanical count, is authoritative.

All 4 files receiving `<Card variant="nested">` conversions already `import { Card } from '@/components/ui/card'` [VERIFIED: grep this session — `ProfileContent.tsx:48`, `DashboardContent.tsx:10`, `EditCharacterModal.tsx:25`, `skeletons.tsx:2`]. No new import is needed at any of the 6 card sites.

**Confirmed nesting** (D-07's premise that these 6 sites sit inside another `<Card>`): `DashboardContent.tsx:2239` sits inside `<Card className="p-4 sm:p-6">` opened at line 2216 ("Next in line" section) [VERIFIED: DashboardContent.tsx:2216-2239]; `DashboardContent.tsx:2411` sits inside `<Card className="p-4 sm:p-6">` opened at line 2401 ("Actions needed" section) [VERIFIED: DashboardContent.tsx:2401-2411]; `skeletons.tsx:69`'s `ItemListSkeleton` is called from inside `LootCardSkeleton()`'s `<Card className="p-6">` wrapper at the same file [VERIFIED: skeletons.tsx:93-105].

**The exact `nested` variant contract** [VERIFIED: components/ui/card.tsx:24-49, quoted verbatim]:
```typescript
type CardVariant = "default" | "unified" | "nested"
// ...
className={cn(
  variant === "nested"
    ? "border-t border-border first:border-t-0"
    : "rounded-xl border border-border bg-card text-card-foreground",
  variant === "unified" && "p-4 sm:p-6",
  className
)}
```
Converting any of the 6 sites to `<Card variant="nested" className="p-4">` (preserving only the original padding) **drops the background, the full border, and the radius entirely** — replaced by a top-only divider (`border-t border-border`), suppressed on first child. This is a real, visible structural simplification (not a colour-only swap), consistent with the ROADMAP's stated goal ("the surface ramp has one card level instead of two").

### 2. WoW item-quality / brand hex literals — exact count and the resolved scope question

**Live count reproduces "34" exactly, but only under one specific scope** [VERIFIED: live grep this session, full sorted list below]:

| Scope tested | Line count |
|---|---|
| `app/`+`components/`, **including** `landing/`, **including** `AccentColorContext.tsx` | **34** ✅ matches ROADMAP |
| `app/`+`components/`, excluding `landing/`, including `AccentColorContext.tsx` | 23 |
| `app/`+`components/`, including `landing/`, excluding `AccentColorContext.tsx` | 31 |
| `app/`+`components/`, excluding both | 20 |

**Resolution: the phase's "34" figure includes `landing/` files and `AccentColorContext.tsx`'s own array.** This is a materially different scope than COLOR-07's purple guard (which explicitly excludes `landing/` per D-05 and REQUIREMENTS.md's own COLOR-07 wording). REQUIREMENTS.md's COLOR-05 text has no `landing/` carve-out ("every hard-coded ... in `app/` and `components/`"), unlike COLOR-07's text which explicitly says `app/(app)/`, `app/components/` excluding `landing/`. The project's own existing guard-test convention backs this reading too: `hand-rolled-cards.test.ts`'s `SCAN_ROOTS = ['app', 'components']` [VERIFIED: __tests__/hand-rolled-cards.test.ts:142] scans `landing/` by default with no built-in exclusion — carve-outs are done via an explicit `scanExclusions` allow-list of specific files, not a blanket directory skip. **Recommendation: confirm with the user at the plan's blocking checkpoint that the COLOR-05 migration includes the 11 `landing/` lines and the 3 `AccentColorContext.tsx` lines** (flagged rather than silently assumed, per this workstream's "Confirm before change" standing constraint).

**Full verified line list** (34 lines) [VERIFIED: live grep this session, `grep -rnE "#a335ee|#1eff00|#0074E0|#5865F2|#e35e15" app/ components/ -i`, quoted]:

| Hex | Non-landing sites (line count) | Landing sites (line count) | `AccentColorContext.tsx` sites (line count) |
|---|---|---|---|
| `#a335ee` | `WeekGroup.tsx:65`, `RaidCardHeader.tsx:109`, `KonamiEasterEgg.tsx:14,15,18,20` (4), `ItemLink.tsx:116` = 7 | `LandingLootDecision.tsx:72`, `ClickEffects.tsx:234,235,275` (3) = 4 | `AccentColorContext.tsx:12` (`{ name: 'Epic', value: '#a335ee' }`), `:25` (filter-lookup key) = 2 |
| `#1eff00` | `PremiumItemTooltip.tsx:37,40,43,46,49` (5) | `ClickEffects.tsx:177,185,193,200,206` (5), `ParallaxItem.tsx:35` (1) = 6 | `AccentColorContext.tsx:14` — **comment only**, `// WoW Uncommon green (darkened from #1eff00)` — the code value on that line is `#15b300`, not `#1eff00` |
| `#0074E0` | `ProfileContent.tsx:637`, `characters/[id]/edit/_client.tsx:576`, `EditCharacterModal.tsx:457`, `CreateCharacterModal.tsx:369` = 4 | none | none |
| `#5865F2` | `RaidCardHeader.tsx:154`, `design-system/_client.tsx:329` (docs page) = 2 | none | none |
| `#e35e15` | `AttendanceContent.tsx:1248`, `RaidCardHeader.tsx:119` = 2 | none | none |
| **Totals** | **20** | **11** | **3** |

20 + 11 + 3 = **34**, matching ROADMAP's success criterion 3 exactly.

**D-13 naming reconciliation for `#1eff00` — RESOLVED with in-repo evidence:**
- `AccentColorContext.tsx:11` [VERIFIED, quoted]: `{ name: 'Legendary', value: '#ff8000' }, // Default - WoW Legendary orange` — Legendary is already, unambiguously, orange in this codebase.
- `AccentColorContext.tsx:14` [VERIFIED, quoted]: `{ name: 'Uncommon', value: '#15b300' }, // WoW Uncommon green (darkened from #1eff00)` — this file already names the un-darkened `#1eff00` shade "Uncommon" in its own comment.
- `app/components/landing/ParallaxItem.tsx:35` [VERIFIED, quoted]: `uncommon: '#1eff00',` — a second, independent, already-shipped mapping in this exact codebase naming the literal (not darkened) `#1eff00` value "uncommon".
- `PremiumItemTooltip.tsx:21` [VERIFIED, quoted]: `text-[#ff8000]` on the tooltip's product-name line, one line above the 5 `#1eff00` "Equip:"/"Use:" body lines — this file itself already uses `#ff8000` for its own "Legendary"-tier styling, so naming the green a second "Legendary" constant would create a same-file contradiction.
- **Conclusion: name the constant `QUALITY_COLORS.uncommon`, not `quality-legendary`.** Note the WoW-authentic nuance for context (not a scope change): in `PremiumItemTooltip.tsx`, this green renders "Equip:"/"Use:" effect-description lines, not an item-name/quality label — in the real WoW UI, that specific green is the fixed colour for spell/effect tooltip text on *any* item regardless of its quality tier, and happens to be numerically identical to the Uncommon quality-tier green. The hex value and the correct constant name are unambiguous either way (`#1eff00` = `quality-uncommon`); this is a naming/labeling nuance the planner does not need to resolve differently, only to be aware of if a future reviewer asks "why is Legendary-tier copy green."

**Dead-code precedent to avoid repeating:** `lib/design-system/tokens.ts:79-82` [VERIFIED, quoted] already defines `discord: { 500: '#5865F2' }` inside its exported `primitiveColors` object, re-exported through `lib/design-system/index.ts:11`. A live grep this session confirms **zero files under `app/` or `components/` import `primitiveColors` or anything from `@/lib/design-system`** — this is exactly why `RaidCardHeader.tsx:154` and `design-system/_client.tsx:329` still hardcode `#5865F2` a few directories away from a tokens file that already names it. Whichever module path the planner picks for `QUALITY_COLORS`/`BRAND_COLORS` (Claude's Discretion per CONTEXT.md), the plan must include an explicit step to rewrite every one of the 34 (or 23) consumer lines to import from it — declaring the constant without rewriting consumers reproduces this exact dead-token failure mode.

### 3. Purple/violet/pink guard — exact live count

`grep -rE "(from-purple-|to-pink-|bg-violet-|text-purple-|via-purple-)" "app/(app)" app/components` excluding `landing/` [VERIFIED: run live this session] returns **exactly the 6 sites CONTEXT.md/UI-SPEC name, at the exact line numbers, with zero drift**:

| File:Line | Exact class string |
|---|---|
| `Sidebar.tsx:795` | `bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 border border-border` |
| `AppLayout.client.tsx:236` | `bg-gradient-to-br from-purple-500 to-pink-500 border border-border` |
| `OnboardingModal.tsx:95` | `bg-gradient-to-br from-accent/20 via-purple-500/15 to-accent/20 bg-[length:200%_200%]` |
| `OnboardingModal.tsx:261` | `bg-gradient-to-r from-purple-500/50 via-accent/50 to-purple-500/50 animate-gradient-x` |
| `MasterSheetContent.tsx:1742` | `bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg` |
| `ScoreComparisonModal.tsx:73` | `bg-purple-500/20 text-purple-500` (in a `rankModifier` config object, not JSX) |

`components/ui/button.tsx:83` [VERIFIED, quoted]: `"bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50",` — confirms UI-SPEC's claim that `hover:bg-accent/90` is the project's real, already-shipped solid-accent-button hover convention (not a speculative class invented for this phase).

### 4. Faction toggle — `GuildSettingsContent.tsx` exact current code

Read live this session, lines 556-614 [VERIFIED: app/(app)/guild-settings/components/GuildSettingsContent.tsx:556-614] — matches CONTEXT.md's "~560-611" estimate almost exactly (actual block is 556-614). Full verbatim structure:

```tsx
<Button
  type="button" variant="outline"
  onClick={() => isGuildCreator && setFaction('Alliance')}
  className={`alliance-btn group relative px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
    faction === 'Alliance'
      ? 'border-blue-500 bg-blue-500/20'
      : 'border-border-strong bg-background-elevated hover:bg-muted'
  } ${!isGuildCreator ? 'opacity-60 cursor-not-allowed' : ''}`}
>
  ...
  <span className={`... ${faction === 'Alliance' ? 'text-blue-400' : isGuildCreator ? 'text-foreground group-hover:text-blue-400' : 'text-foreground'}`}>
    Alliance
  </span>
</Button>
{/* Horde button: identical structure, red-500/red-400/horde-btn */}
{isGuildCreator && (
  <style jsx>{`
    .alliance-btn:hover:not(:disabled) {
      border-color: rgb(59, 130, 246);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
      background: rgba(59, 130, 246, 0.15);
    }
    .horde-btn:hover:not(:disabled) {
      border-color: rgb(239, 68, 68);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.15);
    }
  `}</style>
)}
```

`tailwind.config.js:148-149` [VERIFIED, quoted]: `alliance: "hsl(var(--alliance))",` / `horde: "hsl(var(--horde))",` — so `border-alliance`, `bg-alliance/20`, `text-alliance`, `group-hover:text-alliance`, and the `horde` equivalents already resolve today via Tailwind's JIT engine; no Tailwind config change is needed for the class-based swap. `app/globals.css:200-201,302-303` [VERIFIED]: `--alliance: 217 91% 60%;` / `--horde: 0 84% 60%;` — a single value in both `:root` and `.dark` (confirms D-11's "one shade only" premise), byte-identical to `217 91% 60%`/`0 84% 60%` which is what Tailwind's stock `blue-500`/`red-500` resolve to.

**`<style jsx>` → `hsl(var(--x) / alpha)` — confirmed viable via existing in-repo precedent**, not merely assumed: [VERIFIED, quoted] `app/(app)/admin/analytics/_client.tsx:202`: `` `hsl(var(--accent) / ${0.3 + (pct / 100) * 0.5})` `` and `Sidebar.tsx:292`: `'linear-gradient(to bottom, hsl(var(--background-subtle)) 69.886%, hsl(var(--background-subtle) / 0) 100%)'`. These are inline `style={{}}` values rather than `<style jsx>` blocks, but the CSS syntax is identical either way — `styled-jsx` performs no special parsing or restriction of CSS function syntax; it only scopes selectors via a Babel transform. The slash-alpha `hsl(var(--x) / N)` syntax is CSS Color Module Level 4, supported by all evergreen browsers since ~2020, and is **already used live in this codebase** for the analogous `--accent` token. Recommended direct translation of the glow block:
```css
.alliance-btn:hover:not(:disabled) {
  border-color: hsl(var(--alliance));
  box-shadow: 0 0 20px hsl(var(--alliance) / 0.5), 0 0 40px hsl(var(--alliance) / 0.2);
  background: hsl(var(--alliance) / 0.15);
}
```
(D-10 requires the CSS-in-JS block itself to remain; only the colour source changes.)

## Standard Stack

No new libraries. This phase touches only:
- Tailwind CSS 3.4.19 (existing) — class renames
- `app/globals.css` (existing) — one token deletion, no new tokens
- `tailwind.config.js` (existing) — one config-key deletion, no new keys
- TypeScript (existing) — one new constants module (file, no package)
- `styled-jsx` (bundled with Next.js 16.2.12, already in use at the exact site being touched) — no new usage pattern, only a value-source change

**Installation:** none required.

## Package Legitimacy Audit

Not applicable — this phase installs zero external packages.

## Architecture Patterns

### Recommended file changes (no new directories)
```
app/globals.css                                       # delete --background-inset (2 lines)
tailwind.config.js                                     # delete background.inset key (1 line)
app/(app)/guild-settings/components/GuildSettingsContent.tsx   # faction toggle + style jsx block
app/contexts/AccentColorContext.tsx                    # possible import of new QUALITY_COLORS.epic/.uncommon
lib/design-system/tokens.ts   (or a new lib/constants/quality-colors.ts)  # new QUALITY_COLORS / BRAND_COLORS exports
+ 20-31 consumer files (see hex table above)           # literal -> constant import
+ 6 files                                              # purple/gradient -> accent
+ 6 files                                              # --background-inset -> Card(nested) or muted
__tests__/*.test.ts (new)                              # 2 new guards, following source-files.ts pattern
scripts/visual/baseline.mjs                            # possibly add /master-sheet page (see below)
```

### Pattern: guard test shape (reuse verbatim)
Every existing guard in this repo (`__tests__/hand-rolled-cards.test.ts`, `__tests__/token-palette-literals.test.ts`, `__tests__/type-scale-floor.test.ts`) follows the identical shape [VERIFIED: both files read in full this session]:
```typescript
import { matchesIn, sourceFiles } from './design-tokens/source-files'

const SCAN_ROOTS = ['app', 'components']  // or an explicit SCANNED_PATHS file list
const DETECTION_PATTERN = /.../

describe('some-guard (REQ-ID)', () => {
  it('finds no X anywhere under app/ or components/', () => {
    const files = sourceFiles(SCAN_ROOTS) // optionally .filter() out an EXCLUDED_PATHS set
    const matches = matchesIn(files, DETECTION_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})
```
`sourceFiles()`/`matchesIn()` [VERIFIED: __tests__/design-tokens/source-files.ts:37-107] do a plain recursive walk (skipping only `node_modules`/`.next`/`.git`) and per-line regex test — **directory exclusion (e.g. `landing/`) is done by filtering the file list after `sourceFiles()`, not by a parameter to `sourceFiles()` itself.** This is the established mechanism the new `--background-inset`-absence guard and purple/gradient guard should both reuse: for the purple guard (which must exclude `landing/` per D-05), filter `sourceFiles(['app/(app)', 'app/components'])` with `.filter(f => !f.includes('/landing/'))`, exactly analogous to `hand-rolled-cards.test.ts`'s `EXCLUDED_PATHS` set pattern (just path-prefix-based instead of an exact-file set, since `landing/` is an entire subtree of ~23 files, not a handful of named exceptions).

### Anti-Patterns to Avoid
- **Declaring a constants module without rewriting every consumer:** `lib/design-system/tokens.ts`'s `discord: {500: '#5865F2'}` has existed with zero consumers while `RaidCardHeader.tsx` and 3 other files hardcode the same hex — proof this failure mode already happened once in this exact codebase. The plan must include an explicit rewrite step for every counted line, not just a "create the module" task.
- **Applying `<Card variant="nested">` to `DashboardContent.tsx:2239`/`:2411` without addressing `hover:border-accent/50`:** see Pitfall 1 below.
- **Treating CONTEXT.md's raw "7/5" `--background-inset` split as authoritative over UI-SPEC's decision-adjusted "6/6" table:** see the reconciliation above — build against the 6/6 table.

## Don't Hand-Roll

Not applicable in the traditional sense (no third-party library territory is being reinvented here) — but two implicit "don't hand-roll a new mechanism" notes carry over from CONTEXT.md's own stated pattern:
- Don't introduce new CSS custom properties for the quality/brand colours — D-12 already locked "shared TS constants module" as the mechanism, matching how the data is actually consumed (JS logic: filter calculations, conditional style objects), not Tailwind classes.
- Don't add a new `--alliance-light`/`--horde-light` token for the label-text shade mismatch — D-11 already locked reusing the single existing token.

**Key insight:** every "don't hand-roll" instinct in this phase resolves to "don't introduce a new token/mechanism when an existing one already covers the case" — consistent with CONTEXT.md's own stated meta-pattern ("prefer the existing semantic token over a new one").

## Common Pitfalls

### Pitfall 1: `hover:border-accent/50` on 2 of the 6 `--background-inset` → Card(nested) sites
**What goes wrong:** `DashboardContent.tsx:2239` and `:2411` both carry `hover:border-accent/50 transition-colors cursor-pointer` on top of `bg-background-inset border border-border rounded-xl` [VERIFIED, quoted above]. `<Card variant="nested">` provides ONLY `border-t border-border` (a static top divider) with no full border in any state — so a naive migration that keeps `hover:border-accent/50` in the passed-through `className` would try to colour a full border that doesn't exist at rest, producing a border that appears to materialize on hover out of nowhere (all 4 sides, on an element with no border and no radius in the resting state). This is a real visual difference the other 4 nested-card conversions (`ProfileContent.tsx:908`, `EditCharacterModal.tsx:405`, `skeletons.tsx:69`/`:133`) do not have to deal with, since none of those 4 carry a `hover:border-*` class.
**Why it happens:** these two sites are interactive/clickable rows (`onClick={() => router.push(...)}`), not static display cards — their `hover:border-accent/50` is a "this row is clickable" affordance, a different concern from the card-shape-vs-divider question `nested` solves.
**How to avoid:** the plan should decide explicitly (this is new "Claude's Discretion"-shaped territory the existing CONTEXT.md doesn't cover, since it wasn't discovered until this session's grep): either (a) drop `hover:border-accent/50` and replace the click-affordance with `hover:bg-muted/50` or similar (consistent with D-06's "prefer existing semantic token" pattern and consistent with the surrounding `--muted` sites), or (b) keep a hover border but source it from a value that exists at rest too (defeating part of the "one card level" simplification), or (c) confirm with the user at the phase checkpoint that a hover-border-materializing-from-nothing effect is acceptable. Recommend (a) as consistent with every other locked decision's stated pattern.
**Warning signs:** visually check both sites in the screenshot gate (light + dark, hover state) — if a full-perimeter border appears to pop in on hover with no border present at rest, this pitfall was not addressed.

### Pitfall 2: Re-using CONTEXT.md's "7 card / 5 non-card" prose as the plan's target split
**What goes wrong:** a plan written against CONTEXT.md's raw baseline number would try to convert 7 sites to `<Card variant="nested">`, incorrectly including `LootListSummaryView.tsx:206`.
**Why it happens:** CONTEXT.md's own text is internally correct as a *mechanical* classification but explicitly flags that D-06 overrides it for one site; a fast reader can miss the override.
**How to avoid:** build against UI-SPEC.md's table (6 card, 6 non-card, `LootListSummaryView.tsx:206` grouped with its file's other 2 pills) — already reconciled above.
**Warning signs:** if the plan lists `LootListSummaryView.tsx:206` under the Card-conversion track, this pitfall recurred.

### Pitfall 3: Assuming `#1eff00`'s only occurrences are in `PremiumItemTooltip.tsx`
**What goes wrong:** UI-SPEC's own table only lists `PremiumItemTooltip.tsx` (5 sites) for `#1eff00`; the live count is 11 (5 `PremiumItemTooltip.tsx` + 6 `landing/` sites: `ClickEffects.tsx` x5, `ParallaxItem.tsx` x1). A plan that only touches `PremiumItemTooltip.tsx` under-delivers on COLOR-05's true scope if `landing/` is confirmed in-scope (see the scope resolution above).
**Why it happens:** UI-SPEC.md's own reconciliation flag explicitly deferred the landing-scope question to the planner; its own table was written before that question was answered.
**How to avoid:** decide the `landing/` scope question explicitly (recommend: in-scope, backed by the exact "34" arithmetic match) before writing the file list for COLOR-05's tasks.
**Warning signs:** `grep -c "#1eff00" app/components/landing/ClickEffects.tsx` returning non-zero after the phase claims completion.

### Pitfall 4: Guard-test comment string matching
**What goes wrong:** `AccentColorContext.tsx:14`'s comment `// WoW Uncommon green (darkened from #1eff00)` contains the literal string `#1eff00` even though the line's actual *code* value is `#15b300`. `matchesIn()`'s regex match is a plain per-line string test with no code/comment distinction [VERIFIED: __tests__/design-tokens/source-files.ts:88-107] — so any COLOR-05 guard written as a naive `grep`-equivalent for the 5 hex strings will flag this comment forever, or the plan must edit the comment wording (e.g., "darkened from the Uncommon-tier green" instead of citing the literal hex) to let a strict guard pass.
**Why it happens:** the existing comment predates this phase and was written for a human reader, not a machine guard.
**How to avoid:** either scope the new COLOR-05 guard to exclude this one line by design (an explicit, disclosed exception, following this repo's established "name every exclusion" convention from `hand-rolled-cards.test.ts`), or reword the comment so it no longer contains the literal string.
**Warning signs:** a "zero raw hex" guard that never goes green, or one that silently excludes this line without naming it in a comment.

## Code Examples

### Existing `hsl(var(--x) / alpha)` precedent (verified live, not a new pattern)
```typescript
// Source: app/(app)/admin/analytics/_client.tsx:202 (verified this session)
backgroundColor: isFirst ? 'hsl(var(--accent))' : `hsl(var(--accent) / ${0.3 + (pct / 100) * 0.5})`,
```
```typescript
// Source: app/components/Sidebar.tsx:292 (verified this session)
background: 'linear-gradient(to bottom, hsl(var(--background-subtle)) 69.886%, hsl(var(--background-subtle) / 0) 100%)',
```

### Existing `nested` Card variant contract (verified live)
```typescript
// Source: components/ui/card.tsx:24-49 (verified this session)
type CardVariant = "default" | "unified" | "nested"
// variant === "nested" -> "border-t border-border first:border-t-0"
```

## State of the Art

Not applicable — no framework/library version currency question exists in this phase; every referenced mechanism (Tailwind arbitrary/palette classes, CSS custom properties, `styled-jsx`, React Context) is already live in the exact versions declared in this project's own CLAUDE.md (Next.js 16.2.12 / React 19.2.3 / Tailwind 3.4.19), verified this session against the actual running codebase rather than package.json alone.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Including `landing/` and `AccentColorContext.tsx`'s own array in the COLOR-05 "34 occurrences" scope is the ROADMAP's intended reading (versus excluding one or both) | Live Re-Measurement §2 | If wrong, the plan touches 11 extra landing-page lines and re-touches `AccentColorContext.tsx`'s own array unnecessarily; low risk (arithmetic strongly supports this reading — it is the only combination that reproduces "34" exactly) but this is an inference from a number match, not an explicit ROADMAP scope statement, so it should be confirmed at the phase's first checkpoint, not silently assumed. |
| A2 | In real WoW Classic UI, `#1eff00` is the fixed colour for "Equip:"/"Use:" tooltip effect-description text on any item, coincidentally equal to the Uncommon quality-tier green, rather than being itself a quality indicator in `PremiumItemTooltip.tsx`'s specific usage | D-13 naming reconciliation | Purely explanatory context, not a scope or naming decision — the resolved constant name (`quality-uncommon`) is correct regardless of this nuance, since two independent in-repo naming precedents (`AccentColorContext.tsx`, `ParallaxItem.tsx`) already call this exact hex "Uncommon." If this WoW-lore detail is wrong, nothing in the plan changes. |
| A3 | Dropping `hover:border-accent/50` in favour of `hover:bg-muted/50` (or similar) is the right fix for Pitfall 1's two sites, versus keeping some form of hover border | Common Pitfalls, Pitfall 1 | Medium — this is a genuinely new visual-judgment call this session's research surfaced that none of CONTEXT.md/UI-SPEC's locked decisions cover; the planner or a checkpoint should confirm the exact replacement treatment before implementation, not treat A3's recommendation as locked. |

## Open Questions

1. **Does the COLOR-05 migration include the 11 `landing/` lines and the 3 `AccentColorContext.tsx` lines, or only the 20 "narrow" non-landing/non-definitional lines?**
   - What we know: the ROADMAP's literal "34" figure is only reproduced by including both.
   - What's unclear: whether "34" was an intentional scope statement or an artifact of whoever counted it including files they didn't mean to include.
   - Recommendation: default to including both (matches the number, matches REQUIREMENTS.md's COLOR-05 wording which has no landing carve-out, matches this repo's existing guard-scoping convention) but state this explicitly as a plan-level decision at the blocking checkpoint rather than a silent inheritance.

2. **What replaces `hover:border-accent/50 transition-colors cursor-pointer` on the two interactive `--background-inset` card sites once they convert to `<Card variant="nested">`?**
   - What we know: `nested` provides no border to source a hover-border effect from; the other 4 nested-card conversions in this phase don't have this complication.
   - What's unclear: whether the user/planner wants a hover-background treatment, a different visual affordance, or accepts the border-materializing-from-nothing effect.
   - Recommendation: `hover:bg-muted/50` (or the project's existing `hover:bg-muted` used at `horizontal-scroll.tsx:68`) is the pattern-consistent default; confirm at the phase checkpoint alongside item 1.

3. **Should `AccentColorContext.tsx`'s own `#a335ee` (lines 12, 25) be rewritten to import `QUALITY_COLORS.epic` from the new module, per D-12's "or be imported by this file, not duplicate its data"?**
   - What we know: D-12 explicitly anticipates this file either hosting or importing the new module.
   - What's unclear: whether the planner picks "host" (module lives in/adjacent to this file) or "import" (module lives elsewhere, this file's 2 literal lines get rewritten to reference it).
   - Recommendation: either is consistent with D-12; the "import" direction is slightly cleaner since `AccentColorContext.tsx`'s `ACCENT_COLORS` array is explicitly a different feature (D-14) from the `QUALITY_COLORS` constants this phase introduces, and keeping them as separate concerns (one imports from the other, rather than merging) avoids conflating a user-preference picker with a fixed WoW-lore constant table.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Puppeteer | `scripts/visual/baseline.mjs` screenshot gate (success criterion 5) | ✓ | 24.43.1 (devDependency) [VERIFIED: package.json:89] | — |
| Vitest | Guard tests | ✓ | 4.1.0 (per CLAUDE.md) | — |
| Local dev server (`/dev-login` flow) | Authenticated screenshot capture | Unconfirmed this session (requires `NODE_ENV=development` + a running server) | — | Home-only fallback already established by Phase 09 (WINDOWS.md entries 10/13) if the authenticated dev-login flow is unavailable at execution time |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** the authenticated screenshot capture already has a documented Home-only fallback from Phase 09; carry the same fallback posture into Phase 10 rather than re-deciding it.

### `scripts/visual/baseline.mjs`'s current `PAGES` array [VERIFIED: scripts/visual/baseline.mjs:101-104]
```javascript
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
  { name: 'guild-settings', path: '/guild-settings', auth: true, afterGoto: expandExpansionSchedule },
  { name: 'loot-management', path: '/loot-management', auth: true, afterGoto: openLootSettingsModal },
]
```
4 entries, matching CONTEXT.md's canonical-refs claim exactly. `MasterSheetContent.tsx:1742`'s violet button (one of the 6 COLOR-07 sites) is NOT reachable by any current `PAGES` entry — `/master-sheet` is not in the array. `AttendanceContent.tsx:1248` and `RaidCardHeader.tsx:*` (WCL/Epic-purple/Discord hex sites) are also not reachable — no `/attendance` or `/raid-tracking` entry exists either. The Alliance/Horde faction toggle IS reachable (`/guild-settings` is already captured, though the array's existing `afterGoto: expandExpansionSchedule` hook does not scroll to or interact with the faction section — confirm whether the faction toggle renders within the default viewport capture or needs its own `afterGoto` hook). **Recommendation:** add `master-sheet` to `PAGES` (needed to visually verify D-04's button) at minimum; `attendance` and `raid-tracking` pages carry only small inline text-colour spans (not full-surface colour changes) and are lower-priority for the screenshot gate, but the plan should explicitly decide whether success criterion 5 ("screenshots confirm faction/item-quality/brand colours read the same or better") requires them too.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 [per CLAUDE.md] |
| Config file | `vitest.config.ts` (jsdom environment, globals enabled) |
| Quick run command | `npx vitest run __tests__/<new-guard>.test.ts` |
| Full suite command | `npm run test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLOR-03 | `--background-inset` absent from `globals.css`/`tailwind.config.js`; 12 uses migrated | unit (guard) | `npx vitest run __tests__/background-inset-absence.test.ts` | ❌ Wave 0 — new file |
| COLOR-04 | `--alliance`/`--horde` used at GuildSettingsContent.tsx, no `blue-500`/`red-500`/raw `rgba` remains there | unit (guard, file-scoped) or manual grep in the same guard file as COLOR-03 | `npx vitest run __tests__/faction-color-literals.test.ts` (or fold into an existing/new palette-literal-style guard scoped to this one file) | ❌ Wave 0 — new file or extend `token-palette-literals.test.ts`'s `SCANNED_PATHS` |
| COLOR-05 | 34 (or 23) hex literals replaced by `QUALITY_COLORS`/`BRAND_COLORS` imports | unit (guard) | `npx vitest run __tests__/quality-brand-color-literals.test.ts` | ❌ Wave 0 — new file |
| COLOR-07 | No purple/violet/pink class in authenticated app | unit (guard) | `npx vitest run __tests__/purple-gradient-guard.test.ts` | ❌ Wave 0 — new file |
| Success criterion 5 (screenshots) | Faction/item-quality/brand colours read the same or better | visual (manual + scripted capture) | `node scripts/visual/baseline.mjs --label phase10-before` / `--label phase10-after` | ✓ script exists; `PAGES` array may need a `master-sheet` entry (see Environment Availability) |

### Sampling Rate
- **Per task commit:** `npm run lint && npm run typecheck` plus the specific new guard test for that task's track.
- **Per wave merge:** `npm run test` (full suite).
- **Phase gate:** full suite green, plus the before/after screenshot pair, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `__tests__/background-inset-absence.test.ts` — covers COLOR-03 success criterion 1 (token absence + all 12 sites migrated)
- [ ] A faction-colour guard (new file or an extension of `token-palette-literals.test.ts`'s `SCANNED_PATHS`) — covers COLOR-04
- [ ] `__tests__/quality-brand-color-literals.test.ts` — covers COLOR-05, must explicitly decide the `AccentColorContext.tsx:14` comment-string exception (Pitfall 4) and the `landing/`-inclusion question (Open Question 1) in its own header comment, following this repo's established "disclose every exclusion" convention
- [ ] A purple/gradient guard (new file) — covers COLOR-07 success criterion 4, must explicitly exclude `landing/` via a path-filter, not a `sourceFiles()` parameter (see Architecture Patterns)
- [ ] `scripts/visual/baseline.mjs`'s `PAGES` array may need a `master-sheet` entry — not a strict Wave 0 gap (script exists and runs) but a coverage gap for one of the 6 COLOR-07 sites

## Security Domain

Not applicable in any meaningful sense — this phase changes zero authentication, session, access-control, input-validation, or cryptography surface. Every change is a Tailwind className, a CSS custom property, a `<style jsx>` value source, or a TypeScript constants export. No ASVS category applies beyond the trivial (no new user input is parsed or rendered).

## Sources

### Primary (HIGH confidence — verified this session against the live working tree)
- `app/globals.css`, `tailwind.config.js`, `components/ui/card.tsx`, `components/ui/skeletons.tsx`, `components/ui/horizontal-scroll.tsx` — read/grepped directly
- `app/(app)/guild-settings/components/GuildSettingsContent.tsx` — read directly, lines 540-629
- `app/(app)/overview/components/DashboardContent.tsx` — read directly, lines 2195-2250 and 2400-2420
- `app/contexts/AccentColorContext.tsx` — read in full
- `app/components/PremiumItemTooltip.tsx` — read in full
- `lib/design-system/tokens.ts`, `lib/design-system/index.ts` — read directly
- `__tests__/design-tokens/source-files.ts`, `__tests__/hand-rolled-cards.test.ts`, `__tests__/token-palette-literals.test.ts` — read in full
- `scripts/visual/baseline.mjs` — read directly, lines 1-20 and 101-104
- `package.json` — grepped for `puppeteer`, `test`/`typecheck`/`lint` scripts
- `.planning/config.json` — grepped for `nyquist_validation`

### Secondary (MEDIUM confidence)
- None — no external documentation lookup was needed; this phase's entire domain is in-repo verification.

### Tertiary (LOW confidence)
- A2 (real-world WoW Classic UI convention that Equip:/Use: tooltip text is always green regardless of item quality) — training-knowledge recollection, not verified against a WoW API or wiki this session; flagged in the Assumptions Log; does not affect any locked decision or the resolved constant name.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, every mechanism already live in the codebase and read directly.
- Architecture: HIGH — all 4 tracks confirmed Browser/Client tier only, all file locations and line numbers re-verified live.
- Pitfalls: HIGH — Pitfalls 1-2 discovered and confirmed via direct code reads this session (not carried forward assumptions); Pitfall 3-4 derived from live grep arithmetic.

**Research date:** 2026-09-19
**Valid until:** 7 days (the workstream is mid-sprint with adjacent phases landing frequently — Phase 09 touched several of the same files this phase reads; re-verify line numbers immediately before planning if more than a few days elapse, following this workstream's own established "live re-measurement is authoritative" convention).
