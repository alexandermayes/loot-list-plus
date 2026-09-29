# Phase 07: Token Foundation - Context

**Gathered:** 2026-09-15
**Status:** Ready for planning

<domain>
## Phase Boundary

The type scale steps and colour/surface tokens that every primitive, sweep and page resolves against are correct and contrast-verified, no functional text can be smaller than 11px, and a fixed before/after screenshot baseline exists for later phases. This phase edits `tailwind.config.js`, `app/globals.css`, the 108 sub-11px call sites, `components/ui/status-badge.tsx`, `components/ui/alert.tsx`, the three `orange-500` standby literals in raid tracking, and adds Puppeteer plus a baseline script. It does not touch primitives beyond badge and alert (Phase 08), does not run the `text-[Npx]` codemod (Phase 09), does not migrate colour literals or delete `--background-inset` (Phase 10), and changes no user-facing copy.

Requirements: TYPE-01, COLOR-01, COLOR-02, COLOR-06.

</domain>

<decisions>
## Implementation Decisions

Hard constraints inherited from the roadmap: no user-facing copy changes; nothing is edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint, where the executor presents the concrete diff plan (files, token values, expected visual effect) and waits.

### Type floor mechanics
- **D-01:** Redefine Tailwind `fontSize.xs` as 11px (was 10px). `sm` 12, `base` 13, `md` 14, `lg` 16 and the rest stay. All 137 existing `text-xs` uses grow automatically. | Reversibility: reversible (one line).
- **D-02:** Add pixel-named aliases alongside the semantic names: `text-11`, `text-12`, `text-13`, `text-14`, `text-15` (the new step), `text-16`, `text-18`, `text-20`, `text-24`, `text-32`, `text-42`, each resolving to the same value and line-height as its semantic twin. Purpose: the Phase 09 codemod maps `text-[Npx]` to `text-N` mechanically. | Reversibility: costly once Phase 09 has migrated onto the aliases.
- **D-03:** Raise all 108 `text-[9px]` and `text-[10px]` sites to 11px uniformly in this phase (mechanical, one screenshot review). Per-screen tuning of chip density is deferred to Phase 09 and milestone C. Files: Sidebar (12), BossSection (12), CharacterSelector (10), LootListContent (10), admin analytics (10), SearchableItemSelect (7), AttendanceContent (7), MemberManager (6), CreateGuildModal (5), and 11 more with 1 to 4 each.

