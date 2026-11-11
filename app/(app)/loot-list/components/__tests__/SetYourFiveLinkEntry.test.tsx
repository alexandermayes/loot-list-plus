import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SetYourFiveLinkEntry } from '@/app/(app)/loot-list/components/SetYourFiveLinkEntry'

// Synthetic ids only: the link entry is exercised with made-up uuids.
const GUILD_A = '11111111-1111-4111-8111-111111111111'
const GUILD_B = '22222222-2222-4222-8222-222222222222'

interface TestCharacter {
  id: string
  is_main: boolean
  created_at: string
}

interface TestMembership {
  guild_id: string
  is_active: boolean
  character: TestCharacter
}

const hoisted = vi.hoisted(() => ({
  search: { current: '' },
  guild: { current: {} as Record<string, unknown> },
  switchGuild: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(hoisted.search.current),
}))
vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => hoisted.guild.current,
}))
// The modal is a dynamic import in the component; the stub proves it opens
// without loading the real form.
vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicStub({ isOpen }: { isOpen?: boolean }) {
      return isOpen ? <div data-testid="create-character-modal" /> : null
    },
}))

function membership(guildId: string, id: string, isMain: boolean, createdAt: string): TestMembership {
  return { guild_id: guildId, is_active: true, character: { id, is_main: isMain, created_at: createdAt } }
}

interface GuildOptions {
  loading?: boolean
  memberOf?: string[]
  memberships?: TestMembership[]
  activeGuildId?: string | null
  activeCharacterId?: string | null
}

function setGuild({
  loading = false,
  memberOf = [GUILD_A, GUILD_B],
  memberships = [],
  activeGuildId = GUILD_B,
  activeCharacterId = null,
}: GuildOptions = {}) {
  hoisted.guild.current = {
    loading,
    userGuilds: memberOf.map((id) => ({ guild: { id } })),
    characterMemberships: memberships,
    activeGuild: activeGuildId ? { id: activeGuildId } : null,
    activeCharacter: activeCharacterId ? { id: activeCharacterId } : null,
    switchGuild: hoisted.switchGuild,
  }
}

beforeEach(() => {
  hoisted.switchGuild.mockReset()
  hoisted.switchGuild.mockResolvedValue(undefined)
  hoisted.search.current = ''
  setGuild()
})

describe('SetYourFiveLinkEntry', () => {
  it('switches once to the main character of the linked guild after the context has loaded', async () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    setGuild({
      memberships: [
        membership(GUILD_A, 'alt', false, '2026-01-01T00:00:00Z'),
        membership(GUILD_A, 'main', true, '2026-03-01T00:00:00Z'),
        membership(GUILD_B, 'other-guild-char', true, '2026-01-01T00:00:00Z'),
      ],
    })
    const { rerender } = render(<SetYourFiveLinkEntry />)

    await waitFor(() => expect(hoisted.switchGuild).toHaveBeenCalledTimes(1))
    expect(hoisted.switchGuild).toHaveBeenCalledWith(GUILD_A, 'main')

    // A re-render for the same link does not switch again.
    rerender(<SetYourFiveLinkEntry />)
    expect(hoisted.switchGuild).toHaveBeenCalledTimes(1)
  })

  it('waits for the guild context to finish loading', () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    setGuild({ loading: true, memberships: [membership(GUILD_A, 'main', true, '2026-01-01T00:00:00Z')] })
    render(<SetYourFiveLinkEntry />)

    expect(hoisted.switchGuild).not.toHaveBeenCalled()
  })

  it('does not switch when the guild and character are already active', () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    setGuild({
      memberships: [membership(GUILD_A, 'main', true, '2026-01-01T00:00:00Z')],
      activeGuildId: GUILD_A,
      activeCharacterId: 'main',
    })
    render(<SetYourFiveLinkEntry />)

    expect(hoisted.switchGuild).not.toHaveBeenCalled()
  })

  it('picks the older character when neither is marked main', async () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    setGuild({
      memberships: [
        membership(GUILD_A, 'newer', false, '2026-05-01T00:00:00Z'),
        membership(GUILD_A, 'older', false, '2026-02-01T00:00:00Z'),
      ],
    })
    render(<SetYourFiveLinkEntry />)

    await waitFor(() => expect(hoisted.switchGuild).toHaveBeenCalledWith(GUILD_A, 'older'))
  })

  it('shows the create-character step for a member with no character in the guild, and opens the modal', async () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    const onBlockingChange = vi.fn()
    setGuild({ memberships: [membership(GUILD_B, 'other-guild-char', true, '2026-01-01T00:00:00Z')], activeGuildId: GUILD_A })
    render(<SetYourFiveLinkEntry onBlockingChange={onBlockingChange} />)

    expect(screen.getByText('Create a character first')).toBeTruthy()
    expect(screen.getByText('You need a character in this guild before you can set your 5.')).toBeTruthy()
    expect(onBlockingChange).toHaveBeenLastCalledWith(true)
    expect(screen.queryByTestId('create-character-modal')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Create character' }))
    expect(screen.getByTestId('create-character-modal')).toBeTruthy()
  })

  it('moves the guild before the modal opens so the new character lands in the linked guild', async () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    // The create-character modal writes into the active guild, so a link to
    // another guild has to switch there first.
    setGuild({ memberships: [], activeGuildId: GUILD_B })
    render(<SetYourFiveLinkEntry />)

    await waitFor(() => expect(hoisted.switchGuild).toHaveBeenCalledWith(GUILD_A))
  })

  it.each([
    ['an invalid guild value', 'guild=not-a-uuid&picker=1'],
    ['no picker parameter', `guild=${GUILD_A}`],
    ['no parameters', ''],
  ])('does nothing for %s', (_label, query) => {
    hoisted.search.current = query
    const onBlockingChange = vi.fn()
    setGuild({ memberships: [membership(GUILD_A, 'main', true, '2026-01-01T00:00:00Z')] })
    const { container } = render(<SetYourFiveLinkEntry onBlockingChange={onBlockingChange} />)

    expect(hoisted.switchGuild).not.toHaveBeenCalled()
    expect(container.innerHTML).toBe('')
    expect(onBlockingChange).not.toHaveBeenCalledWith(true)
  })

  it('ignores a guild the user is not in: no switch, nothing rendered (T-04-13-01)', () => {
    hoisted.search.current = `guild=${GUILD_A}&picker=1`
    const onBlockingChange = vi.fn()
    setGuild({
      memberOf: [GUILD_B],
      // A membership row for a guild missing from userGuilds must still not be followed.
      memberships: [membership(GUILD_A, 'stray', true, '2026-01-01T00:00:00Z')],
    })
    const { container } = render(<SetYourFiveLinkEntry onBlockingChange={onBlockingChange} />)

    expect(hoisted.switchGuild).not.toHaveBeenCalled()
    expect(container.innerHTML).toBe('')
    expect(onBlockingChange).not.toHaveBeenCalledWith(true)
  })
})
