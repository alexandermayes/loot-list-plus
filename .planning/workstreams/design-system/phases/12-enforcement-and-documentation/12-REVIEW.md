---
phase: 12-enforcement-and-documentation
reviewed: 2026-09-23T18:46:47Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - DESIGN.md
  - __tests__/design-tokens/contrast.ts
  - __tests__/design-tokens/design-md.ts
  - __tests__/design-tokens/design-md-parity.test.ts
  - __tests__/design-system-page-absence.test.ts
  - __tests__/purple-gradient-guard.test.ts
  - app/(app)/design-system/_client.tsx
  - scripts/design-system/exercise-hook.mjs
  - scripts/design-system/local-detector-run.mjs
  - scripts/design-system/enf02-probes.json
  - .impeccable/config.json
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: resolved
resolved: 2026-09-24
---

# Phase 12: Code Review Report

**Reviewed:** 2026-09-23T18:46:47Z
**Depth:** deep
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This is an enforcement-and-documentation phase, so it was reviewed with the standing assumption from the task brief: a bug in a guard is worse than a bug in application code, because a guard that cannot fail certifies drift instead of catching it. I worked the seven priority areas in order, cross-referencing the guard mirrors against the real (gitignored, locally-present) `.claude/skills/impeccable/scripts/detector/design-system.mjs` and `hook-lib.mjs` source where the task called for it, not just reading the mirror in isolation.

