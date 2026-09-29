# Phase 12: Enforcement and Documentation - Pattern Map

**Mapped:** 2026-09-22
**Files analyzed:** 9 new/modified files (1 doc, 1 config, 1 UI page, 3 test files, 2 doc-content files, 1 probe/harness script)
**Analogs found:** 8 / 9 have direct in-repo analogs; 1 (DESIGN.md itself) has a format spec but no in-repo prose analog

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `DESIGN.md` (new, repo root) | config (hand-authored doc, YAML frontmatter + markdown) | transform (source→doc, no code) | `.claude/skills/impeccable/reference/document.md` (format spec, not an analog file) — no in-repo DESIGN.md precedent | no in-repo analog — spec-driven |
| `__tests__/design-tokens/design-md-parity.test.ts` (new) | test (Vitest guard) | transform (parse+compare) | `__tests__/design-tokens/contrast.ts` (parser) + `__tests__/data-score-absence.test.ts` (guard shape) | exact — reuses `parseTokens`/`loadThemeTokens`/`hslToRgb`, needs new `rgbToHex` |
| `__tests__/design-tokens/contrast.ts` (extend: add `rgbToHex`) | utility | transform | itself — sibling functions `hslToRgb`/`hexToRgb` in same file | exact |
| `.impeccable/config.json` (rewrite `ignoreValues`) | config (JSON, tooling-only) | transform (re-derive from scratch) | itself — existing 5-entry array is the direct analog for shape/fields | exact |
| `scripts/design-system/exercise-hook.mjs` (new, D-09 probe harness) | utility (script) | event-driven (simulated PostToolUse → stdout/NDJSON) | `scripts/visual/numeral-probe.mjs` (two-directional control pattern, localhost-origin discipline) | exact — same control-pair shape, different subject |
| `app/(app)/design-system/_client.tsx` (edit: 7 sections) | component (docs/showcase page) | transform (restate → live example) | itself — existing swatch/preview sections (`_client.tsx:325-330` swatch array, `_client.tsx:1241-1282` Cards section) | exact — mechanical extension of existing patterns in the same file |
| `__tests__/design-system-page-absence.test.ts` (new) | test (Vitest absence guard) | transform (source scan) | `__tests__/data-score-absence.test.ts` (identical shape: absence + sibling-survival assertions via `matchesIn`/`sourceFiles`) | exact |
| `REQUIREMENTS.md`, `ROADMAP.md`, `.planning/WINDOWS.md` (D-02/D-08 Blocked/routing entries) | config (planning doc) | transform (status marker edits) | `.planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/11-VERIFICATION.md` §WINDOWS 32-35 entries (numbered, named-gate pattern) | exact — same numbered-entry convention |
| `<local-detector-output>.json` (D-03 evidence artifact, not source code) | utility (script invocation output) | batch (Puppeteer detector run) | `scripts/visual/baseline.mjs` (localhost-only origin guard, PAGES-matrix-shaped invocation) | role-match — invocation shape only; page list must NOT be copied (baseline.mjs lacks `/about`, `/changelog`) |

## Pattern Assignments

### `DESIGN.md` (config, hand-authored doc)

**Analog:** `.claude/skills/impeccable/reference/document.md` (format spec — no in-repo prior instance to imitate)

**Frontmatter shape to follow** (per RESEARCH.md, cited from `reference/document.md:43-49, 51-62`):
```yaml
---
name: <project title>
description: <one-line tagline>
colors:
  primary: "#b8422e"
typography:
  display: { fontFamily: "...", fontSize: "...", fontWeight: 300, lineHeight: 1, letterSpacing: "normal" }
  body: { ... }
rounded:
  sm: "4px"
spacing:
  sm: "8px"
---
```
Eight canonical sections, exact heading text, fixed order: `## Overview`, `## Colors`, `## Typography`, `## Layout`, `## Elevation & Depth`, `## Shapes`, `## Components`, `## Do's and Don'ts`. Per D-05/D-06, frontmatter carries **light-theme only** (hex, converted from `globals.css` HSL); body Colors/Typography tables carry the full 46-token/29-step set for **both** themes.

