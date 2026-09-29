# Phase 12 — Plan-time measurements

Captured during a `/gsd-plan-phase 12` run that ended `## PLANNING INCONCLUSIVE`
(a second concurrent session was writing the same phase directory). The plan set
that produced these was discarded; **these measurements were run live against the
working tree and several of them correct the source artifacts.** Preserved so the
next planning run does not have to re-derive them.

Status: measurements are trustworthy (each was executed); the *decomposition* they
came from is not the surviving one.

---

## 1. `.impeccable/config.json` has never been committed

`git ls-files .impeccable/config.json` returns empty; the whole `.impeccable/` dir is
untracked. `.git/info/exclude:18-23` excludes only `hook.cache.json`,
`hook.pending.json`, `config.local.json` — **not** `config.json`.

**Consequence:** ENF-02's deliverable is currently machine-local. Any plan must
`git add` it, or the requirement completes with nothing shipped.

## 2. Exception census, run with `--no-config`

`--no-config` is what makes this a census of what the *rules* find, rather than of
what the config already hides.

| Subject | Existing entry | Findings | Read |
|---|---|---|---|
| `app/(app)/raid-tracking/_client.tsx` | `side-tab` | 5 (lines 2523, 2527, 2531, 2535, 2539) | justified, keep |
| `app/components/OnboardingModal.tsx` | `ai-color-palette` | **0** | expired, exactly as D-07 predicted |
| `components/ui/__tests__/skeletons.test.tsx` | `side-tab` | 1 (line 25) | justified, keep |
| `app/(app)/loot-list/components/LootListContent.tsx` | `side-tab` | 1 (line 600) | justified, keep |
| `app/reserve/join/[token]/page.tsx` | `ai-color-palette` | **1, at line 866** | **new finding — not caught upstream** |
| `components/ui/skeletons.tsx` | none | 0 | D-15 holds at baseline |
| `app/components/ScoreComparisonModal.tsx` | none | 0 | D-13 item 1 |
| `app/components/landing/LandingHowItWorks.tsx` | none | 0 | D-13 item 2 (located live) |

**The `reserve/join` entry is expired in a second, worse way than D-07 describes.**
Its stated reason names an "avatar-fallback gradient"; the live finding is at line
866 — the `from-purple-500 to-pink-500` literal that D-08 wants *routed*. That
suppression is currently hiding the exact thing this phase exists to surface.

## 3. `PostToolUse` alone cannot prove three of the five sanctioned categories

`IMMEDIATE_TIER_RULES` holds exactly 14 ids; `side-tab` and `ai-color-palette` are
**not** among them. Each probe needs a `PostToolUse` event **then** a `Stop` event
sharing one fresh `session_id`. Verified working end to end.

`12-RESEARCH.md`'s "no Stop event needed" is true **only** for the four
`design-system-*` rules.

## 4. NDJSON `findings` is the count BEFORE ignore filtering

Measured: raid-tracking → `{"findings":5,"freshFindings":0,"kind":"clean"}`;
`skeletons.tsx` → `{"findings":0,"freshFindings":0}`.

**Proof shape for a correct exception is `findings > 0` AND `freshFindings === 0`.**
An acceptance criterion written as `findings === 0` is unsatisfiable. Worse,
`findings === 0` actually means the entry suppresses nothing — the dead-rule shape
D-15 targets.

## 5. `loadThemeTokens()` returns 45 tokens per theme, not 46

`parseTokens`'s regex is HSL-only, so `--radius: 12px` is silently skipped. It
belongs in `## Shapes` and equals `borderRadius.lg` — a free cross-source check.
Light-only and dark-only key sets are both empty.

## 6. `--accent-subtle` converts to the same hex as `--accent` (`#e67300`)

The alpha group in `parseTokens` is non-capturing and discarded. A body table
documenting only the hex would be **green under the guard and wrong in the
document.** The alpha (`0.15` / `0.2`) needs its own column, asserted against raw
CSS text.

## 7. `globals.css` hex comments are not authoritative

`--foreground: 220 20% 4%` converts to `#080a0c`; its comment reads `#09090c`. A
hand-author copying the comments produces a document that fails its own guard.

## 8. D-08's yellow is 19 sites, not 1 — and it collides with a standing constraint

Scope: all of `app/`, excluding `app/components/landing/`.

`LootListContent.tsx` 11, `ScoreComparisonModal.tsx` 2, `LootSubmissionsContent.tsx` 2,
`OnboardingModal.tsx` 1 *(the named literal)*, `compare/page.tsx` 1,
`DashboardContent.tsx` 1, `MasterSheetContent.tsx` 1.

