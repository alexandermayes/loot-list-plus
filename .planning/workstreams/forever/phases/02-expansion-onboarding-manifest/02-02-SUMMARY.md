---
phase: 02-expansion-onboarding-manifest
plan: 02
subsystem: data
tags: [zod, manifest, forever, expansions, vitest, supply-chain]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "FOREVER_EXPANSION_NAME and EXPANSION_GAMES in domain/expansion/game.ts"
provides:
  - "zod 4.6.5 (dependency) and csv-parse 7.0.2 (devDependency), exact pins, owner-approved"
  - "ExpansionManifestSchema: strict zod 4 schema for expansion manifests, kept out of the domain/expansion barrel"
  - "FOREVER_MANIFEST: Barrow Deeps (10), Hyjal Summit (20), Onyxia's Lair (40), provisional bosses with source notes, opens_on 2026-12-09 as data only"
  - "manifest-gate.test.ts: schema and content gate against an independent transcription (extended by 02-06)"
affects: [02-03, 02-06, 02-07, 02-10, 02-11]

actuals:
  tokens: 4233
  tasks: 2
  commits: 4

tech-stack:
  added: [zod 4.6.5, csv-parse 7.0.2]
  patterns:
    - "Schema module imports zod and stays out of the domain barrel; static data imports its type with import type"
    - "Independent-transcription gate test (expected names, sizes and boss order written as literals in the test)"
    - "Every defaulted manifest field written out so schema parse output deep-equals the constant"

key-files:
  created:
    - domain/expansion/manifest-schema.ts
    - data/expansions/forever/manifest.ts
    - data/expansions/__tests__/manifest-gate.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Dependencies installed only after the owner approved the Task 1 legitimacy checkpoint, exact pins with no caret or tilde"
  - "items is record(wowhead_id, never): an item added before item sync exists fails the gate instead of being silently ignored"
  - "Bosses keyed by kebab slug, never by wowhead_id (D-16); all bosses provisional with a source note (D-12)"
  - "manifest typed as ExpansionManifest (parse output type) rather than as const satisfies, so the type-only import is the whole coupling"

requirements-completed: [EXPN-01, EXPN-04, EXPN-06]

coverage:
  - id: D1
    description: "zod 4.6.5 and csv-parse 7.0.2 declared at exact owner-approved versions, lockfile resolves them"
    requirement: "EXPN-06"
    verification:
      - kind: other
        ref: "node -e check on package.json pins; npm ls zod --depth=0 prints zod@4.6.5"
        status: pass
    human_judgment: false
  - id: D2
    description: "Strict ExpansionManifestSchema (unknown keys, verified without verifiedBy, provisional with verifiedBy, non-numeric or any item key, zero raids, bad date all rejected)"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#ExpansionManifestSchema strictness"
        status: pass
    human_judgment: false
  - id: D3
    description: "FOREVER_MANIFEST content: three raids in size order, Barrow Deeps eight bosses in guide order, provisional with sources, opens_on data only"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#FOREVER_MANIFEST content"
        status: pass
    human_judgment: false
  - id: D4
    description: "Boss names and the Onyxia inference are user-facing copy awaiting owner sign-off, including whether Well of Sorrow is a boss or a place"
    requirement: "EXPN-01"
    verification: []
    human_judgment: true
    rationale: "Names come from third-party guides and are absent from wago DungeonEncounter; only the owner can confirm them (input due 2026-10-21)"

duration: 8min
completed: 2026-10-16
status: complete
---

# Phase 02 Plan 02: Forever manifest schema and data Summary

**Strict zod 4 manifest schema (outside the domain barrel) plus FOREVER_MANIFEST with three raids and provisional bosses, validated by a 19-case gate against an independent transcription, on exact-pinned zod 4.6.5 and csv-parse 7.0.2.**

## Performance

- **Duration:** 8 min of execution after the Task 1 checkpoint was approved
- **Started:** 2026-10-16T18:16:40Z
- **Completed:** 2026-10-16T18:24:00Z
- **Tasks:** 2 (Task 1 checkpoint approved, Task 2 tracer done with RED and GREEN commits)
- **Files modified:** 5

## Approved dependency versions

The owner replied "approved" at the Task 1 blocking-human checkpoint. Installed exactly:

| Package | Version | Section | Notes |
|---------|---------|---------|-------|
| zod | 4.6.5 | dependencies | Was a transitive dev-only 4.3.5; lockfile entry now non-dev. Registry evidence: trusted publishing with provenance, MIT, no install scripts |
| csv-parse | 7.0.2 | devDependencies | Registry evidence: trusted publishing with provenance, MIT, no runtime dependencies, no install scripts |

Both installed with `--save-exact`; `package.json` shows the bare versions. The lockfile diff is 18 lines: the two root entries, the new `csv-parse` node, and `zod` moving from 4.3.5 to 4.6.5 with `dev` removed.

## Accomplishments

- Dependencies declared at the owner-approved exact versions; package.json and package-lock.json committed together.
- `ExpansionManifestSchema` (zod 4 `strictObject` everywhere) with `ExpansionManifest`, `ExpansionManifestInput`, `ManifestRaid` and `ManifestBoss` types. Not re-exported from `domain/expansion/index.ts`.
- `FOREVER_MANIFEST`: Barrow Deeps 10 (eight guide-sourced bosses), Hyjal Summit 20 (no bosses), Onyxia's Lair 40 (one Onyxia), all `opens_on` 2026-12-09, all bosses provisional with source notes.
- Gate test with 19 cases: independent transcription of names, sizes and boss order, plus strictness probes.

