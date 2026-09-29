# Phase 12: Enforcement and Documentation - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the design system from "shipped in code" into "written down where tools can read it, machine-enforced, and regression-proof."

**In scope (this phase, decided below):** ENF-01 (`DESIGN.md` as guard-tested design authority), ENF-02 (re-derived `.impeccable/config.json` exception list), ENF-03 (in-app design-system page documents what shipped and shows nothing deleted).

**Out of scope — blocked, not deferred by choice:** ENF-04 (CI gate against deployed pages) and ENF-05 (zero findings on those deployed pages). Both require the seven public pages to be live with this milestone's work. They are not. See D-01.

Clarifies HOW to implement what is already scoped. Widening a guard's scan scope is enforcement and belongs here; migrating colour literals is Phase 10's migration work and does not.
</domain>

<decisions>
## Implementation Decisions

### The deploy dependency

- **D-01:** Scope Phase 12 to ENF-01/02/03. Record ENF-04 and ENF-05 as **blocked on deploy**, which is what the ROADMAP's own Risk section prescribes for this exact situation ("if the deploy has not happened when this phase runs, record ENF-04 and ENF-05 as blocked with the reason rather than asserting a passing gate that never ran"). — **Reversibility:** reversible — both requirements become actionable the moment the deploy lands; nothing done here forecloses them.

  **The blocking fact, verified this session, not inferred:** `origin/main` is at `2e0587ee`, dated **2026-09-13**, **264 commits behind** local `main`. Its `app/globals.css` contains **zero** occurrences of `prose-measure` and **zero** of `font-tabular`. No part of Phases 07 through 11 is deployed. A detector run against the live site today would measure the pre-milestone site and report the original audit baseline, not zero.

- **D-02:** Record the blocked state in **three places**, each for a different reader:
  1. `REQUIREMENTS.md` — ENF-04 and ENF-05 get an explicit **Blocked** status (not `Pending`, not `Complete`) with the deploy named as the reason.
  2. `.planning/WINDOWS.md` — a numbered entry naming the deploy as the gate and the sprint workstream as its owner.
  3. `ROADMAP.md` — success criteria 4 and 5 get an inline "not met — blocked on deploy" marker.

  This is the pattern Phase 11 used for entries 32 through 35, and it is why that residue is still legible six phases on. A deferral recorded in one place reads as an oversight later. — **Reversibility:** reversible.

- **D-03:** Run the rendered detector against a **local** dev server over the seven pages and record the result as **interim evidence for ENF-05's substance**, clearly labelled local. Record counts for `undersized-ui-text`, `tiny-text`, `low-contrast` and `nested-cards`, and attribute every remaining finding either to tokens/primitives or to page-level layout (the latter carries to milestone B, per ENF-05's own wording).

  Rationale: ENF-05's *letter* needs deployed pages, but its *substance* — did the token and primitive work actually clear those four finding types — is measurable now. Puppeteer 24.43.1 is already a devDependency and all seven pages run on `localhost:3100`. Leaving the milestone's central claim entirely unmeasured at close would repeat the mistake Phase 11 spent a whole gap-closure plan fixing. The local number also gives the eventual deployed run a same-shaped baseline to compare against. — **Reversibility:** reversible.

  **Must be labelled local everywhere it appears.** It does not satisfy ENF-05 and must never be presented as doing so.

### Keeping DESIGN.md true

- **D-04:** Hand-author `DESIGN.md` for human readers, and add a **parsing guard test** that reads `app/globals.css`'s custom properties and `tailwind.config.js`, converts HSL to the frontmatter's colour format, and asserts every documented token equals its source. The guard must be **observed red first** by perturbing one value, per the evidence standard this workstream already holds its guards to. — **Reversibility:** reversible.

  Rationale: criterion 1's "match exactly" is the claim in this phase most exposed to the G-11-1 failure — a written value that silently stops matching the code. A checklist is a declaration; a parsing guard is an instrument.

  **Two wrinkles the planner must handle, both verified:**
  - `globals.css` stores colours as bare HSL triplets (`--border: 35 12% 82%`) while the DESIGN.md frontmatter spec wants hex or OKLCH. "Match exactly" therefore means **equal after conversion**, never string equality. A naive string-comparing guard would either fail permanently or get written to pass vacuously — which is the trap, not a detail.
  - `--font-tabular` is **consumed** in `globals.css` but **defined** by `next/font` in `app/layout.tsx`. A guard parsing only `globals.css` cannot see Phase 11's numeral face at all.

