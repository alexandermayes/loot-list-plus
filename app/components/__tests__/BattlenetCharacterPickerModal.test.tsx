import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BattlenetCharacterPickerModal } from '../BattlenetCharacterPickerModal'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'

vi.mock('@/app/contexts/GuildContext', () => ({ useGuildContext: vi.fn() }))
vi.mock('@/app/contexts/NotificationContext', () => ({ useNotification: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const NOT_AVAILABLE = 'Not available for WoW Forever yet'

let fetchMock: Mock

function useGuild(game: 'classic' | 'forever') {
  ;(useGuildContext as unknown as Mock).mockReturnValue({
    activeGuild: { id: 'guild-1', game, realm: game === 'forever' ? 'Normal (US)' : 'Benediction' },
    refreshCharacters: vi.fn(),
  })
}

beforeEach(() => {
  ;(useNotification as unknown as Mock).mockReturnValue({ showNotification: vi.fn() })
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ characters: [] }) }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('BattlenetCharacterPickerModal: WoW Forever guilds', () => {
  it('says import is not available and never calls Battle.net', async () => {
    useGuild('forever')
    render(<BattlenetCharacterPickerModal open onClose={() => {}} />)

    expect(await screen.findByText(NOT_AVAILABLE)).toBeInTheDocument()
    expect(screen.getByText(/add your character by hand/)).toBeInTheDocument()
    // No Classic version picker, so a Classic character cannot be imported into a Forever guild.
    expect(screen.queryByRole('combobox', { name: 'Game version' })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('says linking is not available in link mode and never calls Battle.net', async () => {
    useGuild('forever')
    render(
      <BattlenetCharacterPickerModal
        open
        onClose={() => {}}
        mode="link"
        linkCharacterId="char-1"
        linkCharacterName="Thrall"
      />
    )

    expect(await screen.findByText(NOT_AVAILABLE)).toBeInTheDocument()
    expect(screen.getByText('Battle.net linking works with WoW Classic characters only.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still loads Classic characters for a Classic guild', async () => {
    useGuild('classic')
    render(<BattlenetCharacterPickerModal open onClose={() => {}} />)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/battlenet/characters?version=cata-classic')
    )
    expect(screen.getByRole('combobox', { name: 'Game version' })).toBeInTheDocument()
    expect(screen.queryByText(NOT_AVAILABLE)).not.toBeInTheDocument()
  })
})