## Task Commits

1. **Task 1: Owner vets zod and csv-parse** - checkpoint only, approved by the owner, no commit
2. **Task 2: Tracer (tdd)**
   - Dependency pins - `d3d250ed` (chore)
   - RED, failing gate test (modules missing) - `3d695621` (test)
   - GREEN, schema and manifest - `8404420a` (feat)

**Plan metadata:** recorded in the docs commit that follows this file (docs: complete plan).

## Files Created/Modified

- `package.json`, `package-lock.json` - exact pins for zod and csv-parse
- `domain/expansion/manifest-schema.ts` - strict zod 4 schema and types, deliberately outside the barrel
- `data/expansions/forever/manifest.ts` - `FOREVER_MANIFEST`, client-safe, type-only schema import
- `data/expansions/__tests__/manifest-gate.test.ts` - schema and content gate

## Decisions Made

- Used `ExpansionManifest` as the declared type of the constant instead of `as const satisfies`, so the parse output deep-equals the constant and widening is not needed.
- Added a symmetrical rule to the plan's superRefine: a provisional boss carrying `verifiedBy` also fails (the plan's behavior list requires it).
- Source notes were written without em dashes (copy-voice constraint).

## Needs owner sign-off (user-facing copy)

Boss names are user-facing copy and ship provisional. Please confirm or correct by 2026-10-21 (Decision 26); each answer is a one-line edit in `data/expansions/forever/manifest.ts`:

- Barrow Deeps bosses, in guide order: Deepscar Matriarch, Khalith the Dreadspinner, Amethrax, Ravus and Darlissa, Elder Tangleclaw, Well of Sorrow, Del'lynar Songwood, Sonya Darkhallow.
- Onyxia's Lair boss "Onyxia" is inferred from the raid name.
- Hyjal Summit has no boss names anywhere in the repo, so it shows "Bosses to be announced".
- **Open question carried forward: is "Well of Sorrow" a boss or a place?**

## Deviations from Plan

### Auto-fixed Issues

None to code. One process note:

**1. [Precondition check] npm registry auth precondition read literally as unmet, resolved by dry run**
- **Found during:** Task 2 precondition
- **Issue:** The plan's precondition says a `.npmrc` is present or `NPM_RC` is set. Neither existed in this environment (repo `.npmrc` absent, user `.npmrc` absent, `NPM_RC` unset), although the private `@hugeicons-pro` package was already in `node_modules`.
- **Resolution:** Ran `npm install --dry-run --save-exact zod@4.6.5` (side-effect free). It resolved with no auth error, so the real installs proceeded. No `.npmrc` was created or edited and no credential content was read or printed. If a later install ever needs the private registry, it will need `NPM_RC` set.
- **Verification:** both installs succeeded; the lockfile diff shows only the expected entries.

**Total deviations:** 0 auto-fixed code deviations, 1 process note. **Impact:** none on scope.

## Issues Encountered

- `npm install` prints an audit summary on each run; pre-existing advisories were not in scope and nothing was changed (`npm audit fix` was not run).
- Repo-wide verification showed only the known noise: 62 pre-existing lint errors outside touched files (touched files lint clean), and one failing test inside the stray `loot-list-plus-wt-355/` copy (`domain/scoring/__tests__/calculations.test.ts`).

## Verification

| Check | Result |
|-------|--------|
| `CI=true npx vitest run data/expansions/__tests__/manifest-gate.test.ts` | pass, 19 of 19 |
| 02-01 golden suite `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` | pass (run with `data/`, `domain/`, `raid-phase-coverage`: 2611 passed, 1 failed in the stray wt-355 copy) |
| `npm run typecheck` | no errors outside the known `loot-list-plus-wt-355/` and `.next/dev/types` noise |
| `npx eslint` on the three new files | exit 0; repo-wide `npm run lint` still 62 errors, same as baseline |
| package.json pins check (`zod` 4.6.5, `csv-parse` 7.0.2) | pass |
| `node -e "console.log(require('zod/package.json').version)"` | 4.6.5 |
| `npm ls zod --depth=0` | zod@4.6.5 |
| Barrel does not mention `manifest-schema` | pass |
| Manifest uses `import type` and no runtime `zod` import | pass |
| No U+2014 in the three new files | pass |

## Known Stubs

None. Provisional bosses and the empty Hyjal Summit boss list are deliberate data states with source notes, tracked as owner sign-off above.

## Threat Flags

None. No new network endpoints, auth paths or trust-boundary schema changes. T-02-SC (supply chain) was mitigated by the blocking-human checkpoint and exact pins; T-02-02-01 by the barrel and type-only checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 02-03 (sync): `FOREVER_MANIFEST` is the single source of Forever raid names. No blockers. Owner boss-name input is due 2026-10-21 and lands as one-line manifest edits.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-16*

## Self-Check: PASSED

- FOUND: domain/expansion/manifest-schema.ts
- FOUND: data/expansions/forever/manifest.ts
- FOUND: data/expansions/__tests__/manifest-gate.test.ts
- FOUND commits: d3d250ed, 3d695621, 8404420a