- **D-05:** Frontmatter carries the **light-theme** values as the canonical machine-readable set; the body's Colors section shows light and dark side by side. The guard asserts frontmatter against `:root`, and separately asserts every token in the body table against **both** `:root` and `.dark`, so dark mode is covered by the instrument even though it is not in the frontmatter. Keeps the frontmatter portable for DESIGN.md-aware tooling, which assumes a single palette. — **Reversibility:** reversible.

- **D-06:** Frontmatter holds the **spec's own shape** — colours (primary/accent/background/foreground/border family), typography display plus body, rounded, spacing. The body's Colors and Typography sections carry the **complete** 46-token and 29-step tables. The guard checks both layers, so coverage is total while the frontmatter honours the spec's explicit "keep it tight" instruction. — **Reversibility:** reversible.

  Measured scope: `globals.css` declares **46 unique** `--tokens` across **91** declarations (`:root` at line 131, `.dark` at line 213). `tailwind.config.js` extends **29** `fontSize` steps, **11** `borderRadius`, **3** `fontFamily` (`sans`, `poppins`, `wow` — note there is no `tabular` entry; the numeral face is wired via CSS variable, not Tailwind).

### Reconciling the exception list

- **D-07:** **Re-derive `.impeccable/config.json`'s exception list from scratch**, verifying each entry against what actually shipped before writing it. Any entry that cannot be justified against current code does not go back in. — **Reversibility:** costly — the five existing entries carry `createdAt` provenance that a rewrite discards; preserve the deleted entries' reasons in the phase evidence so the history is not simply lost.

  **Why, with the evidence that forced it.** The current list holds five entries, none of which are the six criterion 2 names, and at least one has an **expired justification**:

  - `ai-color-palette` on `app/components/OnboardingModal.tsx` is justified by "pre-existing purple/cyan gradient … Phase 10 (COLOR-05) explicitly names the onboarding modal gradients as its own scoped change." **Phase 10 did it** — commit `5967189e`. The gradients now read `from-accent/20 via-accent/10 to-accent/20`. The suppression guards a violation that no longer exists. This is the same failure shape as the dead `[data-score]` rule Phase 11 had to delete, and as G-11-1 itself: a mechanism that quietly stopped being valid while still appearing to work.

- **D-08:** For the two **live literals** found outside every current guard's scan scope: **widen the guards, route the fixes.** Extend COLOR-07's scan scope to cover `app/reserve` and the other non-`(app)` public routes, and add yellow to the palette-literal rule. Record both literals as `.planning/WINDOWS.md` entries routed to a colour-migration owner. Enforcement lands in the phase that owns enforcement; the migration goes where migrations go. The guard then fails until someone fixes them, which is the point of a ratchet. — **Reversibility:** reversible.

  **The two literals, verified:**
  - `app/reserve/join/[token]/page.tsx:866` still carries `from-purple-500 to-pink-500`. Its exception said Phase 10 would migrate it. Phase 10's COLOR-07 guard scans `app/(app)` and `app/components`; `app/reserve/` is under neither, so it fell outside the scan and survived. A live purple literal on a public-facing page, unguarded.
  - `app/components/OnboardingModal.tsx:299` carries `via-yellow-500/50`. COLOR-04 covers blue and red; COLOR-07 covers purple, violet, pink and fuchsia. **Yellow is in neither** — no rule has ever covered it.

