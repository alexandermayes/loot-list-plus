# Phase 09: Type and Card Migration - Pattern Map

**Mapped:** 2026-09-18
**Files analyzed:** 9 (2 primitives/config edited, 2 new codemod scripts, 2 new guard tests, 1 extended script, ~100+55 call-site rewrites treated as one mechanical class per sweep, 1 possible new component test)
**Analogs found:** 8 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `tailwind.config.js` (`theme.extend.fontSize`, D-01 additive aliases) | config | transform | itself (existing alias block, Phase 07) | exact (edit in place) |
| `components/ui/card.tsx` (base radius + `nested` variant, D-06/D-10/D-11) | component (primitive) | request-response (render) | itself (existing `Card`, Phase 07/08 shape) | exact (edit in place) |
| `scripts/codemods/text-sizes.mjs` (new, D-15) | utility (build-time codemod) | batch/transform (file rewrite) | `scripts/visual/baseline.mjs` for script scaffolding conventions; `__tests__/design-tokens/report.ts` for the "committed script, not hand-typed numbers" report convention | role-match |
| `scripts/codemods/hand-rolled-cards.mjs` (new, D-15) | utility (AST codemod) | batch/transform (file rewrite) | same as above; no existing AST-codemod script in repo (all `scripts/*.ts` are DB/data scripts, not source-rewriters) | role-match, partial (no AST precedent) |
| `scripts/codemods/mapping-table.json` or `__tests__/design-tokens/fixtures/mapping-table.json` (new, D-15) | config (data table) | transform (lookup) | `__tests__/design-tokens/fixtures/` directory shape (currently `accent-probe.txt`) | role-match |
| `__tests__/arbitrary-text-sizes.test.ts` (new, D-16, TYPE-03) | test (guard/ratchet) | batch (source scan) | `__tests__/type-scale-floor.test.ts` (its `describe('sub-11px arbitrary sizes (TYPE-01)')` block) | exact |
| `__tests__/hand-rolled-cards.test.ts` (new, D-16, PRIM-01) | test (guard/ratchet) | batch (source scan) | `__tests__/type-scale-floor.test.ts` (same block, order-independent regex variant) | exact |
| `scripts/visual/baseline.mjs` (extended, D-17: `PAGES` +2, per-page `afterGoto` hook) | utility (visual regression capture) | batch/event-driven (headless browser steps) | itself (existing `PAGES`/`VIEWPORTS`/`parseArgs`/`resolveOrigin` structure) | exact (edit in place) |
| `components/ui/__tests__/card.test.tsx` (new, optional — nested variant behavior) | test (component) | request-response (render assertion) | no existing `Card`-specific test found; nearest sibling convention is any `components/ui/*.test.tsx` if present, else Vitest + Testing Library conventions from `vitest.config.ts`/`vitest.setup.ts` | no analog |

**~100 call sites (type sweep) and ~55 call sites (card sweep) under `app/` and `components/`:** These are not individually classified — they are mechanically rewritten by the two codemods above. The "pattern" for each is simply: existing file, existing component/JSX, `className` string surgically edited by regex (type) or AST (cards). No new file role.

## Pattern Assignments

### `tailwind.config.js` (config, transform) — D-01 display aliases

**Analog:** itself, `tailwind.config.js:28-57` (the existing Phase 07 alias block)

