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
