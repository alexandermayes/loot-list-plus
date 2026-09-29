# Phase 12: Enforcement and Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 12-enforcement-and-documentation
**Areas discussed:** The deploy dependency, Keeping DESIGN.md true, Reconciling the exception list, How far the docs page goes

**Not asked, because already answered by fact:** Puppeteer's home (devDependency versus job-scoped install). The ROADMAP's Risk section routed this to the phase checkpoint, but `24.43.1` has been a pinned devDependency since Phase 07, so there was nothing to decide.

---

## The deploy dependency

**Grounding fact established before asking:** `origin/main` is at `2e0587ee` (2026-09-13), 264 commits behind local `main`, with zero `prose-measure` and zero `font-tabular` in its `app/globals.css`. No part of Phases 07-11 is deployed.

### Q1 — How should Phase 12 handle ENF-04/05's dependency on deployed pages?

| Option | Description | Selected |
|--------|-------------|----------|
| Scope to ENF-01/02/03, block 04/05 | Ship DESIGN.md, the exception list and the docs page now; record 04/05 blocked with the deploy as the stated reason, as the ROADMAP's risk section prescribes | ✓ |
| Also build the gate now, advisory-only | Author the CI workflow and seven-URL list running non-blocking; ENF-04 becomes "built but not proven" | |
| Block the phase on the deploy | Stop until the 264 commits are live, then do all five requirements | |

**User's choice:** Scope to ENF-01/02/03, block 04/05
**Notes:** Matches the ROADMAP's own Risk mitigation verbatim. Rejected option 2 partly on the grounds that a gate which exists and looks green because it never really ran is the G-11-1 failure shape; rejected option 3 because the sprint workstream owns the deploy and CLAUDE.md constrains recrawl to once, after all content is final.

### Q2 — How should the blocked state be recorded?

| Option | Description | Selected |
|--------|-------------|----------|
| Requirement status + WINDOWS entry + roadmap note | Blocked status in REQUIREMENTS.md, numbered WINDOWS entry naming the gate and owner, inline "not met" marker on criteria 4 and 5 | ✓ |
| Carry ENF-04/05 into their own follow-up phase | Add a Phase 13 owning the CI gate and zero-findings run | |
| Defer both to milestone B | Treat enforcement-against-deployed-pages as milestone B's problem | |

**User's choice:** Requirement status + WINDOWS entry + roadmap note
**Notes:** Three readers, three places. Same pattern as Phase 11's entries 32-35, which is why that residue is still legible.

### Q3 — Should the detector run locally as interim evidence?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, run local and record it as interim | Run over seven local URLs, record the four finding-type counts, attribute each remaining finding to tokens/primitives or page-level layout | ✓ |
| Yes, and capture the milestone-start baseline too | Same plus reconstruct the pre-Phase-07 baseline by checkout at an old commit | |
| No, defer measurement with ENF-04/05 | Measure nothing until the pages are live | |

**User's choice:** Yes, run local and record it as interim
**Notes:** ENF-05's letter needs deployed pages; its substance is measurable now. Option 2 was declined as more moving parts than the phase needs. Must be labelled local everywhere it appears.

---

## Keeping DESIGN.md true

**Wrinkles surfaced before asking:** `globals.css` stores colours as bare HSL triplets while the DESIGN.md frontmatter spec wants hex or OKLCH, so "match exactly" requires conversion rather than string equality — a naive string-comparing guard would either fail permanently or be written to pass vacuously. And there are two themes (`:root`, `.dark`) but one frontmatter `colors` map.

### Q1 — What holds DESIGN.md's token values true over time?

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-author + parsing guard test | Readable document plus a guard parsing both configs, converting HSL, asserting equality; proven red first by perturbing a value | ✓ |
| Generate the frontmatter from the configs | Script emits the YAML; drift becomes structurally impossible | |
| Hand-author with a review checklist | Values written by hand with a checklist in the evidence | |

**User's choice:** Hand-author + parsing guard test
**Notes:** Option 3 was characterised as a declaration with no instrument behind it — the thing 11-06's plan prohibited accepting as proof. Option 2's generated block was noted as equally capable of going stale, just harder to notice.

