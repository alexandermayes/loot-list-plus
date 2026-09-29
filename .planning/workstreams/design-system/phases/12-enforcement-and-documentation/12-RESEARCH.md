# Phase 12: Enforcement and Documentation - Research

**Researched:** 2026-09-22
**Domain:** Impeccable DESIGN.md contract, design-hook mechanics, rendered UI-quality detector, .impeccable/config.json exception schema
**Confidence:** HIGH — every claim below is grounded in a file this session opened and quoted, not training memory about the `impeccable` skill in general. `[ASSUMED]` is used only where noted.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-12 — do not re-litigate)

- **D-01:** Scope Phase 12 to ENF-01/02/03. Record ENF-04 and ENF-05 as **blocked on deploy** (`origin/main` at `2e0587ee`, 2026-09-13, 264 commits behind local `main`; zero `prose-measure`/`font-tabular` in its `globals.css`).
- **D-02:** Record the blocked state in three places: `REQUIREMENTS.md` (ENF-04/05 → explicit **Blocked** status), `.planning/WINDOWS.md` (numbered entry naming the deploy as gate, sprint workstream as owner), `ROADMAP.md` (criteria 4/5 get an inline "not met — blocked on deploy" marker).
- **D-03:** Run the rendered detector against a **local** dev server over the seven pages as **interim evidence for ENF-05's substance only**, clearly labelled local everywhere it appears. Record counts for `undersized-ui-text`, `tiny-text`, `low-contrast`, `nested-cards`; attribute every remaining finding to tokens/primitives or to page-level layout (the latter carries to milestone B).
- **D-04:** Hand-author `DESIGN.md`; add a parsing guard that reads `globals.css` + `tailwind.config.js`, converts HSL to the frontmatter's colour format, and asserts every documented token equals its source. Guard must be observed red first (perturb one value). Two wrinkles: (a) `globals.css` stores bare HSL triplets, frontmatter wants hex/OKLCH — "match exactly" means equal-after-conversion, never string equality; (b) `--font-tabular` is consumed in `globals.css` but **defined** by `next/font` in `app/layout.tsx` — a guard parsing only `globals.css` cannot see it.
- **D-05:** Frontmatter carries **light-theme** values as the canonical set; body's Colors section shows light and dark side by side. Guard asserts frontmatter against `:root`, and separately asserts every body-table token against **both** `:root` and `.dark`.
- **D-06:** Frontmatter holds the spec's own shape (colours primary/accent/background/foreground/border family, typography display+body, rounded, spacing). Body's Colors/Typography sections carry the complete 46-token/29-step tables. Measured scope: `globals.css` declares 46 unique `--tokens` across 91 declarations (`:root` line 131, `.dark` line 213); `tailwind.config.js` extends 29 `fontSize` steps, 11 `borderRadius`, 3 `fontFamily` (no `tabular` entry).
- **D-07:** Re-derive `.impeccable/config.json`'s exception list **from scratch**, verifying each entry against what actually shipped. Current 5 entries name none of the 6 criterion-2 categories; `ai-color-palette` on `OnboardingModal.tsx` has an **expired justification** (Phase 10/COLOR-05 already migrated the gradients it was guarding — commit `5967189e`, now reads `from-accent/20 via-accent/10 to-accent/20`). Preserve the deleted entries' reasons in phase evidence (costly reversibility — `createdAt` provenance is discarded on rewrite).
- **D-08:** For the two live literals outside every current guard's scan scope: widen the guards, route the fixes elsewhere. `app/reserve/join/[token]/page.tsx:866` (`from-purple-500 to-pink-500`, outside COLOR-07's `app/(app)`+`app/components` scan scope) and `app/components/OnboardingModal.tsx:299` (`via-yellow-500/50`, yellow is in neither COLOR-04 nor COLOR-07). Record both as `.planning/WINDOWS.md` entries routed to a colour-migration owner; the widened guard fails until fixed (intended ratchet).
- **D-09:** Prove criterion 2 by **exercising the hook per exception and recording verbatim output**, plus one deliberate control that DOES flag (two-directional, `numeral-probe.mjs` pattern).
- **D-10:** DESIGN.md is the authority; `app/(app)/design-system/_client.tsx` stops restating numbers and renders live examples reading from the same tokens the app uses, pointing to DESIGN.md for values. Costly reversibility (2051-line page).
- **D-11:** The docs page's prose is in scope for this milestone; Standing Constraint 1 (no user-facing copy changes) does not cover it — internal authenticated documentation, not product copy.
- **D-12:** ENF-03's work is mostly additive. Deleted-primitive references remaining: `LabelText` 0, `.section-label` 0, `--background-inset` 0, `.sidebar-scrollable` 0, `data-score` 1 (line 1801). Required-by-criterion-3 topics documented today: focus ring 0, Card variants 0, surface/colour tokens 0, numeral face 0, prose measure 0.

### Claude's Discretion
- Deleted-primitive absence guard on `_client.tsx` (asserting `LabelText`, `.section-label`, `[data-score]`, `--background-inset`, `.sidebar-scrollable` appear nowhere) — take as a given, not a question.
- Which of the eight canonical DESIGN.md sections to omit.
- Internal structure of the docs page's live-example sections.
- Exact ordering/batching of plans within the phase.

### Deferred Ideas (OUT OF SCOPE)
- Migrating the two live colour literals (D-08 widens guards and routes fixes; migration itself is colour-migration work).
- ENF-04 and ENF-05 substance (blocked on deploy, not deferred by preference).
- Re-plumbing `opengraph-image.tsx` to self-hosted font bytes (accepted as R-11-04; optional here).
- Capturing the authenticated screenshot pair Phase 11 never produced (now unblocked, cheap, not in ENF-01/02/03 scope).
- The phase's MVP-mode goal-format mismatch with `mvp-uat-framing` (a planning-artifact fix, not a discussion item — flagged for whoever runs `/gsd-verify-work 12`).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENF-01 | `DESIGN.md` follows impeccable format, matches shipped tokens exactly, `context.mjs` reports it as design authority | See "The impeccable DESIGN.md contract" and "How context.mjs discovers DESIGN.md" below — exact frontmatter schema, eight sections, and the discovery mechanism criterion 1 hinges on |
| ENF-02 | `.impeccable/config.json` records every sanctioned exception as a scoped `ignore-value`, hook stops flagging them | See "The D-04 guard's conversion problem" is N/A here — see "The six sanctioned exceptions" and "Which detector rule id fires for each exception" — includes the non-obvious `design-system-color`/`design-system-font` mapping |
| ENF-03 | Docs page documents revised system, shows nothing deleted | UI-SPEC.md already fully specifies this (see UI-SPEC's ENF-03 Docs Page Contract); research adds only the mechanical DESIGN.md-pointer and rule-id facts the page's prose must state accurately |
| ENF-04 | CI gate on deployed pages (BLOCKED per D-01) | See "The rendered detector" for the invocation the eventual CI job will need, recorded now so the blocked-status write-up can name the exact command |
| ENF-05 | Zero findings, deployed pages (BLOCKED per D-01; D-03 substitutes a local run) | See "The rendered detector" — exact finding-type list, advisory-vs-blocking distinction, seven-page URL list (with a gap found against the existing baseline matrix) |
</phase_requirements>

## Summary

This phase's mechanics live in five files under `.claude/skills/impeccable/`: `reference/document.md` (the DESIGN.md format spec), `scripts/context.mjs` (how DESIGN.md is discovered as "the design authority"), `scripts/hook.mjs`/`hook-lib.mjs` (the actual enforcement mechanism wired into this repo), `scripts/detector/registry/antipatterns.mjs` (the rule catalogue, including which rules are advisory), and `scripts/detector/cli/main.mjs` (the rendered-detector CLI). Two facts materially change what the planner should write, both verified by opening source this session, not assumed from the skill's docs:

1. **This project's hook is NOT the "pre-edit" hook CONTEXT.md's D-09 language implies.** Claude Code's wiring in `.claude/settings.local.json` (lines 401-411, 434-443) runs `hook.mjs` on **PostToolUse** and **Stop** — a *post*-edit hook that reads the file from disk and emits an advisory `hookSpecificOutput.additionalContext` reminder. It never blocks a write on this harness (only Cursor's separate `hook-before-edit.mjs` blocks). D-09's exercise must therefore simulate a PostToolUse event via stdin JSON, not a proposed-content gate.
2. **Three of the four `design-system-*` rules carry `severity: 'advisory'` as a registry field, but that field is NOT what makes a finding advisory.** Both the CLI (`isAdvisory`) and the hook (`isAdvisoryFinding`) gate exclusively on `finding.advisory === true`, which `findings.mjs` stamps only when the registry entry has the literal `advisory: true` (only `em-dash-overuse` in the whole registry). `design-system-color`, `design-system-radius`, and `design-system-font-size` therefore **do count toward the CLI's exit code 2** and the hook's per-edit reminder, despite the cosmetic-looking `severity: 'advisory'` label. This is the load-bearing fact for ENF-02: item-quality and third-party-brand hex literals will be flagged by `design-system-color` once DESIGN.md exists, and must get real `ignore-value` entries, not be assumed harmless because of the `severity` field.

