import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { NeedPicker } from '@/app/(app)/loot-list/components/NeedPicker'
import { defaultNeedsFor } from '@/domain/loot/need-defaults'
import { NEED_PICK_RANKS } from '@/domain/loot/need-picks'
import { findNeedDefinition } from '@/domain/loot/needs'

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
    saveSubmission: vi.fn().mockResolvedValue({ ok: true }),
    reopenForEdit: vi.fn().mockResolvedValue(null),
    refreshData: vi.fn(),
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
    // The picker shows its own result, so the editor's toast stays quiet (04-20).
    expect(options.quiet).toBe(true)
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


// ---------------------------------------------------------------------------
// Task 2: rows, sheet, Move up, budget footer, scope line
// ---------------------------------------------------------------------------

type SaveMock = ReturnType<typeof vi.fn>
const saveMock = () => (hoisted.lootList.current as { saveSubmission: SaveMock }).saveSubmission

function sentenceOf(key: string): string {
  return findNeedDefinition(key)!.name
}

/** A saved fan-out of these keys over every tier, the way the picker writes one. */
function savedRankings(keys: ReadonlyArray<string | null>, tiers: readonly string[] = TIERS) {
  const rankings: Record<string, string> = {}
  keys.forEach((key, position) => {
    if (key === null) return
    for (const tierId of tiers) rankings[`${NEED_PICK_RANKS[position]}-${SLOTS[tierId]}`] = `row:${tierId}:${key}`
  })
  return rankings
}

function setSaved(keys: ReadonlyArray<string | null>, extra: Record<string, unknown> = {}) {
  const distinct = [...new Set([...MAGE_DEFAULT, ...keys.filter((key): key is string => key !== null)])]
  setContexts({ lootItems: needRows(distinct), rankings: savedRankings(keys), ...extra })
}

// 1 + 1 + 1 + 3 + 2 = 8 points for the Mage.
const EIGHT_POINTS = [
  'head.cloth.spell-damage',
  'legs.cloth.spell-damage',
  'chest.cloth.spell-damage',
  'main-hand-weapon.spell-damage',
  'ring.spell-damage',
]
// 3 + 3 + 3 + 3 + 2 = 14 points, four Big picks.
const OVER_BUDGET = [
  'two-hand-weapon.spell-damage',
  'main-hand-weapon.spell-damage',
  'trinket.spell-damage',
  'ranged-weapon.spell-damage',
  'ring.spell-damage',
]

