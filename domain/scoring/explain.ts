/**
 * Score explanation — generates human-readable breakdown of a loot score.
 *
 * Used by the overview page score widget and master sheet tooltips.
 * Only includes non-zero components (except itemRank and attendance
 * which are always present) so the UI stays clean.
 *
 * Each line includes a `key` for UI styling and an optional `context`
 * map for richer rendering (e.g., guild rank name, matched role label).
 */

import type { ScoreResult, ScoreExplanation, ScoreLine, ScoringConfig, ScoreInput, ScoreComponents } from '../types'
import { withDefaults } from './defaults'
import { getRoleModifierWithLabel, getActiveRaiderBonusEntries } from './modifiers'
import { describeRaiderBonusEntries } from './raider-bonus'

/** Raider bonus detail when the active entries are unknown (no character id, or a legacy flat number). */
export const RAIDER_BONUS_GENERIC_DETAIL = 'Officer-assigned modifier for this raider'

/** Extra context for config-only callers such as the master sheet. */
export interface ExplainScoreOptions {
  /** Character the result belongs to, so the raider bonus line can list each reason and end date. */
  characterId?: string | null
  /** YYYY-MM-DD date the score was computed for. Omit it and dated bonus entries are left out. */
  asOfDate?: string
  /** Whose pick it is: 'self' writes "your", 'other' writes "their" (officers read raiders' scores). */
  voice?: 'self' | 'other'
  /** The guild's decimal places for the sentence numbers. Defaults to 2. */
  decimalPlaces?: number
}

const DEFAULT_SENTENCE_DECIMALS = 2

/**
 * Round with toFixed to the guild's places, then drop trailing zeros so 7.50
 * reads 7.5 and 3.00 reads 3. Number() also turns "-0.00" into 0, so a sentence
 * never shows a negative zero. Tiles keep plain toFixed like every other score number.
 */
export function formatScoreNumber(value: number, decimalPlaces = DEFAULT_SENTENCE_DECIMALS): string {
  const rounded = Number(value.toFixed(decimalPlaces))
  return String(rounded === 0 ? 0 : rounded)
}

// Copy signed off 2026-11-11 (04-19). No em dashes.
const STANDING_PREFIX = 'Standing'
const STANDING_EMPTY = 'no bonuses yet'
const INTEREST_PREFIX = 'Interest'
const INTEREST_NO_PICK_SELF = 'no picks on your list yet'
const INTEREST_NO_PICK_OTHER = 'no pick on their list'

/**
 * Fixed order, independent of the size of each part, so the sentence reads the
 * same for every raider and two sentences can be compared side by side (UI-13).
 * Bad luck protection sits before the officer bonus because the owner's locked
 * example reads "bad luck protection 2, officer bonus 2.5"; the UI spec's written
 * list had them the other way round, so the locked example wins (open for 04-19).
 */
const STANDING_PARTS: ReadonlyArray<{ key: keyof ScoreComponents; label: string }> = [
  { key: 'attendanceScore', label: 'attendance' },
  { key: 'rankModifier', label: 'guild rank' },
  { key: 'roleBonus', label: 'role' },
  { key: 'priorityBonus', label: 'officer priority' },
  { key: 'badLuckBonus', label: 'bad luck protection' },
  { key: 'raiderBonus', label: 'officer bonus' },
  { key: 'trialPenalty', label: 'trial penalty' },
  { key: 'donationBonus', label: 'bank donations' },
]

/** One sentence naming each non-zero standing part, in the fixed order. */
export function standingSentence(
  components: ScoreComponents,
  standing: number,
  options: { maxAttendance: number; decimalPlaces: number }
): string {
  const { maxAttendance, decimalPlaces } = options
  const head = `${STANDING_PREFIX} ${formatScoreNumber(standing, decimalPlaces)}`

  const parts: string[] = []
  for (const { key, label } of STANDING_PARTS) {
    const value = components[key]
    if (value === 0) continue
    const shown = formatScoreNumber(value, decimalPlaces)
    parts.push(
      key === 'attendanceScore'
        ? `${label} ${shown} of ${formatScoreNumber(maxAttendance, decimalPlaces)}`
        : `${label} ${shown}`
    )
  }

  return parts.length === 0 ? `${head}: ${STANDING_EMPTY}.` : `${head}: ${parts.join(', ')}.`
}

/**
 * One sentence for the pick position. Rank 50 is the raider's number 1 pick, so
 * the position is 51 - rank. Items and needs share that scale, so there is no
 * need-specific branch (D-22).
 */
export function interestSentence(itemRank: number, voice: 'self' | 'other'): string {
  const head = `${INTEREST_PREFIX} ${itemRank}`
  if (itemRank <= 0) {
    return `${head}: ${voice === 'self' ? INTEREST_NO_PICK_SELF : INTEREST_NO_PICK_OTHER}.`
  }
  const whose = voice === 'self' ? 'your' : 'their'
  return `${head}: ${whose} number ${51 - itemRank} pick.`
}