### Muted and accent contrast
- **D-04:** Dark `--foreground-muted` moves from `0 0% 40%` to `0 0% 52%` (#858585): about 5.2:1 on `--background`, 4.9:1 on `--background-elevated`. Keeps the two-tier hierarchy against `--foreground-secondary` at 63%.
- **D-05:** Light `--foreground-muted` moves from `25 6% 45%` (#7a7269, 4.46:1 on cream) to about `25 6% 42%` (about 5:1 on cream). Same role, no identity change.
- **D-06:** New `--accent-text` token: light about `30 100% 36%` (at least 4.5:1 on white), dark equal to `--accent` (`30 100% 50%`). Buttons and fills keep `--accent`. Preferred wiring: make the Tailwind `text-accent` utility resolve to `--accent-text` so the 305 call sites need no churn; if that cannot be done cleanly (the `accent` colour object also feeds `bg-accent`), add `text-accent-text` and migrate the text uses in Phase 10. Planner decides which after inspecting `tailwind.config.js` colors. | Reversibility: reversible.
- **D-07:** New `--standby` token in amber, about `38 92% 50%`, distinct from accent orange (hue 30) and `--warning` yellow (hue 45), with a matching `--standby-foreground`. It replaces the three `orange-500` literals for the standby state (`app/(app)/raid-tracking/components/cell-state.ts:22`, `app/(app)/raid-tracking/_client.tsx:2530`, `app/(app)/raid-tracking/components/RaidMemberList.tsx:73`) and the expectation in `cell-state.test.ts:142`. Must pass contrast on both themes.
- **D-08:** `status-badge.tsx` and `alert.tsx` drop every Tailwind palette class: pending/needs_revision/late/benched map onto `--warning` or `--standby` (planner proposes the exact mapping at the checkpoint), approved/attended onto `--success`, rejected onto `--error`/destructive, info onto `--info`. Labels and copy unchanged.

### Surface and border ramp (dark)
- **D-09:** Lift `--background-elevated` (and the tokens that share its value: `--card`, `--popover`, `--secondary`, `--input`) from `228 12% 8%` to `228 12% 12 to 13%`, tuned so elevated vs `--background` measures at least 1.2:1 (L12% computes to 1.19:1; L13% clears it). `--background` (`230 18% 3%`) and `--background-subtle` (sidebar, `225 15% 5%`) are unchanged so the page stays as deep as the landing page.
- **D-10:** `--border` from `0 0% 10%` to `0 0% 18%` (about 1.25:1 against the lifted card); `--border-strong` from 22% to about 26% so the two tiers stay distinct; `--input` follows `--border` if it is used as an outline, or the card value if used as a fill (planner checks `input.tsx`).
- **D-11:** Light mode: change nothing. Measure page-to-card, border-to-card and inset-to-card and write the numbers into the plan and SUMMARY for DESIGN.md (Phase 12) to pick up.
- **D-12:** Ship one token family per commit (type scale; muted; accent-text; ramp; standby and badge/alert) so a bad value is a single revert, each commit carrying a before/after contrast table in its message body.

### Baselines and rendering
- **D-13:** Puppeteer becomes a devDependency in `package.json`, shared by this phase's baseline script and the Phase 12 CI visual job. The existing lint/typecheck/test job sets `PUPPETEER_SKIP_DOWNLOAD=1` so only the visual job downloads Chromium. The package-legitimacy gate applies: a blocking human checkpoint before the install runs. | Reversibility: reversible.
- **D-14:** Fixed baseline set: Home (public, `https://www.getlootlist.com` or the local dev server) and the Overview dashboard (authenticated via `/dev-login` on the local dev server), each in light and dark at 1440 and 390 widths: 8 images per capture. Captured before the first token commit and after the last; reused by Phases 08 to 12.
- **D-15:** Baseline images live under `.planning/workstreams/design-system/baselines/<YYYY-MM-DD>-<label>/` and are committed as docs so confirm-before-change reviews can be done from the repo.
- **D-16:** Local rendering of authenticated pages requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. The user asked Claude to add them; Claude's append was blocked by the tool-approval classifier on 2026-09-15 (env-file write). OPEN ITEM for the plan's first checkpoint: either the user allows the append (a Bash permission rule) or adds the two lines (URL `https://zjnhjstbqekudlsozsvi.supabase.co`; anon key from the Supabase dashboard, Settings, API). Until then, the Overview baseline cannot be captured and only the Home baseline is possible.

### Claude's Discretion
- Exact hue/saturation tuning within the stated targets, provided the contrast numbers are met and shown.
- The badge/alert variant-to-token mapping (D-08), proposed at the checkpoint.
- The `text-accent` wiring choice (D-06).
- The baseline script's shape (a `scripts/visual/` Node script using Puppeteer, reusing the dev-login flow) and how it names files.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Findings and scope
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` - the audit: root causes, per-finding locations, sanctioned exceptions, the purple decision, measured contrast ratios
- `.planning/workstreams/design-system/ROADMAP.md` §Phase 07 - goal, success criteria 1 to 5, the risk note, the hard constraints (no copy changes, confirm before change)
- `.planning/workstreams/design-system/REQUIREMENTS.md` - TYPE-01, COLOR-01, COLOR-02, COLOR-06 wording

### Design quality bar
- `.claude/skills/impeccable/reference/craft-floor.md` - the Verify list (contrast floors, type floors, depth) and the Refuse list this phase's tokens must satisfy
- `.claude/skills/impeccable/reference/document.md` - the DESIGN.md token schema Phase 12 will need; record values in a shape it can consume

### Project conventions
- `.claude/CLAUDE.md` - no em dashes, kebab-case files, vitest in `__tests__`, CI facts
- `.planning/PROJECT.md` §Key Decisions - the hero H1 is sacred; nothing here may change its rendering intent

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tailwind.config.js` lines 19 to 60: `fontFamily`, `fontSize` (xs 10 / sm 12 / base 13 / md 14 / lg 16 / xl 18 / 2xl 20 / 3xl 24 / 4xl 32 / 5xl 42) and the `colors` block that maps every token through `hsl(var(--*))`; new tokens follow the same pattern
- `app/globals.css`: light tokens at lines 133 to 195, dark tokens under `.dark` from line 210; `--warning`, `--success`, `--error`, `--info`, `--alliance`, `--horde`, `--discord` already exist with `-foreground` pairs; `--standby` and `--accent-text` do not
- `components/ui/status-badge.tsx` (variant map with 16 palette classes at lines 26 to 67) and `components/ui/alert.tsx` (warning variant at line 24)
- `app/(app)/raid-tracking/components/cell-state.ts` and its test `__tests__/cell-state.test.ts` (the standby expectation at line 142)
- `app/dev-login/page.tsx` and `app/api/dev/test-users/route.ts`: development-only login the baseline script can drive
- The audit's Puppeteer scripts in the session scratchpad (inspect.mjs, bands.mjs) are a working reference for capture at 1440 and 390 and for element probing; they are not in the repo

### Established Patterns
- Tokens are HSL triplets consumed as `hsl(var(--x))`, with `/ alpha` variants for subtle fills (`--accent-subtle`)
- No test currently covers `tailwind.config.js` or `globals.css`; Phase 07 should add one that asserts the scale floor (no step below 11px) and the contrast targets (compute from the HSL values), so the token decisions become executable checks
- The design-system reference page `app/(app)/design-system/_client.tsx` uses `text-xs` 45 times in demos and will need its copy of the type-scale table updated in Phase 12 (ENF-03), not here
- CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, typecheck, test on Node 20 with a private npm registry secret; a new devDependency must install cleanly there

### Integration Points
- Every token change repaints every screen; the baseline set (D-14) is the regression instrument
- `--input` shares the elevated value today; lifting elevated lifts inputs unless decoupled (D-10)
- `--muted` (dark hover surface, `0 0% 12%`) will equal the lifted card value; planner must check hover states still show and adjust `--muted` upward if needed (in scope as part of the ramp)

</code_context>

<specifics>
## Specific Ideas

- The landing page's near-black `#080808` sections and the WoW weapon renders are the identity anchor; the ramp lifts cards, never the page.
- The user prefers mechanical, reviewable sweeps with the judgement pushed to a screenshot review over per-site tuning inside a token phase.
- Contrast evidence must be numeric and in the commit messages and plan, not asserted.

</specifics>

<deferred>
## Deferred Ideas

- Per-screen chip density tuning after the 11px raise (changelog chips, sidebar labels): Phase 09 or milestone C.
- Migrating the 305 `text-accent` call sites if the alias approach in D-06 is not clean: Phase 10.
- `--background-inset` deletion and the 12 nested-card sites: Phase 10 (COLOR-03).
- Hover surface token review (`--muted`) beyond what the ramp forces: Phase 08 or 11 if it turns out to need design rather than a value bump.
- Light-mode border tightening for parity: not now; revisit in Phase 12 with DESIGN.md numbers in hand.

</deferred>

---

*Phase: 07-token-foundation*
*Context gathered: 2026-09-15*
