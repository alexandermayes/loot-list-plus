import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { NeedPicker } from '@/app/(app)/loot-list/components/NeedPicker'
import { defaultNeedsFor } from '@/domain/loot/need-defaults'

// The picker reads two contexts. Both are replaced with plain objects so the
// tests state exactly what the picker is given and what it hands back.
const hoisted = vi.hoisted(() => ({
  lootList: { current: {} as Record<string, unknown> },
  guild: { current: {} as Record<string, unknown> },
}))

vi.mock('@/app/contexts/LootListContext', () => ({
  useLootList: () => hoisted.lootList.current,
}))
vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => hoisted.guild.current,
}))

const TIERS = ['tier-a', 'tier-b', 'tier-c'] as const
const SLOTS: Record<string, number> = { 'tier-a': 1, 'tier-b': 2, 'tier-c': 3 }

function needRows(keys: readonly string[], tiers: readonly string[] = TIERS) {
  return tiers.flatMap((tierId) =>
    keys.map((key) => ({
      id: `row:${tierId}:${key}`,
      name: key,
      boss_name: 'Needs',
      item_slot: 'Need',
      wowhead_id: null,
      kind: 'need',
      need_key: key,
      raid_tier_id: tierId,
    })),
  )
}

const MAGE_DEFAULT = defaultNeedsFor('Mage', 'Mage') as readonly string[]

function setContexts(overrides: Record<string, unknown> = {}) {
  hoisted.lootList.current = {
    lootItems: needRows(MAGE_DEFAULT),
    submission: null,
    rankings: {},
    phaseTiers: TIERS.map((id) => ({ id, name: id, is_guild_active: true, list_mode: 'discovery' })),
    needTierSlots: SLOTS,
    lockedPositions: {},
    isLoading: false,
    isContentLoading: false,
    isSaving: false,
    saveSubmission: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  hoisted.guild.current = {
    activeCharacter: {
      id: 'char-1',
      name: 'Testchar',
      class: { id: 'class-mage', name: 'Mage', color_hex: '#3fc7eb' },
      spec: { id: 'spec-mage', name: 'Mage' },
    },
    activeGuild: { id: 'guild-1' },
  }
}

describe('NeedPicker tracer (D-11, D-27)', () => {
  beforeEach(() => setContexts())

  it('shows the Mage default as five rows and one Looks right button', () => {
    render(<NeedPicker />)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Looks right' })).toBeEnabled()
  })

  it('saves and submits the default as fifteen rows in one call', async () => {
    const user = userEvent.setup()
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Looks right' }))

    const { saveSubmission } = hoisted.lootList.current as { saveSubmission: ReturnType<typeof vi.fn> }
    expect(saveSubmission).toHaveBeenCalledTimes(1)
    const [submit, options] = saveSubmission.mock.calls[0]
    expect(submit).toBe(true)
    expect(Object.keys(options.rankings).sort()).toEqual(
      ['50', '49', '48', '47', '46'].flatMap((rank) => [1, 2, 3].map((slot) => `${rank}-${slot}`)).sort(),
    )
    // Need 1 of the default sits at rank 50 and fans out over every tier's slot.
    expect(options.rankings['50-1']).toBe(`row:tier-a:${MAGE_DEFAULT[0]}`)
    expect(options.rankings['50-2']).toBe(`row:tier-b:${MAGE_DEFAULT[0]}`)
    expect(options.rankings['46-3']).toBe(`row:tier-c:${MAGE_DEFAULT[4]}`)
  })

  it('does not save when a Discovery tier has no need row for a pick', async () => {
    const user = userEvent.setup()
    // tier-c lacks its rows, so saving would write fewer rows than the tiers need.
    setContexts({ lootItems: needRows(MAGE_DEFAULT, ['tier-a', 'tier-b']) })
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Looks right' }))

    const { saveSubmission } = hoisted.lootList.current as { saveSubmission: ReturnType<typeof vi.fn> }
    expect(saveSubmission).not.toHaveBeenCalled()
  })

  it('carries over a saved row the picker cannot see', async () => {
    const user = userEvent.setup()
    // A turned-off tier keeps its slot but serves no rows, so its saved rows ride along.
    setContexts({
      phaseTiers: [
        { id: 'tier-a', name: 'a', is_guild_active: true, list_mode: 'discovery' },
        { id: 'tier-b', name: 'b', is_guild_active: true, list_mode: 'discovery' },
        { id: 'tier-c', name: 'c', is_guild_active: false, list_mode: 'discovery' },
      ],
      lootItems: needRows(MAGE_DEFAULT, ['tier-a', 'tier-b']),
      rankings: { '50-3': 'hidden-row-50', '49-3': 'hidden-row-49' },
    })
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Looks right' }))

    const { saveSubmission } = hoisted.lootList.current as { saveSubmission: ReturnType<typeof vi.fn> }
    const rankings = saveSubmission.mock.calls[0][1].rankings
    expect(rankings['50-3']).toBe('hidden-row-50')
    expect(rankings['49-3']).toBe('hidden-row-49')
    expect(Object.keys(rankings)).toHaveLength(10 + 2)
  })
})
