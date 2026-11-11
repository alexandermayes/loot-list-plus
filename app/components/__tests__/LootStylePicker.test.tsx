import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LootStylePicker } from '../LootStylePicker'
import {
  LOOT_STYLE_PRESETS,
  applyLootStyle,
  presetDiff,
} from '@/domain/guild/loot-style-presets'

// A settings row with a key outside the preset knobs, so the tests also show
// that applying a preset leaves unrelated rules alone.
const BASE = { decimal_places: 2, award_slot_lock_enabled: true, loot_style: null }

function renderSettingsPicker(
  settings: Record<string, unknown>,
  onApply = vi.fn(),
) {
  render(<LootStylePicker variant="settings" settings={settings} onApply={onApply} />)
  return onApply
}

describe('LootStylePicker (settings variant)', () => {
  it('shows the preset the knobs match as selected, with no Custom or Customised badge', () => {
    renderSettingsPicker(applyLootStyle(BASE, 'even_rotation'))

    expect(screen.getByRole('radio', { name: /Even rotation/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Reward attendance/ })).not.toBeChecked()
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    expect(screen.queryByText('Customised')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Reset to/ })).not.toBeInTheDocument()
  })

  it('applies Officers decide at once over matching Reward attendance knobs, without a confirm', async () => {
    const user = userEvent.setup()
    const settings = applyLootStyle(BASE, 'reward_attendance')
    const onApply = renderSettingsPicker(settings)

    await user.click(screen.getByRole('radio', { name: /Officers decide/ }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(applyLootStyle(settings, 'officers_decide'))
    expect(screen.queryByText('Replace your settings?')).not.toBeInTheDocument()
    // The apply leaves rules outside the preset alone.
    expect(onApply.mock.calls[0][0].award_slot_lock_enabled).toBe(true)
  })

  it('asks before replacing customised knobs, naming how many settings change, and Keep my settings changes nothing', async () => {
    const user = userEvent.setup()
    const settings = { ...BASE, ...LOOT_STYLE_PRESETS.reward_attendance.knobs, max_attendance_bonus: 9, blp_enabled: true }
    const n = presetDiff(settings, 'officers_decide').length
    const onApply = renderSettingsPicker(settings)

    await user.click(screen.getByRole('radio', { name: /Officers decide/ }))

    expect(await screen.findByText('Replace your settings?')).toBeInTheDocument()
    expect(
      screen.getByText(
        `Officers decide, score advises will change ${n} settings you set yourself. You can fine-tune them again afterwards.`,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Keep my settings' }))
    expect(onApply).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('Replace your settings?')).not.toBeInTheDocument())
  })

  it('applies the preset after the officer confirms with Use {preset name}', async () => {
    const user = userEvent.setup()
    const settings = { ...BASE, ...LOOT_STYLE_PRESETS.reward_attendance.knobs, max_attendance_bonus: 9 }
    const onApply = renderSettingsPicker(settings)

    await user.click(screen.getByRole('radio', { name: /Even rotation/ }))
    await user.click(await screen.findByRole('button', { name: 'Use Even rotation' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(applyLootStyle(settings, 'even_rotation'))
  })

  it('says "1 setting" when exactly one setting would change', async () => {
    const user = userEvent.setup()
    const oneOff = { ...applyLootStyle(BASE, 'officers_decide'), loot_style: null, blp_enabled: true }
    expect(presetDiff(oneOff, 'officers_decide')).toHaveLength(1)
    renderSettingsPicker(oneOff)

    await user.click(screen.getByRole('radio', { name: /Officers decide/ }))

    expect(
      await screen.findByText(
        'Officers decide, score advises will change 1 setting you set yourself. You can fine-tune them again afterwards.',
      ),
    ).toBeInTheDocument()
  })

  it('with loot_style null shows the Custom row, selects nothing and confirms before applying', async () => {
    const user = userEvent.setup()
    const settings = { ...BASE, max_attendance_bonus: 7 }
    const onApply = renderSettingsPicker(settings)

    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText("Your settings don't match a preset. Pick one to replace them.")).toBeInTheDocument()
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()

    await user.click(screen.getByRole('radio', { name: /Reward attendance/ }))
    expect(await screen.findByText('Replace your settings?')).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('applies at once when loot_style is null but the knobs already equal the preset', async () => {
    const user = userEvent.setup()
    const settings = { ...BASE, ...LOOT_STYLE_PRESETS.even_rotation.knobs }
    const onApply = renderSettingsPicker(settings)

    await user.click(screen.getByRole('radio', { name: /Even rotation/ }))

    // Nothing would change, so there is nothing to ask about.
    expect(screen.queryByText('Replace your settings?')).not.toBeInTheDocument()
    expect(onApply).toHaveBeenCalledWith(applyLootStyle(settings, 'even_rotation'))
  })

  it('marks a preset Customised when the live knobs differ and Reset asks first', async () => {
    const user = userEvent.setup()
    const settings = { ...applyLootStyle(BASE, 'even_rotation'), blp_maximum: 12 }
    const onApply = renderSettingsPicker(settings)

    expect(screen.getByRole('radio', { name: /Even rotation/ })).toBeChecked()
    expect(screen.getByText('Customised')).toBeInTheDocument()
    expect(screen.getByText('You changed some settings from this preset.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset to Even rotation' }))
    expect(
      await screen.findByText(
        'Even rotation will change 1 setting you set yourself. You can fine-tune them again afterwards.',
      ),
    ).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Use Even rotation' }))
    expect(onApply).toHaveBeenCalledWith(applyLootStyle(settings, 'even_rotation'))
  })

  it('reads PostgREST numeric strings as matching, so no Customised badge shows', () => {
    const settings = { ...applyLootStyle(BASE, 'reward_attendance'), max_attendance_threshold: '0.90', bottom_attendance_threshold: '0.25' }
    renderSettingsPicker(settings)

    expect(screen.getByRole('radio', { name: /Reward attendance/ })).toBeChecked()
    expect(screen.queryByText('Customised')).not.toBeInTheDocument()
  })
})

describe('LootStylePicker (create variant)', () => {
  it('shows the value as selected with no status badges and applies a pick at once', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<LootStylePicker variant="create" settings={null} value="reward_attendance" onApply={onApply} />)

    expect(screen.getByRole('radio', { name: /Reward attendance/ })).toBeChecked()
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Even rotation/ }))

    expect(screen.queryByText('Replace your settings?')).not.toBeInTheDocument()
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].loot_style).toBe('even_rotation')
  })

  it('lays the three cards out in a single column', () => {
    render(<LootStylePicker variant="create" settings={null} value="reward_attendance" onApply={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: 'Loot style' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(group.className).toContain('grid-cols-1')
    expect(group.className).not.toContain('md:grid-cols-3')
  })
})

describe('LootStylePicker load states', () => {
  it('while loading disables the three cards and selects nothing', () => {
    render(
      <LootStylePicker
        variant="settings"
        settings={applyLootStyle(BASE, 'even_rotation')}
        loading
        onApply={vi.fn()}
      />,
    )

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    for (const radio of radios) {
      expect(radio).toBeDisabled()
      expect(radio).not.toBeChecked()
    }
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('on a load error shows the alert with Retry loading it and the helper, and leaves nothing selected', async () => {
    const user = userEvent.setup()
    const onRetryLoad = vi.fn()
    render(
      <LootStylePicker
        variant="settings"
        settings={BASE}
        loadError
        onRetryLoad={onRetryLoad}
        onApply={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText("Couldn't load your loot style.")).toBeInTheDocument()
    expect(within(alert).getByText('The settings below still work.')).toBeInTheDocument()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
      expect(radio).not.toBeChecked()
    }
    // Without a loaded loot_style the row would read Custom, which is a claim we cannot make.
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Retry loading it' }))
    expect(onRetryLoad).toHaveBeenCalledTimes(1)
  })
})