No new npm dependency is needed anywhere in this phase. The HSL→hex conversion D-04 needs is already implemented and exported by `__tests__/design-tokens/contrast.ts` (`parseTokens`, `loadThemeTokens`, `hslToRgb`) — only a small `rgbToHex` wrapper is missing. Puppeteer 24.43.1 is confirmed as an existing devDependency (verified in `package.json`, not just cited from CONTEXT.md). The rendered detector's seven-page URL list has a real gap against the existing `scripts/visual/baseline.mjs` PAGES matrix: that matrix has no `/about` or `/changelog` entries, so the D-03 local run needs its own page list, not a reuse of the existing script's matrix.

**Primary recommendation:** Build the DESIGN.md guard on top of `__tests__/design-tokens/contrast.ts`'s existing HSL parser (adding only `rgbToHex`), exercise the hook via simulated PostToolUse stdin JSON against `.claude/skills/impeccable/scripts/hook.mjs` (not the Cursor pre-edit script), and write every ENF-02 exception as `ignore-value <rule-id> <value> --file <glob> --reason "..."` through `hook-admin.mjs`, verifying each rule id against the registry facts in this document rather than guessing from the audit's prose.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DESIGN.md authoring + token-parity guard | Repo root / test tier | — | `DESIGN.md` is a root-level doc; the guard is a Vitest test, no runtime tier involved |
| `.impeccable/config.json` exception list | Config / tooling tier | — | Consumed only by the impeccable hook and CLI, never shipped to the app |
| Design-system docs page | Frontend (App Router, authenticated) | — | `app/(app)/design-system/_client.tsx` is a real React client component behind auth |
| Rendered detector (local run) | Tooling / CI-adjacent | Browser (Puppeteer-driven) | Runs against a local Next.js dev server via headless Chrome; not part of the shipped app |
| CI gate (ENF-04, blocked) | CI/CD | — | A future post-deploy GitHub Actions job, explicitly out of this phase's build scope per D-01 |

## Standard Stack

No new libraries are introduced by this phase. Everything needed is either already a devDependency or already implemented in-repo.

### Already available (verified this session)
| Tool | Version | Where verified | Role in this phase |
|------|---------|-----------------|---------------------|
| Puppeteer | 24.43.1 | `package.json` devDependencies (direct read, not `npm view`) [VERIFIED: package.json] | Powers the rendered detector's browser engine and `scripts/visual/numeral-probe.mjs`'s pattern |
| Vitest | ^4.1.0 | `package.json` devDependencies; `npm test` → `vitest run` [VERIFIED: package.json] | Home for the DESIGN.md parsing guard and the D-12 absence guard |
| `__tests__/design-tokens/contrast.ts` | in-repo, not a package | Read directly this session [VERIFIED: __tests__/design-tokens/contrast.ts:1-138] | Exports `parseTokens(css, selector)`, `loadThemeTokens()`, `hslToRgb(hsl)`, `hexToRgb(hex)` — the exact HSL parser and HSL→RGB converter the DESIGN.md guard needs; only a `rgb→hex` formatter (roughly `rgb.map(c => Math.round(c).toString(16).padStart(2,'0')).join('')`) is missing |

### Explicitly NOT needed
| Candidate | Why it was checked | Verdict |
|-----------|--------------------|---------|
| A color-conversion package (`culori`, `colord`, `color`, `tinycolor2`) | D-04 requires HSL→hex/OKLCH conversion; a naive plan might reach for a library | **Not present in `package.json` and not needed** — `contrast.ts` already has the parser and `hslToRgb`; only a ~3-line hex formatter is missing. Do not add a dependency for this. |
| `impeccable` as an installed CLI | `npx impeccable detect ...` is the documented invocation in `hooks.md` | `npx impeccable@4.1.0` requires a network fetch and is **not currently cached** (verified: `npx --no-install impeccable --version` fails with "canceled due to missing packages"). The bundled skill copy at `.claude/skills/impeccable/scripts/detect.mjs` is version **4.1.1** [VERIFIED: `.claude/skills/impeccable/SKILL.md:4`] and runs offline — prefer it for the D-03 local run so the result is reproducible without network access and matches the version already vetted for this repo. |

**Installation:** none required.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages. `.impeccable/` and `.claude/skills/impeccable/` are already present in the repo (installed in an earlier phase); no `npm install` occurs in Phase 12.

## Architecture Patterns

### The impeccable DESIGN.md contract

Read in full this session: `.claude/skills/impeccable/reference/document.md`.

**Frontmatter schema** (YAML, at the top of `DESIGN.md`):
```yaml
---
name: <project title>
description: <one-line tagline>
colors:
  primary: "#b8422e"          # key = descriptive slug, value = hex/oklch/rgb/hsl — "preserve an incumbent format"
typography:
  display: { fontFamily: "...", fontSize: "...", fontWeight: 300, lineHeight: 1, letterSpacing: "normal" }
  body: { ... }
rounded:
  sm: "4px"
spacing:
  sm: "8px"
components:               # optional; 8-prop limit: backgroundColor, textColor, typography, rounded, padding, size, height, width
  button-primary: { backgroundColor: "{colors.primary}", ... }
---
```
Rules that matter [CITED: .claude/skills/impeccable/reference/document.md:43-49]: token refs use `{path.to.token}`; **colors accept any valid CSS colour string — hex is the recommended default, but "preserve an incumbent rgb()/hsl()/oklch() value when it is the project's normative source. Never split the source of truth without explicit reason."** This directly informs D-04: since this project's normative CSS source (`globals.css`) is HSL, the frontmatter is free to use hex (as D-04 already decided) as long as the guard proves hex-after-conversion equals the HSL source — the spec does not mandate hex, but does mandate one format used consistently, matching D-04's plan exactly.