describe('NeedPicker rows (D-16, D-04)', () => {
  beforeEach(() => setContexts())

  it('renders one ol with exactly five li and no Move up on row 1', () => {
    render(<NeedPicker />)

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: /^Move .* up to number/ })).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /^Move .* up to number 0$/ })).toBeNull()
  })

  it('names each row button with its number, sentence, cost word and Change', () => {
    render(<NeedPicker />)

    expect(
      screen.getByRole('button', { name: `Number 1: ${sentenceOf(MAGE_DEFAULT[0])}. Big pick. Change.` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Number 3: ${sentenceOf(MAGE_DEFAULT[2])}. Medium pick. Change.` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Number 5: ${sentenceOf(MAGE_DEFAULT[4])}. Standard pick. Change.` }),
    ).toBeInTheDocument()
  })

  it('opens a saved Discovery list as saved, without the default helper', () => {
    setSaved(EIGHT_POINTS)
    render(<NeedPicker />)

    expect(screen.getByRole('button', { name: new RegExp(`^Number 1: ${sentenceOf(EIGHT_POINTS[0])}`) })).toBeInTheDocument()
    expect(screen.queryByText(/We picked these for/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeInTheDocument()
  })

  it('shows the default-list helper for a spec with a default and no saved list', () => {
    render(<NeedPicker />)

    expect(screen.getByText('We picked these for Mage Mage. Tap a row to change it.')).toBeInTheDocument()
  })

  it('opens five empty rows with the no-default helper for a spec without a default', () => {
    setContexts({ lootItems: needRows([]) })
    ;(hoisted.guild.current as { activeCharacter: unknown }).activeCharacter = {
      id: 'char-2',
      name: 'Testchar',
      class: { id: 'class-dk', name: 'Death Knight', color_hex: '#c41e3a' },
      spec: { id: 'spec-blood', name: 'Blood' },
    }
    render(<NeedPicker />)

    expect(screen.getAllByText('Pick a need')).toHaveLength(5)
    expect(screen.getByText('Pick the five gear needs you want most.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeDisabled()
    expect(screen.getByText('Pick all 5 to save. 0 of 5 picked.')).toBeInTheDocument()
  })

  it('shows the Create a character first state when the member has no character', () => {
    ;(hoisted.guild.current as { activeCharacter: unknown }).activeCharacter = null
    render(<NeedPicker />)

    expect(screen.getByText('Create a character first')).toBeInTheDocument()
    expect(
      screen.getByText('You need a character in this guild before you can set your 5.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create character' })).toBeInTheDocument()
  })

  it('keeps Save my 5 for a pending list even when it equals the default', () => {
    setSaved(MAGE_DEFAULT, { submission: { id: 'sub-1', status: 'pending' } })
    render(<NeedPicker />)

    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeInTheDocument()
  })

  it('has no off-spec or rare-drops control', () => {
    const { container } = render(<NeedPicker />)

    expect(container.textContent).not.toMatch(/off-spec/i)
    expect(container.textContent).not.toMatch(/rare/i)
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('stays neutral and tappable: no classification badge, danger palette, grid-cols-2 or flex-row', () => {
    const { container } = render(<NeedPicker />)

    const html = container.innerHTML
    expect(html).not.toMatch(/destructive|danger/)
    expect(html).not.toContain('grid-cols-2')
    expect(html).not.toMatch(/(^|[\s"])flex-row([\s"]|$)/)
    // ClassificationBadge words are Reserved, Limited and Unlimited; cost uses Big, Medium, Standard.
    expect(container.textContent).not.toMatch(/Reserved|Limited|Unlimited/)
    for (const button of container.querySelectorAll('button')) {
      expect(button.className).toMatch(/(^|\s)(h-11|h-12|min-h-11|min-h-14)(\s|$)/)
    }
  })

  it('shows the scope line for three raids and for one', () => {
    const { unmount } = render(<NeedPicker />)
    expect(screen.getByText('One list for all 3 Forever raids this phase.')).toBeInTheDocument()
    unmount()

    setContexts({
      phaseTiers: [{ id: 'tier-a', name: 'a', is_guild_active: true, list_mode: 'discovery' }],
      needTierSlots: { 'tier-a': 1 },
      lootItems: needRows(MAGE_DEFAULT, ['tier-a']),
    })
    render(<NeedPicker />)
    expect(screen.getByText('One list for the Forever raid this phase.')).toBeInTheDocument()
  })
})

describe('NeedPicker Move up (UI-02, D-05)', () => {
  beforeEach(() => setContexts())

  it('swaps a row with the one above and announces the new number', async () => {
    const user = userEvent.setup()
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[2])} up to number 2` }))

    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(within(rows[1]).getByRole('button', { name: new RegExp(`^Number 2: ${sentenceOf(MAGE_DEFAULT[2])}`) })).toBeInTheDocument()
    expect(within(rows[2]).getByRole('button', { name: new RegExp(`^Number 3: ${sentenceOf(MAGE_DEFAULT[1])}`) })).toBeInTheDocument()
    const status = screen.getByText('Moved to number 2.')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('keeps focus on the moved row\'s Move up, or its main button when it lands at number 1', async () => {
    const user = userEvent.setup()
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[2])} up to number 2` }))
    expect(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[2])} up to number 1` })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[2])} up to number 1` }))
    expect(
      screen.getByRole('button', { name: new RegExp(`^Number 1: ${sentenceOf(MAGE_DEFAULT[2])}`) }),
    ).toHaveFocus()
    expect(screen.getByText('Moved to number 1.')).toBeInTheDocument()
  })

  it('saves the moved order as an edit, with Save my 5', async () => {
    const user = userEvent.setup()
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[1])} up to number 1` }))
    await user.click(screen.getByRole('button', { name: 'Save my 5' }))

    const rankings = saveMock().mock.calls[0][1].rankings
    expect(rankings['50-1']).toBe(`row:tier-a:${MAGE_DEFAULT[1]}`)
    expect(rankings['49-1']).toBe(`row:tier-a:${MAGE_DEFAULT[0]}`)
  })

  it('never moves a locked row or swaps another row into a locked position', () => {
    // Rank 48 is the third row; the lock sits on one tier's slot only.
    setContexts({ lockedPositions: { '48-2': { rank: 48, slot: 2, loot_item_id: 'x', locked_at: '2026-01-01T00:00:00Z' } } })
    render(<NeedPicker />)

    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(within(rows[2]).getByRole('button', { name: /^Number 3:/ })).toBeDisabled()
    expect(within(rows[2]).getByRole('button', { name: /^Move .* up to number 2$/ })).toBeDisabled()
    expect(within(rows[3]).getByRole('button', { name: /^Move .* up to number 3$/ })).toBeDisabled()
    expect(within(rows[1]).getByRole('button', { name: /^Move .* up to number 1$/ })).toBeEnabled()
    expect(within(rows[4]).getByRole('button', { name: /^Move .* up to number 4$/ })).toBeEnabled()
  })
})

describe('NeedPicker budget footer (D-07, DISC-03)', () => {
  it('shows the points used with a ten segment meter', () => {
    setSaved(EIGHT_POINTS)
    render(<NeedPicker />)

    const sentence = screen.getByText('8 of 10 points used.')
    expect(sentence).toHaveAttribute('aria-live', 'polite')
    expect(sentence).toHaveAttribute('aria-atomic', 'true')
    const segments = screen.getByTestId('budget-meter').children
    expect(segments).toHaveLength(10)
    expect([...segments].filter((segment) => segment.getAttribute('data-filled') === 'true')).toHaveLength(8)
  })

  it('shows 10 of 10 for the Mage default', () => {
    setContexts()
    render(<NeedPicker />)

    expect(screen.getByText('10 of 10 points used.')).toBeInTheDocument()
  })

  it('disables the button and says how many are picked for three picks', () => {
    setSaved([EIGHT_POINTS[0], EIGHT_POINTS[1], EIGHT_POINTS[2], null, null])
    render(<NeedPicker />)

    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeDisabled()
    expect(screen.getByText('Pick all 5 to save. 3 of 5 picked.')).toBeInTheDocument()
    expect(screen.getByText('3 of 10 points used.')).toBeInTheDocument()
  })

  it('shows the over-budget sentence in a warning panel and disables the button (defensive)', () => {
    setSaved(OVER_BUDGET)
    render(<NeedPicker />)

    const panel = screen.getByText("That's four big picks. Swap a weapon or trinket for armour.")
    expect(panel.className).toContain('bg-warning/10')
    expect(screen.queryByText(/points used\./)).toBeNull()
    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeDisabled()
  })

  it('sticks the footer to the bottom edge with the safe-area padding', () => {
    setContexts()
    const { container } = render(<NeedPicker />)

    const footer = container.querySelector('.sticky')!
    expect(footer.className).toContain('bottom-0')
    expect(footer.className).toContain('border-t')
    expect(footer.className).toContain('env(safe-area-inset-bottom)')
  })
})

describe('NeedPicker question sheet (D-07, D-29)', () => {
  beforeEach(() => setContexts())

  it('blocks a Big slot that would break the budget and says why', async () => {
    const user = userEvent.setup()
    render(<NeedPicker />)

    // Row 4 is a 1 point armour pick at 10 of 10; a Trinket would make 12.
    await user.click(screen.getByRole('button', { name: new RegExp(`^Number 4: ${sentenceOf(MAGE_DEFAULT[3])}`) }))
    const dialog = await screen.findByRole('dialog')
    const trinket = within(dialog).getByRole('button', { name: /^Trinket/ })

    expect(trinket).toHaveAttribute('aria-disabled', 'true')
    await user.click(trinket)
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      "That's three big picks. Swap a weapon or trinket for armour.",
    )
  })

  it('lets a Big pick swap for another Big at 10 of 10 and saves the change', async () => {
    const user = userEvent.setup()
    setContexts({ lootItems: needRows([...MAGE_DEFAULT, 'two-hand-weapon.spell-damage']) })
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: new RegExp(`^Number 1: ${sentenceOf(MAGE_DEFAULT[0])}`) }))
    const dialog = await screen.findByRole('dialog')
    const twoHand = within(dialog).getByRole('button', { name: /^Two-hand weapon/ })
    expect(twoHand).not.toHaveAttribute('aria-disabled', 'true')
    await user.click(twoHand)

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(`^Number 1: ${sentenceOf('two-hand-weapon.spell-damage')}`) }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('10 of 10 points used.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save my 5' }))
    expect(saveMock().mock.calls[0][1].rankings['50-1']).toBe('row:tier-a:two-hand-weapon.spell-damage')
  })

  it('refuses a need already in the list at the tap that would make it', async () => {
    const user = userEvent.setup()
    render(<NeedPicker />)

    // Row 4 is Head, Cloth, Spell damage; picking Legs, Cloth, Spell damage again would repeat row 5.
    await user.click(screen.getByRole('button', { name: new RegExp(`^Number 4: ${sentenceOf(MAGE_DEFAULT[3])}`) }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^Legs/ }))

    // The mage has one armour and one stat for Legs, so the tap finishes the need and is judged at once.
    expect(within(dialog).getByRole('alert')).toHaveTextContent('That need is already in your 5.')
  })
})

describe('NeedPicker loading (UI-SPEC E1 loading)', () => {
  it.each([['isLoading'], ['isContentLoading']])(
    'shows the skeleton with five row shapes and no footer while %s',
    (flag) => {
      setContexts({ [flag]: true })
      const { container } = render(<NeedPicker />)

      expect(screen.getByTestId('need-picker-skeleton')).toBeInTheDocument()
      expect(screen.getAllByTestId('need-picker-skeleton-row')).toHaveLength(5)
      expect(container.querySelector('.sticky')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()
      expect(screen.queryByRole('list')).toBeNull()
    },
  )

  it('swaps the skeleton for the five rows and the footer once the list is in', () => {
    setContexts({ isContentLoading: true })
    const { rerender, container } = render(<NeedPicker />)
    expect(screen.getByTestId('need-picker-skeleton')).toBeInTheDocument()

    setContexts()
    rerender(<NeedPicker />)

    expect(screen.queryByTestId('need-picker-skeleton')).toBeNull()
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(5)
    expect(container.querySelector('.sticky')).not.toBeNull()
  })
})


// ---------------------------------------------------------------------------
// 04-20 Task 1: a server refusal reaches the footer
// ---------------------------------------------------------------------------

const BUDGET_SENTENCE = "That's four big picks. Swap a weapon or trinket for armour."
const budgetRefusal = {
  ok: false,
  code: 'NEED_BUDGET_EXCEEDED',
  message: BUDGET_SENTENCE,
  details: { error: BUDGET_SENTENCE, code: 'NEED_BUDGET_EXCEEDED', used: 14, limit: 10 },
}

describe('NeedPicker server budget refusal (D-07, DISC-03)', () => {
  it('shows the server sentence in the footer warning panel instead of the budget sentence', async () => {
    const user = userEvent.setup()
    setContexts({ saveSubmission: vi.fn().mockResolvedValue(budgetRefusal) })
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Looks right' }))

    const panel = await screen.findByText(BUDGET_SENTENCE)
    expect(panel.className).toContain('bg-warning/10')
    expect(panel.className).not.toMatch(/destructive|danger/)
    expect(screen.queryByText(/points used\./)).toBeNull()
  })

  it('clears the refusal at the next edit', async () => {
    const user = userEvent.setup()
    setContexts({ saveSubmission: vi.fn().mockResolvedValue(budgetRefusal) })
    render(<NeedPicker />)
    await user.click(screen.getByRole('button', { name: 'Looks right' }))
    await screen.findByText(BUDGET_SENTENCE)

    await user.click(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[1])} up to number 1` }))

    expect(screen.queryByText(BUDGET_SENTENCE)).toBeNull()
    expect(screen.getByText('10 of 10 points used.')).toBeInTheDocument()
  })

  it('falls back to the code-less message when the refusal has no details sentence', async () => {
    const user = userEvent.setup()
    setContexts({
      saveSubmission: vi.fn().mockResolvedValue({ ...budgetRefusal, message: 'From the message', details: undefined }),
    })
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Looks right' }))

    expect(await screen.findByText('From the message')).toBeInTheDocument()
  })
})