/**
 * Generate a human-readable explanation of a score result.
 *
 * @param result - Output from computeScore()
 * @param configOrInput - Either a partial ScoringConfig (legacy) or the full ScoreInput for richer context
 * @param opts - Used only when configOrInput is a config; the ScoreInput path ignores it
 */
export function explainScore(
  result: Pick<ScoreResult, 'total' | 'components'>,
  configOrInput: Partial<ScoringConfig> | ScoreInput = {},
  opts: ExplainScoreOptions = {}
): ScoreExplanation {
  // Determine if we got a full ScoreInput or just config
  const isScoreInput = 'itemRank' in configOrInput && 'character' in configOrInput
  const config = isScoreInput ? (configOrInput as ScoreInput).config || {} : configOrInput as Partial<ScoringConfig>
  const input = isScoreInput ? configOrInput as ScoreInput : null

  const c = withDefaults(config)
  const s = result.components
  const lines: ScoreLine[] = []

  // Item rank is always present (1-50)
  lines.push({
    label: 'Item rank',
    value: s.itemRank,
    detail: s.itemRank > 0 ? `Position #${51 - s.itemRank} on your list` : 'No item selected',
    key: 'itemRank',
  })

  // Attendance is always present (0 to max_attendance_bonus)
  lines.push({
    label: 'Attendance',
    value: s.attendanceScore,
    detail: `${c.attendance_type} scoring, ${c.rolling_attendance_weeks}-week window`,
    key: 'attendance',
  })

  if (s.rankModifier !== 0) {
    const rankName = input?.character?.guildRank || undefined
    lines.push({
      label: 'Rank bonus',
      value: s.rankModifier,
      detail: rankName ? `Modifier for "${rankName}" rank` : 'Based on your guild rank',
      key: 'rankModifier',
      ...(rankName ? { context: { rankName } } : {}),
    })
  }

  if (s.roleBonus !== 0) {
    // Resolve the matched role label if we have character context
    let matchedRole: string | undefined
    if (input?.character?.specRoles && input.character.specRoles.length > 0) {
      const roleResult = getRoleModifierWithLabel(input.character.specRoles, config)
      matchedRole = roleResult.matchedRole || undefined
    }
    lines.push({
      label: 'Role bonus',
      value: s.roleBonus,
      detail: matchedRole ? `Bonus for ${matchedRole} role` : 'Based on your raid role (tank, healer, etc.)',
      key: 'roleBonus',
      ...(matchedRole ? { context: { matchedRole } } : {}),
    })
  }

  if (s.priorityBonus !== 0) {
    lines.push({
      label: 'Priority bonus',
      value: s.priorityBonus,
      detail: 'Officers set priority for your role or class on this item',
      key: 'priorityBonus',
    })
  }

  if (s.raiderBonus !== 0) {
    // With the full input, list each active entry's reason and end date (#329).
    // Config-only callers can pass opts with the character id and date to get the same text (GH #357).
    const entries = input
      ? getActiveRaiderBonusEntries(input.character.characterId, input.config, input.asOfDate)
      : getActiveRaiderBonusEntries(opts.characterId ?? null, config, opts.asOfDate)
    lines.push({
      label: 'Raider bonus',
      value: s.raiderBonus,
      detail: entries.length > 0 ? describeRaiderBonusEntries(entries) : RAIDER_BONUS_GENERIC_DETAIL,
      key: 'raiderBonus',
    })
  }

  if (s.trialPenalty !== 0) {
    lines.push({
      label: 'Trial penalty',
      value: s.trialPenalty,
      detail: 'Penalty while on trial membership',
      key: 'trialPenalty',
    })
  }

  if (s.badLuckBonus !== 0) {
    lines.push({
      label: 'Bad luck protection',
      value: s.badLuckBonus,
      detail: `Passed on this item before, bonus capped at ${c.blp_maximum}`,
      key: 'badLuckBonus',
    })
  }

  if (s.donationBonus !== 0) {
    const parts: string[] = []
    switch (c.donation_bonus_type) {
      case 'permanent':
        parts.push('all-time bank donations')
        break
      case 'rolling': {
        const weeks = c.donation_rolling_weeks ?? c.rolling_attendance_weeks
        parts.push(`bank donations, ${weeks}-week window`)
        break
      }
      case 'hard-reset':
        parts.push('bank donations since last reset')
        break
    }
    if (c.donation_cap_enabled) {
      parts.push(`capped at ${c.donation_cap_points}`)
    }
    lines.push({
      label: 'Donation bonus',
      value: s.donationBonus,
      detail: parts.join(', '),
      key: 'donationBonus',
    })
  }

  // Derived here rather than read from the result so a hand-built { total, components }
  // explains exactly like one that came from computeScore.
  const interest = s.itemRank
  const standing = result.total - interest

  return {
    total: result.total,
    lines,
    standing: {
      value: standing,
      sentence: standingSentence(s, standing, {
        maxAttendance: c.max_attendance_bonus,
        decimalPlaces: opts.decimalPlaces ?? DEFAULT_SENTENCE_DECIMALS,
      }),
    },
    interest: {
      value: interest,
      sentence: interestSentence(interest, opts.voice ?? 'self'),
    },
  }
}
