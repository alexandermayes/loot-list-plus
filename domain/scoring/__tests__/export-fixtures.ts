/**
 * Export scoring test fixtures as JSON for Lua parity testing.
 *
 * Run: npx tsx domain/scoring/__tests__/export-fixtures.ts > lua-test-fixtures.json
 *
 * The output can be loaded by the addon's test harness to verify
 * ScoreEngine.lua produces identical results.
 *
 * NOTE: The Lua engine needs updating to match late/benched/excused changes.
 * Until then, only the base fixtures (no late/benched/excused fields) are
 * comparable.
 */

import {
  calculateAttendanceScore,
  calculateLootScore,
  getRankModifier,
  getRoleModifier,
  getTrialPenalty,
  calculateBadLuckBonus,
  calculatePriorityBonus,
  getDefaultSettings,
} from '@/domain/scoring'
import {
  attended, signedUpOnly, ncns, absent,
  DEFAULT_PPR_SETTINGS, DEFAULT_LINEAR_SETTINGS, DEFAULT_BREAKPOINT_SETTINGS,
  LOOT_SCORE_FIXTURES,
} from './fixtures'

const fixtures = {
  defaultSettings: getDefaultSettings(),
  attendanceTests: [
    {
      name: 'PPR: 4 attended, 4 total',
      records: [attended(true), attended(true), attended(true), attended(true)],
      totalRaids: 4,
      settings: DEFAULT_PPR_SETTINGS,
      expected: calculateAttendanceScore([attended(true), attended(true), attended(true), attended(true)], 4, DEFAULT_PPR_SETTINGS),
    },
    {
      name: 'PPR: 2 attended + 2 signed_up, 4 total',
      records: [attended(true), attended(true), signedUpOnly(), signedUpOnly()],
      totalRaids: 4,
      settings: DEFAULT_PPR_SETTINGS,
      expected: calculateAttendanceScore([attended(true), attended(true), signedUpOnly(), signedUpOnly()], 4, DEFAULT_PPR_SETTINGS),
    },
    {
      name: 'Linear: 2/4 attended',
      records: [attended(), attended(), absent(), absent()],
      totalRaids: 4,
      settings: DEFAULT_LINEAR_SETTINGS,
      expected: calculateAttendanceScore([attended(), attended(), absent(), absent()], 4, DEFAULT_LINEAR_SETTINGS),
    },
    {
      name: 'Breakpoint: 90% attendance',
      records: Array(9).fill(null).map(() => attended()),
      totalRaids: 10,
      settings: DEFAULT_BREAKPOINT_SETTINGS,
      expected: calculateAttendanceScore(Array(9).fill(null).map(() => attended()), 10, DEFAULT_BREAKPOINT_SETTINGS),
    },
  ],
  lootScoreTests: LOOT_SCORE_FIXTURES.map(f => ({
    ...f,
    expected: calculateLootScore(f.itemRank, f.attendanceScore, f.rankModifier, f.badLuckBonus, f.priorityBonus, f.trialPenalty, f.roleBonus),
  })),
  modifierTests: {
    rankModifier: [
      { rank: 'Pro Yiker', expected: getRankModifier('Pro Yiker', getDefaultSettings()) },
      { rank: 'Alt Yiker', expected: getRankModifier('Alt Yiker', getDefaultSettings()) },
      { rank: 'Unknown Rank', expected: getRankModifier('Unknown Rank', getDefaultSettings()) },
    ],
    trialPenalty: [
      { status: 'trial', enabled: true, expected: getTrialPenalty('trial', getDefaultSettings()) },
      { status: 'full', enabled: true, expected: getTrialPenalty('full', getDefaultSettings()) },
    ],
    badLuckBonus: [
      { timesPassed: 0, expected: calculateBadLuckBonus(0, getDefaultSettings()) },
      { timesPassed: 3, expected: calculateBadLuckBonus(3, getDefaultSettings()) },
      { timesPassed: 5, expected: calculateBadLuckBonus(5, getDefaultSettings()) },
    ],
  },
}

console.log(JSON.stringify(fixtures, null, 2))