- **D-09:** Prove criterion 2's "the pre-edit hook no longer flags any of them" by **exercising the hook per exception and recording its verbatim output**, plus one deliberate **control that does flag**, to prove the hook was still live and discriminating during the run. Two-directional controls, the same pattern `scripts/visual/numeral-probe.mjs` used. — **Reversibility:** reversible.

  Rationale: a config-shape test proves the config *says* the right thing, not that the hook *behaves* — exactly the substitution 11-06's plan prohibited. And `11-SECURITY.md` F-11-01 is a fresh, in-phase example of the cost of promising a one-time observation and never recording it: 11-06 required the numeral probe's origin refusal to be exercised by hand and recorded, no record was ever written, and the security auditor had to exercise it itself to close the threat.

### How far the docs page goes

- **D-10:** **`DESIGN.md` is the authority; the docs page shows live examples.** `DESIGN.md` holds the normative values and is guard-tested against source. `app/(app)/design-system/_client.tsx` stops restating numbers and instead renders live examples — actual Card variants, a real focused input, real numerals — reading from the same tokens the app uses, with a pointer to `DESIGN.md` for values. — **Reversibility:** costly — undoing this means re-inlining values across a 2051-line page.

  Rationale: two hand-maintained sources of the same truth is the drift problem this phase exists to solve. A rendered example cannot go stale the way a typed-out hex can, and it makes the page the thing `DESIGN.md` cannot be — visual proof. Criterion 1 already names `DESIGN.md` as the design authority that `context.mjs` must report.

- **D-11:** The docs page's prose is **in scope** for this milestone, and the user's sign-off is **recorded here** rather than taken at a mid-phase checkpoint. Standing Constraint 1 ("no user-facing copy changes this milestone; copy goes to milestone B under separate sign-off") is judged not to cover it: the design-system page is authenticated internal documentation of the design system, not product copy, and ENF-03 mandates that it change. The constraint was considered, not ignored. — **Reversibility:** reversible.

  Precedent noted: Phase 08 took an explicit copy sign-off before recasing Sidebar labels (OI-4), so asking was the established pattern; this decision consciously departs from it for documentation prose and records why.

- **D-12:** ENF-03's work is **mostly additive, not corrective** — a fact that inverts the phase's apparent shape and the planner should not re-derive it. Measured on the 2051-line page:

  | Deleted primitive | References remaining |
  |---|---|
  | `LabelText` | 0 |
  | `.section-label` | 0 |
  | `--background-inset` | 0 |
  | `.sidebar-scrollable` | 0 |
  | `data-score` | **1** (the known WINDOWS entry 23, line 1801) |

  | Required by criterion 3 | Documented today |
  |---|---|
  | Focus ring (`focus-visible`) | **0 hits** |
  | Card variants (`variant="nested"`) | **0 hits** |
  | Surface/colour tokens (`standby`) | **0 hits** |
  | Numeral face (`Figtree` / `font-tabular`) | **0 hits** |
  | Prose measure (`prose-measure`) | **0 hits** |

  The "shows no primitive this milestone deleted" half is **one sentence** from done. The "documents the revised type scale, colour and surface tokens, Card variants, the single Label, the focus ring and Modal behaviour" half is barely started and is the real work.

### Scope decisions taken at planning (research-driven)

Added by `/gsd-plan-phase` after `12-RESEARCH.md` surfaced facts that the discussion
session did not have. Each carries the evidence that forced it.

- **D-13:** ENF-02's exception scope is **criterion 2's five categories as the acceptance bar, with the audit's other two empirically verified** rather than assumed either way. `UI-AUDIT-2026-09-15.md`'s "Legitimate exceptions" line names **seven** items; ENF-02's own success-criterion text names **five**, dropping "ScoreComparisonModal big numbers" and "numbered how-it-works steps" (and folding "DB class colours" into the item-quality entry). Run the detector against current code for those two dropped items: write an `ignore-value` only if something actually flags, and if nothing does, record them as consciously dropped **with the evidence that nothing fires**. — **Reversibility:** reversible.

  Rationale: this is a real drift between the audit source and the phase's own acceptance text, not a research artifact. Silently choosing five would close two audit items on an inference; silently choosing seven would risk re-adding suppressions for violations Phase 10 already migrated, which is the precise failure D-07 exists to correct. D-07's own principle governs: an entry that cannot be justified against current code does not go back in.

