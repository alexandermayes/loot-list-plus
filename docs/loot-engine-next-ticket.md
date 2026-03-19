# Next Ticket: Add `computeScore()` and `explainScore()` to domain/scoring

## Context

PR 1 (vitest + 94 golden tests) and PR 2 (domain/ directory + 6 bridge files) are done. The scoring functions exist in `domain/scoring/` as individual modules: `loot-score.ts`, `attendance-score.ts`, `modifiers.ts`, `priority.ts`. But there's no high-level function that combines them.

Currently, every page that computes a loot score does this:

```typescript
// app/(app)/master-sheet/page.tsx lines 855-868
const roleModifier = getRankModifier(characterRole, guildSettings)
const priorityBonus = calculatePriorityBonus(itemPriority, character.id, specId, specRole)
const badLuckBonus = calculateBadLuckBonus(timesPassed, guildSettings)
const trialPenalty = getTrialPenalty(membershipStatus, guildSettings)
const roleBonus = getRoleModifier(specRoles, guildSettings)
const lootScore = calculateLootScore(r.rank, attendance, roleModifier, badLuckBonus, priorityBonus, trialPenalty, roleBonus)
```

That's 6 setup calls + 1 sum call, with 7 positional parameters. Easy to pass in the wrong order. The overview page gets it wrong: it hardcodes `priorityBonus = 0` at line 1087.

## What to Build

### 1. `domain/scoring/engine.ts`

A single function `computeScore(input: ScoreInput): ScoreResult` that:
- Takes a structured input object (not 7 positional numbers)
- Internally calls `getRankModifier`, `getRoleModifier`, `calculateBadLuckBonus`, `calculatePriorityBonus`, `getTrialPenalty`
- Returns `{ total: number, components: ScoreComponents }` so the breakdown is always available

### 2. `domain/scoring/explain.ts`

A function `explainScore(result: ScoreResult, config: Partial<ScoringConfig>): ScoreExplanation` that:
- Takes a ScoreResult and returns an array of labeled lines
- Each line has `{ label: string, value: number, detail: string }`
- Only includes non-zero components
- Detail text explains what the component means in plain language

### 3. Types in `domain/types.ts`

```typescript
interface CharacterContext {
  characterId: string
  specId: string | null
  specRoles: string[]       // e.g. ['tank'] or ['physical', 'tank']
  guildRank: string         // e.g. 'Officer', 'Raider'
  membershipStatus: string  // 'trial' | 'full'
}

interface ScoreInput {
  itemRank: number
  character: CharacterContext
  attendance: { score: number }  // from computeAttendance() or raw
  config: Partial<ScoringConfig>
  itemPriority: ItemPriority | null
  timesPassed: number       // BLP counter
}

interface ScoreComponents {
  itemRank: number
  attendanceScore: number
  rankModifier: number
  roleBonus: number
  badLuckBonus: number
  priorityBonus: number
  trialPenalty: number
}

interface ScoreResult {
  total: number
  components: ScoreComponents
}

interface ScoreLine {
  label: string
  value: number
  detail: string
}

interface ScoreExplanation {
  total: number
  lines: ScoreLine[]
}
```

## Files to Change

```
NEW   domain/scoring/engine.ts              (~40 lines)
NEW   domain/scoring/explain.ts             (~50 lines)
NEW   domain/scoring/__tests__/engine.test.ts  (~80 lines)
MOD   domain/scoring/index.ts               (add exports for computeScore, explainScore)
MOD   domain/types.ts                       (add CharacterContext, ScoreInput, ScoreResult, ScoreComponents, ScoreExplanation, ScoreLine)
```

## Tests to Write

**Parity tests** (prove computeScore matches calculateLootScore):
- All-zero optional inputs → total equals itemRank + attendanceScore
- All 7 components non-zero → total matches manual sum
- Each LOOT_SCORE_FIXTURE from fixtures.ts → same result
- Trial penalty as negative number → total decreases
- Priority bonus divisor (priority 2 = half bonus) → matches calculatePriorityBonus

**Component preservation tests:**
- `result.components.itemRank` equals input itemRank
- `result.components.attendanceScore` equals input attendance.score
- Each modifier computed from character context + config

**Explanation tests:**
- Zero-value components are omitted from `lines`
- Non-zero components each produce a labeled line
- `explanation.total` equals `result.total`
- Item rank line always present (it's never zero for real data)

## Acceptance Criteria

- `npm test` passes with new tests
- `npm run build` passes
- `computeScore()` produces identical totals to `calculateLootScore()` for all existing test fixtures
- `explainScore()` produces a line for every non-zero component
- No existing file behavior changes
- No page components modified

## Why This is the Right Next Step

1. **Zero risk** — new code, no consumers changed
2. **Enables PR 5** — master sheet migration can't happen without `computeScore()`
3. **Fixes the input problem** — structured object replaces 7 positional params
4. **Adds explainability** — the explanation output is what makes the engine trustworthy to users, not just correct
5. **Small** — ~170 lines of new code including tests