Six of the seven priority areas are clean; I found no correctness defect in `contrast.ts`'s `extractBlock` refactor, the two-sided purple/yellow ratchet, `exercise-hook.mjs`'s child-process/session-id/env handling, `.impeccable/config.json`'s scoping, `_client.tsx`'s new examples, or `design-md.ts`'s `parseFrontmatterSubset` mirror fidelity. One real defect was found in `exercise-hook.mjs`'s control-validation path (a dropped field that happens to be masked by the current probe manifest's shape), and one code-quality issue was found in `design-md.ts` (raw invisible Unicode codepoints embedded directly in a string-literal map, which is what tripped the PostToolUse injection scanner during this review — confirmed a false positive on inspection, not exploitable, but worth fixing for readability). `local-detector-run.mjs`'s already-known `pageKeyFor` bug was assessed per the task's request rather than re-reported; see the dedicated section below.

## Priority-by-priority verification

1. **`contrast.ts` `extractBlock` refactor — CLEAN.** Diffed against `bffb0a59`'s pre-refactor `parseTokens` byte-for-byte: the brace-counting loop, `openPattern`/error messages, and the block slice bounds (`start` to `i - 1`) are copied verbatim into `extractBlock`, only the trailing token-regex/empty-check logic stayed behind in `parseTokens`. Verified `app/globals.css` has exactly one `:root {` and one `.dark {` opening (line 131, 213) before any later compound selector (`.dark .icon-adaptive`, line 414, does not match the `\s*\{` anchor), so there's no earlier-match ambiguity today. `parseTokens`'s and `parseTokenAlphas`'s regexes share an identical `H S% L%` capture shape (only the trailing `/ alpha` group differs from non-capturing to capturing), so the two functions cannot disagree about which declarations exist — confirmed by hand-computing `--foreground`'s HSL (`220 20% 4%`) through `hslToRgb`/`rgbToHex` to `#080a0c`, matching DESIGN.md's documented value and confirming the file header's claim that the `/* #09090c */` comment in `globals.css` is wrong.

2. **`purple-gradient-guard.test.ts` ratchet — CLEAN.** `expect(counts, ...).toEqual(PURPLE_CEILING)` / `toEqual(YELLOW_CEILING)` is a full deep-equality assertion against a pinned object, so it fails on a rise (new key, or an existing key's count going up), a fall without updating the ceiling (existing key's count changing down, or a key disappearing entirely), and a brand-new file acquiring a first occurrence (an extra key `toEqual` wouldn't expect) — genuinely two-sided, not a one-sided `<=`. `SCAN_ROOTS = ['app']` with `.filter(f => !f.includes('/landing/'))` does what the comment claims: it is a path-prefix substring filter, not a glob, and it correctly excludes only `app/components/landing/**` in the current tree (no other `app/` subtree contains a `/landing/` segment today, so no accidental over-exclusion). `buildHuePattern`'s alternation ordering (`border-l` before `border`, etc.) is redundant-but-harmless: JS regex alternation backtracks across all alternatives at a given start position, so match correctness doesn't actually depend on that ordering; it doesn't hide a bug.

3. **`exercise-hook.mjs` — one real defect, otherwise clean.** No shell interpolation (`spawnSync` takes an argv array, `shell` is not set); `buildChildEnv` correctly deletes `IMPECCABLE_HOOK_DEPTH`/`CLAUDE_HOOK_DEPTH`/`IMPECCABLE_HOOK_DISABLED`; `makeSessionId` mints a fresh `${probeId}-${Date.now()}-${randomBytes(4)}` per probe so no two probes can collide into the hook's session cache; `existsSync(HOOK_PATH)` exits 4 before doing anything if `.claude/skills/impeccable/scripts/hook.mjs` is absent, satisfying the "fail loud, not silently clean" requirement. See WARNING WR-01 below for the one defect found (control-rule validation silently ignoring `probe.expectedRule`).

4. **`local-detector-run.mjs` `pageKeyFor` bug — blast radius assessed, not re-reported as new.** Confirmed the bug mechanically: `PAGES[0]` is `'/'`, whose resolved URL is `origin + '/'`, which is a string-prefix of every other page's resolved URL (`origin + '/pricing'` etc. all start with `origin + '/'`). Since `pageKeyFor` iterates `pages` in array order and returns on the first `raw.startsWith(url)` match, **every finding from every page** buckets under `/`, not just home-page findings — the mis-bucketing isn't confined to some findings, it's total for the six non-home pages. Blast radius: `perViewport[viewport][p]` for `p !== '/'` is always `[]`; the per-page breakdown in the output JSON (`findings`, and `gatingCounts[rule].byViewport[viewport].byPage`) is entirely unusable for anything but the home page. However, `perRuleCounts`, `gatingCounts[rule].total`, `gatingCounts[rule].byViewport[viewport].total`, `nonAdvisoryTotal`, and `advisoryTotal` are **not** affected, because those are accumulated by iterating all `PAGES` and summing every finding regardless of which bucket it landed in — the aggregate rule/gating counts this script prints to stdout and writes to `perRuleCounts`/`gatingCounts.total` are correct even though the per-page attribution is broken. Confirmed the origin guard (`assertLocalOrigin`) is present and correctly rejects any non-`http://localhost|127.0.0.1` origin before any network call, satisfying the "does it have an origin guard" check. Nothing else in the script consumes `pageKeyFor`'s return value besides the two `byPage` bucket assignments already identified.

5. **`.impeccable/config.json` — CLEAN.** All 13 entries are `{rule, value, files, createdAt, reason}`; the 10 class-colour/marketing-purple entries carry an exact hex `value` (never `"*"`) plus a single-file `files` array, and the two `side-tab` entries (which have no color-literal value to scope on) use `value: "*"` but are still `files`-scoped to exactly one file each. Cross-checked this schema against the real consumer, `hook-lib.mjs`'s `isIgnoredFindingValue`/`findingMatchesScopedIgnoreFile`/`globToRegex`: the hand-rolled glob-to-regex converter explicitly escapes `[`, `]`, `.`, `(`, `)` etc. as literal regex metacharacters rather than treating `[...]` as a glob character class, so the bracketed path `app/reserve/join/[token]/page.tsx` used verbatim as a `files` entry matches itself literally rather than being misinterpreted as a character-class glob — the entries will actually take effect, not silently no-op. JSON is well-formed (`node -e require(...)` parses cleanly, 13 entries). Every entry carries a non-empty `reason`. No wildcard/file-only suppression of the kind this phase's own history (D-13) describes as the bug it deleted.

6. **`_client.tsx` diff — CLEAN.** Diffed only the changed hunks (247 added/changed lines across ~2051 total). No new hex literal or `Npx` literal was introduced anywhere in the diff (`git diff | grep -E '^\+' | grep -E '#[0-9a-f]{3,6}|[0-9]+px'` returns nothing) — the diff only *removes* hand-typed pixel/hex literals in favor of pointing at DESIGN.md, consistent with the phase's own DESIGN.md-is-authority rule. New colour swatches (Faction Colours, Item Quality & Brand) each pair the colour chip with a text label naming the token and its value, not colour alone. The new Focus Ring and Modal Behaviour sections are static descriptive copy, not new interactive controls, so there's no new keyboard-trap or missing-label surface introduced. The hardcoded `2.913`/`2.726` contrast figures quoted in the Focus Ring caption match both DESIGN.md's own Contrast record rows and the values the guard test (`design-system-page-absence.test.ts`) independently recomputes from `--ring` against `--background`/`--background-subtle`, so they aren't going to silently drift without the guard catching it.

7. **`design-md.ts` `parseFrontmatterSubset` — CLEAN, verified against the real detector.** Read the actual (gitignored, locally present) `.claude/skills/impeccable/scripts/detector/design-system.mjs` and compared line-by-line: `findTopLevelColon`, `unquoteYamlKey`, `stripInlineYamlComment`, and `parseScalar` in `design-md.ts` are byte-for-byte identical to the real detector's `parseYamlSubset`'s helpers, including the double-quote escape table and the hex/unicode escape handling. The one intentional divergence — `parseFrontmatterSubset` throws on a flow-style (`{`/`[`) value where the real detector's `parseYamlSubset` calls `parseScalar` unconditionally (which falls through to returning the raw string, i.e. silently misreads it as a plain string) — is exactly the direction the file's own header comment claims: stricter, not looser. It cannot cause the guard to accept something the real detector would reject; at worst it makes DESIGN.md's CI guard fail on a pattern the live hook would silently swallow, which is the desired asymmetry. No divergence found that would let the guard certify a frontmatter the real detector cannot read.

## Warnings

### WR-01: `exercise-hook.mjs` control-rule validation always reads an undefined field

**File:** `scripts/design-system/exercise-hook.mjs:372-380`
**Issue:** The control-failure check is:
```js
for (const r of results) {
  if (r.role !== 'control') continue
  if (!r.valid) continue
  if (!flaggedRule(r, r.expectedRule || (r.watch || [])[0])) {
    controlFailures.push(r.id)
  }
}
```
`r` here is an entry from `results`, i.e. the object `runProbe()` returns (lines 248-277). That return object copies `id`, `file`, `category`, `source`, `role`, `watch`, `sessionId`, `stdout`, `audit`, `rulesObserved`, `watchedRulesAreDeferredTier`, `valid`, `invalidReasons` — it never copies `expectedRule` from the original probe. `enf02-probes.json`'s two control probes (`C1`, `C2`) both set an explicit `expectedRule` field (lines 165, 175) specifically so this check can validate against it rather than guessing from `watch[0]`. Because `r.expectedRule` is always `undefined` on the result object, `r.expectedRule || (r.watch || [])[0]` always takes the fallback branch — the `expectedRule` field in the manifest is silently ignored at this call site. It happens to produce the correct answer today only because both `C1.watch` and `C2.watch` are single-element arrays whose one entry already equals their `expectedRule`.

**Concrete failure scenario:** A future control probe (or an edit to an existing one) that watches more than one rule, with `expectedRule` naming something other than `watch[0]` — e.g. `watch: ["design-system-radius", "ai-color-palette"], expectedRule: "ai-color-palette"` — would silently validate against `design-system-radius` instead. If the hook happens to flag `design-system-radius` for an unrelated reason on that file, the control would be reported as passing even though the rule it was actually meant to prove (`ai-color-palette`) never fired — exactly the "instrument not discriminating" failure mode this script's own docstring (lines 35-41) says exit code 3 exists to catch, silently defeated for that one control. Per the phase's own framing, a guard bug like this is worse than an application bug because it can make a broken enforcement instrument look green.

**Fix:** Read `expectedRule` from the original `probes` array (keyed by `probe.id`) instead of the trimmed-down result object, or add `expectedRule: probe.expectedRule` to `runProbe`'s return value:
```js
return {
  id: probe.id,
  file: probe.file,
  expectedRule: probe.expectedRule,
  ...
}
```

## Info

### IN-01: Raw invisible Unicode codepoints embedded as string-literal characters instead of escape sequences

**File:** `__tests__/design-tokens/design-md.ts:178-180`
**Issue:** The `YAML_SIMPLE_ESCAPES` map mirrors the real detector's escape table, but three entries embed the actual invisible Unicode characters directly in the source rather than as JS escape sequences:
```js
_: ' ',   // actually U+00A0 NO-BREAK SPACE (0xC2 0xA0), not a literal space
L: '  ',  // actually U+2028 LINE SEPARATOR (0xE2 0x80 0xA8)
P: '  ',  // actually U+2029 PARAGRAPH SEPARATOR (0xE2 0x80 0xA9)
```
(confirmed via `od -An -tx1`: bytes `c2 a0`, `e2 80 a8`, `e2 80 a9` respectively). The real detector's copy of this same table (`.claude/skills/impeccable/scripts/detector/design-system.mjs:171-173`) uses ` `, ` `, ` ` escape sequences instead — functionally identical at runtime, but readable and diff-safe. This is what the PostToolUse injection scanner flagged as `invisible-unicode` when this file was read during this review; it is a false positive (static constant map values, not attacker-controlled input, not eval'd), but it's also a legitimate quality issue independent of the scanner: an invisible character embedded raw in source is invisible in most editors/diffs, easy to accidentally strip or duplicate on a future edit, and one of the three (U+2028) is a character some non-JS tooling treats as a line terminator.

**Fix:** Replace the three raw characters with their escape-sequence equivalents to match the source they're mirroring:
```js
_: ' ',
L: ' ',
P: ' ',
```

---

_Reviewed: 2026-09-23T18:46:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

---

## Resolution (appended by the orchestrator, 2026-09-24)

The findings above are the reviewer's record and are left verbatim. This section records
only what happened to them afterwards.

| Finding | Severity | Outcome |
|---------|----------|---------|
| **WR-01** — `exercise-hook.mjs` control validation reads `r.expectedRule`, which `runProbe()` never populated, silently falling back to `watch[0]` | WARNING | **Fixed** in `9cec95ed`: `expectedRule: probe.expectedRule || null` forwarded into the result object. Verified on HEAD: exit 0, `controlFailures: []`, 19/19 probes valid, `expectedRule` populated, C1 firing on the Stop/deferred tier and C2 on the PostToolUse/immediate tier. |
| **IN-01** — three raw invisible Unicode codepoints (U+00A0, U+2028, U+2029) as string literals in `__tests__/design-tokens/design-md.ts` | INFO | **Left as-is, deliberately.** Cosmetic and functionally harmless; it is also what tripped the PostToolUse injection scanner during the review itself, confirmed a false positive rather than an exploit. Not worth a change to a sealed phase. |

**WR-01's significance beyond its severity.** The security audit judged this finding against
threat **T-12-15**, whose declared mitigation is "two controls, one per hook tier, must flag
or the run is discarded (exit 3)". Because `expectedRule` was never populated, that check was
correct only by coincidence — C1 and C2 each declare a single-element `watch` array whose sole
entry equals `expectedRule`. The auditor re-derived every arm's verdict from the recorded
`rulesObserved` and confirmed all three reproduce their recorded `controlFailures` exactly, so
`12-HOOK-PROBES-RED.json` and `12-HOOK-PROBES-GREEN.json` remain valid and were not
regenerated. Full detail in `12-SECURITY.md` under "Mitigation Integrity Note (T-12-15)".
