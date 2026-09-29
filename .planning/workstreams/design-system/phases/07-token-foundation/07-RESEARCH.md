# Phase 07: Token Foundation - Research

**Researched:** 2026-09-15
**Domain:** Tailwind CSS token/theme configuration, WCAG contrast math, CSS custom-property surface ramps, Puppeteer-based visual baselines
**Confidence:** HIGH (all core claims verified this session by reading the actual source files and running the contrast arithmetic; the one external claim is CITED with a verification task called out)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Hard constraints inherited from the roadmap: no user-facing copy changes; nothing is edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint, where the executor presents the concrete diff plan (files, token values, expected visual effect) and waits.

**Type floor mechanics**
- **D-01:** Redefine Tailwind `fontSize.xs` as 11px (was 10px). `sm` 12, `base` 13, `md` 14, `lg` 16 and the rest stay. All 137 existing `text-xs` uses grow automatically. | Reversibility: reversible (one line).
- **D-02:** Add pixel-named aliases alongside the semantic names: `text-11`, `text-12`, `text-13`, `text-14`, `text-15` (the new step), `text-16`, `text-18`, `text-20`, `text-24`, `text-32`, `text-42`, each resolving to the same value and line-height as its semantic twin. Purpose: the Phase 09 codemod maps `text-[Npx]` to `text-N` mechanically. | Reversibility: costly once Phase 09 has migrated onto the aliases.
- **D-03:** Raise all 108 `text-[9px]` and `text-[10px]` sites to 11px uniformly in this phase (mechanical, one screenshot review). Per-screen tuning of chip density is deferred to Phase 09 and milestone C. Files: Sidebar (12), BossSection (12), CharacterSelector (10), LootListContent (10), admin analytics (10), SearchableItemSelect (7), AttendanceContent (7), MemberManager (6), CreateGuildModal (5), and 11 more with 1 to 4 each.