**Token source to transcribe from** — `app/globals.css:131` (`:root`) and `:213` (`.dark`), `tailwind.config.js` (29 `fontSize`, 11 `borderRadius`, 3 `fontFamily`), plus `app/layout.tsx:40-45` for the Figtree/`--font-tabular` fact (not present as a CSS custom property — must be named in prose, not the frontmatter's colours/typography token machinery).

---

### `__tests__/design-tokens/design-md-parity.test.ts` (test, transform)

**Analog:** `__tests__/design-tokens/contrast.ts` (parser to reuse) + `__tests__/data-score-absence.test.ts` (guard shape/comment style)

**Imports pattern to copy** (`contrast.ts:1-11`):
```typescript
import * as fs from 'node:fs'
import * as path from 'node:path'

export type Hsl = { h: number; s: number; l: number }
```
Reuse `loadThemeTokens()` (`contrast.ts:75-84`) and `hslToRgb()` (`contrast.ts:88-104`) directly via import; add only a `rgbToHex` wrapper beside them (per RESEARCH.md Code Examples):
```typescript
function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
}
```

**Guard structure / comment style to copy** (`__tests__/data-score-absence.test.ts:1-26`, full header):
```typescript
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// [WHY comment: names the regression this guard prevents, cites the phase/decision,
//  and explicitly calls out the guard's scope limit — "a green result here must not
//  be read as X" pattern, used consistently across this workstream's guards]

const SOME_PATTERN = /.../

describe('<guard name> (<REQ-ID>)', () => {
  it('...', () => {
    const matches = matchesIn([targetPath], SOME_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})
```
**Must-observe-red-first requirement (D-04):** perturb one frontmatter value before the guard exists in green state, and record the failing run — this workstream's established evidence standard (see "Guards are proven red before they ship" in RESEARCH.md Architecture Patterns).

**`--font-tabular` special-case** — a second, separate assertion against `app/layout.tsx`'s raw source text (not the HSL/hex pipeline):
```typescript
// regex or substring check against app/layout.tsx's Figtree({...}) call
/Figtree\(\{[^}]*variable:\s*["']--font-tabular["']/s
```

---

### `.impeccable/config.json` (config, JSON)

**Analog:** itself — existing entry shape is the direct template

**Entry shape to copy** (verbatim from current file, read this session):
```json
{
  "rule": "side-tab",
  "value": "*",
  "files": [
    "app/(app)/raid-tracking/_client.tsx"
  ],
  "createdAt": "2026-09-16T19:29:12.456Z",
  "reason": "Sanctioned exception per 2026-09-15 UI audit (UI-AUDIT-2026-09-15.md) and 07-05-PLAN.md prohibition: raid-tracking legend rails intentionally mirror the 2px cell-state left border; 07-05 changed only the colour token (orange literal -> --standby), not the rail"
}
```
Per D-07, the `side-tab` entry (`app/(app)/raid-tracking/_client.tsx`) is the one entry to **re-justify and keep**; `ai-color-palette` on `OnboardingModal.tsx` is the one entry whose justification is **expired** (Phase 10/COLOR-05 already migrated it — commit `5967189e`) and must NOT be carried forward unmodified. New entries needed per D-13/D-14: `design-system-color` (WoW item-quality + brand hex values, five values), `design-system-font` (file-scoped to the six named type-to-confirm/invite-code call sites, NOT value-scoped — see D-14's warning that `design-system-font` extracts the computed font-family, so a value-scoped entry would silently suppress all 20 `font-mono` sites). Preserve the deleted entries' reasons as phase evidence text (not in the JSON) per D-07's costly-reversibility note.

**Reason-string convention:** cite the audit or ROADMAP source, cite the specific commit/phase that changed the code, and name why the exception is scoped where it is — every existing entry follows this three-part shape, keep it.

---

### `scripts/design-system/exercise-hook.mjs` (new, utility/script)

**Analog:** `scripts/visual/numeral-probe.mjs`

**Two-directional control pattern to copy** (concept, from `numeral-probe.mjs:26-30`, header comment): every probe run must include one case proven to still flag (forcing the "wrong" condition) alongside the cases proven clean, "or the probe cannot detect success where success exists."

**Invocation shape to copy** (from RESEARCH.md Code Examples, itself derived from `hook-lib.mjs` read this session):
```bash
echo '{
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": { "file_path": "'"$(pwd)"'/app/(app)/raid-tracking/_client.tsx" },
  "cwd": "'"$(pwd)"'",
  "session_id": "enf02-probe-side-tab-1"
}' | node .claude/skills/impeccable/scripts/hook.mjs
```
**Critical rule copied from `numeral-probe.mjs`'s localhost-origin discipline (`numeral-probe.mjs:133-146` `assertLocalOrigin`):** this script has no equivalent network target, but the analogous discipline here is a **fresh, unique `session_id` per probe invocation** (`enf02-probe-<rule>-<iso-timestamp>`) — reusing one silently dedupes a later real finding into the "already known" cache (`hook-lib.mjs:931-943`), the same shape of false-pass `assertLocalOrigin` exists to prevent.

**Getting verbatim proof beyond stdout:** set `IMPECCABLE_HOOK_LOG=<path>` in the probe's env to capture an NDJSON audit record per invocation — this is the "verbatim output" D-09 requires, not just stdout text.

**The one deliberate control that DOES flag:** point a probe at `app/reserve/join/[token]/page.tsx:866` or `OnboardingModal.tsx:299` (the D-08 live literals, deliberately left unguarded) with a fresh `session_id` — must return a flagging result, proving the hook still discriminates at the moment the six sanctioned exceptions report clean.

---

### `app/(app)/design-system/_client.tsx` (component, transform — 7 edit sites)

**Analog:** itself — every new section is a mechanical extension of an existing sibling pattern in the same file, per D-10/D-12 and the UI-SPEC's item-by-item contract

**Swatch-array pattern to copy** (`_client.tsx:325-330`, existing `discord` entry shape — read live during UI-SPEC research, not re-quoted here since file exceeds single-read budget; UI-SPEC §Color names the exact target: `{ name: 'standby', bg: 'bg-standby', fg: 'text-standby', desc: '...', hex: '...' }` rendered through the same `.map()`):
- New `standby` entry → same "Accent & Status" grid, same shape.
- New "Faction Colours" subsection (`--alliance`, `--horde`) → same swatch-grid pattern, new subsection heading.
- New "Item Quality & Brand" subsection → import `QUALITY_COLORS` from `lib/design-system/quality-colors.ts` alongside the already-imported `BRAND_COLORS`; do not hand-type hex values (UI-SPEC explicit instruction).

**Card variants section** (`_client.tsx:1241-1282`, existing three `default`-variant cards) — add a fourth example: parent `<Card>` with three `variant="nested"` children, demonstrating `first:border-t-0`. Same JSX shape as the existing three cards, new `variant` prop value.

**Type Scale fix** (`_client.tsx:382-398` cluster A, `_client.tsx:429-436` cluster B) — **delete** hand-typed pixel strings (`size: '10px'` etc. and `(16px)`/`(14px)` parentheticals); do not replace with a corrected number (D-10's core rule: point to `DESIGN.md`, never re-inline a value). Add the missing `text-15` row between `text-base` and `text-lg`.

**Stale-prose fix** (`_client.tsx:1801`) — literal string replace: `"Applied globally to td, th, and [data-score]."` → `"Applied globally to td, th, and .tabular-nums."`

**Modal callout** — reuse the existing `PreviewCard` pattern (already used throughout the file) next to the existing real `Modal` demo at `_client.tsx:1285-1354`; no new interactive component, only a static list + caption.

---

### `__tests__/design-system-page-absence.test.ts` (test, transform)

**Analog:** `__tests__/data-score-absence.test.ts` — copy verbatim structurally, change only the target patterns and file

**Pattern to copy** (full file structure already quoted above under the parity-test entry) — this guard asserts **absence** of five deleted-primitive names/selectors (`LabelText`, `.section-label`, `[data-score]`, `--background-inset`, `.sidebar-scrollable`) in `app/(app)/design-system/_client.tsx`, paired with **sibling-survival** assertions (e.g., that `Text` and `.tabular-nums` still match) so a false-pass from deleting the whole surrounding block cannot occur — this is `data-score-absence.test.ts`'s own load-bearing design point, reused identically:

```typescript
// modeled on __tests__/data-score-absence.test.ts's comment shape:
// - cite the phase/decision this guard enforces (D-12 discretion item)
// - state the scope limit explicitly ("says nothing about X")
const DELETED_PRIMITIVE_PATTERNS = [
  /LabelText/,
  /\.section-label/,
  /\[data-score\]/,
  /--background-inset/,
  /\.sidebar-scrollable/,
]
```
Use `matchesIn`/`sourceFiles` from `__tests__/design-tokens/source-files.ts` exactly as `data-score-absence.test.ts` does — throws on missing path, so a rename cannot yield a silent zero-match pass (see `source-files.ts:27-32` doc comment).

---

### `REQUIREMENTS.md`, `ROADMAP.md`, `.planning/WINDOWS.md` (planning-doc edits, D-02/D-08)

**Analog:** `.planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/11-VERIFICATION.md` §WINDOWS entries 32-35 (numbered, named-gate, named-owner convention already established in this workstream)

**Entry shape to copy** (structural convention, not literal text — WINDOWS entries in this repo are numbered, name the specific gate/file, and name a destination/owner):
```
### WINDOWS <N>
<one-line description of what's blocked>
**Gate:** <the specific fact blocking it, e.g. "deploy of commit range X"> 
**Owner:** <named workstream/person/phase>
```
D-02 requires this same shape in three places for ENF-04/05 (Blocked status, deploy named as reason); D-08 requires two new numbered entries for the live colour literals, routed to "a colour-migration owner" per the deferred-ideas convention.

---

## Shared Patterns

### Guard evidence discipline (applies to design-md-parity.test.ts, design-system-page-absence.test.ts, exercise-hook.mjs)
**Source:** `scripts/visual/numeral-probe.mjs` header comment + `__tests__/data-score-absence.test.ts` header comment
**Apply to:** every new guard/probe this phase writes
Every guard in this workstream is observed red first (perturb the value, record the failure), and every guard's comment states its own scope limit explicitly ("a green result here must not be read as X"). This is not optional style — it is the mechanism that prevents the exact G-11-1/dead-`[data-score]`-rule failure shape D-04/D-09 exist to close out.

### Absence + sibling-survival guard shape
**Source:** `__tests__/data-score-absence.test.ts` (full file)
**Apply to:** `__tests__/design-system-page-absence.test.ts`
Never write an absence-only assertion; always pair it with a sibling-survival assertion so a false-pass from over-deletion is structurally impossible.

### `.impeccable/config.json` ignoreValue entry shape
**Source:** `.impeccable/config.json` (current 5 entries)
**Apply to:** the rewritten `ignoreValues` array
`{ rule, value, files: [...], createdAt, reason }` — reason cites the audit/ROADMAP source and the commit/phase that made the exception legitimate; re-verify every carried-forward entry against current code before keeping it (D-07's governing principle).

### Numbered WINDOWS-entry convention
**Source:** Phase 11 WINDOWS entries 32-35
**Apply to:** `.planning/WINDOWS.md` additions for D-02 (blocked ENF-04/05) and D-08 (routed colour-literal fixes)
Numbered, named-gate, named-owner — never silent.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `DESIGN.md` | config (hand-authored doc) | transform | No prior DESIGN.md exists in this repo; format is entirely spec-driven (`reference/document.md`), not codebase-pattern-driven. Planner should follow the spec's frontmatter/section rules directly rather than search for an in-repo analog. |

## Metadata

**Analog search scope:** `__tests__/design-tokens/`, `__tests__/data-score-absence.test.ts`, `.impeccable/config.json`, `.claude/skills/impeccable/scripts/`, `scripts/visual/`, `app/(app)/design-system/_client.tsx`, `.planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/`
**Files scanned:** ~10 (contrast.ts, data-score-absence.test.ts, source-files.ts, config.json, numeral-probe.mjs header, plus CONTEXT/RESEARCH/UI-SPEC for prior phases' PATTERNS.md format)
**Pattern extraction date:** 2026-09-22
