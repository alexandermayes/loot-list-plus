import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScoreBreakdownModal from '../ScoreBreakdownModal'

const BODY = 'Officers can give a raider a bonus or penalty on every item, either permanent or for set dates, like a reward for full enchants next week. Your dashboard shows each bonus, its reason and when it ends.'

function renderWith(guildSettings: Parameters<typeof ScoreBreakdownModal>[0]['guildSettings']) {
  render(<ScoreBreakdownModal open onClose={() => {}} guildSettings={guildSettings} />)
}

describe('ScoreBreakdownModal raider bonus section (#329)', () => {
  it('explains raider bonuses and adds them to the formula when they are on', () => {
    renderWith({ single_raider_overall_bonus: true })

    expect(screen.getByRole('heading', { name: 'Raider bonus' })).toBeInTheDocument()
    expect(screen.getByText('Set by officers')).toBeInTheDocument()
    expect(screen.getByText(BODY)).toBeInTheDocument()
    expect(screen.getByText(/\+ Raider Bonus/)).toBeInTheDocument()
  })

  it.each([
    ['off', { single_raider_overall_bonus: false }],
    ['null', { single_raider_overall_bonus: null }],
    ['missing', {}],
  ])('leaves raider bonuses out when the setting is %s', (_name, settings) => {
    renderWith(settings)

    expect(screen.queryByRole('heading', { name: 'Raider bonus' })).not.toBeInTheDocument()
    expect(screen.queryByText(BODY)).not.toBeInTheDocument()
    expect(screen.queryByText(/\+ Raider Bonus/)).not.toBeInTheDocument()
  })

  it('leaves raider bonuses out when settings have not loaded', () => {
    renderWith(null)

    expect(screen.queryByRole('heading', { name: 'Raider bonus' })).not.toBeInTheDocument()
    expect(screen.queryByText(/\+ Raider Bonus/)).not.toBeInTheDocument()
  })
})

// D-21: the modal opens with the two halves of a score in two short paragraphs.
// DRAFT copy: the owner signs it off in 04-19.
const STANDING_PARAGRAPH = 'Standing is what you bring to the raid: attendance, bad luck protection and officer bonuses.'
const INTEREST_PARAGRAPH = 'Interest is how much you want the item. It comes from where you put it on your list.'

describe('ScoreBreakdownModal standing and interest explainer (D-21)', () => {
  it('opens with the standing and interest paragraphs in that order', () => {
    renderWith({})

    const standing = screen.getByText(STANDING_PARAGRAPH)
    const interest = screen.getByText(INTEREST_PARAGRAPH)
    expect(standing.tagName).toBe('P')
    expect(interest.tagName).toBe('P')
    expect(standing.compareDocumentPosition(interest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts both paragraphs before the formula and the component cards', () => {
    renderWith({})

    const interest = screen.getByText(INTEREST_PARAGRAPH)
    const formula = screen.getByText(/^Score = Item Rank/)
    const firstCard = screen.getByRole('heading', { name: 'Item rank' })
    expect(interest.compareDocumentPosition(formula) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(interest.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the paragraphs when settings have not loaded, in the secondary text colour', () => {
    renderWith(null)

    expect(screen.getByText(STANDING_PARAGRAPH).className).toContain('text-foreground-secondary')
    expect(screen.getByText(INTEREST_PARAGRAPH).className).toContain('text-foreground-secondary')
  })

  it('writes no em dash', () => {
    renderWith({ single_raider_overall_bonus: true, trial_penalty_enabled: true })

    expect(document.body.textContent).not.toContain(String.fromCharCode(0x2014))
  })
})
