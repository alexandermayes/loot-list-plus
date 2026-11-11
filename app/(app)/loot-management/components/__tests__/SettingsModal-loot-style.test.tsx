import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from '../SettingsModal'
import { LOOT_STYLE_PRESETS, applyLootStyle } from '@/domain/guild/loot-style-presets'

vi.mock('@/app/contexts/NotificationContext', () => {
  const value = { showNotification: vi.fn() }
  return { useNotification: () => value }
})

// The modal reads these fields while rendering; the rest of the settings row is
// not needed to show the disclosure.
const SETTINGS = {
  raid_days_per_week: 2,
  first_raid_day: 2,
  second_raid_day: 1,
  third_raid_day: null,
  fourth_raid_day: null,
  fifth_raid_day: null,
  reset_date: '2026-01-01',
  decimal_places: 2,
  minimum_raid_days_enabled: true,
  minimum_raid_days: 2,
  weekly_attendance_minimum: null,
  week_reset_day: 2,
  new_member_mode: 'raw',
  late_early_penalty_enabled: true,
  late_early_penalty_value: 0.25,
  number_of_ranks: 5,
  rank_modifiers: {},
  role_modifiers: {},
  donation_bonuses_enabled: false,
  donation_cap_enabled: false,
  donation_cap_points: 0,
  donation_bonus_type: 'rolling',
  donation_rolling_weeks: null,
  donation_reset_at: null,
  trial_penalty_enabled: false,
  trial_penalty_value: -2,
  trial_auto_promote_enabled: false,
  trial_auto_promote_weeks: 4,
  new_members_start_as_trial: false,
  blp_includes_benched: false,
  blp_reset_at: null,
  max_allocation_points_per_bracket: 3,
  max_tokens_per_bracket: 1,
  max_category_per_bracket: 1,
  award_slot_lock_enabled: false,
  loot_style: null as string | null,
  ...LOOT_STYLE_PRESETS.reward_attendance.knobs,
}

function renderModal(
  settings: Record<string, unknown>,
  extra: { lootStyleLoad?: 'loading' | 'ready' | 'error'; onRetryLootStyleLoad?: () => void } = {},
) {
  return render(
    <SettingsModal
      open
      onClose={vi.fn()}
      settings={settings}
      setSettings={vi.fn()}
      saveStatus="idle"
      advancedExpanded={false}
      setAdvancedExpanded={vi.fn()}
      guildRoles={[{ name: 'Officer', position: 50 }]}
      lootStyleLoad={extra.lootStyleLoad ?? 'ready'}
      onRetryLootStyleLoad={extra.onRetryLootStyleLoad ?? vi.fn()}
    />,
  )
}

function fineTune() {
  const button = screen.getByRole('button', { name: /Fine-tune/ })
  const regionId = button.getAttribute('aria-controls')
  expect(regionId).toBeTruthy()
  return { button, region: document.getElementById(regionId as string) as HTMLElement }
}

describe('SettingsModal Fine-tune disclosure', () => {
  it('puts the Loot style card first and the General, Attendance and Advanced cards inside the controlled region', () => {
    renderModal({ ...SETTINGS, loot_style: null })

    expect(screen.getByRole('radiogroup', { name: 'Loot style' })).toBeInTheDocument()
    const { button, region } = fineTune()
    expect(button).toHaveAttribute('aria-expanded')
    expect(region).toBeInTheDocument()
    expect(within(region).getByText('General settings')).toBeInTheDocument()
    expect(within(region).getByText('Attendance')).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: /Advanced settings/ })).toBeInTheDocument()
    // The picker is outside the region it controls.
    expect(within(region).queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('starts expanded when loot_style is null', () => {
    renderModal({ ...SETTINGS, loot_style: null })

    const { button, region } = fineTune()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(region).toBeVisible()
  })

  it('starts expanded when the chosen preset is Customised', () => {
    renderModal({ ...applyLootStyle(SETTINGS, 'even_rotation'), blp_maximum: 12 })

    const { button, region } = fineTune()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(region).toBeVisible()
  })

  it('starts collapsed when a preset matches, and the button opens and closes it', async () => {
    const user = userEvent.setup()
    renderModal(applyLootStyle(SETTINGS, 'even_rotation'))

    const { button, region } = fineTune()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(region).not.toBeVisible()

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(region).toBeVisible()

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(region).not.toBeVisible()
  })

  it('while the loot style loads, disables the cards and keeps the settings reachable', () => {
    renderModal({ ...SETTINGS, loot_style: null }, { lootStyleLoad: 'loading' })

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
      expect(radio).not.toBeChecked()
    }
    expect(fineTune().region).toBeVisible()
  })

  it('on a load error shows the alert with Retry, and Fine-tune is expanded', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderModal(applyLootStyle(SETTINGS, 'even_rotation'), { lootStyleLoad: 'error', onRetryLootStyleLoad: onRetry })

    expect(screen.getByText("Couldn't load your loot style.")).toBeInTheDocument()
    expect(screen.getByText('The settings below still work.')).toBeInTheDocument()
    const { button, region } = fineTune()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(region).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Retry loading it' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('decides the starting state once the load finishes, not from the placeholder settings', () => {
    const { rerender } = renderModal({ ...SETTINGS, loot_style: null }, { lootStyleLoad: 'loading' })
    expect(fineTune().button).toHaveAttribute('aria-expanded', 'true')

    rerender(
      <SettingsModal
        open
        onClose={vi.fn()}
        settings={applyLootStyle(SETTINGS, 'officers_decide')}
        setSettings={vi.fn()}
        saveStatus="idle"
        advancedExpanded={false}
        setAdvancedExpanded={vi.fn()}
        guildRoles={[{ name: 'Officer', position: 50 }]}
        lootStyleLoad="ready"
        onRetryLootStyleLoad={vi.fn()}
      />,
    )
    expect(fineTune().button).toHaveAttribute('aria-expanded', 'false')
  })
})
