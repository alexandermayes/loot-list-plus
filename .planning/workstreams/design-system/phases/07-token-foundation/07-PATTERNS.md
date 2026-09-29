# Phase 07: Token Foundation - Pattern Map

**Mapped:** 2026-09-15
**Files analyzed:** 12 (grouped; 3 sub-11px call-site files are representative of the 22-file/108-site sweep)
**Analogs found:** 10 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `tailwind.config.js` (fontSize, colors.standby, textColor.accent) | config | transform (build-time CSS generation) | itself (existing `fontSize`/`colors` blocks) | exact — no external analog needed, this is the only theme config file in the repo |
| `app/globals.css` (`:root`/`.dark` token edits: muted, accent-text, standby, ramp) | config | transform (CSS custom properties) | itself (existing token blocks for `--warning`/`--success`/`--error`/`--info`) | exact — same file, same pattern, new entries |
| `components/ui/status-badge.tsx` | component | transform (variant map -> className string) | itself — the `approved`/`rejected`/`draft` entries are already token-clean; `pending`/`needs_revision`/`late`/`benched` are the ones to fix | exact (in-file analog) |
| `components/ui/alert.tsx` | component | transform (cva variant map) | itself — `success`/`destructive`/`info` variants already token-clean; `warning` is the one to fix | exact (in-file analog) |
| `app/(app)/raid-tracking/components/cell-state.ts` | utility | transform (pure function, state -> className string) | itself — `attended`/`late`/`no-show`/`excused` branches already use `border-l-success`/`border-l-warning`/etc.; `standby` branch is the odd one out | exact (in-file analog) |
| `app/(app)/raid-tracking/_client.tsx` (legend swatch ~line 2530) | component | transform (JSX className literal) | `cell-state.ts`'s sibling literals in the same legend block (success/warning/destructive/muted-foreground) | exact (in-file analog, same JSX block) |
| `app/(app)/raid-tracking/components/RaidMemberList.tsx` (`StatusPill`, ~line 73) | component | transform (JSX className literal, text+bg fill) | the four sibling `StatusPill` branches in the same function (`attended`/`late`/`no-show`/`excused` already token-based) | exact (in-file analog, same function) |
| `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts` (line ~142) | test | transform (assertion update) | itself — the `no-show`/`excused`/`attended`/`late` assertions in the same `describe` block show the exact `toContain('border-l-<token>')` shape to copy | exact (in-file analog) |
| 22-file / 108-site `text-[9px]`/`text-[10px]` -> `text-11` sweep (Sidebar, BossSection, CharacterSelector, LootListContent, admin analytics, SearchableItemSelect, AttendanceContent, MemberManager, CreateGuildModal, +11 more) | component | transform (literal Tailwind class string replacement) | no single-file analog needed — mechanical `sed`-style substitution across all 22 files (Common Pitfall 4 in RESEARCH.md confirms no dynamic interpolation exists) | role-match (mechanical, not a copy-a-pattern task) |
| `scripts/visual/baseline.mjs` (new) | script | file-I/O + event-driven (Puppeteer navigates a running dev server, writes PNGs) | no in-repo Puppeteer/browser-automation analog exists; closest structural analog for a standalone Node script that reads env vars, hits an HTTP endpoint, and writes files is `scripts/create-test-users.ts` (env var + HTTP + file write shape) and `scripts/apply-item-corrections.mjs` (`.mjs`, `fileURLToPath`/`import.meta.url` path resolution, shebang, top-of-file doc comment) | no analog for the Puppeteer-specific parts (page navigation, screenshot, login-flow interaction) — see "No Analog Found" |
| `__tests__/token-contrast.test.ts` (new, or co-located under `app/__tests__/`) | test | transform (parse CSS custom properties, run WCAG arithmetic, assert) | `app/__tests__/content-dates.test.ts` (parses a data source, asserts derived values with `describe`/`it`, throws-on-missing pattern) and `lib/__tests__/public-routes.test.ts` (regression-note comment header, `describe('functionName', ...)` per exported function) | role-match |
| `__tests__/type-scale-floor.test.ts` (new) | test | transform (grep-based absence check) | `lib/__tests__/public-routes.test.ts`'s "no mocks, importing proves it stays framework-free" framing; no existing test does a filesystem grep, so the specific glob/regex mechanics are new but the `describe`/`it`/comment-header shape is copied | role-match |
| `__tests__/status-badge-tokens.test.ts` (new) | test | transform (grep-based absence check on 2 component files) | same as `type-scale-floor.test.ts` | role-match |