### Q2 — Which theme's values go in the single frontmatter `colors` map?

| Option | Description | Selected |
|--------|-------------|----------|
| Light in frontmatter, both in the body | Frontmatter canonical against `:root`; body table shows both and is guarded against `:root` and `.dark` | ✓ |
| Dark in frontmatter | Dark-theme values canonical, on the grounds the app is dark-first | |
| Namespaced entries for both | Both in frontmatter under distinct keys | |

**User's choice:** Light in frontmatter, both in the body
**Notes:** Option 3 was flagged as departing from the spec's single-palette shape, trading portability with DESIGN.md-aware tooling for completeness.

### Q3 — What goes in the frontmatter given 46 tokens and a 29-step scale?

| Option | Description | Selected |
|--------|-------------|----------|
| Spec-shaped core, full tables in the body | Frontmatter in the spec's own shape; complete tables in Colors and Typography; guard checks both layers | ✓ |
| Every token in the frontmatter | All 46 colours, 11 radii, 29 type steps as frontmatter entries | |
| Audit-relevant subset only | Only what this milestone created or changed | |

**User's choice:** Spec-shaped core, full tables in the body
**Notes:** Option 2 works against the spec's explicit "keep it tight" advice and forces semantic tokens into a palette-slug map. Option 3 was rejected because a partial authority invites someone to reintroduce an undocumented token believing it is new.

---

## Reconciling the exception list

**Evidence gathered before asking** (the claim was verified rather than asserted):

- `ai-color-palette` on `OnboardingModal.tsx` is justified by "Phase 10 owns this" — and Phase 10 executed it in commit `5967189e`. The gradients now read `from-accent/20 via-accent/10 to-accent/20`. The suppression guards a violation that no longer exists.
- `app/reserve/join/[token]/page.tsx:866` still carries `from-purple-500 to-pink-500`. COLOR-07's guard scans `app/(app)` and `app/components`; `app/reserve/` is under neither, so it fell outside the scan and survived.
- `OnboardingModal.tsx:299` carries `via-yellow-500/50`. COLOR-04 covers blue/red, COLOR-07 covers purple/violet/pink/fuchsia. Yellow is covered by no rule.

### Q1 — How to handle the existing five entries?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-derive from scratch, each entry re-verified | Clear and rebuild from the audit's six, verifying each against shipped code; anything unjustifiable stays out | ✓ |
| Audit each existing entry, then add the missing | Walk the five in place, preserving `createdAt` provenance for those still valid | |
| Additive only | Leave the five, add the six | |

**User's choice:** Re-derive from scratch, each entry re-verified
**Notes:** Option 3 was described as knowingly leaving a suppression for a violation that no longer exists — the same dynamic as the dead `[data-score]` rule Phase 11 deleted. CONTEXT.md rates this `costly` and asks that the deleted entries' reasons be preserved in the phase evidence so the provenance option 2 would have kept is not simply lost.

### Q2 — What to do about the two live literals?

| Option | Description | Selected |
|--------|-------------|----------|
| Widen the guards, route the fixes | Extend COLOR-07's scan scope, add yellow to the palette rule, record both literals as routed WINDOWS entries | ✓ |
| Widen the guards and fix both now | Same guard work plus migrating purple/pink to accent and yellow to standby or accent | |
| Widen the guards, allow both as exceptions | Cover the scan gap but sanction these two so CI passes today | |

**User's choice:** Widen the guards, route the fixes
**Notes:** Domain boundary was explicit in the question: widening a guard's scan scope is enforcement (this phase); migrating literals is Phase 10's migration work. Option 2 also involved a visual decision (yellow to what) needing sign-off rather than a mechanical swap. Option 3 was noted as sanctioning the exact literals the milestone set out to remove.

### Q3 — How to prove the pre-edit hook no longer flags sanctioned exceptions?

