---
phase: 4
slug: discovery-lists-and-score-split
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded by plan-phase from the Validation Architecture in 04-RESEARCH.md; the planner fills the per-task map and validate-phase sets the status.

---

## Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.12 with jsdom 29.1.1 and Testing Library 16.3.2 (`package.json:102,93,82`); PGlite 0.5.8 for SQL |
| Config file | `vitest.config.ts` (jsdom default, `testTimeout: 15000`, alias `@`); route and PGlite tests set `// @vitest-environment node` |
| Quick run command | `npx vitest run <file>` |
| Full suite command | `npm test` then `npm run typecheck` and `npm run lint` |

## Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-02 | five positions become 15 rows at ranks 50-46 and slots by tier order; picker renders one `<ol>` of five, "Looks right" is one click; statuses and refusals (04-20) | unit + component | `npx vitest run domain/loot/__tests__/need-picks.test.ts "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx"` | Wave 0 |
| DISC-02 | a raider saves 15 rows through `save_submission_items` including slot 3 | PGlite | `npx vitest run app/services/__tests__/need-lists-pglite.test.ts` | Wave 0 |
| DISC-02 | 375px layout | manual / puppeteer | `node scripts/visual/baseline.mjs` style capture at 375x667 and 320 | manual-only: jsdom has no layout |
| DISC-03 | budget sum counts each pick once; over budget answers 422 and writes nothing | unit + route | `npx vitest run domain/loot/__tests__/need-budget.test.ts app/api/loot-submissions/submit/__tests__/route.test.ts` | Wave 0 / extend |
| DISC-03 | the hold is gone from route, module and DB | route + PGlite + inventory | submit route test, `need-lists-pglite.test.ts`, `lib/loot/__tests__/need-reader-inventory.test.ts` | extend |
| DISC-04 | defaults gate: five keys, within budget, eligible, spec exists | unit | `npx vitest run domain/loot/__tests__/need-defaults.test.ts` | Wave 0 |
| DISC-04 | eligibility matrix and the route refusal | unit + route | `npx vitest run domain/loot/__tests__/need-eligibility.test.ts` and submit route | Wave 0 / extend |
| DISC-05 | bootstrap and `GET /api/loot-items` return needs only for Discovery tiers, `list_mode` per tier; mixed group fails closed | route | `npx vitest run app/api/loot-list/bootstrap app/api/loot-items lib/__tests__/loot-items-query.test.ts` | extend |
| DISC-05 | a 15-row fan-out list shows as five need lines in officer review and on the Overview loot priority, 'all 3 raids' or tier names (D-28, 04-21) | unit | `npx vitest run lib/loot/__tests__/need-lines.test.ts` | Wave 0 |
| DISC-08 | totals unchanged; standing plus interest equals total within float tolerance; sentences | unit | `CI=true npx vitest run domain/scoring` and the Lua `cmp` | extend |
| DISC-08 | five surfaces render the split | component | `npx vitest run "app/(app)/master-sheet/components/__tests__" app/components/__tests__/ScoreComparisonModal.test.tsx` | extend / Wave 0 |
| DISC-10 | presets map, `presetMatches`, confirm diff; PUT rejects an unknown `loot_style`; `POST /api/guilds` accepts and applies it | unit + route | `npx vitest run domain/guild/__tests__/loot-style-presets.test.ts app/api/guild-settings app/api/guilds` | Wave 0 / extend |
| DISC-10 | `loot_style` check on the three ids; null allowed | PGlite + contract | `need-lists-pglite.test.ts`, `need-lists-migration.test.ts` | Wave 0 |
| DISC-11 | Discord route: permission, Discovery gate, counts only, 403 quiet, no ids logged | route | `npx vitest run app/api/discord/set-your-five` | Wave 0 |
| DISC-11 | proxy keeps the query in `next`; deep-link entry switches guild to the main character | unit + component | proxy test, `SetYourFiveCard` / entry test | Wave 0 |
| WR-02, WR-03, WR-04 | chunked visibility reads throw on page error; prio-list drops needs with a failing-capable test; tier delete guard | route + PGlite | visibility route test, prio-list test, `need-lists-pglite.test.ts` | extend / Wave 0 |
| Known unchanged | golden seeder rows and scoring fixtures | golden | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` | exists |

## Sampling Rate
- **Per task commit:** the single new or edited test file plus its neighbours (`npx vitest run <paths>`).
- **Per wave merge:** `npx vitest run app/api lib domain app/services --maxWorkers=2` (Phase 3 used `--maxWorkers=2` to avoid worker exhaustion), then `npm run typecheck`.
- **Phase gate:** `npm test`, `npm run typecheck`, `npm run lint`, the golden command, the Lua byte comparison, and the end-of-phase human check at 375px.

## Wave 0 Gaps
Every test file below is created by the task that first needs it (no separate Wave 0 plan; each plan's first task writes its tests first):
- [ ] `domain/loot/__tests__/{need-picks,need-budget,need-eligibility}.test.ts` and `domain/loot/__fixtures__/class-specs.json` (04-03); `need-defaults.test.ts` (04-04); `need-questions.test.ts` (04-10); `need-list-rules.test.ts` (04-08); `set-your-five.test.ts` (04-18)
- [ ] `domain/scoring/__tests__/score-split.test.ts` (04-05); `domain/guild/__tests__/loot-style-presets.test.ts` (04-06)
- [ ] `app/services/__tests__/need-lists-{migration,pglite}.test.ts` (04-01)
- [ ] `lib/__tests__/proxy-next.test.ts` (04-07); `lib/loot/__tests__/need-list-scope.test.ts` (04-09); `lib/loot/__tests__/need-lines.test.ts` (04-21)
- [ ] `app/api/discord/set-your-five/__tests__/route.test.ts` and `app/(app)/guild-settings/components/__tests__/SetYourFiveSendRow.test.tsx` (04-18)
- [ ] `app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx` (04-10); `app/(app)/loot-list/components/__tests__/{NeedPicker,LootListContent-mode,SetYourFiveLinkEntry}.test.tsx` (04-11, extended by 04-20; 04-13); `app/(app)/overview/components/__tests__/SetYourFiveCard.test.tsx` (04-13)
- [ ] `app/components/__tests__/{ScoreSplit,ScoreComparisonModal,LootStylePicker,CreateGuildModal-loot-style}.test.tsx` (04-12, 04-14, 04-16); `app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx` (04-17)
- [ ] Framework install: `npm ci` in the worktree before the first Vitest run

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 04-01 | 1 | DISC-03, DISC-05, DISC-10 | T-04-01-01 | browser cannot delete a ranked Discovery tier; slot 1..8; loot_style check | PGlite + contract | `npx vitest run app/services/__tests__/need-lists-pglite.test.ts lib/loot/__tests__/need-reader-inventory.test.ts` | created or extended by the task | ⬜ pending |
| 04-01-T2 | 04-01 | 1 | DISC-03, DISC-05, DISC-10 | T-04-01-01 | browser cannot delete a ranked Discovery tier; slot 1..8; loot_style check | PGlite + contract | `npx vitest run app/services/__tests__/need-lists-pglite.test.ts app/services/__tests__/need-lists-migration.test.ts` | created or extended by the task | ⬜ pending |
| 04-01-T3 | 04-01 | 1 | DISC-03, DISC-05, DISC-10 | T-04-01-01 | browser cannot delete a ranked Discovery tier; slot 1..8; loot_style check | PGlite + contract | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts app/services/__tests__/need-lists-pglite.test.ts` | created or extended by the task | ⬜ pending |
| 04-02-T1 | 04-02 | 3 | DISC-03, DISC-04, DISC-05, DISC-10 | T-04-02-02 | PR 1 holds only migration files; deploy recorded before dependent code | CLI / owner | `gh pr view feat/forever-need-lists-schema --json files -q '.files[].path' \| sort \| tr '\n' ' ' && gh pr checks feat/forever-need-lists-schema` | created or extended by the task | ⬜ pending |
| 04-02-T2 | 04-02 | 3 | DISC-03, DISC-04, DISC-05, DISC-10 | T-04-02-02 | PR 1 holds only migration files; deploy recorded before dependent code | owner checkpoint | `owner checkpoint: resume signal recorded in SUMMARY` | n/a | ⬜ pending |
| 04-02-T3 | 04-02 | 3 | DISC-03, DISC-04, DISC-05, DISC-10 | T-04-02-02 | PR 1 holds only migration files; deploy recorded before dependent code | CLI / owner | `npm run typecheck && node -e "const s=require('fs').readFileSync('lib/database.types.ts','utf8');process.exit((s.match(/loot_style\??: string \\| null/g)\|\|...` | created or extended by the task | ⬜ pending |
| 04-03-T1 | 04-03 | 1 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-03-01 | budget counts each pick once; stable slots; eligibility fails closed | unit | `npx vitest run domain/loot/__tests__/need-picks.test.ts` | created or extended by the task | ⬜ pending |
| 04-03-T2 | 04-03 | 1 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-03-01 | budget counts each pick once; stable slots; eligibility fails closed | unit | `npx vitest run domain/loot/__tests__/need-budget.test.ts` | created or extended by the task | ⬜ pending |
| 04-03-T3 | 04-03 | 1 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-03-01 | budget counts each pick once; stable slots; eligibility fails closed | unit | `npx vitest run domain/loot/__tests__/need-eligibility.test.ts domain/loot/__tests__/needs.test.ts` | created or extended by the task | ⬜ pending |
| 04-04-T1 | 04-04 | 2 | DISC-04 | T-04-04-02 | defaults within budget and eligible | unit | `npx vitest run domain/loot/__tests__/need-defaults.test.ts` | created or extended by the task | ⬜ pending |
| 04-04-T2 | 04-04 | 2 | DISC-04 | T-04-04-02 | defaults within budget and eligible | unit | `npx vitest run domain/loot/__tests__/need-defaults.test.ts && npm run lint && npm run typecheck` | created or extended by the task | ⬜ pending |
| 04-05-T1 | 04-05 | 1 | DISC-08 | T-04-05-01 | Known totals, golden rows and Lua bytes unchanged | unit + golden + cmp | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring && npx tsx domain/scoring/__tests__/export-fixtures.ts > "${TMPDI...` | created or extended by the task | ⬜ pending |
| 04-05-T2 | 04-05 | 1 | DISC-08 | T-04-05-01 | Known totals, golden rows and Lua bytes unchanged | unit + golden + cmp | `CI=true npx vitest run domain/scoring` | created or extended by the task | ⬜ pending |
| 04-06-T1 | 04-06 | 1 | DISC-10 | T-04-06-02 | presets touch scoring knobs only | unit | `npx vitest run domain/guild/__tests__/loot-style-presets.test.ts` | created or extended by the task | ⬜ pending |
| 04-06-T2 | 04-06 | 1 | DISC-10 | T-04-06-02 | presets touch scoring knobs only | unit | `npx vitest run domain/guild/__tests__/loot-style-presets.test.ts && npm run lint && npm run typecheck` | created or extended by the task | ⬜ pending |
| 04-07-T1 | 04-07 | 1 | DISC-05, DISC-11 | T-04-07-02 | failed read answers 500; need prio refused; safe next path | route + unit | `npx vitest run app/api/master-sheet/visibility` | created or extended by the task | ⬜ pending |
| 04-07-T2 | 04-07 | 1 | DISC-05, DISC-11 | T-04-07-02 | failed read answers 500; need prio refused; safe next path | route + unit | `npx vitest run app/api/prio-list` | created or extended by the task | ⬜ pending |
| 04-07-T3 | 04-07 | 1 | DISC-05, DISC-11 | T-04-07-02 | failed read answers 500; need prio refused; safe next path | route + unit | `npx vitest run lib/__tests__/proxy-next.test.ts lib/__tests__/post-auth-redirect.test.ts app/api/addon/auth/__tests__/rate-limit.test.ts` | created or extended by the task | ⬜ pending |
| 04-08-T1 | 04-08 | 4 | DISC-03, DISC-04, DISC-05 | T-04-08-01 | over-budget or ineligible list refused before any write | route + unit | `npx vitest run app/api/loot-submissions/submit domain/loot/__tests__/need-list-rules.test.ts lib/loot/__tests__/need-reader-inventory.test.ts` | created or extended by the task | ⬜ pending |
| 04-08-T2 | 04-08 | 4 | DISC-03, DISC-04, DISC-05 | T-04-08-01 | over-budget or ineligible list refused before any write | route + unit | `npx vitest run app/api/loot-submissions/submit domain/loot/__tests__/need-list-rules.test.ts` | created or extended by the task | ⬜ pending |
| 04-08-T3 | 04-08 | 4 | DISC-03, DISC-04, DISC-05 | T-04-08-01 | over-budget or ineligible list refused before any write | route + unit | `npx vitest run app/api/loot-submissions domain/loot` | created or extended by the task | ⬜ pending |
| 04-09-T1 | 04-09 | 4 | DISC-02, DISC-05 | T-04-09-02 | needs served only to all-Discovery groups | route + unit | `npx vitest run lib/loot/__tests__/need-list-scope.test.ts app/api/loot-list/bootstrap lib/loot/__tests__/need-reader-inventory.test.ts` | created or extended by the task | ⬜ pending |
| 04-09-T2 | 04-09 | 4 | DISC-02, DISC-05 | T-04-09-02 | needs served only to all-Discovery groups | route + unit | `npx vitest run app/api/loot-items` | created or extended by the task | ⬜ pending |
| 04-09-T3 | 04-09 | 4 | DISC-02, DISC-05 | T-04-09-02 | needs served only to all-Discovery groups | route + unit | `npm run typecheck` | created or extended by the task | ⬜ pending |
| 04-10-T1 | 04-10 | 2 | DISC-02, DISC-03 | T-04-10-01 | UI blocks mirror server rules | unit + component | `npx vitest run domain/loot/__tests__/need-questions.test.ts app/components/need-picker` | created or extended by the task | ⬜ pending |
| 04-10-T2 | 04-10 | 2 | DISC-02, DISC-03 | T-04-10-01 | UI blocks mirror server rules | unit + component | `npx vitest run components/ui/__tests__/modal.test.tsx app/components/need-picker` | created or extended by the task | ⬜ pending |
| 04-10-T3 | 04-10 | 2 | DISC-02, DISC-03 | T-04-10-01 | UI blocks mirror server rules | unit + component | `npx vitest run app/components/need-picker` | created or extended by the task | ⬜ pending |
| 04-11-T1 | 04-11 | 5 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-11-02 | active character only; submit goes to officer review | component | `npx vitest run "app/(app)/loot-list/components/__tests__"` | created or extended by the task | ⬜ pending |
| 04-11-T2 | 04-11 | 5 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-11-02 | active character only; submit goes to officer review | component | `npx vitest run "app/(app)/loot-list/components/__tests__" app/components/need-picker` | created or extended by the task | ⬜ pending |
| 04-11-T3 | 04-11 | 5 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-11-02 | active character only; submit goes to officer review | component | `npx vitest run "app/(app)/loot-list/components/__tests__" components/ui/__tests__/skeletons.test.tsx` | created or extended by the task | ⬜ pending |
| 04-12-T1 | 04-12 | 2 | DISC-08 | T-04-12-01 | award body unchanged | component | `npx vitest run app/components/__tests__/ScoreSplit.test.tsx "app/(app)/master-sheet/components/__tests__/BossSection.test.tsx"` | created or extended by the task | ⬜ pending |
| 04-12-T2 | 04-12 | 2 | DISC-08 | T-04-12-01 | award body unchanged | component | `npx vitest run "app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx"` | created or extended by the task | ⬜ pending |
| 04-13-T1 | 04-13 | 6 | DISC-02, DISC-08, DISC-11 | T-04-13-01 | guild param never authorises | component + unit | `npx vitest run "app/(app)/loot-list/components/__tests__"` | created or extended by the task | ⬜ pending |
| 04-13-T2 | 04-13 | 6 | DISC-02, DISC-08, DISC-11 | T-04-13-01 | guild param never authorises | component + unit | `npx vitest run "app/(app)/overview/components/__tests__" && npm run typecheck && npm run lint` | created or extended by the task | ⬜ pending |
| 04-14-T1 | 04-14 | 3 | DISC-08, DISC-02 | T-04-14-02 | need labels never link out | component | `npx vitest run app/components/__tests__/ScoreComparisonModal.test.tsx` | created or extended by the task | ⬜ pending |
| 04-14-T2 | 04-14 | 3 | DISC-08, DISC-02 | T-04-14-02 | need labels never link out | component | `npx vitest run app/components/__tests__/ScoreBreakdownModal.test.tsx app/components/__tests__/NeedLabel.test.tsx` | created or extended by the task | ⬜ pending |
| 04-15-T1 | 04-15 | 4 | DISC-10 | T-04-15-03 | preset validated; no false funnel milestone; addon payload unchanged | route | `npx vitest run app/api/guild-settings` | created or extended by the task | ⬜ pending |
| 04-15-T2 | 04-15 | 4 | DISC-10 | T-04-15-03 | preset validated; no false funnel milestone; addon payload unchanged | route | `npx vitest run app/api/guilds` | created or extended by the task | ⬜ pending |
| 04-15-T3 | 04-15 | 4 | DISC-10 | T-04-15-03 | preset validated; no false funnel milestone; addon payload unchanged | route | `npx vitest run app/api/addon` | created or extended by the task | ⬜ pending |
| 04-16-T1 | 04-16 | 5 | DISC-10 | T-04-16-01 | confirm before replacing customised knobs | component | `npx vitest run app/components/__tests__/LootStylePicker.test.tsx "app/(app)/loot-management"` | created or extended by the task | ⬜ pending |
| 04-16-T2 | 04-16 | 5 | DISC-10 | T-04-16-01 | confirm before replacing customised knobs | component | `npx vitest run app/components/__tests__/LootStylePicker.test.tsx "app/(app)/loot-management"` | created or extended by the task | ⬜ pending |
| 04-16-T3 | 04-16 | 5 | DISC-10 | T-04-16-01 | confirm before replacing customised knobs | component | `npx vitest run app/components/__tests__/CreateGuildModal-loot-style.test.tsx` | created or extended by the task | ⬜ pending |
| 04-17-T1 | 04-17 | 1 | DISC-05 | T-04-17-01 | control hidden from non-managers; route reasons shown | component + route | `npx vitest run "app/(app)/expansions"` | created or extended by the task | ⬜ pending |
| 04-17-T2 | 04-17 | 1 | DISC-05 | T-04-17-01 | control hidden from non-managers; route reasons shown | component + route | `npx vitest run app/api/raid-tiers` | created or extended by the task | ⬜ pending |
| 04-18-T1 | 04-18 | 2 | DISC-11 | T-04-18-03 | officer-only, hourly cooldown, counts only, no pings | route + component | `npx vitest run domain/loot/__tests__/set-your-five.test.ts app/api/discord/set-your-five` | created or extended by the task | ⬜ pending |
| 04-18-T2 | 04-18 | 2 | DISC-11 | T-04-18-03 | officer-only, hourly cooldown, counts only, no pings | route + component | `npx vitest run app/api/discord/set-your-five utils/analytics/__tests__/no-names-in-analytics.test.ts` | created or extended by the task | ⬜ pending |
| 04-18-T3 | 04-18 | 2 | DISC-11 | T-04-18-03 | officer-only, hourly cooldown, counts only, no pings | route + component | `npx vitest run "app/(app)/guild-settings/components/__tests__/SetYourFiveSendRow.test.tsx"` | created or extended by the task | ⬜ pending |
| 04-19-T1 | 04-19 | 7 | DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11 | T-04-19-04 | Known guilds unchanged; copy signed off | suite + golden + owner | `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts && CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scorin...` | created or extended by the task | ⬜ pending |
| 04-19-T2 | 04-19 | 7 | DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11 | T-04-19-04 | Known guilds unchanged; copy signed off | suite + golden + owner | `npx vitest run app/__tests__/content-dates.test.ts` | created or extended by the task | ⬜ pending |
| 04-19-T3 | 04-19 | 7 | DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11 | T-04-19-04 | Known guilds unchanged; copy signed off | owner checkpoint | `owner checkpoint: resume signal recorded in SUMMARY` | n/a | ⬜ pending |
| 04-20-T1 | 04-20 | 6 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-20-01 | server refusal codes reach the picker; editor save path unchanged | component | `npx vitest run "app/(app)/loot-list/components/__tests__"` | created or extended by the task | ⬜ pending |
| 04-20-T2 | 04-20 | 6 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-20-01 | approved list reopened only at save, through the audited route | component | `npx vitest run "app/(app)/loot-list/components/__tests__"` | created or extended by the task | ⬜ pending |
| 04-20-T3 | 04-20 | 6 | DISC-02, DISC-03, DISC-04, DISC-05 | T-04-20-02 | only the active character's list; fixed refusal and error sentences | component | `npx vitest run "app/(app)/loot-list/components/__tests__" && npm run lint && npm run typecheck` | created or extended by the task | ⬜ pending |
| 04-21-T1 | 04-21 | 2 | DISC-05, DISC-02 | T-04-21-02 | grouping keeps every ranked row in officer review; Known lists unchanged | unit + component | `npx vitest run lib/loot/__tests__/need-lines.test.ts "app/(app)/loot-submissions" lib/loot/__tests__/need-reader-inventory.test.ts` | created or extended by the task | ⬜ pending |
| 04-21-T2 | 04-21 | 2 | DISC-05, DISC-02 | T-04-21-02 | grouping before the top-five cut; Known loot priority unchanged | unit + component | `npx vitest run lib/loot/__tests__/need-lines.test.ts "app/(app)/overview" lib/loot/__tests__/need-reader-inventory.test.ts && npm run typecheck && npm run lint` | created or extended by the task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 375px phone layout of the picker and the sheet (no horizontal scroll, sticky footer never covers row 5, need sentence wraps) | DISC-02 | jsdom has no layout | Open /loot-list on a Discovery guild at 375x667 and 320px; check the five UI-SPEC backstop rows listed under Probe Lifts (the two E1 rows on /loot-list, E5 in the master sheet popover, the two E6 rows on the expansion page at 320px) |
| Owner copy sign-off (picker, presets, Set your 5, standing and interest sentences, the Phase 3 strings) | DISC-02, DISC-10, DISC-11, DISC-08 | Owner decision | Review the Copywriting Contract in 04-UI-SPEC.md and the constants in code, following the sign-off change map in 04-19 Task 3 (each constant's file, export and the tests that change with it) |
| Spec defaults review (18 lists, Enhancement Shaman and Feral called out) | DISC-04 | Owner decision | Review domain/loot/need-defaults.ts before its PR merges |

## Probe Lifts

Where each probe item lives in the plans, so the lifts can be checked from the files. A truth is a plain string in the plan's `must_haves.truths`, tagged with the row in square brackets; a backstop marker is a `{ statement, verification: backstop }` entry that the end-of-phase human check closes (04-19 Task 1); a flagged assumption sits in the plan's `flagged_assumptions`.

### UI Considerations rows (04-UI-SPEC.md, in its order)

| # | Category | Element(s) | UI-SPEC status | Lifted by | Lift form |
|---|----------|------------|----------------|-----------|-----------|
| 1 | empty | E1 picker, no default for the spec or no saved list | covered | 04-11 | truth |
| 2 | loading | E1 picker | covered | 04-11 | truth |
| 3 | error | E1 picker load and save | covered | 04-20 | truth |
| 4 | populated | E1 picker with five rows | covered | 04-20 | truth |
| 5 | partial | E1 picker with some rows picked, and the submitted states | covered | 04-20 | truth |
| 6 | overflow | E1 picker on a short phone | covered | 04-11 | truth |
| 7 | zero-one-many | E1 picker scope line | covered | 04-11 | truth |
| 8 | long-text | E1 need sentence on a row | backstop | 04-11 | backstop marker |
| 9 | long-text | E1 officer note on a rejected list | backstop | 04-20 | backstop marker |
| 10 | empty | E2 sheet step with no choice yet | covered | 04-10 | truth |
| 11 | loading | E2 sheet | dismissed | none | dismissed (the sheet is local state and makes no request; reason recorded in the UI-SPEC) |
| 12 | error | E2 sheet | covered | 04-10 | truth |
| 13 | partial | E2 sheet with decided steps skipped | covered | 04-10 | truth |
| 14 | overflow | E2 slot grid on a short phone | covered | 04-10 | truth |
| 15 | long-text | E2 tile labels | covered | 04-10 | truth |
| 16 | loading | E3 Overview card | covered | 04-13 | truth |
| 17 | error | E3 Overview card | covered | 04-13 | truth |
| 18 | overflow | E3 Overview card at phone width | covered | 04-13 | truth |
| 19 | long-text | E3 Overview card copy | covered | 04-13 | truth |
| 20 | empty | E4 preset picker with no preset stored | covered | 04-16 | truth |
| 21 | loading | E4 preset picker | covered | 04-16 | truth |
| 22 | error | E4 preset picker | covered | 04-16 | truth |
| 23 | partial | E4 preset selected with knobs changed | covered | 04-16 | truth |
| 24 | long-text | E4 preset lines | covered | 04-16 | truth |
| 25 | overflow | E5 ScoreSplit numbers | covered | 04-12 | truth |
| 26 | long-text | E5 standing sentence with many parts | backstop | 04-12 | backstop marker |
| 27 | empty | E6 officer controls with nothing to act on | covered | 04-18 | truth |
| 28 | loading | E6 officer controls in flight | covered | 04-18 | truth |
| 29 | error | E6 officer controls | covered | 04-18 | truth |
| 30 | partial | E6 send result | covered | 04-18 | truth |
| 31 | long-text | E6 route reason under the row | backstop | 04-17 | backstop marker |
| 32 | overflow | E6 list-mode row at 320px | backstop | 04-17 | backstop marker |
| 33 | empty | E7 Needs group with nothing ranked | covered | 04-07 | truth |
| 34 | loading | E7 tables | covered | 04-14 | truth |
| 35 | error | E7 need reads | covered | 04-07 | truth |
| 36 | populated | E7 Needs group | covered | 04-07 | truth |
| 37 | partial | E7 need ranked by some raiders | covered | 04-07 | truth |
| 38 | overflow | E7 need names in table cells | covered | 04-14 | truth |
| 39 | zero-one-many | E7 Needs group size | covered | 04-07 | truth |
| 40 | long-text | E7 longest need name | covered | 04-14 | truth |
| 41 | overflow | E8 Discord message | covered | 04-18 | truth |
| 42 | long-text | E8 Discord message | covered | 04-18 | truth |

**Counts:** 41 lifted, 5 backstop, 1 dismissed (42 rows; the 41 lifted rows are 36 truths plus the 5 backstop markers, matching the UI-SPEC's 36 covered, 5 backstop and 1 dismissed). Check: `grep -oh '\[UI-SPEC E[0-9][^]]*\]' 04-*-PLAN.md | wc -l` prints 41 and `cat 04-*-PLAN.md | grep -c 'verification: backstop'` prints 5. The D-28 grouping that moved from 04-13 to 04-21 carries no UI Considerations row, so every row above stayed with its plan.

### Edge-probe items (phase requirements)

| # | Requirement | Category | Lifted by | Lift form |
|---|-------------|----------|-----------|-----------|
| 1 | DISC-02 | unclassified (under 60 seconds on a phone) | 04-11 | flagged assumption (tap budget pinned by tests; 60 seconds and 375px left to the end-of-phase human check) |
| 2 | DISC-03 | unclassified (the budget as one sentence) | 04-08 | flagged assumption (server refusal pinned by truths; the 'one sentence' half is the owner's call at the 04-19 copy sign-off) |
| 3 | DISC-04 | adjacency | 04-04 | truth |
| 4 | DISC-04 | empty | 04-04 | truth |
| 5 | DISC-04 | ordering | 04-04 | truth |
| 6 | DISC-05 | adjacency | 04-03 | truth |
| 7 | DISC-05 | empty | 04-03 | truth |
| 8 | DISC-05 | ordering | 04-03 | truth |
| 9 | DISC-08 | adjacency | 04-05 | truth |
| 10 | DISC-08 | boundary | 04-05 | truth |
| 11 | DISC-08 | empty | 04-05 | truth |
| 12 | DISC-08 | ordering | 04-05 | truth |
| 13 | DISC-08 | precision | 04-05 | truth |
| 14 | DISC-10 | unclassified (three presets at setup with Fine-tune behind a disclosure) | 04-16 | flagged assumption (behaviour pinned by truths; whether the presets feel right is the owner's call at the 04-19 values review) |
| 15 | DISC-11 | adjacency | 04-13 | truth |
| 16 | DISC-11 | empty | 04-13 | truth |
| 17 | DISC-11 | ordering | 04-18 | truth |

**Counts:** 14 truths plus 3 flagged = 17. Check: `grep -oh '\[DISC-[0-9]* [a-z][^]]*\]' 04-*-PLAN.md | grep -v DISC-12 | wc -l` prints 17, and adding `| grep -c unclassified` in place of `wc -l` prints 3. The two DISC-12 style truths in 04-02 are Phase 3 rule carry-overs (DISC-12 is a Phase 3 requirement), not edge-probe items, so they are left out of this count.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