**Exact block to extend (lines 28-57, read in full):**
```javascript
fontSize: {
  'xs': ['11px', { lineHeight: '1.5' }],
  'sm': ['12px', { lineHeight: '1.5' }],
  'base': ['13px', { lineHeight: '1.5' }],
  'md': ['14px', { lineHeight: '1.5' }],
  'lg': ['16px', { lineHeight: '1.5' }],
  'xl': ['18px', { lineHeight: '1.2' }],
  '2xl': ['20px', { lineHeight: '1.2' }],
  '3xl': ['24px', { lineHeight: '1.2' }],
  '4xl': ['32px', { lineHeight: '1.2' }],
  '5xl': ['42px', { lineHeight: '1.02' }],
  '15': ['15px', { lineHeight: '1.5' }],
  // Pixel-named aliases (TYPE-01, D-02): each one is a twin of the
  // semantic step above it, not a new size. They exist so the
  // Phase 09 codemod can map an arbitrary text-[Npx] literal onto a
  // scale step by name, mechanically, without inventing a value.
  '11': ['11px', { lineHeight: '1.5' }],
  '12': ['12px', { lineHeight: '1.5' }],
  '13': ['13px', { lineHeight: '1.5' }],
  '14': ['14px', { lineHeight: '1.5' }],
  '16': ['16px', { lineHeight: '1.5' }],
  '18': ['18px', { lineHeight: '1.2' }],
  '20': ['20px', { lineHeight: '1.2' }],
  '24': ['24px', { lineHeight: '1.2' }],
  '32': ['32px', { lineHeight: '1.2' }],
  '42': ['42px', { lineHeight: '1.02' }],
},
```

**Pattern to copy:** literal-tuple style `'<key>': ['<Npx>', { lineHeight: '<value>' }]`, with a comment block explaining *why* the alias exists (not just what it is), placed adjacent to the existing pixel-named alias group. D-01 appends eight new entries in this exact shape:
```javascript
  // Display aliases (D-01): landing hero/sections, pricing, about, app stat
  // tiles, UpgradeModal price — mapped 1:1 onto their exact current pixel
  // value so nothing in the sacred hero H1 shifts. Line-heights follow
  // D-04: 1.2 through 48px, 1.02 from 56px up.
  '28': ['28px', { lineHeight: '1.2' }],
  '40': ['40px', { lineHeight: '1.2' }],
  '44': ['44px', { lineHeight: '1.2' }],
  '48': ['48px', { lineHeight: '1.2' }],
  '56': ['56px', { lineHeight: '1.02' }],
  '64': ['64px', { lineHeight: '1.02' }],
  '72': ['72px', { lineHeight: '1.02' }],
  '80': ['80px', { lineHeight: '1.02' }],
```

**Guard coupling:** `__tests__/type-scale-floor.test.ts:41-52` (`ALIAS_PAIRS`) and its `toPx`/floor-scan tests read this same `theme.extend.fontSize` object live — no new guard needed there, but the planner should note the existing `resolves every entry in the extend block to at least 11 CSS px` test (lines 67-72) will automatically cover the eight new entries once added, since it iterates `Object.entries(fontSize)`.

---

### `components/ui/card.tsx` (component, request-response) — D-06/D-10/D-11

**Analog:** itself, full file read (127 lines)

**Current base class string (line 30):**
```typescript
"rounded-lg border border-border bg-card text-card-foreground",
```
→ becomes (D-06, radius only):
```typescript
"rounded-xl border border-border bg-card text-card-foreground",
```

**Current variant union and context (lines 16-38):**
```typescript
type CardVariant = "default" | "unified"

const CardContext = React.createContext<CardVariant>("default")

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <CardContext.Provider value={variant}>
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border bg-card text-card-foreground",
          variant === "unified" && "p-4 sm:p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CardContext.Provider>
  )
)
```

**Pattern to copy for `nested` (D-11):** extend the union to `"default" | "unified" | "nested"`, and follow the exact `variant === "unified" && "..."` conditional-class idiom already used inline via `cn(...)`, but for `nested` the base surface classes must be *replaced*, not appended — this is the one place the existing pattern needs a structural tweak, not a copy-paste:
```typescript
type CardVariant = "default" | "unified" | "nested"

// ...
className={cn(
  variant === "nested"
    ? "border-t border-border"
    : "rounded-xl border border-border bg-card text-card-foreground",
  variant === "unified" && "p-4 sm:p-6",
  className
)}
```
This mirrors the existing `cn(...)` composition style (base string first, then variant-conditional additions, then `className` passthrough last so callers always win) already used by `CardHeader`/`CardContent`/`CardFooter` (lines 43-124), which is the pattern every one of those sub-components already follows for variant-aware class branching — e.g. `CardContent` (lines 89-105):
```typescript
className={cn(
  variant === "default" && "p-4 sm:p-6 pt-0",
  className
)}
```
No sub-component needs a `nested`-specific branch per D-11 ("padding on `nested`... passes through via `className`... the variant does not impose its own padding") — only `Card`'s own base string changes.