| Option | Description | Selected |
|--------|-------------|----------|
| Exercise the hook per exception, record output | Trigger the hook against each named file, record verbatim output, plus one deliberate control that does flag | ✓ |
| Assert config shape in a guard test | Parse config.json and assert the six are present with reasons and scoped file lists | |
| Both: guard test plus recorded hook exercise | Durable CI coverage and a one-time recorded exercise with controls | |

**User's choice:** Exercise the hook per exception, record output
**Notes:** Option 2 alone proves the config says the right thing, not that the hook behaves — the substitution 11-06 prohibited. `11-SECURITY.md` F-11-01 was cited as a fresh in-phase example of a promised one-time observation never being recorded.

---

## How far the docs page goes

**The area was reframed mid-discussion.** My original question offered "fix only known-stale spots" versus "full audit" versus "also add newly-shipped things," as though scope were the choice. Measuring the page inverted that: only one stale reference survives (`data-score`, line 1801), while five things criterion 3 explicitly mandates are entirely undocumented (`focus-visible`, `variant="nested"`, `standby`, `Figtree`/`font-tabular`, `prose-measure` — all 0 hits on 2051 lines). The additive half is not optional extra; it is the requirement. The real gray area was therefore how the page relates to DESIGN.md.

### Q1 — How should DESIGN.md and the docs page relate?

| Option | Description | Selected |
|--------|-------------|----------|
| DESIGN.md is authority; page shows live examples | DESIGN.md holds guard-tested normative values; the page renders real Card variants, a real focused input, real numerals, pointing to DESIGN.md for values | ✓ |
| Page is authority; DESIGN.md summarises | Rich page keeps the values; DESIGN.md is the machine-readable extract | |
| Both document fully, both guarded | Each stands alone; guard asserts both against configs and against each other | |

**User's choice:** DESIGN.md is authority; page shows live examples
**Notes:** Two hand-maintained sources of one truth is the drift problem this phase exists to solve. A rendered example cannot go stale the way a typed hex can. Option 2 would put normative values in a `.tsx` file, against criterion 1 naming DESIGN.md as the authority `context.mjs` must report. Option 3's three-way consistency was flagged as the most brittle.

### Q2 — Does Standing Constraint 1 (no user-facing copy changes) cover this page?

| Option | Description | Selected |
|--------|-------------|----------|
| Constraint does not apply; sign off the docs page now | Treat authenticated internal design-system documentation as in-scope; record the sign-off rather than stopping mid-phase | ✓ |
| Applies; limit to factually wrong prose | Change only false sentences, add missing sections, reword nothing merely dated | |
| Applies; plan a blocking checkpoint | Halt at a checkpoint presenting before/after text, as Phase 08 did for Sidebar | |

**User's choice:** Constraint does not apply; sign off the docs page now
**Notes:** Phase 08's OI-4 precedent (explicit sign-off before recasing Sidebar labels) was surfaced in the question, so the departure from it is deliberate. CONTEXT.md D-11 records the reasoning so a later reader sees the constraint was considered rather than ignored.

---

## Claude's Discretion

- **Deleted-primitive absence guard** for `_client.tsx` (`LabelText`, `.section-label`, `[data-score]`, `--background-inset`, `.sidebar-scrollable`). Taken as my call, not asked — cheap, durable, and the same shape as `__tests__/data-score-absence.test.ts`.
- **Which of the eight canonical DESIGN.md sections to omit** where not relevant.
- **Internal structure of the docs page's live-example sections** — how examples read tokens without duplicating them.
- **Plan ordering and batching within the phase.**

## Deferred Ideas

- Migrating the two live colour literals — guards widen here, migration goes with colour work (D-08).
- ENF-04 and ENF-05 — blocked on deploy, not deferred by preference (D-01).
- Re-plumbing `opengraph-image.tsx` to self-hosted font bytes — accepted as R-11-04 with the control's scope narrowed.
- Capturing the authenticated screenshot pair Phase 11's criterion 4 asked for and never produced. Now technically unblocked.
- **Phase 12's MVP-mode goal format** — marked `Mode: mvp` with a non-user-story goal, which halts UAT generation. Must be fixed before `/gsd-verify-work 12`. Raised by me, not the user; a planning-artifact fix rather than a discussion item.
