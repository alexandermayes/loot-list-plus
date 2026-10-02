import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import AddonPage from '../_client'

// Hoisted mutable state so each test can set the active guild before render
// while the hoisted vi.mock factory closes over the same object.
const { state } = vi.hoisted(() => ({
  state: { guild: null as { id: string } | null },
}))

vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => ({ activeGuild: state.guild }),
}))

vi.mock('@/components/addon/AddonExportDialog', () => ({
  AddonExportDialog: () => null,
}))

vi.mock('@/components/addon/AddonImportDialog', () => ({
  AddonImportDialog: () => null,
}))

// AP-2, signed off 2026-10-02 (quick task 261002-k0n), until the store
// listings exist.
const AP2 = 'Copy the LootList+ addon folder into your WoW AddOns folder. Ask us on Discord for the latest version.'

describe('admin addon page download line', () => {
  beforeEach(() => {
    state.guild = { id: 'guild-1' }
  })

  afterEach(() => {
    cleanup()
    state.guild = null
  })

  it('P1 shows the AP-2 line', () => {
    render(<AddonPage />)
    expect(screen.getByText(AP2)).toBeInTheDocument()
  })

  it('P2 no longer names a store the addon is not listed on', () => {
    render(<AddonPage />)
    expect(screen.queryByText(/CurseForge/)).toBeNull()
  })

  it('P3 still shows the no-guild message without an active guild', () => {
    state.guild = null
    render(<AddonPage />)
    expect(screen.getByText('No active guild selected.')).toBeInTheDocument()
  })
})