**Eight canonical sections, fixed order, headings must match exactly** [CITED: reference/document.md:51-62, 414]: `## Overview`, `## Colors`, `## Typography`, `## Layout`, `## Elevation & Depth`, `## Shapes`, `## Components`, `## Do's and Don'ts`. "Don't rename sections even slightly... Tooling parsing depends on exact headers." Omit a section only when irrelevant — never fill it with invented content. This is Claude's Discretion per CONTEXT.md; the spec permits omission but the *headings present* must stay in this exact order and exact spelling.

**Frontmatter is normative, prose is contextual** [CITED: reference/document.md:394, 415]: "Don't duplicate token values between frontmatter and prose. If a colour is in `colors.primary` as hex, the prose can name it and describe its role but should not reassert a different hex." This is the textual justification for D-05's split (frontmatter = light-only canonical; body prose tables = both themes, informational).

### How `context.mjs` discovers DESIGN.md (criterion 1's actual mechanism)

Read in full this session: `.claude/skills/impeccable/scripts/context.mjs` (1525 lines; relevant logic at lines 84-169, 1146-1198). There is no special "authority" flag or validation step — discovery IS the authority signal:

1. `resolveContext()` searches, in order: the active project root (repo root here, since there's no monorepo marker) for a file matching `DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md']` [VERIFIED: context.mjs:45,140-169] — **must be named `DESIGN.md` at the repo root**, case-sensitive-first-match order; then `.agents/context/` or `docs/` as fallback dirs; then `$IMPECCABLE_CONTEXT_DIR`.
2. `loadContext()` reads the file's raw text via `safeRead()` and returns `{ hasDesign: true, design: <full file text>, designPath: <relative path> }` [VERIFIED: context.mjs:88-127]. There is **no parsing, no frontmatter validation, no section-order check** in `context.mjs` itself — it is a presence-and-read check only.
3. The CLI entry point (`cli()`, lines ~1089-1198) prints `# DESIGN.md\n\n${ctx.design.trim()}` as a context block whenever `ctx.hasDesign` is true [VERIFIED: context.mjs:1146-1147, 1166-1168] — this is what "reports it as the design authority" cashes out to: the skill's own boot context injects the full file content labelled `# DESIGN.md` into the agent's context on every invocation, wherever `PRODUCT.md` is or isn't present.
4. When `DESIGN.md` is **absent** but incumbent visual code exists, `context.mjs` instead emits an `EXISTING_VISUAL_SYSTEM` / `INCUMBENT_WORLD_UNDOCUMENTED` directive naming code as authority and DESIGN.md's absence as "a documentation gap" [VERIFIED: context.mjs:1125-1127, 1180-1187].

**Practical implication for the phase's success criterion:** "impeccable `context.mjs` reports it as the design authority" is satisfied purely by the file existing at `<repo root>/DESIGN.md` and being readable — no separate validation command exists to "check" this. The verification step for ENF-01 should therefore be: run `node .claude/skills/impeccable/scripts/context.mjs` from the repo root (or via its exported `loadContext()`) and confirm the output contains a `# DESIGN.md` block with the full file content, not an `EXISTING_VISUAL_SYSTEM`/`INCUMBENT_WORLD_UNDOCUMENTED` directive.

### The D-04 guard's conversion problem — resolved

**What conversion is needed:** `globals.css` custom properties are bare HSL triplets, e.g. `--border: 35 12% 82%;` [VERIFIED: app/globals.css:171, quoted verbatim]. The frontmatter spec accepts hex, rgb, hsl, or oklch, but requires one consistent format [CITED: reference/document.md:46]. D-04 chose hex. The guard must therefore: (1) parse the `:root`/`.dark` blocks into `{h,s,l}` triplets, (2) convert each HSL triplet to an `[r,g,b]` triple, (3) format that triple as a 6-digit hex string, (4) string-compare against the hex literal written in `DESIGN.md`'s frontmatter.

**What already exists — reuse, do not reimplement:** `__tests__/design-tokens/contrast.ts`, opened and quoted this session:
- `parseTokens(css: string, selector: string): Record<string, Hsl>` [VERIFIED: __tests__/design-tokens/contrast.ts:30] — extracts a CSS block by brace-matching and parses every `--name: H S% L%` declaration inside it, tolerating a trailing `/ alpha`.
- `loadThemeTokens(): { light, dark }` [VERIFIED: contrast.ts:75-84] — reads `app/globals.css` relative to `process.cwd()` and returns `parseTokens(css, ':root')` / `parseTokens(css, '.dark')`.
- `hslToRgb(hsl: Hsl): [number, number, number]` [VERIFIED: contrast.ts:88-104] — standard HSL→sRGB conversion, returns 0-255 range floats (not yet rounded/hex-formatted).
- `hexToRgb(hex: string): [number, number, number]` [VERIFIED: contrast.ts:112-121] — the reverse direction, already exists for contrast comparisons against Tailwind palette literals.

**What's missing:** a `rgbToHex([r,g,b]): string` formatter (round each channel, `toString(16)`, `padStart(2,'0')`). This is a ~3-line pure function, not present anywhere in the repo today [VERIFIED: grep for `rgbToHex\|rgb2hex` across `__tests__/`, `lib/`, `domain/` returned zero hits this session]. Add it beside the existing functions in `contrast.ts` (or a new guard-specific module that imports `hslToRgb`/`loadThemeTokens` from it) rather than duplicating the HSL parser.