- **D-14:** The monospace exception is scoped **narrowly to the sanctioned files, with the remainder routed** rather than blanket-suppressed. Write the `design-system-font` `ignore-value` for the type-to-confirm and invite-code call sites only (`InviteCodeManager.tsx:224,252`; `ProfileContent.tsx:1041,1048`; `GuildSettingsContent.tsx:891,898,930,937`), and open `.planning/WINDOWS.md` entries routing the other ~14 `font-mono` sites for a later legitimacy review. — **Reversibility:** reversible.

  **The fact that forces the distinction, verified in research:** `design-system-font` extracts the **computed font-family display name**, not the Tailwind class, so every `font-mono` site in `app/` resolves to the same ignore value. A file-scoped entry suppresses only the sanctioned ones; a value-scoped entry would silently suppress all twenty. The audit sanctioned two categories, not twenty. The gate stays red on the remainder, which is what a ratchet is for — an unexplained failure population that the next audit rediscovers is the outcome being avoided.

- **D-15:** Do **not** write an `animate-pulse` / skeleton `ignore-value` on faith. No currently-known rule fires on it: the closest registry rule, `pulsing-dot`, describes a small decorative status dot, not the full-block `animate-pulse rounded-md bg-muted` placeholder at `components/ui/skeletons.tsx:15`. Confirm empirically that something flags before writing the entry; if nothing does, record that finding instead. — **Reversibility:** reversible.

  Rationale: an `ignore-value` with no matching finding is not harmless — it is a suppression with no justification, and D-09's "exercise the hook and confirm it no longer flags" step has nothing to exercise. That is the dead-`[data-score]`-rule shape this workstream has already paid for twice.

- **D-16:** Two corrections to this file's own earlier premises, from research, which the planner must follow over the D-07/D-09 wording above:
  1. **The wired hook is post-edit and advisory, not a blocking pre-edit gate.** `.claude/settings.local.json` wires `.claude/skills/impeccable/scripts/hook.mjs` on `PostToolUse`/`Stop`, emitting an advisory reminder via `hookSpecificOutput.additionalContext`. The Cursor-only blocking `hook-before-edit.mjs` is **not wired in this repo**. D-09's exercise must simulate a `PostToolUse` stdin event against `hook.mjs`, with a **distinct `session_id` per probe** (the hook dedups on session, so a reused id silently suppresses later probes).
  2. **`severity: 'advisory'` is not the advisory flag.** Both the CLI's `isAdvisory` and the hook's `isAdvisoryFinding` gate on `finding.advisory === true`, which only `em-dash-overuse` carries out of 50 rules. So `design-system-color` and `design-system-font` findings **do** count toward the CLI's exit-code-2 failure gate and need real `ignore-value` entries. Note also that `design-system-*` rules fire only once `designSystem` is active, i.e. **only after ENF-01 lands** — so ENF-01 must sequence before ENF-02's verification.

### Claude's Discretion

