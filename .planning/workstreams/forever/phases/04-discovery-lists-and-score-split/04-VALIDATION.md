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
| DISC-02 | five positions become 15 rows at ranks 50-46 and slots by tier order; picker renders one `<ol>` of five, "Looks right" is one click | unit + component | `npx vitest run domain/loot/__tests__/need-picks.test.ts "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx"` | Wave 0 |
| DISC-02 | a raider saves 15 rows through `save_submission_items` including slot 3 | PGlite | `npx vitest run app/services/__tests__/need-lists-pglite.test.ts` | Wave 0 |
| DISC-02 | 375px layout | manual / puppeteer | `node scripts/visual/baseline.mjs` style capture at 375x667 and 320 | manual-only: jsdom has no layout |
| DISC-03 | budget sum counts each pick once; over budget answers 422 and writes nothing | unit + route | `npx vitest run domain/loot/__tests__/need-budget.test.ts app/api/loot-submissions/submit/__tests__/route.test.ts` | Wave 0 / extend |
| DISC-03 | the hold is gone from route, module and DB | route + PGlite + inventory | submit route test, `need-lists-pglite.test.ts`, `lib/loot/__tests__/need-reader-inventory.test.ts` | extend |
| DISC-04 | defaults gate: five keys, within budget, eligible, spec exists | unit | `npx vitest run domain/loot/__tests__/need-defaults.test.ts` | Wave 0 |
| DISC-04 | eligibility matrix and the route refusal | unit + route | `npx vitest run domain/loot/__tests__/need-eligibility.test.ts` and submit route | Wave 0 / extend |
| DISC-05 | bootstrap and `GET /api/loot-items` return needs only for Discovery tiers, `list_mode` per tier; mixed group fails closed | route | `npx vitest run app/api/loot-list/bootstrap app/api/loot-items lib/__tests__/loot-items-query.test.ts` | extend |
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
- [ ] `domain/loot/__tests__/{need-picks,need-budget,need-eligibility,need-defaults}.test.ts` and `__fixtures__/class-specs.json`
- [ ] `domain/guild/__tests__/loot-style-presets.test.ts`
- [ ] `app/services/__tests__/need-lists-{migration,pglite}.test.ts`
- [ ] `app/api/discord/set-your-five/__tests__/route.test.ts`
- [ ] `NeedPicker` and `SetYourFiveCard` component tests; a proxy `next` test
- [ ] Framework install: `npm ci` in the worktree


---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner from the PLAN files) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 375px phone layout of the picker and the sheet (no horizontal scroll, sticky footer never covers row 5, need sentence wraps) | DISC-02 | jsdom has no layout | Open /loot-list on a Discovery guild at 375x667 and 320px; check the four UI-SPEC backstop rows |
| Owner copy sign-off (picker, presets, Set your 5, standing and interest sentences, the Phase 3 strings) | DISC-02, DISC-10, DISC-11, DISC-08 | Owner decision | Review the Copywriting Contract in 04-UI-SPEC.md and the constants in code |
| Spec defaults review (18 lists, Enhancement Shaman and Feral called out) | DISC-04 | Owner decision | Review domain/loot/need-defaults.ts before its PR merges |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