---

### `scripts/codemods/text-sizes.mjs` (utility, batch/transform) — D-15

**No direct in-repo analog** (no prior source-rewriting codemod exists; closest sibling is the visual-capture script for CLI-arg conventions and the design-tokens report script for the "committed report, not hand-typed" convention).

**CLI-arg pattern to copy from `scripts/visual/baseline.mjs:47-56`:**
```javascript
function parseArgs(argv) {
  const labelIndex = argv.indexOf('--label')
  const label = labelIndex !== -1 ? argv[labelIndex + 1] : undefined
  if (!label) {
    throw new Error(
      'Missing required argument: --label <label>. Usage: node scripts/visual/baseline.mjs --label <label>'
    )
  }
  return { label }
}
```
Apply the same shape for `--dry-run` (boolean flag, `argv.includes('--dry-run')`) and the scoped path argument (positional or `--path <dir>`), with the same "throw a clear Error naming correct usage" convention.

**File-header doc-comment pattern to copy from `scripts/visual/baseline.mjs:1-20`:** a `#!/usr/bin/env node` shebang followed by a block comment stating purpose, usage line, and exactly what side effects the script has/does not have (baseline.mjs states it never logs credentials; the codemod's header should state it only rewrites `text-[Npx]` literals matched in the JSON table and is idempotent/re-runnable).

**Report-output pattern to copy from `__tests__/design-tokens/report.ts:44-55` and its file-header comment (lines 1-14):** a `printReport()`-style function building an array of lines and a single `console.log(lines.join('\n'))` at the end, invoked at module scope (not gated behind an export) — the codemod's `--dry-run` report should follow this "runnable, fixed-order, not hand-typed" convention, printing one line per file/pixel-value/alias triple.

**Guard coupling:** must produce output that satisfies D-16's requirement that the guard test (`arbitrary-text-sizes.test.ts`) can assert every JSON-table value resolves to a real `fontSize` key — reuse the same `tailwindConfig.theme.extend.fontSize` read pattern already in `__tests__/type-scale-floor.test.ts:18-26` (ESM/CJS interop fallback via `createRequire`) if the codemod itself needs to validate the table against the config at run time.

---

### `scripts/codemods/hand-rolled-cards.mjs` (utility, batch/transform) — D-15

**No direct in-repo analog** for the AST-walk mechanism itself (research already confirms this — no `ts.createSourceFile`/`ts.factory` usage exists anywhere in `scripts/`). Structural conventions to copy are the same CLI-arg and header-comment patterns as `text-sizes.mjs` above (`baseline.mjs` lines 47-56, 1-20).

**Detection regex to copy verbatim (order-independent D-08 contract, already re-verified live this session in RESEARCH.md Code Examples):**
```javascript
function isHandRolledCard(classString) {
  const hasElevated = /bg-background-elevated/.test(classString)
  const hasRounded = /rounded-\S*/.test(classString)
  const hasBorderToken = /border-border-strong/.test(classString) || /\bborder-border\b/.test(classString)
  return hasElevated && hasRounded && hasBorderToken
}
```

**Import to add/extend at each rewritten call site:** `import { Card } from "@/components/ui/card"` — copy the existing import-alias convention already used at every site that imports `Card` today (11 files named in CONTEXT.md D-06, e.g. pattern seen in any of `sheet-import`, `ExpansionGuard`, `SettingsModal`), which uses the project's single `@/` alias per `.claude/CLAUDE.md` Import Organization conventions — never a relative `../../components/ui/card` path.

---

### `__tests__/arbitrary-text-sizes.test.ts` (test, batch) — D-16, TYPE-03

**Analog:** `__tests__/type-scale-floor.test.ts:83-116` (the `describe('sub-11px arbitrary sizes (TYPE-01)')` block) — this is the exact scaffold to clone.

**Imports pattern (lines 1-5):**
```typescript
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import defaultImportedConfig from '../tailwind.config.js'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
```

**Core ratchet-scan pattern to clone (lines 93-98), swapping the pattern and expected length per D-16's ceiling:**
```typescript
it('finds no [pattern] anywhere under app/ or components/', () => {
  const files = sourceFiles(SCAN_ROOTS)
  const matches = matchesIn(files, SOME_PATTERN)
  const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
  expect(matches, report).toHaveLength(0) // or toHaveLength(CEILING) mid-ratchet
})
```

**Interpolation-bypass guard to clone verbatim (lines 90, 100-105), per D-16's explicit instruction to copy this rather than re-derive it:**
```typescript
const DYNAMIC_INTERPOLATION_PATTERN = /text-\[\$\{/
// ...
it('finds no dynamically-interpolated text-[...px] size anywhere under app/ or components/, confirming the literal scan is not bypassable', () => {
  const files = sourceFiles(SCAN_ROOTS)
  const matches = matchesIn(files, DYNAMIC_INTERPOLATION_PATTERN)
  const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
  expect(matches, report).toHaveLength(0)
})
```

**Primary scan target regex for this new guard** (not sub-11px specific — the full arbitrary-size scan): `/text-\[\d+px\]/` (already used narrowly in the same file at line 124 for `label.tsx`/`typography.tsx`; this new guard applies it repo-wide to `app`/`components` with a ratcheting ceiling constant, e.g. `const CEILING = 0` at the final batch).

**Ceiling-constant convention:** name it explicitly (e.g. `const ARBITRARY_TEXT_SIZE_CEILING = <N>`) at the top of the file so each batch commit's diff is a one-line ceiling decrement — this is implied by D-16 ("every batch commit lowers its ceiling in the same commit") and mirrors no exact existing constant in this repo, but follows the file's own `SCAN_ROOTS`-as-named-constant convention (line 91).

---

### `__tests__/hand-rolled-cards.test.ts` (test, batch) — D-16, PRIM-01

**Analog:** same as above, `__tests__/type-scale-floor.test.ts:83-116` shape, with the D-08 order-independent regex from the codemod section reused here as the scan pattern (share the same regex source between codemod and guard — do not let them drift; consider extracting the D-08 predicate into a small shared module both the codemod and this test import, though CONTEXT.md does not mandate this and it is a reasonable planner discretion call, not a locked decision).

**Core pattern:** identical `sourceFiles`/`matchesIn`/ratchet-`toHaveLength` shape as `arbitrary-text-sizes.test.ts` above. `card.tsx` itself must be excluded from the scan roots or explicitly filtered out (per the Anti-Patterns note in RESEARCH.md: "Only `components/ui/card.tsx` itself is excluded").

---

### `scripts/visual/baseline.mjs` (utility, batch/event-driven) — D-17 extension

**Analog:** itself, full file (298 lines), specifically the `PAGES` array (lines 29-32) and the per-page loop structure (lines 211-276, per RESEARCH.md's citation).

**Current `PAGES` shape to extend:**
```javascript
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
]
```
D-17 adds two entries with the same object shape plus a new optional field for the per-page interaction step (not currently present — additive, per RESEARCH.md's note that "`PAGES` entries do not currently support a 'click step' field... a small, additive per-page hook (e.g., an optional `afterGoto: async (page) => {...}` field)"):
```javascript
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
  {
    name: 'guild-settings',
    path: '/guild-settings',
    auth: true,
    afterGoto: async (page) => { /* expand expansion-manager panel */ },
  },
  {
    name: 'loot-management',
    path: '/loot-management',
    auth: true,
    afterGoto: async (page) => { /* click to open SettingsModal */ },
  },
]
```

**Existing arg-parsing and origin-safety patterns to leave untouched (lines 47-72):** `parseArgs`, `resolveOrigin` (refuses non-localhost origins) — no change needed, D-17 only touches `PAGES` and the per-page loop.

**Credential-boundary precedent (Phase 07 OI-6, cited in file header lines 15-20):** "It never logs or records a credential or an environment-variable value" — the new `afterGoto` hooks must not read or log the service-role key; they only interact with an already-authenticated page via UI clicks.

---

## Shared Patterns

### Guard-test scaffold (source-scan ratchet)
**Source:** `__tests__/type-scale-floor.test.ts` (whole file, especially lines 83-116) + `__tests__/design-tokens/source-files.ts` (whole file, `sourceFiles`/`matchesIn`)
**Apply to:** both new guard tests (`arbitrary-text-sizes.test.ts`, `hand-rolled-cards.test.ts`)
```typescript
import { sourceFiles, matchesIn } from './design-tokens/source-files'
const files = sourceFiles(['app', 'components'])
const matches = matchesIn(files, PATTERN)
const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
expect(matches, report).toHaveLength(CEILING_OR_ZERO)
```
Never write a new file-walker — `sourceFiles`/`matchesIn` signatures need zero changes (confirmed by RESEARCH.md's "Don't Hand-Roll" table).

### Committed-script-not-hand-typed-numbers convention
**Source:** `__tests__/design-tokens/report.ts` (whole file, especially the header comment lines 1-14)
**Apply to:** both codemods' `--dry-run` report output — the checkpoint and evidence doc must cite the codemod's own printed report, never a hand-run grep or a manually typed count.

### CLI script conventions (arg parsing, origin/safety guards, header doc-comments)
**Source:** `scripts/visual/baseline.mjs` lines 1-72
**Apply to:** both new `scripts/codemods/*.mjs` scripts — shebang + purpose/usage header comment, explicit `--flag` parsing with a thrown `Error` naming correct usage on missing required args, no side effects beyond the stated file-rewrite scope.

### `@/` import alias
**Source:** `.claude/CLAUDE.md` Import Organization section; live example any `Card`-importing file (e.g. `SettingsModal`, `ExpansionGuard`)
**Apply to:** every card codemod rewrite that adds `import { Card } from "@/components/ui/card"` — never a relative path.

### `cn(...)` variant-conditional class composition
**Source:** `components/ui/card.tsx` lines 29-33, 51-55, 97-100, 115-119 (every sub-component)
**Apply to:** the `nested` variant addition inside `Card` itself — base classes first (conditional on variant), then variant-specific additions, then `className` passthrough last.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/codemods/hand-rolled-cards.mjs`'s AST-walk core (parse→mutate→print with `ts.createSourceFile`/`ts.factory`/`ts.createPrinter`) | utility | transform | No existing script in `scripts/` uses the TypeScript compiler API for source rewriting — every existing `scripts/*.ts`/`.js`/`.mjs` file is a one-off DB/data script (seeding, migration, verification), not a JSX/AST rewriter. RESEARCH.md's Architecture Pattern 2 and Pitfall 3 are the only available reference (a documented external GitHub issue plus a from-scratch code sketch), not a codebase analog. The planner should treat RESEARCH.md's Pattern 2 code example as the working reference here, not a repo file. |
| `components/ui/__tests__/card.test.tsx` (optional nested-variant component test) | test | request-response | No existing test file covers `Card` or any `components/ui/*` component render output; RESEARCH.md's Wave 0 Gaps confirms zero existing component tests under `components/ui/__tests__/`. If the planner includes this test, it must follow `vitest.config.ts`'s jsdom + `@testing-library/react` setup generically (no card-specific precedent to copy), rendering `<Card variant="nested">` and asserting `border-t border-border` is present while `bg-card`/`rounded-*`/`border` (non-`-t`) are absent. |

## Metadata

**Analog search scope:** `components/ui/`, `__tests__/`, `__tests__/design-tokens/`, `scripts/`, `scripts/visual/`, `tailwind.config.js`
**Files scanned/read in full this session:** `components/ui/card.tsx`, `__tests__/type-scale-floor.test.ts`, `__tests__/design-tokens/source-files.ts`, `__tests__/design-tokens/report.ts`, `scripts/visual/baseline.mjs` (partial, lines 1-80), `tailwind.config.js` (partial, lines 1-60), plus a directory listing of `scripts/` (94 files, all confirmed to be one-off DB/data scripts with no AST-codemod precedent)
**Pattern extraction date:** 2026-09-18