// ---------------------------------------------------------------------------
// 04-20 Task 2: status block and the approved read-only state
// ---------------------------------------------------------------------------

type Submission = { id: string; status: string; review_notes?: string | null; change_rejected_at?: string | null }
const submissionWith = (status: string, extra: Partial<Submission> = {}): Submission => ({
  id: 'sub-1',
  status,
  review_notes: null,
  change_rejected_at: null,
  ...extra,
})
const statusRegion = () => screen.getAllByRole('status').find((node) => node.hasAttribute('data-need-status'))

describe('NeedPicker status block (D-11, D-27)', () => {
  it('shows no status block before a first submit', () => {
    setSaved(MAGE_DEFAULT)
    render(<NeedPicker />)

    expect(statusRegion()).toBeUndefined()
  })

  it('pending: badge, sentence, editable rows and Save my 5', () => {
    setSaved(EIGHT_POINTS, { submission: submissionWith('pending') })
    render(<NeedPicker />)

    const region = statusRegion()!
    expect(within(region).getByText('Pending')).toBeInTheDocument()
    expect(within(region).getByText('Waiting for an officer to review your 5.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(`^Number 1: ${sentenceOf(EIGHT_POINTS[0])}`) })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeInTheDocument()
  })

  it('needs revision: its badge and the send-back sentence', () => {
    setSaved(EIGHT_POINTS, { submission: submissionWith('needs_revision') })
    render(<NeedPicker />)

    const region = statusRegion()!
    expect(within(region).getByText('Needs Revision')).toBeInTheDocument()
    expect(
      within(region).getByText('Officers sent your 5 back. Change what they asked for, then save to send it again.'),
    ).toBeInTheDocument()
    expect(within(region).queryByText(/Officer note/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Save my 5' })).toBeInTheDocument()
  })

  it('rejected: the officer note follows the sentence', () => {
    setSaved(EIGHT_POINTS, { submission: submissionWith('rejected', { review_notes: 'Pick armour for the legs.' }) })
    render(<NeedPicker />)

    const region = statusRegion()!
    expect(within(region).getByText('Rejected')).toBeInTheDocument()
    expect(within(region).getByText('Officer note: Pick armour for the legs.')).toBeInTheDocument()
  })

  it('wraps a 300 character officer note with no height cap', () => {
    const note = 'x'.repeat(300)
    setSaved(EIGHT_POINTS, { submission: submissionWith('rejected', { review_notes: note }) })
    render(<NeedPicker />)

    const line = within(statusRegion()!).getByText(`Officer note: ${note}`)
    expect(line.className).toContain('break-words')
    expect(statusRegion()!.outerHTML).not.toMatch(/max-h-|overflow-hidden|truncate|line-clamp/)
  })

  it('approved with a rejected recent change keeps the last list and says so', () => {
    setSaved(EIGHT_POINTS, { submission: submissionWith('approved', { change_rejected_at: '2026-01-01T00:00:00Z' }) })
    render(<NeedPicker />)

    const region = statusRegion()!
    expect(within(region).getByText('Approved')).toBeInTheDocument()
    expect(
      within(region).getByText('Your recent changes were rejected. Your last approved list is still active.'),
    ).toBeInTheDocument()
  })

  it('an edit on a pending list shows the Draft sentence', async () => {
    const user = userEvent.setup()
    setSaved(MAGE_DEFAULT, { submission: submissionWith('pending') })
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: `Move ${sentenceOf(MAGE_DEFAULT[1])} up to number 1` }))

    const region = statusRegion()!
    expect(within(region).getByText('Draft')).toBeInTheDocument()
    expect(within(region).getByText('You changed your 5. Save to send it to officers.')).toBeInTheDocument()
  })

  it('a pending list with a Discovery tier short of rows opens as changed and one save sends it', async () => {
    const user = userEvent.setup()
    // tier-c was turned on after the list was saved, so only tiers a and b hold rows.
    const distinct = [...new Set([...MAGE_DEFAULT])]
    setContexts({
      lootItems: needRows(distinct),
      rankings: savedRankings(MAGE_DEFAULT, ['tier-a', 'tier-b']),
      submission: submissionWith('pending'),
    })
    render(<NeedPicker />)

    expect(within(statusRegion()!).getByText('You changed your 5. Save to send it to officers.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save my 5' }))

    const rankings = saveMock().mock.calls[0][1].rankings
    expect(rankings['50-3']).toBe(`row:tier-c:${MAGE_DEFAULT[0]}`)
    expect(Object.keys(rankings)).toHaveLength(15)
  })

  it('an approved list with the same gap keeps Change my 5 and the Approved sentence', () => {
    const distinct = [...new Set([...MAGE_DEFAULT])]
    setContexts({
      lootItems: needRows(distinct),
      rankings: savedRankings(MAGE_DEFAULT, ['tier-a', 'tier-b']),
      submission: submissionWith('approved'),
    })
    render(<NeedPicker />)

    expect(screen.getByRole('button', { name: 'Change my 5' })).toBeInTheDocument()
    expect(within(statusRegion()!).getByText('Officers approved your 5.')).toBeInTheDocument()
  })

  it.each([['pending'], ['rejected'], ['needs_revision']])(
    'with three picks the footer reads the incomplete helper under %s',
    (status) => {
      setSaved([EIGHT_POINTS[0], EIGHT_POINTS[1], EIGHT_POINTS[2], null, null], { submission: submissionWith(status) })
      render(<NeedPicker />)

      expect(screen.getByText('Pick all 5 to save. 3 of 5 picked.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save my 5' })).toBeDisabled()
    },
  )
})