## Pattern Assignments

### `tailwind.config.js` (config, transform)

**Analog:** itself, lines 27-38 (`fontSize`) and lines 42-60+ (`colors`)

**Current fontSize block to edit** (lines 28-37):
```javascript
fontSize: {
  'xs': ['10px', { lineHeight: '1.5' }],
  'sm': ['12px', { lineHeight: '1.5' }],
  'base': ['13px', { lineHeight: '1.5' }],
  'md': ['14px', { lineHeight: '1.5' }],
  'lg': ['16px', { lineHeight: '1.5' }],
  'xl': ['18px', { lineHeight: '1.2' }],
  '2xl': ['20px', { lineHeight: '1.2' }],
  '3xl': ['24px', { lineHeight: '1.2' }],
  '4xl': ['32px', { lineHeight: '1.2' }],
  '5xl': ['42px', { lineHeight: '1.02' }],
},
```
D-01/D-02 pattern to copy: change `'xs'` value to `'11px'`, add a `'15'`-keyed entry (new step), and add pixel-named twins (`'11'`, `'12'`, `'13'`, `'14'`, `'15'`, `'16'`, `'18'`, `'20'`, `'24'`, `'32'`, `'42'`) each resolving to the same `[value, { lineHeight }]` tuple as its semantic sibling — same array-tuple shape, just duplicated keys.

**Current colors block pattern to copy for `standby`** (mirrors the existing `destructive`/`primary` shape, lines ~59-70):
```javascript
destructive: {
  DEFAULT: "hsl(var(--destructive))",
  foreground: "hsl(var(--destructive-foreground))",
},
```
New `standby` entry follows this exact `DEFAULT`/`foreground` shape (per RESEARCH.md Pattern 2).

**`text-accent` override (D-06 primary path, per RESEARCH.md Pattern 1)** — new top-level `theme.extend.textColor` key alongside the existing `colors` block, not inside it:
```javascript
// New — does not touch colors.accent (which still feeds bg-accent/border-accent)
textColor: {
  accent: "hsl(var(--accent-text))",
},
```

---

### `app/globals.css` (config, transform)

**Analog:** itself — light block lines 133-195, dark block from line 210

**Existing status-token shape to copy for `--standby`** (mirrors `--warning`, dark block ~line 253):
```css
--warning: 45 93% 47%;
--warning-foreground: 220 20% 4%;
```
New dark-block entries:
```css
--standby: 38 92% 50%;
--standby-foreground: 0 0% 4%;   /* verified 9.25:1 on standby, per RESEARCH.md */
```

