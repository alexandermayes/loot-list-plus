---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: "WoW Forever Loot: Discovery to Known"
status: planning
last_updated: "2026-10-13T04:35:40.000Z"
last_activity: 2026-10-12
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (shared; its milestone section describes the SEO sprint, not this milestone)
Milestone brief: `.planning/workstreams/forever/MILESTONE-BRIEF.md`
Requirements: `.planning/workstreams/forever/REQUIREMENTS.md` (44 v1)
Roadmap: `.planning/workstreams/forever/ROADMAP.md` (8 phases)
Research: `.planning/research/SUMMARY.md`

**Core value:** A Forever guild can run loot from day one without knowing a single item: raiders rank generic needs, officers settle every drop in seconds from a Drop Desk, and the whole product feels like a consumer app that just works.
**Current focus:** Phase 1 (Forever Defect and Privacy Fixes) and Phase 2 (Expansion Onboarding Manifest), in parallel

## Current Position

Phase: 1 of 8 (Forever Defect and Privacy Fixes); Phase 2 can start in parallel
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-12 (roadmap created: 8 phases, 44/44 requirements mapped)

Progress: [░░░░░░░░░░] 0/8 phases (0%)

## Hard Dates

- 2026-10-31: Discovery lists usable (Phases 1 to 4)
- 2026-11-30: Drop Desk live (Phases 5 to 7)
- 2026-12-09: Forever raids open (Phase 8 cuts targeted around it)

## Standing Constraints

1. Schema changes are expand-only, ship as their own migration-only PR (`--admin` merge, non-raid day) and are live before any code that reads them; RLS matrix per new table.
2. The owner signs off user-facing copy; no em dashes in user-facing text.
3. No player or guild names in analytics or published data.
4. Known guilds' Loot Score golden fixtures and Lua fixtures stay byte-identical.
5. No live wago.tools or Wowhead fetches; nothing before Dec 9 depends on Forever loot data.

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

## Accumulated Context

### Decisions

- Owner: all four extra features are in (What would it take line, who's-interested responses, live Discord loot thread, loot style presets).
- Owner: the Drop Desk is free for all guilds, gated by a server-side guild setting.
- Owner: need rows are per raid tier, with one picker fanning out to every Discovery tier.
- Owner: the simplicity audit starts Oct 26; its cuts ship after Nov 30.
- Owner: the Known mode transition is deferred; raid assignments are out of scope.
- Roadmap: the research's ranker-extraction phase is folded into Phase 5, and the Drop Desk is split into Phase 5 (core award path) and Phase 6 (live raid night).

### Pending Owner Inputs

- Oct 21: Forever boss names (Phase 2); addon scope and owner for the separate repo (Phase 5)
- Oct 26: spec defaults review and copy sign-off for picker, presets, "Set your 5" (Phase 4); simplicity audit scope and sidebar direction (Phase 8)
- Nov 9: beta guild, named paper-fallback officer, void rule (Phase 7); master loot or Gargul export scope (Phase 5)

### Blockers/Concerns

- Phase 3: research lists two cost schemes for need rows (an allocation cost of 1/1/0, and a budget at Big 3, Medium 2, Standard 1). Settle which one the seeded rows carry before Phase 4 reads it.
- Phase 3 to 4 gap: a Discovery tier can have need rows before raiders have a picker.
- Research flags: Phases 3, 5, 6 and 8 need `/gsd-plan-phase N --research-phase`.

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-10-12 21:35
Stopped at: Roadmap created; awaiting owner approval before commit
Resume file: None