describe('NeedPicker approved list (D-05, D-27)', () => {
  const approved = () => setSaved(EIGHT_POINTS, { submission: submissionWith('approved') })

  it('renders read-only rows with no tap target and no Move up, and an outline Change my 5', () => {
    approved()
    render(<NeedPicker />)

    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    for (const row of rows) expect(within(row).queryByRole('button')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Move/ })).toBeNull()
    expect(screen.getByText(sentenceOf(EIGHT_POINTS[0]))).toBeInTheDocument()
    const change = screen.getByRole('button', { name: 'Change my 5' })
    expect(change.className).toContain('border')
    expect(change.className).not.toContain('bg-primary')
    expect(screen.queryByRole('button', { name: 'Save my 5' })).toBeNull()
  })

  it('opens the Change your 5? confirm and leaves the rows read-only on Keep it', async () => {
    const user = userEvent.setup()
    approved()
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Change my 5' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Change your 5?')).toBeInTheDocument()
    expect(
      within(dialog).getByText('This list is approved. Once you save a change, officers review it again before it counts.'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Change my 5' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Number 1:/ })).toBeNull()
  })

  it('confirming unlocks the rows with no server call, and Save my 5 then saves', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    approved()
    render(<NeedPicker />)

    await user.click(screen.getByRole('button', { name: 'Change my 5' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Change my 5' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save my 5' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: new RegExp(`^Number 1: ${sentenceOf(EIGHT_POINTS[0])}`) })).toBeEnabled()
    // T-04-20-01: unlocking demotes nothing; the audited reopen belongs to the save.
    expect(fetchSpy).not.toHaveBeenCalled()
    expect((hoisted.lootList.current as { reopenForEdit: SaveMock }).reopenForEdit).not.toHaveBeenCalled()
    expect(saveMock()).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save my 5' }))
    expect(saveMock()).toHaveBeenCalledTimes(1)
    expect(saveMock().mock.calls[0][0]).toBe(true)
    vi.unstubAllGlobals()
  })
})