Purple family over the same scope is **exactly 1** (`app/reserve/join/[token]/page.tsx`).

**Unresolved conflict:** D-08 says "the guard then fails until someone fixes them,
which is the point of a ratchet." A literal reading ships a 19-line permanently-red
suite, which collides head-on with Standing Constraint 3 (CI green per commit).
Needs a user decision: descending ceiling vs. ship-red vs. split-the-hues.

## 9. `font-mono` is 23 lines across 15 files (not ~20)

Sanctioned (D-14): `InviteCodeManager.tsx:224,252`; `ProfileContent.tsx:1041,1048`;
`GuildSettingsContent.tsx:891,898,930,937`.

The other 15 lines span `sheet-import` (2), `ImportModal` (3),
`LootItemSelectionModal`, `LootListContent:2158`, `help/[slug]`,
`AddonImportDialog`, `AddonExportDialog`, `dev-login`, `BisImportModal`,
`WowSimsImportModal`, `reserve/runs/[id]`, `admin/addon`.

## 10. Tailwind counts confirmed

29 `fontSize`, 11 `borderRadius`, 3 `fontFamily`, plus `spacing` (4 additions),
`boxShadow` (3 `glow-*`), `transitionDuration` (3) — the real sources for
`## Elevation & Depth` and the frontmatter `spacing` key.

## 11. MVP-mode planning-artifact defect

ROADMAP marks the phase `**Mode:** mvp`, but its `**Goal:**` is not in user-story
form. `mvp-uat-framing` **halts UAT generation** on that combination.

Fix before `/gsd-verify-work 12`: run `/gsd-mvp-phase 12`, or drop the
`**Mode:** mvp` line.

---

## Coverage accounting from the discarded set (reusable)

- **Probe edges: 10 = 9 authored + 1 flagged.** ENF-01's `unclassified` row stays
  unresolved as an explicit assumption (never auto-resolved to backstop).
- **UI-SPEC: all 23 resolved considerations** lifted — 11 explicit plain strings,
  12 flat-scalar `{statement, verification: backstop}`.
- **Prohibitions:** Stage 1 → 12 candidates, Stage 2 → 6 kept (descriptor-less),
  1 canon item dropped with a breadcrumb (argument injection → `/gsd-secure-phase`).
- **Decision coverage:** D-01..D-16 all cited across the 6-plan set.

---

## Decisions taken by the user after these measurements

Recorded here rather than in `12-CONTEXT.md`'s `<decisions>` block **on purpose**:
adding a new D-NN mid-flight would trip the blocking decision-coverage gate for a
planning run already in progress. Promote this into `<decisions>` as D-17 at the
start of the next planning run, before plans are written.

### D-17 (pending promotion): D-08's guard widening uses a descending ceiling

**Decision:** the widened colour guard asserts that the count of live literals does
not **exceed** the current measured baseline, and ratchets that ceiling down as
sites are fixed. It does not assert zero.

Baseline at time of measurement: **yellow 19** sites across 7 files
(`LootListContent.tsx` 11, `ScoreComparisonModal.tsx` 2, `LootSubmissionsContent.tsx` 2,
`OnboardingModal.tsx` 1, `compare/page.tsx` 1, `DashboardContent.tsx` 1,
`MasterSheetContent.tsx` 1); **purple family exactly 1**
(`app/reserve/join/[token]/page.tsx:866`).

**Why this shape:** it preserves D-08's ratchet intent — no new yellow or purple
literal can be introduced, and the number can only move down — while satisfying
Standing Constraint 3 (CI green per commit). The literal reading of D-08 ("the
guard then fails until someone fixes them") would ship a 19-line permanently-red
suite and break that constraint on every subsequent commit.

**Implications for the plan:**
- The guard needs the baseline count as a committed constant, with a comment
  naming what it is and that it may only decrease.
- Fixing a site and forgetting to lower the ceiling must not pass silently —
  assert equality against the expected count, not just `<=`, or add a separate
  check that the ceiling is tight.
- The single purple site is small enough to fix outright in this phase rather than
  merely ceiling-ed, which would take the purple ceiling to 0 and close D-08's
  original finding properly.
- `.impeccable/config.json`'s `reserve/join` `ai-color-palette` entry must be
  removed as part of this (per measurement 2, it is currently suppressing that
  exact literal).