- **Deleted-primitive absence guard.** Add a guard test asserting the deleted names (`LabelText`, `.section-label`, `[data-score]`, `--background-inset`, `.sidebar-scrollable`) appear nowhere in `app/(app)/design-system/_client.tsx`. Cheap, durable, and the same shape as the absence guards this workstream already ships (`__tests__/data-score-absence.test.ts`). Taken as my call, not asked.
- **Which of the eight canonical DESIGN.md sections to omit.** The spec permits omission where not relevant; sections present must stay in order.
- **Internal structure of the docs page's live-example sections** — how examples read tokens without duplicating them.
- **Exact ordering and batching of plans within the phase.**

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract
- `.planning/workstreams/design-system/ROADMAP.md` § Phase 12 — goal, ENF-01..05, five success criteria, and the Risk section that D-01 follows
- `.planning/workstreams/design-system/REQUIREMENTS.md` — ENF-01 through ENF-05 verbatim; the file D-02 updates with Blocked status
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` — the audit whose six sanctioned exceptions criterion 2 enumerates, and the baseline ENF-04 would record
- `.planning/WINDOWS.md` — carried-forward register; D-02 and D-08 add entries. Entry 23 is ENF-03's known stale sentence; entries 32, 33, 35 are Phase 11 residue this phase inherits

### DESIGN.md format and tooling
- `.claude/skills/impeccable/reference/document.md` — the frontmatter token schema and the eight canonical sections in fixed order; also the upstream spec URL
- `.claude/skills/impeccable/scripts/context.mjs` — what criterion 1 means by "reports it as the design authority"
- `.impeccable/config.json` — the five existing `ignoreValues` entries D-07 re-derives
- `.impeccable/hook.cache.json` — hook cache; may need invalidating after the config rewrite

### Token sources of truth
- `app/globals.css` — 46 unique `--tokens`, 91 declarations; `:root` line 131, `.dark` line 213. Also holds the Phase 11 rules: `.prose-measure` (633), the `::selection`/caret/scrollbar block (317-360), the tabular-numerals rule (362-366) and the unlayered `.tabular-nums` family rule (437-438, below the marker at 404)
- `tailwind.config.js` — 29 `fontSize` steps, 11 `borderRadius`, 3 `fontFamily`. No `tabular` family entry
- `app/layout.tsx` — where `next/font` defines `--font-tabular` (Figtree). The one token source outside the two configs above

### Enforcement targets
- `app/(app)/design-system/_client.tsx` — 2051 lines; ENF-03's subject. Stale `data-score` prose at line 1801
- `.github/workflows/ci.yml` — two jobs, `test` (Node 20) and `companion` (Node 22); the file ENF-04 would extend once unblocked
- `app/reserve/join/[token]/page.tsx:866` — live `from-purple-500 to-pink-500`, outside COLOR-07's scan scope (D-08)
- `app/components/OnboardingModal.tsx:299` — live `via-yellow-500/50`, covered by no rule (D-08)

### Evidence standard inherited from Phase 11
- `.planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/11-VERIFICATION.md` — why a declaration is not evidence; also the corrected authentication finding
- `.../11-SECURITY.md` § Findings F-11-01 — the undischarged one-time process control that motivates D-09
- `scripts/visual/numeral-probe.mjs` — the two-directional control pattern D-09 copies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Puppeteer 24.43.1** — already a pinned devDependency since Phase 07. The ROADMAP's risk about deciding its home (devDependency versus job-scoped install) is **moot**; do not re-open it.
- **`scripts/visual/numeral-probe.mjs`** — real-Chrome measurement harness with a localhost-only `assertLocalOrigin` guard, CDP rasterised-family reads, and two-directional controls with distinct exit codes. The template for D-03's local detector run and D-09's hook exercise.
- **`scripts/visual/baseline.mjs`** — screenshot capture with a `PAGES` matrix and the same localhost-only `resolveOrigin` refusal. Its matrix still has **no authenticated entry** (see the Phase 11 residue note below).
- **Absence-guard pattern** — `__tests__/data-score-absence.test.ts` pairs an absence assertion with sibling-survival assertions and a fail-loud-on-missing-path test, via shared `sourceFiles`/`matchesIn` (`__tests__/.../source-files.ts`, whose `readFileSync` throws ENOENT so a rename cannot yield a silent zero-match pass). The model for the D-12 discretion guard.
- **`__tests__/design-tokens/report.ts`** — existing token-contrast reporting table, extended additively by Phases 07 and 08. Likely the natural home for DESIGN.md's parsing guard rows.

### Established Patterns
- **Guards are proven red before they ship.** Every phase in this workstream recorded a fail-first observation naming a file and line. D-04 and D-09 inherit this; it is not optional here.
- **A declaration is not evidence.** 11-06 explicitly prohibited accepting a CSS declaration or a passing text-scan as proof of rendering. D-04 and D-09 are shaped by that rule.
- **Ratchet guards, then close to zero.** Phases 09 and 10 used descending ceilings then `toHaveLength(0)`. D-08's widened scan scope will fail until the literals are migrated — that is intended.
- **Unresolved items get a numbered `.planning/WINDOWS.md` entry with a named destination**, never silence.

### Integration Points
- `DESIGN.md` is new at the repo root; `context.mjs` must discover it.
- The DESIGN.md guard reads three sources (`globals.css`, `tailwind.config.js`, `app/layout.tsx`), one more than criterion 1 names.
- The docs page shifts from restating values to rendering live examples, so it begins consuming tokens rather than describing them.
- COLOR-07's scan scope widens beyond `app/(app)` and `app/components` for the first time.

### Phase 11 residue this phase inherits
- WINDOWS 23 → ENF-03 directly (the line 1801 sentence).
- WINDOWS 32: the `td, th` half of the shared tabular-numerals rule carries no `font-family`, so table numerals never get Figtree — only hand-applied `.tabular-nums` sites do. Worth documenting accurately on the docs page rather than overstating the numeral fix.
- WINDOWS 33: `app/research/wow-classic-loot-systems-2026/page.tsx:461`'s stat callout carries no `.tabular-nums` class.
- WINDOWS 35 / `11-SECURITY.md` R-11-04: `app/reserve/join/[token]/opengraph-image.tsx:14-15` fetches Poppins from `fonts.gstatic.com` at request time. Accepted with the font-host control's scope narrowed; re-plumbing to self-hosted bytes is optional work here.
- Criterion 4's app-page screenshot artifact does not exist — the behaviour was attested by UAT, but no authenticated image is in `baselines/` and the capture matrix has no authenticated entry. **Now unblocked:** the local dev server targets the same hosted Supabase project, so an existing personal account reaches an authenticated session with no test-user provisioning. Six WINDOWS entries (10, 15, 20, 22, 24, 34) had recorded a harder blocker than the one that actually existed.

</code_context>

<specifics>
## Specific Ideas

- The blocked-requirement recording pattern should look like Phase 11's WINDOWS entries 32 through 35 — numbered, named file or gate, explicit destination.
- D-09's hook proof should look like the numeral probe's control structure: the instrument must be shown to still discriminate at the moment it reports success.
- The local detector run (D-03) must be labelled local in every artifact it appears in. The whole value of the distinction is lost if a later reader mistakes it for the deployed run ENF-05 asks for.

</specifics>

<deferred>
## Deferred Ideas

- **Migrating the two live colour literals** (`reserve/join/[token]/page.tsx:866` purple/pink, `OnboardingModal.tsx:299` yellow) — Phase 12 widens the guards that catch them and routes the fixes; the migration itself belongs with colour-migration work, not enforcement. Per D-08.
- **ENF-04 and ENF-05** — blocked on the deploy, not deferred by preference. Actionable the moment the 264 commits are live. Per D-01.
- **Re-plumbing `opengraph-image.tsx` to self-hosted font bytes** — accepted as R-11-04 in `11-SECURITY.md` with the control's scope narrowed. Optional here; no longer a standing inconsistency.
- **Capturing the authenticated screenshot pair** that Phase 11's criterion 4 asked for and never produced. Now technically unblocked. Not in ENF-01/02/03's scope, but cheap and would close the artifact gap honestly.
- **Phase 12's MVP-mode goal format.** The phase is marked `**Mode:** mvp` in the ROADMAP but its goal is not in `As a …, I want …, so that …` form. The `mvp-uat-framing` guard **halts UAT generation** on that combination. It did not bite Phase 11 only because its UAT script already existed and that session was resuming. This must be fixed before `/gsd-verify-work 12` — either set a user-story goal via `/gsd-mvp-phase 12` or drop the `Mode:` line. Not a discussion item; a planning-artifact fix.

</deferred>

---

*Phase: 12-enforcement-and-documentation*
*Context gathered: 2026-09-22*