**Muted edit (D-04), dark block line ~226:**
```css
--foreground-muted: 0 0% 40%;       /* #666666 - Muted */
```
becomes (per RESEARCH.md's Pitfall-1 resolution, Option B — pair with the L13% ramp):
```css
--foreground-muted: 0 0% 53%;
```

**Muted edit (D-05), light block line ~140:**
```css
--foreground-muted: 25 6% 45%;      /* #7a7269 - Muted text (darker) */
```
becomes `25 6% 42%;`

**Surface ramp (D-09/D-10), dark block lines ~217-231:**
```css
--background-elevated: 228 12% 8%;  /* #141519 - Cards/inputs */
...
--card: 228 12% 8%;
...
--popover: 228 12% 8%;
...
--secondary: 228 12% 8%;            /* #141519 */
...
--muted: 0 0% 12%;                    /* #1f1f1f - Hover background */
...
--border: 0 0% 10%;                 /* #1a1a1a - Default */
--border-strong: 0 0% 22%;          /* #383838 - Strong */
--input: 0 0% 10%;
```
All five `228 12% 8%`-valued tokens move together to `228 12% 13%` (per RESEARCH.md's L13% + muted-53% pairing); `--muted` must be bumped independently to at least `0 0% 14-15%` per Pitfall 3 so it stays visually lighter than the lifted card; `--border` to `0 0% 18%`, `--border-strong` to `0 0% 26%`.

**`--accent-text` (D-06), new token beside the existing `--accent`/`--accent-foreground`/`--accent-subtle` triplet in both blocks:**
```css
/* light block */
--accent-text: 30 100% 36%;
/* dark block */
--accent-text: 30 100% 50%;   /* equal to --accent in dark mode */
```

---

### `components/ui/status-badge.tsx` (component, transform)

**Analog:** in-file — `approved` entry (already correct) vs. `pending`/`needs_revision`/`late`/`benched` (to fix)

**Already-correct pattern to replicate** (lines 24-27):
```typescript
approved: {
  label: 'Approved',
  className: 'bg-success/10 text-success border-success/20 hover:bg-success/20'
},
```

**Entries to change** (lines 28-31, 32-35, and the `late`/`benched` duplicates further down):
```typescript
pending: {
  label: 'Pending',
  className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
},
needs_revision: {
  label: 'Needs Revision',
  className: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'
},
```
becomes (mapping proposed at the checkpoint per D-08, RESEARCH.md's grounded starting point):
```typescript
pending: {
  label: 'Pending',
  className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
},
needs_revision: {
  label: 'Needs Revision',
  className: 'bg-standby/10 text-standby border-standby/20 hover:bg-standby/20'
},
```
Same substitution for `late` -> `--warning`, `benched` -> `--standby`. `draft`/`excused`/`signed_up`/`rejected`/`no_show`/`attended` are already token-clean and untouched.

---

### `components/ui/alert.tsx` (component, transform)

**Analog:** in-file — `success`/`destructive`/`info` variants (lines 20, 21, 23) vs. `warning` (line 22)

```typescript
warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500 [&>svg]:text-yellow-500",
```
becomes, matching the `success`/`destructive`/`info` shape exactly:
```typescript
warning: "bg-warning/10 border-warning/30 text-warning [&>svg]:text-warning",
```

---

### `app/(app)/raid-tracking/components/cell-state.ts` (utility, transform)

**Analog:** in-file — `getCellStyle()`'s `attended`/`late`/`no-show`/`excused` branches

```typescript
case 'late':
  return 'bg-background-elevated border border-border border-l-2 border-l-warning'
case 'standby':
  return 'bg-background-elevated border border-border border-l-2 border-l-orange-500'
case 'no-show':
  return 'bg-background-elevated border border-border border-l-2 border-l-destructive'
```
`standby` branch becomes `border-l-standby`, matching the exact `border border-border border-l-2 border-l-<token>` shape already used by every other branch.

---

### `app/(app)/raid-tracking/_client.tsx` (component, transform, ~line 2530)

**Analog:** the sibling legend swatches in the same block (success/warning/destructive/muted-foreground, lines ~2521-2537)

```jsx
<div className="w-5 h-5 rounded bg-background-elevated border border-border border-l-2 border-l-orange-500"></div>
<span className="text-muted-foreground">Standby</span>
```
`border-l-orange-500` -> `border-l-standby`, identical structure to the `border-l-success`/`border-l-warning`/`border-l-destructive`/`border-l-muted-foreground` siblings immediately above/below it.

---

### `app/(app)/raid-tracking/components/RaidMemberList.tsx` (component, transform, `StatusPill`, ~line 73)

**Analog:** the sibling `StatusPill` branches in the same function (lines ~62-87: `attended`, `late`, `no-show`, `excused`, `isSignedUp`)

```jsx
{state === 'standby' && (
  <span className="text-[11px] font-medium text-orange-500 bg-orange-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
    Standby
  </span>
)}
```
becomes, matching the `text-success bg-success/15` / `text-warning bg-warning/15` / `text-destructive bg-destructive/15` shape used by every sibling branch:
```jsx
{state === 'standby' && (
  <span className="text-[11px] font-medium text-standby bg-standby/15 px-2 py-0.5 rounded-full flex-shrink-0">
    Standby
  </span>
)}
```
Note: this is the one site that needs `colors.standby` to exist as a full Tailwind color object (not just a CSS variable used in a border utility) — both `text-standby` and `bg-standby/15` must resolve, confirmed in RESEARCH.md Pattern 2.

---

### `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts` (test, transform)

**Analog:** in-file — the `no-show`/`excused`/`attended`/`late` assertions in the same `describe('getCellStyle', ...)` block

```typescript
it('no-show uses the destructive border accent', () => {
  expect(getCellStyle('no-show')).toContain('border-l-destructive')
})

it('excused uses a muted-foreground border accent', () => {
  expect(getCellStyle('excused')).toContain('border-l-muted-foreground')
})
```
The `standby` assertion:
```typescript
it('standby uses an orange border accent', () => {
  expect(getCellStyle('standby')).toContain('border-l-orange-500')
})
```
becomes:
```typescript
it('standby uses the standby border accent', () => {
  expect(getCellStyle('standby')).toContain('border-l-standby')
})
```
Same `toContain` shape, same one-assertion-per-state structure as every sibling `it` block in the file — no other structural change needed.

---

### Sub-11px sweep (108 sites across 22 files) (component, transform)

**Analog:** none needed — mechanical literal substitution, not a code pattern to imitate.

Per RESEARCH.md Pitfall 4 (verified this session, zero dynamic interpolation): a project-wide literal-string replace is safe and complete —
```bash
# once tailwind.config.js's text-11 alias (D-02) exists:
grep -rl 'text-\[10px\]\|text-\[9px\]' app components | xargs sed -i '' \
  -e 's/text-\[10px\]/text-11/g' -e 's/text-\[9px\]/text-11/g'
```
Files/counts already inventoried in RESEARCH.md's "Full 108-Site Inventory" table — no per-file pattern extraction is needed since every site is a literal Tailwind class string, including the four sites inside template literals or alongside dynamic `title={...}` attributes (`AttendanceContent.tsx:1227`, `CreateGuildModal.tsx:716`, `BossSection.tsx:452,467`).

---

### `scripts/visual/baseline.mjs` (script, file-I/O + event-driven — NEW)

**Partial analogs (structure only, not Puppeteer usage):**

`scripts/apply-item-corrections.mjs` — `.mjs` shebang + doc-comment + `fileURLToPath`/`import.meta.url` path-resolution pattern (lines 1-12):
```javascript
#!/usr/bin/env node

/**
 * Applies verified corrections to item-types.ts based on Wowhead data.
 * Run generate-corrected-items.mjs first to verify the corrections.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const filePath = fileURLToPath(new URL('../data/item-types.ts', import.meta.url))
```

`app/dev-login/page.tsx` + `app/api/dev/test-users/route.ts` — the dev-only login flow the script must drive: `IS_DEV = process.env.NODE_ENV === 'development'` gate (both files), and the test-user shape returned by `GET /api/dev/test-users` (`{ users: TestUser[], count: number }` where `TestUser = { id, email, password }`) is exactly what a Puppeteer script would fetch and then fill into the dev-login form fields to authenticate before navigating to `/overview`.

No in-repo analog exists for the Puppeteer-specific mechanics (browser launch, `page.goto`, `page.screenshot`, viewport sizing at 1440/390, light/dark toggling via `next-themes`' `.dark` class). These parts should follow RESEARCH.md's Code Examples/Architecture Patterns sections directly (Puppeteer's own API), not a codebase pattern — flagged below under "No Analog Found."

**package.json script-registration analog** (existing `scripts` block pattern to copy for a new npm script, e.g. `visual:baseline`):
```json
"test:users:create": "tsx scripts/create-test-users.ts",
```
New entry follows the same `"<name>": "node scripts/visual/baseline.mjs"` shape (or `tsx` if written in `.ts`).

---

### `__tests__/token-contrast.test.ts` and `__tests__/type-scale-floor.test.ts` and `__tests__/status-badge-tokens.test.ts` (test, transform — NEW)

**Analog:** `app/__tests__/content-dates.test.ts` and `lib/__tests__/public-routes.test.ts`

**Header comment + regression-note pattern** (`public-routes.test.ts` lines 1-6):
```typescript
import { describe, it, expect } from 'vitest'
import { isPublicPathname, exactPublicPaths } from '../public-routes'

// Regression suite for G-04-2: proxy.ts redirected logged-out requests for
// /research and /customers to the landing page instead of serving the page.
// ...
```
Copy this shape: a `describe`/`it` block per token family (muted, ramp, standby) or per grep target (sub-11px sites, palette-literal classes), with a comment header naming the requirement ID (TYPE-01/COLOR-01/COLOR-02/COLOR-06) and why the test exists — matching this project's convention of comments explaining *why*, not what.

**Throw-on-missing / fail-loud pattern** (`content-dates.test.ts`):
```typescript
it('throws an Error naming the route when the route is absent from the JSON', () => {
  expect(() => contentDate('/this-route-does-not-exist')).toThrowError(
    /this-route-does-not-exist/
  )
})
```
Apply the same "fail loud, name the thing" idea in `token-contrast.test.ts`: if a CSS custom property expected by the contrast test is missing from `globals.css`, the parser helper should throw naming the property, not silently return `undefined`.

**Assertion style for a numeric floor** (no existing analog computes contrast ratios — this is new arithmetic per RESEARCH.md's Code Examples section, reproduce the `hslToRgb`/`relativeLuminance`/`contrastRatio` functions verbatim as shown there):
```javascript
expect(contrastRatio(mutedHsl, backgroundElevatedHsl)).toBeGreaterThanOrEqual(4.5)
```

**Grep-based absence-check pattern** (no existing test does this; closest analog is `public-routes.test.ts`'s "importing proves it stays framework-free" no-mocks philosophy — apply the same "test the real files, no mocking" idea using Node's `fs`/`fast-glob` or a `child_process` grep):
```javascript
import { readFileSync } from 'fs'
import fg from 'fast-glob' // or use existing project deps; check package.json before adding

const files = fg.sync(['app/**/*.tsx', 'components/**/*.tsx'])
for (const file of files) {
  const content = readFileSync(file, 'utf8')
  expect(content).not.toMatch(/text-\[9px\]|text-\[10px\]/)
}
```

---

## Shared Patterns

### CSS custom property + Tailwind color-object pairing
**Source:** `app/globals.css` (`--warning`/`--success`/`--error`/`--info` triplets) + `tailwind.config.js` (`colors.destructive`/`colors.primary` `DEFAULT`/`foreground` shape)
**Apply to:** `--standby`/`colors.standby`, `--accent-text`/`textColor.accent`
Every semantic token in this codebase is defined once in `globals.css` as an HSL triplet, then exposed in `tailwind.config.js` as `hsl(var(--x))`. New tokens must follow this exact two-file pairing — never hardcode a hex or Tailwind palette class directly in a component.

### Token-clean component variant maps
**Source:** `status-badge.tsx`'s `approved`/`rejected`/`draft` entries, `alert.tsx`'s `success`/`destructive`/`info` variants, `cell-state.ts`'s `attended`/`no-show`/`excused` branches
**Apply to:** every "fix" entry in `status-badge.tsx`, `alert.tsx`, `cell-state.ts`, `_client.tsx`, `RaidMemberList.tsx`
The in-file sibling entries are the best possible analogs for each fix — the pattern to copy is always in the same file, one branch away. Do not invent a new className shape; mirror the sibling exactly, only swapping the token name.

### Vitest test file header/regression-comment convention
**Source:** `lib/__tests__/public-routes.test.ts`, `app/__tests__/content-dates.test.ts`
**Apply to:** all three new Wave-0 test files
Comment header naming the requirement/regression this test locks in, `describe` per exported function or concern, no `vi.mock` unless unavoidable, fail-loud assertions that name the offending value.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/visual/baseline.mjs` (Puppeteer page-navigation/screenshot logic specifically) | script | event-driven | No Puppeteer or browser-automation code exists anywhere in this repo (`grep -r puppeteer` outside `node_modules` returns nothing); use RESEARCH.md's Architecture Patterns diagram and Puppeteer's own API directly rather than a codebase pattern. The surrounding script shell (shebang, path resolution, dev-login HTTP fetch) does have analogs, listed above. |
| Grep-based absence-check test mechanics (walking `app/`+`components/` for a literal substring from inside Vitest) | test | transform | No existing test performs a filesystem-wide grep; nearest philosophical analog (`public-routes.test.ts`'s no-mock stance) is listed above under Shared Patterns, but the actual glob/regex mechanics are new to this codebase — check `package.json` for an existing glob dependency (`fast-glob` is not currently a listed dependency; confirm before adding, or use Node's built-in `fs.readdirSync` recursion to avoid a new package). |

## Metadata

**Analog search scope:** `tailwind.config.js`, `app/globals.css`, `components/ui/status-badge.tsx`, `components/ui/alert.tsx`, `app/(app)/raid-tracking/components/cell-state.ts` + `__tests__/cell-state.test.ts`, `app/(app)/raid-tracking/components/RaidMemberList.tsx`, `app/(app)/raid-tracking/_client.tsx`, `app/dev-login/page.tsx`, `app/api/dev/test-users/route.ts`, `scripts/` (full directory listing), `.github/workflows/ci.yml`, `package.json`, `app/__tests__/`, `lib/__tests__/`, `domain/**/__tests__/`
**Files scanned:** ~20 read/grepped directly this session; 22-file sub-11px sweep inventoried via RESEARCH.md (not re-read here, per no-duplicate-reads rule)
**Pattern extraction date:** 2026-09-15