**The `--font-tabular` wrinkle, confirmed by direct read:**
- Defined in `app/layout.tsx:40-45`: `const figtree = Figtree({ variable: "--font-tabular", subsets: ["latin"], weight: ["400","500","600","700"], display: "swap" });` [VERIFIED: app/layout.tsx:40-45, quoted verbatim] — imported from `next/font/google` at line 2.
- Consumed in `app/globals.css:438`: `.tabular-nums { font-family: var(--font-tabular), ui-sans-serif, system-ui, sans-serif; }` [VERIFIED: app/globals.css:438, quoted verbatim].
- A guard that only regex-parses `globals.css`'s `:root`/`.dark` custom-property blocks (as `contrast.ts`'s `parseTokens` does) will never see `--font-tabular`'s *value* (Figtree), because it is never declared as a CSS custom property — it is a `next/font` variable name string injected by Next.js's font loader into the `<html>` class list at runtime, not a `--name: value;` declaration in the stylesheet.
- **Concretely, the guard must add a second, separate check against `app/layout.tsx`'s source text**: a regex such as `/Figtree\(\{[^}]*variable:\s*["']--font-tabular["']/s` (or simpler: assert the literal substring `Figtree` appears in `app/layout.tsx` and the literal substring `--font-tabular` appears in the same `Figtree({...})` call) to confirm DESIGN.md's typography section names "Figtree" as the numeral face. This is a plain source-text assertion, not a CSS-token comparison — do not try to force it through the same HSL/hex pipeline as the colour tokens.

### The D-09 hook exercise — exact mechanics

**Which hook file actually runs in this repo (verified against wiring, not the skill's generic docs):** `.claude/settings.local.json` wires `PostToolUse` (matcher `Edit|Write`, lines 401-411) and `Stop` (lines 434-443) to:
```
[ ! -f "${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/hook.mjs" ] || node "${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/hook.mjs"
```
[VERIFIED: .claude/settings.local.json:401-411, 434-443, quoted verbatim]. There is **no `PreToolUse` entry for impeccable** anywhere in this file — `hook-before-edit.mjs` (Cursor's blocking pre-write gate) is not wired for this harness at all [VERIFIED: full-file grep for "impeccable" in settings.local.json returned only the two PostToolUse/Stop lines]. CONTEXT.md's D-09 phrase "the pre-edit hook" is the upstream skill's generic Cursor-centric language; for this repo the mechanism is `hook.mjs`'s `runHook()` (PostToolUse, non-blocking, reads the file from disk after the edit lands) [VERIFIED: `.claude/skills/impeccable/scripts/hook.mjs:1-63`, `hook-lib.mjs:1844` `runHook()` signature]. The planner should write ENF-02's verification instructions against `runHook`, not the Cursor gate.

**Exact invocation to exercise it** — construct a Claude-Code-shaped PostToolUse event and pipe it to `hook.mjs` via stdin:
```bash
echo '{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"<ABS PATH TO THE EXCEPTION FILE>"},"cwd":"<ABS REPO ROOT>","session_id":"enf02-probe-<rule>-<n>"}' \
  | node .claude/skills/impeccable/scripts/hook.mjs
```
Fields required, per `resolveTargetFiles`/`resolveHarness`/`normalizeHookEvent` read this session [VERIFIED: hook-lib.mjs:1226-1248, 1250-1275]: `tool_input.file_path` (absolute path — this is what `resolveTargetFiles` reads first), `cwd`, `session_id`. **Omit `conversation_id` and `turn_id`** — their presence would misclassify the harness as Cursor or Codex (`resolveHarness` falls through to `'claude'` only when neither is present and no Grok/GitHub camelCase fields exist) [VERIFIED: hook-lib.mjs:1263-1274]. Use a **distinct `session_id` per probe run** — the dedup cache (`.impeccable/hook.cache.json`) is keyed per `session_id`+file, so reusing one across probes would fold a second real finding into the "already known" set and silently suppress it from the fresh-emission path [VERIFIED: hook-lib.mjs:931-943 `dedupeAgainstCache`].

**Reading the output:** `hook.mjs` writes one line of JSON to stdout, shaped `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"<text>"}}` for the `claude` harness [VERIFIED: hook-lib.mjs:2444-2446 `payload()`]. Three outcomes to distinguish, verified from `runHook`'s return branches [VERIFIED: hook-lib.mjs:2066-2211]:
- **Flags** (a finding exists and is fresh for this session): stdout carries the rendered finding text (via `renderGroupedTemplate`/`renderTemplate`), which names the rule id and an `ignore-value <rule> <value>` suggestion line. Exit code 0 either way (the hook itself never fails the tool call).
- **Clean** (scanned, no findings): stdout carries a short "clean ack" text (`renderCleanAck`), or, once the ack has already fired once per file per session, no stdout at all (`emitted:false, skipped:'non-ui-ack'` in the audit).
- **Skipped** (extension not covered, path outside project, `.impeccable`-disabled, etc.): no stdout; the caller must inspect the process's own audit log (see below) to distinguish "skipped for an unrelated reason" from "genuinely clean" — do not treat empty stdout alone as proof of "no finding."

**Getting verbatim proof beyond stdout:** `hook.mjs` also calls `writeAuditLog(process.env, result.audit, process.cwd())` [VERIFIED: hook.mjs:59]. Set `IMPECCABLE_HOOK_LOG=<path>` in the probe's environment (an already-documented env override per `hooks.md:11`) to get an NDJSON record of `{ts, harness, cwd, file, findings, freshFindings, emitted, skipped, ...}` per invocation — this is the mechanically reproducible "verbatim output" D-09 asks for, in addition to the stdout text.

**The control that DOES flag:** point the probe at a file/finding that is genuinely still live and NOT yet in `.impeccable/config.json` — the two D-08 literals are the natural choice (`app/reserve/join/[token]/page.tsx:866`'s `from-purple-500 to-pink-500` under the widened COLOR-07 scan scope, or `OnboardingModal.tsx:299`'s `via-yellow-500/50`), since those are deliberately left unguarded until Phase 12 widens the guard and D-08 explicitly wants them to keep failing. Running the same probe command against one of these files, with a fresh `session_id`, should return a "flags" result — proving the hook still discriminates at the moment the six sanctioned exceptions report clean. This mirrors `numeral-probe.mjs`'s two-directional control (forcing Poppins must fail, forcing system-ui must pass) [VERIFIED: scripts/visual/numeral-probe.mjs:26-30, 339-385].

**Role of `.impeccable/hook.cache.json` and whether the config rewrite requires invalidating it:** `readCache`/`persistCache` [VERIFIED: hook-lib.mjs:587-620] store, per `session_id`, a `files: { <path>: { editCount, findings: [...], cleanAcked } }` map used only for **dedup within that session** (`dedupeAgainstCache`/`rememberFindings`, lines 931-960) and the six-edits-then-suppress ceiling (`EDIT_COUNT_THRESHOLD = 6`, line 183). Nothing in the cache stores the *config's* exception list — `.impeccable/config.json`'s `ignoreValues` are read fresh via `readConfig(cwd)` on every invocation [VERIFIED: hook-lib.mjs:281 `readConfig`, called at line 1887 inside `runHook`]. **Rewriting `.impeccable/config.json` does not require invalidating `hook.cache.json`**, because config is not cached — cache only remembers *findings already reported this session*. Using a fresh `session_id` per D-09 probe run (recommended above regardless) makes this moot: a brand-new session has an empty cache entry by construction. If a completely clean slate is still wanted for the record, `node .claude/skills/impeccable/scripts/hook-admin.mjs reset` deletes the project config, dedup cache, and Cursor pending queue in one step [CITED: reference/hooks.md:35] — but this also deletes the config being tested, so run it (if at all) *before* writing the new exception list, never after.

### The rendered detector (ENF-04/05 substance)

**Location and invocation.** The CLI entry is `.claude/skills/impeccable/scripts/detector/cli/main.mjs`, exported as `detectCli` and re-exported by `.claude/skills/impeccable/scripts/detect.mjs` (the bundled skill's own executable) [VERIFIED: detect.mjs:1-18, main.mjs:432]. Confirmed this session that `npx impeccable` is **not resolvable offline** (`npx --no-install impeccable --version` → "canceled due to missing packages", attempting to fetch `impeccable@4.1.0`) while the bundled copy is version **4.1.1** [VERIFIED: SKILL.md:4]. For a reproducible D-03 local run, prefer:
```bash
node .claude/skills/impeccable/scripts/detect.mjs detect \
  http://localhost:3100/ \
  http://localhost:3100/pricing \
  http://localhost:3100/compare \
  http://localhost:3100/about \
  http://localhost:3100/research/wow-classic-loot-systems-2026 \
  http://localhost:3100/blog/dkp-is-dead-what-classic-guilds-use-in-2026 \
  http://localhost:3100/changelog \
  --json > <output-path>.json
```
(`detect` is optional as the first positional arg — `main.mjs` strips it if present — but keep it for readability.) Multiple `http(s)://` targets automatically get a single shared `createBrowserDetector()` Puppeteer instance rather than relaunching per URL [VERIFIED: main.mjs:296-299]. `--viewport WxH` is available for a second, mobile-width pass (default is `1280x800`) [CITED: main.mjs help text, lines 148-190].

**Seven pages — a real gap against the existing baseline matrix, found this session.** ROADMAP's seven target pages are home, pricing, compare, about, research, one blog post, changelog. The exact routes, confirmed by listing `app/`:
- `/` — `app/page.tsx` (home)
- `/pricing` — `app/pricing/page.tsx`
- `/compare` — `app/compare/page.tsx`
- `/about` — `app/about/page.tsx`
- `/research/wow-classic-loot-systems-2026` — `app/research/wow-classic-loot-systems-2026/`
- `/blog/dkp-is-dead-what-classic-guilds-use-in-2026` — one of ten posts under `app/blog/`; this exact slug is the one `scripts/visual/baseline.mjs`'s `PAGES` matrix already uses [VERIFIED: scripts/visual/baseline.mjs:123]
- `/changelog` — `app/changelog/page.tsx`

**`scripts/visual/baseline.mjs`'s own `PAGES` array (lines 115-127, read in full this session) does NOT include `/about` or `/changelog`** — its 11 entries are `home, overview, guild-settings, loot-management, master-sheet, raid-tracking, profile, blog-post, research, compare, pricing` [VERIFIED: scripts/visual/baseline.mjs:116-126, quoted verbatim]. A planner who assumes the seven-page list can be lifted from the existing baseline matrix will be missing two of the seven pages. The D-03 local detector run needs its own page list (the seven URLs above), not a filter over `PAGES`.

**The four gating finding types — exact registry definitions, confirmed non-advisory:**

| Rule id | Registry fields (verified) | Fires on |
|---|---|---|
| `undersized-ui-text` | `category:'quality'`, `scopes:['type']`, **no `advisory` field** [VERIFIED: registry/antipatterns.mjs:412-419] | Interactive/content-bearing UI text below 11px (links, buttons, nav, labels, table cells, timecodes); exempts sup/sub, sr-only, code/terminal; the 11px floor holds even in footers (10px only for non-interactive legal smallprint) |
| `tiny-text` | `category:'quality'`, `scopes:['type']`, **no `advisory` field** [VERIFIED: registry/antipatterns.mjs:404-411] | Body text below 12px |
| `low-contrast` | `category:'quality'`, **no `advisory` field** [VERIFIED: registry/antipatterns.mjs:327-333] | Text failing WCAG AA (4.5:1 body / 3:1 large) |
| `nested-cards` | `category:'slop'`, `scopes:['layout']`, **no `advisory` field** [VERIFIED: registry/antipatterns.mjs:69-77] | Cards inside cards |

None of the four carries `advisory: true`, so `isAdvisory()`/`partitionAdvisory()` in `main.mjs` places every instance of these four in the `primary` (failure-counted) bucket [VERIFIED: main.mjs:41-52]. **CLI exit code is `2` when `primary.length > 0`, else `0`** [VERIFIED: main.mjs:426 `process.exit(primary.length > 0 ? 2 : 0)`] — this is the exact exit-code contract a future ENF-04 CI job would gate on.

**The only advisory rule in the entire registry is `em-dash-overuse`** [VERIFIED: full-file grep of `advisory: true` in `registry/antipatterns.mjs` returned exactly one hit, line 218]. Do not assume any other rule — including `design-system-color`/`design-system-radius`/`design-system-font-size`, which carry a *different*, cosmetic `severity: 'advisory'` field — is excluded from the exit-code math; see the Summary's second load-bearing fact above.

### Which detector rule id fires for each of the six sanctioned exceptions

Cross-referenced against the full 50-id rule list read this session (`grep -n "id: '" registry/antipatterns.mjs`, 50 matches) and against `design-system.mjs`'s implementation of the `design-system-*` family [VERIFIED: detector/design-system.mjs:798-969]:

| ENF-02 exception category | Likely rule id | Mechanism / value the guard extracts | Non-advisory? |
|---|---|---|---|
| Raid-tracking legend rails | `side-tab` | Thick coloured left border on a card-like element [CITED: registry/antipatterns.mjs:4-11] | Yes — no `advisory` field. **Already** in `.impeccable/config.json` as `{"rule":"side-tab","value":"*","files":["app/(app)/raid-tracking/_client.tsx"]}` [VERIFIED: .impeccable/config.json, read directly this session]. D-07's re-derivation must re-justify this existing entry, not discover it fresh. |
| WoW item-quality colours (`#a335ee`, `#1eff00`) and third-party brand colours (`#0074e0`, `#5865f2`, `#e35e15`) | `design-system-color` | Extracts the literal colour value into `ignoreValue`; keyed for dedup as `design-system-color:<hex-or-rgb>` [VERIFIED: design-system.mjs:1052 area] | **Yes — counts as a failure**, despite its `severity:'advisory'` field (see Summary). Fires only once `DESIGN.md`/`designSystem.enabled` is active, i.e. only after ENF-01 lands — sequence ENF-01 before ENF-02's verification. Source of the five hex values: `lib/design-system/quality-colors.ts` [VERIFIED: lib/design-system/quality-colors.ts:1-30, module header quoted] and matching `tailwind.config.js` keys `quality-epic`, `quality-uncommon`, `brand-battlenet`, `brand-discord`, `brand-wcl` (lines ~172-179 of tailwind.config.js, quoted verbatim in this session's read). |
| `animate-pulse` only on skeletons | **No confirmed match** — `pulsing-dot` [CITED: registry/antipatterns.mjs:97-104] describes "small pulsing status dots" (a decorative liveness indicator), not a full-block Tailwind `animate-pulse` skeleton placeholder (`components/ui/skeletons.tsx:15`, `'animate-pulse rounded-md bg-muted'` [VERIFIED: components/ui/skeletons.tsx:15]) | **[ASSUMED]** that no currently-firing rule targets this pattern at all. The planner must run the detector against a skeleton-bearing page (or the static/regex engine against `skeletons.tsx`) and confirm whether *any* finding currently names this file before writing an `ignore-value` for it — D-07's own principle ("any entry that cannot be justified against current code does not go back in") applies here: an ignore-value with no matching finding is harmless but is not evidence of anything, and D-09's "exercise the hook and confirm it no longer flags" step has nothing to exercise if no rule ever flagged it. |
| Monospace on type-to-confirm targets and invite codes | `design-system-font` | Extracts the **computed font-family display name**, not the Tailwind class name [VERIFIED: design-system.mjs:964-969, `ignoreValue: font`] — `font-mono` resolves to Tailwind's default mono stack (no `mono` override exists in `tailwind.config.js`'s `fontFamily` block, confirmed by direct read: only `sans`, `poppins`, `wow` are declared) | **Yes — counts as a failure** (no `advisory` field on `design-system-font` [VERIFIED: registry/antipatterns.mjs:465-472]). Confirmed call sites: `app/(app)/guild-settings/components/InviteCodeManager.tsx:224,252` (invite codes) and `app/(app)/profile/components/ProfileContent.tsx:1041,1048` / `GuildSettingsContent.tsx:891,898,930,937` (type-to-confirm) [VERIFIED: grep for `font-mono` across `app/` this session, 20 call sites total — the two named categories plus several others (`sheet-import`, `ImportModal`, `LootItemSelectionModal`, `LootListContent.tsx:2158`'s bracket-level numerals, code blocks in `help/[slug]`, `addon/AddonImportDialog`/`AddonExportDialog`, `dev-login`, `BisImportModal`, `WowSimsImportModal`) — the audit's "type-to-confirm and invite codes" framing does not cover every `font-mono` site in the codebase; the planner should decide whether the exception is scoped narrowly (two file categories) or needs a broader review of the other ~14 sites. |
| ScoreComparisonModal big numbers | Not in criterion 2's 5-name list | The audit's raw "Legitimate exceptions" line lists 7 items [VERIFIED: UI-AUDIT-2026-09-15.md, quoted below]; criterion 2's ROADMAP wording names only 5 categories, omitting this one and "numbered how-it-works steps." | [ASSUMED] this exception is either already resolved (Phase 10 migrated ScoreComparisonModal tile hues per the audit's own Decisions section, though the *numbers themselves* were never named as migrated) or intentionally dropped from scope between the audit and the ROADMAP's criterion wording. Flag for discuss-phase / planner confirmation rather than silently re-adding a 6th/7th exception not named in ENF-02's own text. |
| Numbered how-it-works steps | Possibly `numbered-section-labels` [CITED: registry/antipatterns.mjs:201-210, `severity:'advisory'` field present, but same caveat as `design-system-color`: does NOT carry the literal `advisory:true`, so re-check before assuming it's excluded] | Same "not in criterion 2's 5-name list" caveat as above | [ASSUMED] — same recommendation: confirm with discuss-phase/planner whether this is in scope; do not silently drop or silently add. |

**Verbatim audit source for the discrepancy above** [VERIFIED: .planning/workstreams/design-system/UI-AUDIT-2026-09-15.md, "Legitimate exceptions" line, quoted in full]:
> "Raid-tracking legend rails (mirror real 20px cell states); WoW item-quality colours (#a335ee Epic, #1eff00 Uncommon) and DB class colours; Battle.net #0074E0, Discord #5865F2, Warcraft Logs #e35e15 (tokenize them); animate-pulse only on skeletons; monospace on type-to-confirm targets and invite codes; ScoreComparisonModal big numbers; numbered how-it-works steps."

Versus criterion 2's ROADMAP wording (per REQUIREMENTS.md/ROADMAP, as CONTEXT.md and this phase's success criteria quote it): "raid-tracking legend rails, item-quality colours, third-party brand colours, animate-pulse on skeletons, monospace on type-to-confirm targets and invite codes" — **five** named categories, dropping "DB class colours," "ScoreComparisonModal big numbers," and "numbered how-it-works steps" from the audit's original seven-item list. This is a genuine drift between the audit source and the phase's own success-criteria text, not a research artifact — surfaced here so D-07's "from scratch" re-derivation checks against the audit (7 items) but the phase's own acceptance criterion only requires 5. Recommend the planner treat the 5 named in criterion 2 as the acceptance bar and record the other 2 (ScoreComparisonModal numbers, numbered steps) as an open question rather than silently including or excluding them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HSL→RGB conversion for the DESIGN.md guard | A new colour-math module or an npm dependency | `hslToRgb()` from `__tests__/design-tokens/contrast.ts` (already exported, already tested against this exact `globals.css`) | Avoids a second WCAG/colour-math implementation existing alongside the one `contrast.ts`'s own file header explicitly says must be the only one for this milestone |
| Proposed-write blocking to test the hook | Wiring `hook-before-edit.mjs` (Cursor's pre-write gate) into this Claude Code project | Simulated PostToolUse stdin JSON piped to `hook.mjs` | This repo's actual enforcement mechanism is post-edit and advisory-only; testing against the wrong hook script would prove nothing about what actually runs here |
| Manually typing DESIGN.md token values | Hand-copying hex/px values into `DESIGN.md`'s frontmatter and hoping they stay in sync | The guard test itself, run once at write time to confirm the hand-authored values are already correct, then re-run on every future PR | D-04 mandates a guard specifically because hand-typed values silently drift (this is the exact G-11-1-shaped failure the phase exists to prevent) |

**Key insight:** every mechanical piece this phase needs (HSL parsing, a hex formatter, a hook-invocation harness, a rendered-detector CLI) already exists in this repo or its bundled skill — the phase's actual work is wiring existing instruments together and writing the resulting facts down, not building new tooling.

## Common Pitfalls

### Pitfall 1: Treating `severity: 'advisory'` as equivalent to the `advisory` boolean flag
**What goes wrong:** A planner reads `design-system-color`'s registry entry, sees `severity: 'advisory'`, and assumes item-quality/brand-colour hex literals will never block CI or the hook — so no `ignore-value` entries get written for them, and a future ENF-04 CI run (once unblocked) fails on findings nobody expected.
**Why it happens:** The field name `severity` reads as a semantic synonym for "this is advisory," but the codebase's actual advisory-partition logic (`isAdvisory`/`isAdvisoryFinding`) checks a **different**, boolean `advisory` field that `findings.mjs` stamps from a **different** registry field (`advisory: true`), which only `em-dash-overuse` carries.
**How to avoid:** Verify advisory status by grepping `registry/antipatterns.mjs` for the literal string `advisory: true` next to the specific `id`, not by reading the `severity` field.
**Warning signs:** A finding shows up in the CLI's primary (non-dimmed) section and the exit code is 2, despite the registry listing `severity: 'advisory'` for that rule.

### Pitfall 2: Assuming `npx impeccable detect` works offline
**What goes wrong:** A CI-gate or local-run script hard-codes `npx impeccable detect ...`; the command silently tries to fetch `impeccable@4.1.0` from the npm registry, which fails in a sandboxed/offline environment or fetches a version that doesn't match the bundled skill (4.1.1) already vetted for this repo.
**Why it happens:** `hooks.md` documents `npx impeccable ...` as the canonical invocation for the *published* CLI, which is a separate distribution channel from the bundled `.claude/skills/impeccable/scripts/` copy this session confirmed is what's actually installed.
**How to avoid:** Use `node .claude/skills/impeccable/scripts/detect.mjs detect ...` for anything that must run reproducibly and offline (the D-03 local run in particular).
**Warning signs:** `npx --no-install impeccable --version` failing with "canceled due to missing packages" (reproduced this session).

### Pitfall 3: Reusing `scripts/visual/baseline.mjs`'s `PAGES` matrix for the seven-page detector run
**What goes wrong:** The D-03 local run's page list is built by filtering `PAGES` for `auth: false` entries, silently omitting `/about` and `/changelog` because they were never added to that matrix.
**Why it happens:** `baseline.mjs`'s matrix was built for screenshot capture (11 pages, extended by Phases 07/10/11), not for the seven-page ENF-04/05 detector scope, and the two lists were never reconciled.
**How to avoid:** Use the seven explicit URLs listed above; treat `baseline.mjs`'s `PAGES` as unrelated to this phase's scope.
**Warning signs:** A local detector run reporting six pages' worth of findings when seven were expected, or a page-count mismatch against the milestone-start baseline.

### Pitfall 4: Reusing the same `session_id` across multiple D-09 probe invocations
**What goes wrong:** A second probe against a file already scanned once in the same simulated session returns a "pending" ack (known-findings list) instead of the full rendered finding text, or returns nothing if the file was already clean-acked — making it look like the hook stopped flagging when it actually just deduped.
**Why it happens:** `dedupeAgainstCache`/`rememberFindings` key their memory by `session_id` + file path; the per-session cache persists across separate `node hook.mjs` process invocations because it's read from `.impeccable/hook.cache.json` on disk, not held in memory.
**How to avoid:** Generate a fresh, unique `session_id` for every probe invocation (e.g. `enf02-probe-<rule>-<iso-timestamp>`).
**Warning signs:** A probe run against a file that should still flag (the D-08 control literals) returning "pending" with a shortened `known` list instead of the full finding text.

## Code Examples

### DESIGN.md frontmatter → source-of-truth parity assertion (sketch, not a finished test)
```typescript
// Source: pattern derived from __tests__/design-tokens/contrast.ts (parseTokens, loadThemeTokens, hslToRgb — all VERIFIED read this session)
import { loadThemeTokens, hslToRgb } from '../design-tokens/contrast'

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
}

// frontmatter.colors.primary etc. parsed from DESIGN.md's YAML block (a YAML
// parser is required here — this repo has no yaml dependency listed in
// package.json either; confirm before adding one, or hand-parse the small,
// fixed key set DESIGN.md's frontmatter actually uses).
const { light } = loadThemeTokens()
const expectedPrimaryHex = rgbToHex(hslToRgb(light['--accent']))
// assert expectedPrimaryHex === frontmatter.colors['accent'] (or whichever slug name DESIGN.md chose)
```

### Simulated PostToolUse event for D-09's hook exercise
```bash
# Source: derived from hook-lib.mjs's resolveTargetFiles/resolveHarness/normalizeHookEvent (VERIFIED read this session)
echo '{
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": { "file_path": "'"$(pwd)"'/app/(app)/raid-tracking/_client.tsx" },
  "cwd": "'"$(pwd)"'",
  "session_id": "enf02-probe-side-tab-1"
}' | node .claude/skills/impeccable/scripts/hook.mjs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Impeccable's full detector rule set ran per-edit on every Write/Edit | Only `IMMEDIATE_TIER_RULES` (14 rule ids, including all four `design-system-*` rules) run per-edit; the rest wait for the `Stop` deep pass | Documented in-file as a measured eval-harness decision [CITED: hook-lib.mjs:100-112] | The four `design-system-*` rules ARE in the immediate tier, so D-09's per-file probe (a single simulated PostToolUse event) is sufficient to observe them firing — no need to simulate a Stop event for these specific rules |

**Deprecated/outdated:** none specific to this phase; the skill version in this repo (4.1.1) is newer than what `npx impeccable` currently resolves to (4.1.0), so any instruction written against the published npm package's docs should be cross-checked against the bundled copy's actual behaviour.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No detector rule currently fires on `animate-pulse` skeleton usage (`pulsing-dot` targets a different pattern) | "Which detector rule id fires for each exception" | If a rule does fire and the planner skips writing an ignore-value for it, ENF-02's "hook no longer flags any of them" criterion silently fails for this one category at execution time |
| A2 | "ScoreComparisonModal big numbers" and "numbered how-it-works steps" are correctly out of ENF-02's 5-name scope (dropped between the audit and the ROADMAP wording, not an oversight) | "Which detector rule id fires for each exception" | If they were meant to be included, D-07's "from scratch" re-derivation under-delivers against the original audit; if correctly excluded, over-delivering wastes an ignore-value entry on nothing |
| A3 | The "monospace on type-to-confirm targets and invite codes" exception is scoped to exactly the ~6 call sites named (InviteCodeManager, ProfileContent, GuildSettingsContent confirm inputs), not all ~20 `font-mono` sites found in this session's grep | "Which detector rule id fires for each exception" | An ignore-value scoped too narrowly leaves other `font-mono` sites (ImportModal, LootListContent bracket numerals, code blocks, import/export dialogs) still flagging after Phase 12 closes, contradicting criterion 2 |
| A4 | A YAML parser is needed (or a hand-rolled fixed-key parser suffices) for the DESIGN.md guard to read the frontmatter back programmatically | "Code Examples" | If a YAML dependency is silently added without the package-legitimacy check this workstream otherwise applies rigorously, it breaks the "no new npm dependency" finding this document states as a headline fact |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Does any detector rule currently fire on skeleton `animate-pulse` usage?**
   - What we know: `components/ui/skeletons.tsx:15` uses `animate-pulse rounded-md bg-muted`; the closest-named registry rule (`pulsing-dot`) describes a small decorative status dot, not a full skeleton block.
   - What's unclear: whether some other rule (motion-category, or a browser-engine-only check not enumerated in the static registry) fires on this pattern when rendered.
   - Recommendation: run the local rendered detector (once available) against a page that renders a loading skeleton, or run the static/regex engine directly against `skeletons.tsx`, before writing an `ignore-value` for this category — confirm there is something to suppress.

2. **Is the audit's 7-item exception list or the ROADMAP's 5-name criterion-2 list authoritative for D-07's scope?**
   - What we know: the audit (`UI-AUDIT-2026-09-15.md`) names 7 legitimate exceptions verbatim; ENF-02's criterion text names only 5 categories, omitting "DB class colours" (folded into the item-quality entry, probably fine) and dropping "ScoreComparisonModal big numbers" / "numbered how-it-works steps" entirely.
   - What's unclear: whether the two dropped items were intentionally descoped (e.g. resolved by a later phase's migration) or simply not carried forward when the ROADMAP's criterion was written.
   - Recommendation: surface this explicitly at plan-review or discuss-phase rather than silently choosing 5 or 7; either answer is defensible but should be a recorded decision, not an inference.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Puppeteer | Rendered detector, `numeral-probe.mjs` pattern for D-09 | ✓ | 24.43.1 (devDependency, verified in `package.json`) | — |
| Node.js dev server on :3100 | D-03 local detector run, D-09 hook exercise against live routes (not strictly required — the hook reads files from disk, not rendered pages) | ✓ (via `npm run dev` → `next dev --port 3100`, confirmed in `package.json` scripts) | — | — |
| `npx impeccable` (published CLI, network-dependent) | Alternative to the bundled `detect.mjs` | ✗ (fetch fails offline, confirmed this session) | — | Use bundled `.claude/skills/impeccable/scripts/detect.mjs` (v4.1.1) instead |
| A YAML parser (for a fully automated frontmatter round-trip in the guard) | Optional — only if the guard reads DESIGN.md's frontmatter programmatically rather than via a hand-written fixed-key extraction | ✗ (no `yaml`/`js-yaml` in `package.json`) | — | Hand-parse the small, fixed key set (colors, typography.display/body, rounded, spacing) with regex/string splitting — DESIGN.md's frontmatter shape is fully known and fixed per D-06, so a full YAML parser is not required |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** `npx impeccable` (use the bundled script); a YAML parser (hand-parse the fixed key set).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` (jsdom environment, globals enabled, path aliases) |
| Quick run command | `npx vitest run <path-to-new-test-file>` |
| Full suite command | `npm test` (→ `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| ENF-01 | DESIGN.md frontmatter tokens equal `globals.css`/`tailwind.config.js`/`layout.tsx` source, after HSL→hex conversion | unit (Vitest, reusing `contrast.ts` parsers) | `npx vitest run __tests__/design-tokens/design-md-parity.test.ts -x` | ❌ Wave 0 — new file |
| ENF-01 | `context.mjs` reports DESIGN.md as design authority | manual/scripted check | `node .claude/skills/impeccable/scripts/context.mjs` (inspect stdout for `# DESIGN.md` block, absence of `INCUMBENT_WORLD_UNDOCUMENTED`) | ❌ Wave 0 — no existing invocation of this script in the repo's own test suite |
| ENF-02 | Each sanctioned exception no longer flags via the hook | scripted probe (simulated PostToolUse, per exception + one control) | `echo '{...}' | node .claude/skills/impeccable/scripts/hook.mjs` (see Code Examples) — not a Vitest test, a recorded manual/scripted evidence run per D-09 | ❌ Wave 0 — no harness script exists for this yet; consider a small `scripts/design-system/exercise-hook.mjs` wrapper |
| ENF-03 | Docs page shows no deleted primitive | unit (absence guard, same shape as `__tests__/data-score-absence.test.ts`) | `npx vitest run __tests__/design-system-page-absence.test.ts -x` | ❌ Wave 0 — new file (Claude's Discretion item already names this pattern) |
| ENF-04 / ENF-05 | Blocked-status is correctly recorded in all three named locations | manual verification (grep for the Blocked marker in each of `REQUIREMENTS.md`, `.planning/WINDOWS.md`, `ROADMAP.md`) | `grep -n "Blocked" .planning/workstreams/design-system/REQUIREMENTS.md .planning/WINDOWS.md .planning/workstreams/design-system/ROADMAP.md` | N/A — a doc-content check, not a code test |

### Sampling Rate
- **Per task commit:** `npx vitest run <changed-test-file>`
- **Per wave merge:** `npm test` (full suite) plus `npm run lint` / `npm run typecheck`
- **Phase gate:** Full suite green, plus the D-09 hook-probe transcript and D-03 local detector JSON both present as phase evidence, before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/design-tokens/design-md-parity.test.ts` — covers ENF-01 (frontmatter-to-source parity, observed red first per D-04)
- [ ] `__tests__/design-system-page-absence.test.ts` — covers ENF-03's deleted-primitive absence guard (Claude's Discretion item)
- [ ] A small `scripts/design-system/exercise-hook.mjs` (or equivalent inline bash) — not strictly a Vitest file, but needed to make D-09's per-exception probe mechanically repeatable rather than hand-typed each time
- [ ] Framework install: none — Vitest and Puppeteer are both already present

## Security Domain

`security_enforcement: true` in `.planning/config.json` [VERIFIED: .planning/config.json:47], so this section is required even though the phase is primarily documentation/config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase touches no auth code |
| V3 Session Management | No | — |
| V4 Access Control | No | `app/(app)/design-system/_client.tsx` is already behind the existing `(app)` route group's auth gate; this phase does not change that gate |
| V5 Input Validation | No | No new user input surfaces are introduced |
| V6 Cryptography | No | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A probe/hook script constructing a shell command from a file path could be vulnerable to argument injection if the path is ever attacker-controlled | Tampering | Not applicable here — every D-09 probe path is a fixed, developer-chosen literal (the six sanctioned-exception files), never derived from untrusted input; still, prefer the JSON-via-stdin invocation shown above over building a shell command string with interpolated paths |
| A local rendered-detector run pointed at a non-localhost URL by mistake | Information Disclosure (of a real deployed environment's actual content being probed unexpectedly) | `scripts/visual/numeral-probe.mjs` and `baseline.mjs` both already enforce a `localhost`/`127.0.0.1`-only origin guard [VERIFIED: numeral-probe.mjs:133-146]; the D-03 detector invocation shown above only ever targets `http://localhost:3100/...` — no origin guard exists in `detect.mjs`/`main.mjs` itself, so this is a process discipline point, not a code control, worth calling out in the plan's task instructions |

## Sources

### Primary (HIGH confidence — files opened and quoted this session)
- `.claude/skills/impeccable/reference/document.md` — DESIGN.md frontmatter schema, eight canonical sections, style rules
- `.claude/skills/impeccable/scripts/context.mjs` — DESIGN.md discovery mechanism (lines 84-169, 1089-1198)
- `.claude/skills/impeccable/scripts/hook.mjs`, `hook-lib.mjs` — PostToolUse/Stop hook mechanics, `runHook`, dedup cache, advisory partition
- `.claude/skills/impeccable/scripts/hook-before-edit.mjs` — confirmed this is the Cursor-only pre-write gate, NOT wired for this project
- `.claude/skills/impeccable/scripts/lib/impeccable-config.mjs` — `.impeccable/config.json` schema, `ignoreValues` normalization
- `.claude/skills/impeccable/scripts/detector/registry/antipatterns.mjs` — full 50-rule catalogue, advisory-flag ground truth
- `.claude/skills/impeccable/scripts/detector/findings.mjs` — the exact `advisory: true` stamping logic
- `.claude/skills/impeccable/scripts/detector/cli/main.mjs` — CLI invocation, exit-code contract, advisory partition
- `.claude/skills/impeccable/scripts/detector/design-system.mjs` — `design-system-*` rule implementations, `ignoreValue` extraction
- `.claude/skills/impeccable/scripts/detect.mjs` — bundled CLI entry point
- `.claude/settings.local.json` (lines 355-444) — actual hook wiring for this repo
- `.impeccable/config.json` — current 5 exception entries, read verbatim
- `app/globals.css` (lines 131-440-ish), `tailwind.config.js`, `app/layout.tsx` (lines 1-50) — token sources
- `__tests__/design-tokens/contrast.ts` — existing HSL parser/converter, reusable for the DESIGN.md guard
- `scripts/visual/numeral-probe.mjs`, `scripts/visual/baseline.mjs` — two-directional control pattern, PAGES matrix gap
- `package.json` — devDependency and script verification
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` — verbatim audit exception list

### Secondary (MEDIUM confidence)
- None used beyond the primary sources above; no WebSearch was needed for this phase's mechanics.

### Tertiary (LOW confidence / assumed)
- A1-A4 in the Assumptions Log above

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; every claim verified against `package.json` or in-repo source directly
- Architecture (DESIGN.md contract, hook mechanics, detector CLI): HIGH — every mechanism claim traces to a specific file and line opened this session
- Rule-id-to-exception mapping: MEDIUM — the four confirmed rule ids (`side-tab`, `design-system-color`, `design-system-font`) are HIGH confidence; the `animate-pulse`/skeleton and the two audit-vs-criterion discrepancy items are explicitly flagged LOW/assumed and routed to Open Questions

**Research date:** 2026-09-22
**Valid until:** Re-verify if `.claude/skills/impeccable` is updated (the skill's own update-check mechanism will surface this), or if `app/globals.css`/`tailwind.config.js` token counts change before this phase executes — 14 days is a reasonable estimate given active concurrent phases in this workstream.