**Muted and accent contrast**
- **D-04:** Dark `--foreground-muted` moves from `0 0% 40%` to `0 0% 52%` (#858585): about 5.2:1 on `--background`, 4.9:1 on `--background-elevated`. Keeps the two-tier hierarchy against `--foreground-secondary` at 63%.
- **D-05:** Light `--foreground-muted` moves from `25 6% 45%` (#7a7269, 4.46:1 on cream) to about `25 6% 42%` (about 5:1 on cream). Same role, no identity change.
- **D-06:** New `--accent-text` token: light about `30 100% 36%` (at least 4.5:1 on white), dark equal to `--accent` (`30 100% 50%`). Buttons and fills keep `--accent`. Preferred wiring: make the Tailwind `text-accent` utility resolve to `--accent-text` so the 305 call sites need no churn; if that cannot be done cleanly (the `accent` colour object also feeds `bg-accent`), add `text-accent-text` and migrate the text uses in Phase 10. Planner decides which after inspecting `tailwind.config.js` colors. | Reversibility: reversible.
- **D-07:** New `--standby` token in amber, about `38 92% 50%`, distinct from accent orange (hue 30) and `--warning` yellow (hue 45), with a matching `--standby-foreground`. It replaces the three `orange-500` literals for the standby state (`app/(app)/raid-tracking/components/cell-state.ts:22`, `app/(app)/raid-tracking/_client.tsx:2530`, `app/(app)/raid-tracking/components/RaidMemberList.tsx:73`) and the expectation in `cell-state.test.ts:142`. Must pass contrast on both themes.
- **D-08:** `status-badge.tsx` and `alert.tsx` drop every Tailwind palette class: pending/needs_revision/late/benched map onto `--warning` or `--standby` (planner proposes the exact mapping at the checkpoint), approved/attended onto `--success`, rejected onto `--error`/destructive, info onto `--info`. Labels and copy unchanged.

**Surface and border ramp (dark)**
- **D-09:** Lift `--background-elevated` (and the tokens that share its value: `--card`, `--popover`, `--secondary`, `--input`) from `228 12% 8%` to `228 12% 12 to 13%`, tuned so elevated vs `--background` measures at least 1.2:1 (L12% computes to 1.19:1; L13% clears it). `--background` (`230 18% 3%`) and `--background-subtle` (sidebar, `225 15% 5%`) are unchanged so the page stays as deep as the landing page.
- **D-10:** `--border` from `0 0% 10%` to `0 0% 18%` (about 1.25:1 against the lifted card); `--border-strong` from 22% to about 26% so the two tiers stay distinct; `--input` follows `--border` if it is used as an outline, or the card value if used as a fill (planner checks `input.tsx`).
- **D-11:** Light mode: change nothing. Measure page-to-card, border-to-card and inset-to-card and write the numbers into the plan and SUMMARY for DESIGN.md (Phase 12) to pick up.
- **D-12:** Ship one token family per commit (type scale; muted; accent-text; ramp; standby and badge/alert) so a bad value is a single revert, each commit carrying a before/after contrast table in its message body.

**Baselines and rendering**
- **D-13:** Puppeteer becomes a devDependency in `package.json`, shared by this phase's baseline script and the Phase 12 CI visual job. The existing lint/typecheck/test job sets `PUPPETEER_SKIP_DOWNLOAD=1` so only the visual job downloads Chromium. The package-legitimacy gate applies: a blocking human checkpoint before the install runs. | Reversibility: reversible.
- **D-14:** Fixed baseline set: Home (public) and the Overview dashboard (authenticated via `/dev-login` on the local dev server), each in light and dark at 1440 and 390 widths: 8 images per capture. Captured before the first token commit and after the last; reused by Phases 08 to 12.
- **D-15:** Baseline images live under `.planning/workstreams/design-system/baselines/<YYYY-MM-DD>-<label>/` and are committed as docs so confirm-before-change reviews can be done from the repo.
- **D-16:** Local rendering of authenticated pages requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. OPEN ITEM for the plan's first checkpoint: either the user allows the append (a Bash permission rule) or adds the two lines. Until then, the Overview baseline cannot be captured and only the Home baseline is possible.

### Claude's Discretion
- Exact hue/saturation tuning within the stated targets, provided the contrast numbers are met and shown.
- The badge/alert variant-to-token mapping (D-08), proposed at the checkpoint.
- The `text-accent` wiring choice (D-06).
- The baseline script's shape (a `scripts/visual/` Node script using Puppeteer, reusing the dev-login flow) and how it names files.

### Deferred Ideas (OUT OF SCOPE)
- Per-screen chip density tuning after the 11px raise (changelog chips, sidebar labels): Phase 09 or milestone C.
- Migrating the 305 `text-accent` call sites if the alias approach in D-06 is not clean: Phase 10.
- `--background-inset` deletion and the 12 nested-card sites: Phase 10 (COLOR-03).
- Hover surface token review (`--muted`) beyond what the ramp forces: Phase 08 or 11 if it turns out to need design rather than a value bump.
- Light-mode border tightening for parity: not now; revisit in Phase 12 with DESIGN.md numbers in hand.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-01 | Functional UI text never smaller than 11px: `xs` step is 11px, scale gains a 15px step, no `text-[9px]`/`text-[10px]` remains in `app/` or `components/` | Verified `tailwind.config.js:29` current `fontSize` block; verified 108-site inventory (95×10px, 13×9px) by file with exact line counts (see Full 108-Site Inventory below) |
| COLOR-01 | Dark `--foreground-muted` ≥4.5:1 against `--background`, `--background-elevated`, `--background-subtle`; light `text-accent` on white ≥4.5:1 (or dedicated accent-text token) | Ran the WCAG contrast arithmetic for current and proposed HSL values; found and resolved a conflict between COLOR-01 and COLOR-02 at the D-09 elevated value (see Critical Finding: The L13% Trap) |
| COLOR-02 | Dark card distinguishable from page without nesting: `--border` and `background`→`background-elevated` step both ≥1.2:1, values recorded for DESIGN.md | Same arithmetic pass; light-mode record-only values also computed for D-11 |
| COLOR-06 | `status-badge`/`alert` use `--warning`/`--success`/`--error`/`--info` not Tailwind palette classes; new `--standby` token replaces 3 duplicated `orange-500` literals | Read `status-badge.tsx`, `alert.tsx`, `badge.tsx`, `cell-state.ts`, `RaidMemberList.tsx`, `_client.tsx` in full; confirmed exact class strings and the one non-border standby use that needs a full Tailwind color object (not just a CSS variable) |
</phase_requirements>

## Summary

This phase is a token-value and CSS-config change, not new application code: every deliverable is a small, mechanical edit to `tailwind.config.js`, `app/globals.css`, ~25 call sites, two primitive files, and one new dev-only script. The highest-value research finding is a real conflict inside the user's own locked decisions: the D-09 target of lifting `--background-elevated` to "12 to 13%" to satisfy the COLOR-02 border-ramp floor (≥1.2:1) *breaks* the COLOR-01 muted-text floor (≥4.5:1) at the top of that range. The arithmetic below shows exactly where the two floors cross and gives the planner two concrete, both-floors-clearing resolutions instead of one contradictory range.

The second most valuable finding is that D-06's "preferred wiring" (make `text-accent` resolve to `--accent-text` without touching `bg-accent`) is achievable in standard Tailwind — but not the way CONTEXT.md frames the choice ("clean" vs. "not clean" after inspecting the color object). Tailwind CSS separates the `textColor`/`backgroundColor`/`borderColor` theme scales from the shared `colors` scale; overriding `theme.extend.textColor.accent` independently is the standard mechanism, confirmed by Tailwind's own docs pattern, and does not touch `bg-accent`/`border-accent` at all. The planner should treat this as the primary path and verify it with a one-line build check, not default to the fallback.

Third: the devDependency install in D-13 needs a version pin the CONTEXT.md doesn't specify. `puppeteer@latest` (25.11.0, published 2026-09-14) requires Node `>=22.12.0`, but the project's `lint`/`typecheck`/`test` CI job (and the main app runtime) is pinned to Node 20. `puppeteer@24.43.1` (published 2026-05-11, the last 24.x release) requires only Node `>=18` and is the correct pin. The package-legitimacy seam flags `puppeteer` `SUS` ("too-new", based on the 25.x tip) regardless of which version is pinned — this only strengthens the case for the blocking checkpoint D-13 already requires.

**Primary recommendation:** Plan six commits in this order — (1) type scale + pixel aliases + 108-site raise, (2) muted contrast (dark + light), (3) `--accent-text` via `theme.extend.textColor`, (4) surface ramp (elevated to 12.5% or paired with muted at 53%, plus border/border-strong), (5) `--standby` token + badge/alert detokenization, (6) Puppeteer devDependency + baseline script + before/after capture — each gated by the contrast test suite described in Validation Architecture, with the blocking human checkpoint sitting before commit 1 (diff plan) and again before commit 6 (package install).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Type scale definition (`fontSize`) | Frontend Server (build-time CSS) | Browser (rendered text) | Tailwind config compiles to static utility CSS at build time; every screen inherits it, no runtime logic |
| Color/surface tokens (`--background-*`, `--border*`, `--foreground-muted`, `--accent-text`, `--standby`) | Frontend Server (build-time CSS) | Browser (`.dark` class toggling at runtime via next-themes) | CSS custom properties resolved at build time into the stylesheet; theme switching is a client-side class toggle, no server involvement |
| `status-badge.tsx` / `alert.tsx` variant maps | Browser / Client (React component render) | — | Pure presentational components, no data fetching or business logic |
| `cell-state.ts` standby literal | Domain-ish helper, but pure/no I/O | Browser (class-string output consumed by React render) | `getCellStyle()` is a pure function returning a class string; it lives beside the raid-tracking feature but has zero DB/API dependency |
| Visual baseline capture script | Build/CI tooling (Node script, not shipped to browser) | — | Puppeteer runs in Node against a running dev server; output (screenshots) is a docs artifact, not application code |
| Contrast-assertion test | Test tooling (Vitest, Node) | — | Pure arithmetic over hardcoded/parsed HSL strings; no DOM, no jsdom render needed |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 3.4.19 (already pinned, `package.json:89`) [VERIFIED: package.json:89] | Utility CSS, `fontSize`/`colors` theme config | Already the project's only CSS framework; no alternative considered — CLAUDE.md names it explicitly |
| Puppeteer | `^24.43.1` (NOT `latest`/`^25`) [VERIFIED: npm registry — `npm view puppeteer@24.43.1 engines` → `{node:'>=18'}`, `npm view puppeteer@24.43.1 time.modified` → `2026-05-11`] | Headless Chrome for the before/after screenshot baseline | The only asked-for tool (D-13); 24.x is the newest major still compatible with the project's Node 20 CI/runtime — 25.x (published 2026-05-12 onward, tip 25.11.0 on 2026-09-14) requires Node ≥22.12 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.0 (already pinned) | New contrast-assertion + grep-absence tests | Add to existing `vitest.config.ts` jsdom setup; contrast math itself needs no DOM |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Puppeteer | Playwright | Not asked for by CONTEXT.md (D-13 names Puppeteer explicitly, matching the audit's existing scratchpad scripts); introducing a second browser-automation tool for one script would be scope creep |
| Manual `theme.extend.textColor` override for `text-accent` | New `text-accent-text` utility (D-06 fallback) | Fallback requires migrating 305 call sites now or leaving them stale until Phase 10; the `textColor` override needs zero call-site changes — strictly prefer it unless the build check (see Common Pitfalls) fails |

**Installation:**
```bash
npm install --save-dev puppeteer@24.43.1
```

**Version verification:** Confirmed via `npm view puppeteer@24.43.1 version engines time.modified scripts.postinstall repository.url` this session (see Package Legitimacy Audit). `npm view puppeteer versions --json` shows 1,008 published versions; the 24.x → 25.x major bump (which raised the Node floor to 22.12) landed 2026-05-12.

## Package Legitimacy Audit

| Package | Registry | Age (this pin) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| puppeteer@24.43.1 | npm | published 2026-05-11 (~4 mo old); package itself is 13 years old (created 2013-03-23) | 8,573,247/wk (measured against the `puppeteer` package overall) | `github.com/puppeteer/puppeteer` | seam reports `SUS` for the package as a whole, reason `too-new` (it evaluates against the 25.11.0 tip, published 2026-09-14, one day before this research) | **Flagged — planner must add `checkpoint:human-verify` before `npm install puppeteer@24.43.1`.** The install itself declares a `postinstall: node install.mjs` (downloads a Chromium binary) — combine with `PUPPETEER_SKIP_DOWNLOAD=1` in the shared CI job per D-13, and let only the (future, Phase 12) visual job actually download. |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `puppeteer` — not because the *specific pinned version* (24.43.1) is new (it is 4 months old and part of a 1,008-release, 13-year-old, 8.5M-weekly-download package), but because the legitimacy seam scores the package name against its current tip release. The planner should record in the checkpoint that the pin is 24.43.1, not `latest`, and that the "too-new" signal is an artifact of checking the unpinned package rather than a finding about this specific version.

*The Node-engine mismatch (25.x requires Node ≥22.12, project CI/runtime is Node 20) is itself a legitimacy-adjacent finding: pinning `^25` would either fail `npm ci` under `engine-strict` or silently install a devDependency the main test job cannot run — verify no `.npmrc`/`package.json` `engines` field enables `engine-strict` before assuming a soft warning (checked this session: no committed `.npmrc`, `.gitignore:65` ignores `.npmrc` entirely, `package.json` has no top-level `engines` field, so today it would warn, not fail — but pin 24.43.1 anyway since it is behaviorally correct, not just non-blocking).*

## Architecture Patterns

### System Architecture Diagram

```text
tailwind.config.js (fontSize, colors)         app/globals.css (:root, .dark CSS vars)
        │                                                │
        ▼                                                ▼
   Tailwind JIT compiler ─────────────────────────────────┘
        │  (build time — next build / next dev)
        ▼
 Generated utility CSS (text-11..text-42, bg-standby, text-accent, etc.)
        │
        ▼
 React components import utility classes ──► rendered DOM
        │                                          │
        │                                          ▼
        │                              next-themes toggles `.dark`
        │                              on <html> at runtime (client)
        ▼
 status-badge.tsx / alert.tsx / cell-state.ts
 (variant maps resolve to token-backed classes,
  no more hardcoded palette literals)
        │
        ▼
 scripts/visual/*.mjs (Puppeteer, Node-only)
        │  navigates the *running* dev server
        │  (Home: no auth; Overview: via /dev-login)
        ▼
 .planning/workstreams/design-system/baselines/<date>-<label>/*.png
 (committed as docs; diffed by eye pre/post-phase, reused Phases 08-12)
```

A reader can trace the primary path: a developer edits an HSL value in `globals.css` or a px value in `tailwind.config.js` → Tailwind recompiles utility classes at build time → every component using that utility repaints → the Puppeteer script (run manually, before and after the token commits) captures the visual delta as committed PNGs for human review at the phase's blocking checkpoints.

### Recommended Project Structure
```
tailwind.config.js          # fontSize (D-01/D-02), colors.standby, colors.accent-text (fallback path only)
app/globals.css             # :root and .dark token blocks (D-04/D-05/D-07/D-09/D-10), theme.extend.textColor.accent (primary path)
components/ui/status-badge.tsx   # statusConfig map onto --warning/--standby/--success/--error/--info
components/ui/alert.tsx          # alertVariants onto --warning
app/(app)/raid-tracking/components/cell-state.ts     # border-l-orange-500 → border-l-standby
app/(app)/raid-tracking/_client.tsx                  # legend swatch, line 2530
app/(app)/raid-tracking/components/RaidMemberList.tsx  # badge pill, line 73 (text+bg, not just border)
app/(app)/raid-tracking/components/__tests__/cell-state.test.ts  # line 142 expectation updates to border-l-standby
scripts/visual/                  # new: baseline.mjs (Claude's Discretion on exact shape/naming)
__tests__/ or a new co-located __tests__/  # new: token-contrast.test.ts, type-scale-floor.test.ts
.planning/workstreams/design-system/baselines/<date>-<label>/  # committed PNGs
```

### Pattern 1: Independent per-utility color theme keys (Tailwind)
**What:** Tailwind resolves `text-*`, `bg-*`, `border-*` utilities from `theme('textColor')`, `theme('backgroundColor')`, `theme('borderColor')` respectively. When these keys are absent from a project's config, Tailwind's own default theme sets each of them to fall back to `theme('colors')` — but a project can override any one of the three independently via `theme.extend.textColor`, `theme.extend.backgroundColor`, or `theme.extend.borderColor` without touching the other two.
**When to use:** D-06 — resolving `text-accent` to `--accent-text` while `bg-accent`/`border-accent` keep resolving to `--accent`.
**Example:**
```js
// tailwind.config.js — theme.extend block
// Existing (unchanged): colors.accent.DEFAULT feeds bg-accent, border-accent, ring-accent, etc.
colors: {
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
    subtle: "hsl(var(--accent-subtle))",
  },
  // ...
},
// New: only overrides the `text-accent` utility's source
textColor: {
  accent: "hsl(var(--accent-text))",
},
```
[CITED: tailwindcss.com — documented `theme.textColor` override pattern (v2-era docs page surfaced this session; the underlying `textColor`/`backgroundColor`/`borderColor` corePlugin-scale architecture is unchanged through Tailwind v3 — verify with the build check in Common Pitfalls before treating this as settled).]

### Pattern 2: One CSS custom property per semantic role, consumed via `hsl(var(--x))`
**What:** Every existing status/surface token in `app/globals.css` follows `--name: H S% L%;` consumed as `hsl(var(--name))` in `tailwind.config.js`'s `colors` block, with `/ alpha` suffixes for subtle fills (e.g. `--accent-subtle: 30 100% 50% / 0.2`).
**When to use:** `--standby` and `--accent-text` must follow this exact pattern to stay consistent with `--warning`, `--success`, `--error`, `--info` (all already `-foreground`-paired) [VERIFIED: app/globals.css:179-187, 253-261].
**Example:**
```css
/* app/globals.css — .dark block, alongside the other status colors */
--standby: 38 92% 50%;
--standby-foreground: 0 0% 4%;   /* verified black-on-standby = 9.25:1; white-on-standby = 2.14:1 fails, so foreground must be dark */
```
```js
// tailwind.config.js — colors block, alongside success/warning/error/info
standby: {
  DEFAULT: "hsl(var(--standby))",
  foreground: "hsl(var(--standby-foreground))",
},
```
**Why a full color object, not just a CSS variable:** `RaidMemberList.tsx:73` uses `text-orange-500 bg-orange-500/15` (text AND background fill), not just a border accent like the other two standby sites. A bare `--standby` custom property is not enough — `colors.standby` needs to exist as a Tailwind color key (mirroring `success`/`warning`) so `text-standby`, `bg-standby/15`, and `border-l-standby` all resolve. [VERIFIED: app/(app)/raid-tracking/components/RaidMemberList.tsx:73 — `<span className="text-[11px] font-medium text-orange-500 bg-orange-500/15 px-2 py-0.5 rounded-full flex-shrink-0">`]

### Anti-Patterns to Avoid
- **Per-screen chip-density tuning during this phase:** CONTEXT.md D-03 explicitly defers this; raise all 108 sites to 11px uniformly and let the screenshot review catch density regressions, don't hand-tune individual chips now.
- **Touching `label.tsx`'s own `text-[12px]`/`text-[13px]`/`text-[14px]` sizes:** those are TYPE-02 (Phase 08). This phase only changes the scale they'll eventually consume.
- **Migrating `text-accent` call sites in this phase:** even if the `textColor` override (Pattern 1) works cleanly, migrating the 305 sites onto a literal `text-accent-text` class is explicitly Phase 10's job per CONTEXT.md's Deferred Ideas — this phase only needs the *token* to exist and resolve correctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WCAG contrast-ratio calculation | A different formula or a heuristic diff of lightness values | The verified relative-luminance formula (sRGB → linearize → weighted sum → `(L1+0.05)/(L2+0.05)`) shown under Code Examples | It's the actual WCAG 2.x algorithm; a shortcut (e.g. comparing raw `L%` HSL lightness) undercounts hue/chroma contributions and would misjudge borderline cases like the L12/L13 tension found below |
| Splitting a Tailwind utility's color source from a shared token | A custom PostCSS plugin, a `@layer utilities` override, or duplicating the whole `colors.accent` object under a new key | `theme.extend.textColor` (Pattern 1) | Tailwind already ships this exact mechanism; reaching for a plugin or a parallel color object is unnecessary indirection for a one-key override |
| Headless-browser screenshotting | A hand-rolled `child_process` Chrome invocation | Puppeteer (already the audit's tool of choice, D-13) | Puppeteer already handles viewport sizing, waiting for network idle, and PNG encoding; a manual CDP client would reinvent all of it for one script |

**Key insight:** Every "don't hand-roll" here already has a first-party, zero-new-dependency answer inside the stack the project already has (Tailwind's own theme-scale architecture, standard WCAG math, the one already-approved Puppeteer devDependency). This phase should add exactly one new package (`puppeteer`) and zero new patterns.

## Common Pitfalls

### Pitfall 1: The L13% trap — COLOR-01 and COLOR-02 cannot both pass at the single value CONTEXT.md names
**What goes wrong:** D-09 says lift `--background-elevated` to "12 to 13%" and names L13% as the value that "clears" the ≥1.2:1 background-to-elevated floor (COLOR-02). But at L13%, `--foreground-muted` (proposed 52%, D-04) against the *lifted* elevated surface computes to 4.45:1 — **below** the ≥4.5:1 floor COLOR-01 requires against `--background-elevated`.
**Why it happens:** The two floors move in opposite directions as elevated's lightness rises: raising elevated's L% helps the background→elevated ratio (COLOR-02) but shrinks the muted-text→elevated ratio (COLOR-01), because muted text is getting closer in lightness to the surface it sits on.
**How to avoid:** Two resolutions verified this session, either is safe to hand to the planner:
  - **Option A:** `--background-elevated` at L12.5% → background-vs-elevated = **1.206:1** (clears ≥1.2), muted(52%)-vs-elevated = **4.506:1** (clears ≥4.5). Both floors clear, but by a thin margin (0.006 and 0.006) — risky if any downstream rounding (browser color management, screenshot compression) shaves a hundredth off either.
  - **Option B (recommended, more margin):** `--background-elevated` at L13% (as CONTEXT.md named) **plus** bump dark `--foreground-muted` from 52% to **53%** → background-vs-elevated = **1.223:1**, muted-vs-elevated = **4.601:1**. Muted-vs-background also improves slightly (5.63:1 vs the D-04 target of ~5.2:1) and the two-tier hierarchy against `--foreground-secondary` (63%) still holds (10-point gap vs. D-04's 11-point gap — negligible.
  - Whichever is chosen, the commit implementing D-04 (muted) and the commit implementing D-09 (ramp) are not independently safe to land in isolation if the plan follows D-12's "one token family per commit" — the muted commit must already assume the eventual elevated value, or the ramp commit must re-verify muted contrast against its own new value. Recommend planning the muted and ramp commits with the *final* paired values (Option A or B) baked in from the start rather than landing D-04 first at the CONTEXT.md-stated 52%/L8% baseline and then re-deriving it after D-09 lands.
**Warning signs:** Any contrast-assertion test (see Validation Architecture) that checks muted-vs-elevated and background-vs-elevated independently, with each floor's own literal value, rather than checking the actual *paired* final values — a test written before this pairing is discovered would pass D-04's stated numbers in isolation and still ship a below-floor combination.

### Pitfall 2: `--input` is not actually consumed the way D-10 assumes
**What goes wrong:** D-10 says "`--input` follows `--border` if it is used as an outline, or the card value if used as a fill (planner checks `input.tsx`)." But `components/ui/input.tsx` doesn't reference the `--input` CSS variable at all — it uses `border-border-strong` directly (line 22, 31-32) and `focus:outline-none focus:border-accent` for the focus state (unrelated to `--ring`, a separate PRIM-03/Phase-08 finding). [VERIFIED: components/ui/input.tsx:22,31-32 — `"hover:border-border-strong hover:bg-background-elevated/50"`, `"focus:outline-none focus:border-accent"`, `pill: "rounded-[52px] border-border-strong"`, `rounded: "rounded-xl border-border-strong"`]
**Why it happens:** `--input` is defined in `globals.css` and mapped in `tailwind.config.js` (`input: "hsl(var(--input))"`), but only one call site in the whole `app/`+`components/` tree actually uses it: `components/ui/switch.tsx:19`, `data-[state=unchecked]:bg-input` — the Switch's unchecked track fill. [VERIFIED: grep for `border-input|bg-input\b` across `app` and `components` this session returned exactly one file, `components/ui/switch.tsx:19`]
**How to avoid:** Since `--input` shares `--background-elevated`'s value today (per CONTEXT.md's Reusable Assets note) and D-09 lifts that shared value, the only real-world consequence of lifting `--input` is the Switch's unchecked-state track getting lighter — not a text input outline or fill, because `input.tsx` never reads the token. Don't spend checkpoint time debating "outline vs. fill" for `Input`; the decision that actually matters is whether Switch's unchecked track should track the lift or be decoupled (default: let it track, since it's the same "resting surface" role `--muted`/`--input` already share).
**Warning signs:** A plan task titled "update `input.tsx` for the new `--input` value" — that file has no `--input` reference to update.

### Pitfall 3: `--muted` and the lifted `--background-elevated` will become equal, and `--muted` is used more widely than the CONTEXT.md's "hover states" framing suggests
**What goes wrong:** Dark `--muted` is currently `0 0% 12%` — already numerically *equal* to the proposed L12% floor of the elevated ramp, and above the L8% original. If elevated lands at L12.5% or L13% (Pitfall 1's resolutions), `--muted` (still at 12%) becomes very slightly *darker* than `--card`/`--background-elevated`, inverting the surface's implied depth relationship (hover states are conventionally lighter than rest, not darker).
**Why it happens:** `--muted` was tuned against the *original* L8% elevated value; it was never meant to sit this close to the card surface.
**How to avoid:** CONTEXT.md's Integration Points section already flags this ("planner must check hover states still show and adjust `--muted` upward if needed (in scope as part of the ramp)") — treat that as a firm requirement, not a maybe: bump `--muted` to at least L14-15% (clearing the lifted elevated value by 1-2 points) as part of the D-09/D-10 ramp commit, and verify visually in the baseline screenshots (a `bg-muted` hover row that visually disappears against a `bg-card` container is the regression to look for).
**Warning signs:** A hover row, dropdown item, or table stripe that renders indistinguishable from its container in the "after" screenshot set.

### Pitfall 4: A plain sed/grep pass on `text-[9px]`/`text-[10px]` is safe here — but confirm dynamic sizes aren't hiding
**What goes wrong (that didn't happen, but was checked):** The additional_context flagged a risk that some of the 108 sites might sit inside template strings or `cn()` calls that a plain sed would miss.
**What was actually found:** All 108 matches are literal, non-interpolated Tailwind class strings — including the two sites inside template literals (`AttendanceContent.tsx:1227`, `CreateGuildModal.tsx:716`) and the two sites inside dynamic `title={...}` attributes alongside the class (`BossSection.tsx:452,467`). A text-based find-and-replace on the literal substring `text-[10px]` / `text-[9px]` will catch every one of these, because the class name itself is never built from a variable (`grep -rnE 'text-\[\$\{' app components` returned zero matches — no site constructs the pixel value dynamically). [VERIFIED: this session — see Full 108-Site Inventory below for the complete file:count breakdown, and the confirmed-zero dynamic-interpolation grep]
**How to avoid:** No special-casing needed. A single project-wide `sed -i '' 's/text-\[10px\]/text-11/g; s/text-\[9px\]/text-11/g'` (or the `text-11` alias from D-02, once it exists) across `app/` and `components/` is safe and complete.
**Warning signs:** None currently; re-run the same `text-\[\$\{` grep as a regression check if new call sites are added before Phase 09's broader codemod runs.

### Pitfall 5: The package-legitimacy "too-new" signal on Puppeteer is about the wrong version
**What goes wrong:** Running the legitimacy check against the bare package name `puppeteer` returns `SUS` / `too-new`, which could read as "don't install this."
**Why it happens:** The seam's freshness signal is evaluated against the package's current tip (25.11.0, published the day before this research), not the version actually being pinned.
**How to avoid:** Pin `puppeteer@24.43.1` explicitly in `package.json` (not `^puppeteer` or `latest`), and carry both facts into the checkpoint: the SUS verdict is real (the seam correctly flagged it, so the human-verify checkpoint D-13 already requires still applies) and the specific version being installed is 4 months old, off a 13-year-old package with 8.5M weekly downloads.
**Warning signs:** A plan or commit message that pins `puppeteer` without a version, or pins `^25`/`latest`.

## Code Examples

### WCAG 2.x contrast ratio from an HSL token (the arithmetic a vitest test should reproduce)
```js
// Source: WCAG 2.x relative luminance + contrast ratio formulas, applied to this
// project's `--token: H S% L%` custom-property format. Verified this session by
// computing every before/after value cited in CONTEXT.md and this file.
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function relativeLuminance([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const [R, G, B] = [f(r), f(g), f(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(hslA, hslB) {
  const [L1, L2] = [relativeLuminance(hslToRgb(...hslA)), relativeLuminance(hslToRgb(...hslB))];
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}
// contrastRatio([0, 0, 52], [230, 18, 3]) === 5.44  (dark muted L52% vs --background)
```

### Verified before/after contrast table (computed this session — cite directly in commit messages per D-12)
```
DARK MODE
  muted 40%→52% vs --background (230 18% 3%):          3.51:1 → 5.44:1
  muted 40%→52% vs --background-elevated (unlifted):   3.23:1 → 5.01:1
  muted 40%→52%(or 53%) vs --background-elevated (lifted L13%): 3.18:1(est.) → 4.45:1 (52%, FAILS 4.5 floor) / 4.60:1 (53%, PASSES)
  muted 40%→52% vs --background-subtle (225 15% 5%):   3.41:1 → 5.28:1
  background vs elevated:      L8% = 1.09:1 → L12% = 1.19:1 (fails ≥1.2) → L12.5% = 1.21:1 (passes) → L13% = 1.22:1 (passes)
  border 10%→18% vs elevated:  1.06:1 → 1.25:1 (at L12%) / 1.21:1 (at L13%)
  border-strong 22%→26% vs elevated: 1.59:1 → 1.69:1 (at L12%) / 1.65:1 (at L13%)
  border(18%) vs border-strong(26%) tier gap: 1.36:1

LIGHT MODE (record-only per D-11, values unchanged)
  background (35 33% 97%) vs elevated (0 0% 100%): 1.06:1
  border (35 12% 82%) vs elevated:                 1.50:1
  inset (35 25% 96%) vs elevated:                  1.09:1
  background vs inset:                             1.02:1
  muted 45%→42% vs background:                     4.47:1 → 5.00:1
  accent-text: current accent(45%) vs white = 3.09:1 (fails); accent-text(36%) vs white = 4.61:1 (passes); accent-text(38%) vs white = 4.20:1 (fails, don't use)

STANDBY (dark, matches D-07 target)
  standby (38 92% 50%) vs --background:  9.43:1
  standby (38 92% 50%) vs elevated(12%): 7.92:1
  black text (0 0% 4%) on standby bg:    9.25:1  → use this for --standby-foreground
  white text on standby bg:              2.14:1  → do NOT use white as --standby-foreground
```

### Full 108-Site Inventory (text-[9px] / text-[10px], verified via grep this session)
```
text-[10px] — 95 occurrences across 22 files:
  12  app/components/Sidebar.tsx
  10  app/components/CharacterSelector.tsx
  10  app/(app)/loot-list/components/LootListContent.tsx
   9  app/(app)/admin/analytics/_client.tsx
   7  app/components/SearchableItemSelect.tsx
   7  app/(app)/master-sheet/components/BossSection.tsx
   7  app/(app)/attendance/components/AttendanceContent.tsx
   5  app/components/CreateGuildModal.tsx
   4  app/(app)/overview/components/DashboardContent.tsx
   4  app/(app)/master-sheet/components/ItemCandidateModal.tsx
   3  app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
   3  app/(app)/expansions/[expansionId]/_client.tsx
   2  app/reserve/join/[token]/page.tsx
   2  app/(app)/guild-settings/components/MemberManager.tsx
   2  app/(app)/guild-settings/components/ExpansionManager.tsx
   1  components/ui/classification-badge.tsx
   1  app/components/ReserveItemPicker.tsx
   1  app/components/LootListSummaryView.tsx
   1  app/components/landing/PremiumHero.tsx
   1  app/components/landing/LandingHero.tsx
   1  app/(app)/reserve/runs/[id]/_client.tsx
   1  app/(app)/master-sheet/components/MasterSheetContent.tsx
   1  app/(app)/guild-settings/components/RoleManager.tsx

text-[9px] — 13 occurrences across 5 files:
   5  app/(app)/master-sheet/components/BossSection.tsx
   4  app/(app)/guild-settings/components/MemberManager.tsx
   2  app/(app)/master-sheet/components/RaidModeView.tsx
   1  app/components/landing/LandingLootDecision.tsx
   1  app/(app)/admin/analytics/_client.tsx

Total: 95 + 13 = 108 (matches the phase's stated count exactly).
Sites inside template literals or dynamic attributes (confirmed still plain-text-replaceable,
no dynamic pixel interpolation exists — `grep -rnE 'text-\[\$\{'` returns zero matches):
  app/(app)/attendance/components/AttendanceContent.tsx:1227  (className={`... text-[10px] ...`})
  app/components/CreateGuildModal.tsx:716                     (className={`... text-[10px] ...`})
  app/(app)/master-sheet/components/BossSection.tsx:452,467   (text-[10px]/text-[9px] alongside a dynamic title={...})
```

### `status-badge.tsx` current variant map → proposed token mapping (planner proposes final mapping at checkpoint, this is the grounded starting point)
```typescript
// Source: components/ui/status-badge.tsx:22-69 (verified, read in full this session)
// Current palette-literal classes, exact strings:
approved / attended:    'bg-success/10 text-success border-success/20 hover:bg-success/20'       // already tokenized
pending / late:         'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'  // → --warning
needs_revision/benched: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'  // → --standby
rejected / no_show:     'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20' // already tokenized (--error via destructive)
draft / excused:        'bg-muted text-muted-foreground border-border hover:bg-muted'            // already tokenized
signed_up:              'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'            // already tokenized (not a palette literal — leave as-is)
```
`alert.tsx`'s only palette literal is the `warning` variant: `'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 [&>svg]:text-yellow-500'` → `--warning`. [VERIFIED: components/ui/alert.tsx:24]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fontSize.xs = 10px` as the type floor | `fontSize.xs = 11px`, new 15px step added | This phase (D-01) | 137 existing `text-xs` sites grow automatically; no code change needed at those call sites |
| Hardcoded `orange-500` for "standby"/"benched" states | Semantic `--standby` token, distinct hue from `--accent` (30°) and `--warning` (45°) | This phase (D-07) | 3 call sites + 1 test expectation change; visually near-identical (orange-500 ≈ hue 25, standby proposed at hue 38 — close enough to read as "the same amber" while being a real token) |
| `puppeteer@latest` would be 25.x, Node ≥22.12 | Pin `24.43.1`, Node ≥18 | Puppeteer 25.0.0 shipped 2026-05-12, raising the floor | Installing `latest`/`^25` today would be incompatible with the project's Node 20 CI/runtime; this phase's devDependency addition must pin the major explicitly |

**Deprecated/outdated:** None specific to this phase's token surface — `--background-inset` is flagged for removal but that's Phase 10 (COLOR-03), out of scope here.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `theme.extend.textColor` cleanly overrides only the `text-accent` utility in Tailwind 3.4.19 without touching `bg-accent`/`border-accent`, per the standard `textColor`/`backgroundColor`/`borderColor` corePlugin-scale architecture | Architecture Patterns → Pattern 1 | If the specific Tailwind 3.4.19 build resolves theme scales differently than assumed (e.g. via a plugin interaction, or if `bg-accent`/`text-accent` share a single generated utility under JIT in some edge case), the "clean" D-06 path silently fails to apply and `text-accent` keeps rendering the fill-intended `--accent` value — low risk, cheaply caught by the build check below, and D-06 already names the fallback (`text-accent-text` + Phase 10 migration) if this doesn't hold |
| A2 | The Option B pairing (elevated L13% + muted 53%) keeps the two-tier muted/secondary hierarchy legible at a 10-point gap, matching the intent (not the exact stated number) of D-04's "keeps the two-tier hierarchy against `--foreground-secondary` at 63%" | Common Pitfalls → Pitfall 1 | If 10 points reads as visually too-close to `--foreground-secondary` in the baseline screenshots, the planner may need a third value (e.g., elevated at L12.5%/Option A) — this is a screenshot-review judgment call, not a math error |

**Verification task to close A1 before treating it as settled (not merely assumed):** add a one-line build check as part of the D-06 commit's task list — after adding `theme.extend.textColor.accent`, run a `grep` on the compiled CSS output (`.next/static/css/*.css` after `npm run build`, or a `tailwindcss --content ... -o -` invocation) confirming `.text-accent{color:hsl(var(--accent-text))}` exists as a rule distinct from any `.bg-accent{background-color:hsl(var(--accent))}` rule. This turns A1 from ASSUMED into VERIFIED before Phase 08 or 10 relies on it.

## Open Questions

1. **Which L13%-trap resolution (Option A: L12.5% elevated / Option B: L13% + muted 53%) should the plan commit to?**
   - What we know: both clear both floors mathematically (see Pitfall 1); Option B has more margin.
   - What's unclear: which reads better in the actual screenshot baseline — this is a visual judgment CONTEXT.md reserves for "Claude's Discretion... exact hue/saturation tuning within the stated targets."
   - Recommendation: plan for Option B (elevated L13%, muted 53%) as the default, with Option A held as documented fallback if Option B looks too washed out in the screenshot review — both values are cheap one-line reverts per D-12's one-family-per-commit structure.

2. **Should `--muted`'s upward bump (Pitfall 3) be its own commit or folded into the D-09/D-10 ramp commit?**
   - What we know: CONTEXT.md's Integration Points already scopes this in ("in scope as part of the ramp").
   - What's unclear: whether "part of the ramp" means the same git commit as `--background-elevated`/`--border`/`--border-strong`, or a discrete follow-up commit.
   - Recommendation: same commit as the ramp — `--muted` shares the elevated token's role closely enough that reviewing it in isolation (without the elevated context it sits beside) would be harder to judge, and D-12's "one token family per commit" reads naturally as "surface ramp family" including muted.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CI test job, local dev, Puppeteer runtime | ✓ | 20 (CI-pinned, `.github/workflows/ci.yml:25`) | — |
| npm | package install | ✓ | 10+ (per CLAUDE.md) | — |
| Puppeteer (Chromium download) | Baseline screenshot capture | Not yet installed | Pin `24.43.1` | `PUPPETEER_SKIP_DOWNLOAD=1` for the shared lint/typecheck/test job; only the manual local run (this phase) or the future Phase 12 visual CI job downloads Chromium |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` | Authenticated `/overview` baseline capture (D-16) | ✗ (confirmed missing this session without reading file contents — checked for key presence only) | — | Capture the Home baseline only until the user adds the two env lines or grants the Bash append permission; Overview baseline blocked, not a hard stop for the rest of the phase |
| `loadtest/test-users.json` | `/dev-login` quick-login flow the baseline script would drive | Not verified this session (gitignored, generated by `npm run test:users:create`) | — | Run `npm run test:users:create` locally before attempting the Overview capture if the file is absent |

**Missing dependencies with no fallback:** none — the Overview baseline has an explicit, already-documented fallback (Home-only baseline) per D-16.

**Missing dependencies with fallback:** Puppeteer (not yet installed — install is itself a phase task, gated by the checkpoint); Supabase env vars (Home-only baseline fallback); `loadtest/test-users.json` (regenerate via existing npm script).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0, jsdom environment [VERIFIED: package.json:93, vitest devDependency; existing `__tests__` convention confirmed via `lib/__tests__/*.test.ts`, `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts`] |
| Config file | `vitest.config.ts` (jsdom environment, globals enabled, path aliases — per CLAUDE.md) |
| Quick run command | `npm run test` (runs `vitest run`, no watch) |
| Full suite command | `npm run test` (same script; project has no separate "quick vs full" split — CI runs this one command per `.github/workflows/ci.yml:42`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-01 | `fontSize.xs` resolves to `11px`; `text-15` alias exists | unit (parse `tailwind.config.js` fontSize object) | `vitest run tailwind-config.test.ts` | ❌ Wave 0 |
| TYPE-01 | No `text-[9px]`/`text-[10px]` remains in `app/`/`components/` | grep-based absence check (Node `child_process` or `fast-glob` + regex inside a vitest test) | `vitest run type-scale-floor.test.ts` | ❌ Wave 0 |
| COLOR-01 | Dark `--foreground-muted` ≥4.5:1 vs background/elevated/subtle; light accent-text ≥4.5:1 on white | unit (parse `globals.css` custom properties, run the contrast formula from Code Examples) | `vitest run token-contrast.test.ts` | ❌ Wave 0 |
| COLOR-02 | Dark `--border` and background→elevated step both ≥1.2:1 | unit (same file as above, additional assertions) | `vitest run token-contrast.test.ts` | ❌ Wave 0 |
| COLOR-06 | `status-badge.tsx`/`alert.tsx` contain no Tailwind palette class (yellow-500, orange-500) | grep-based absence check + existing `cell-state.test.ts` updated expectation | `vitest run status-badge-tokens.test.ts` (new) + `vitest run app/\(app\)/raid-tracking/components/__tests__/cell-state.test.ts` (existing, line 142 updated) | Existing test needs a one-line update; new absence-check test is ❌ Wave 0 |
| (all) | Baseline screenshot comparison | manual-only (visual review) | `node scripts/visual/baseline.mjs` (new, Claude's Discretion on exact name) | ❌ Wave 0 — this is D-14's before/after capture, explicitly manual-only per the phase's own risk mitigation |

### Sampling Rate
- **Per task commit:** `npm run test` (fast — no browser, no jsdom render needed for the new token/grep tests; existing suite is already jsdom-based and fast per CI's 15-minute timeout budget)
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test` (matches the exact CI job sequence, `.github/workflows/ci.yml:40-42`)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the before/after screenshot set captured and committed under `.planning/workstreams/design-system/baselines/`

### Wave 0 Gaps
- [ ] `tailwind-config.test.ts` (or fold into `token-contrast.test.ts`) — asserts `fontSize.xs[0] === '11px'` and that a `15` (or equivalent) key exists, covers TYPE-01's scale-definition half
- [ ] `type-scale-floor.test.ts` — greps `app/` and `components/` for `text-\[9px\]`/`text-\[10px\]` and fails if any match is found, covers TYPE-01's "zero remaining" half (this is the executable form of the success criterion's own `grep -rE "text-\[(9|10)px\]" app components` check)
- [ ] `token-contrast.test.ts` — parses the HSL triplets out of `app/globals.css` (both `:root` and `.dark` blocks) and runs the WCAG formula from Code Examples against every COLOR-01/COLOR-02 pairing named in the success criteria; this is the executable form of the "committed contrast check" success criterion #2 and #3 demand
- [ ] `status-badge-tokens.test.ts` — greps `status-badge.tsx` and `alert.tsx` for `yellow-500|orange-500` (or any Tailwind palette color name) and fails if found, covers COLOR-06
- [ ] Update existing `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts:142` — change `.toContain('border-l-orange-500')` to `.toContain('border-l-standby')`
- [ ] Framework install: none — Vitest is already configured; no new test-framework dependency needed (only `puppeteer` for the manual/non-Vitest baseline script)

## Security Domain

`security_enforcement` is on (ASVS level 1) project-wide, but this phase touches no auth, session, input-validation, or crypto surface — it is a CSS-token and static-asset change. The one applicable control is supply-chain/dependency hygiene, already covered above.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase touches no auth code; the baseline script *uses* existing dev-only auth (`/dev-login`, gated by `NODE_ENV === 'development'` per `app/dev-login/page.tsx:13,46` and `app/api/dev/test-users/route.ts:6,10`) but does not modify it |
| V3 Session Management | No | Same as above — read-only consumer of an existing dev-only flow |
| V4 Access Control | No | No permission logic changed |
| V5 Input Validation | No | No user input processed; all changes are static config/CSS/class-string edits |
| V6 Cryptography | No | Not applicable |
| V14 Configuration (dependency/supply-chain, informal ASVS mapping) | Yes | Package Legitimacy Audit above (Puppeteer pin, SUS verdict, human-verify checkpoint) is the operative control |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/typosquatted devDependency introduced via an unpinned `npm install <package>` | Tampering | Pin exact version (`puppeteer@24.43.1`), verify via `npm view` + the package-legitimacy seam before install, gate behind `checkpoint:human-verify` (already required by D-13) |
| `postinstall` script reaching outside the project (Puppeteer's `install.mjs` downloads a Chromium binary from Google's CDN) | Tampering / Elevation of Privilege (build-time code execution) | `PUPPETEER_SKIP_DOWNLOAD=1` in the shared CI job (D-13) restricts the download to the developer's local machine and the future Phase 12 visual-only CI job; this is a known, standard Puppeteer install-time behavior, not a red flag unique to this package |

## Sources

### Primary (HIGH confidence — read/executed directly this session)
- `tailwind.config.js` (full file) — current `fontSize`, `colors`, `accentColor` blocks
- `app/globals.css` (full file) — current `:root` and `.dark` token blocks, `--input`/`--muted` values
- `components/ui/status-badge.tsx`, `components/ui/alert.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx` (full files)
- `app/(app)/raid-tracking/components/cell-state.ts`, `app/(app)/raid-tracking/components/RaidMemberList.tsx` (lines 60-85), `app/(app)/raid-tracking/_client.tsx` (lines 2515-2548), `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts` (grep, lines 44/141-142)
- `app/dev-login/page.tsx`, `app/api/dev/test-users/route.ts` (full files)
- `package.json`, `.github/workflows/ci.yml`, `.gitignore`, `.planning/config.json` (full/targeted reads)
- `npm view puppeteer` / `puppeteer@24.43.1` / `puppeteer@24` / `puppeteer@25.0.0` (version, engines, time.modified, scripts.postinstall, repository.url, full versions/time JSON) — executed this session
- `gsd-tools.cjs query package-legitimacy check --ecosystem npm puppeteer` — executed this session, returned `SUS`/`too-new`
- WCAG contrast arithmetic — computed via a Node script written and executed this session (`/tmp/contrast-calc.mjs`) reproducing the standard sRGB-linearize + relative-luminance + `(L1+0.05)/(L2+0.05)` formula
- Full 108-site `text-[9px]`/`text-[10px]` inventory — `grep`/`for`-loop executed this session across `app/` and `components/`
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md`, `07-CONTEXT.md`, `REQUIREMENTS.md`, `STATE.md`, `.planning/PROJECT.md` — read in full

### Secondary (MEDIUM confidence)
- [CITED: tailwindcss.com] — `theme.textColor` independent-override pattern (WebSearch this session surfaced a v2-era Tailwind docs page demonstrating this; the underlying corePlugin-scale architecture — `textColor`/`backgroundColor`/`borderColor` each independently resolvable and each falling back to `theme('colors')` only when unset — is unchanged through Tailwind v3.4.x, but this specific claim is not re-verified against the v3.4.19 docs directly in this session; see Assumptions Log A1 and the build-check verification task)

### Tertiary (LOW confidence)
- None — every other claim in this document is either read/executed directly (Primary) or explicitly logged in the Assumptions table.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Tailwind version and Puppeteer pin both verified against the actual `package.json` and live npm registry this session
- Architecture: HIGH for the token-consumption patterns (all read from source); MEDIUM for the `theme.textColor` override mechanism specifically (CITED, not yet build-verified in this exact config)
- Pitfalls: HIGH — the L13%-trap, `--input` non-usage, and `--muted` collision findings are all original arithmetic/greps run this session, not carried over from CONTEXT.md's own (correct as far as it went, but not fully cross-checked) framing

**Research date:** 2026-09-15
**Valid until:** 30 days (stable domain — Tailwind config and CSS custom properties don't drift quickly; re-verify the Puppeteer pin specifically if this phase's execution slips past early October 2026, since the 25.x line may itself patch forward)
