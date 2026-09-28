import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupGuide } from '../SetupGuide'

// Hoisted mutable state so per-test values can be set before render while the
// vi.mock factories below (which vitest hoists to the top of the module) can
// still close over the same objects. Mirrors CreateReserveRunModal.test.tsx.
const { state, client } = vi.hoisted(() => {
  const state = {
    guild: null as { id: string; game?: string } | null,
    activeCharacter: null as { name: string } | null,
    memberCount: 0,
    firstRaidDay: null as string | null,
    approvedSubmissions: 0,
    raidEvents: 0,
    inviteCodes: [] as string[],
    push: vi.fn(),
  }

  const countForTable = (table: string): number => {
    if (table === 'character_guild_memberships') return state.memberCount
    if (table === 'loot_submissions') return state.approvedSubmissions
    if (table === 'raid_events') return state.raidEvents
    return 0
  }

  // select() and eq() return the builder itself; single() resolves the
  // guild_settings row; the builder is also thenable, resolving a
  // { count, error } tuple keyed by which table it was created from, since
  // the member/submission/raid queries end their chain on eq(), not single().
  const makeBuilder = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: () => Promise.resolve({ data: { first_raid_day: state.firstRaidDay }, error: null }),
      then: (resolve: (value: { count: number; error: null }) => void) => {
        resolve({ count: countForTable(table), error: null })
      },
    }
    return builder
  }

  const client = {
    from: vi.fn((table: string) => makeBuilder(table)),
  }

  return { state, client }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}))

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => client,
}))

vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => ({ activeGuild: state.guild, activeCharacter: state.activeCharacter }),
}))

const EM_DASH = String.fromCharCode(0x2014)

function renderGuide(overrides: {
  game: 'classic' | 'forever'
  raidTierStatus: 'loading' | 'none' | 'available'
  hasExpansion: boolean
  memberCount: number
  firstRaidDay: string | null
  approvedSubmissions?: number
  raidEvents?: number
  inviteCodes?: string[]
}) {
  state.guild = { id: 'guild-1', game: overrides.game }
  state.activeCharacter = { name: 'Thrall' }
  state.memberCount = overrides.memberCount
  state.firstRaidDay = overrides.firstRaidDay
  state.approvedSubmissions = overrides.approvedSubmissions ?? 0
  state.raidEvents = overrides.raidEvents ?? 0
  state.inviteCodes = overrides.inviteCodes ?? []

  return render(
    <SetupGuide
      guildId="guild-1"
      guildName="Test Guild"
      guildIconUrl={null}
      hasExpansion={overrides.hasExpansion}
      raidTierStatus={overrides.raidTierStatus}
    />
  )
}

// The live Forever regression case: character and schedule done, invite not
// done, no submissions or raids yet (2 of 5 steps done, 40% fill).
function renderLiveForever() {
  return renderGuide({
    game: 'forever',
    raidTierStatus: 'none',
    hasExpansion: true,
    memberCount: 1,
    firstRaidDay: 'monday',
  })
}

describe('SetupGuide', () => {
  beforeEach(() => {
    localStorage.clear()
    state.guild = null
    state.activeCharacter = null
    state.memberCount = 0
    state.firstRaidDay = null
    state.approvedSubmissions = 0
    state.raidEvents = 0
    state.inviteCodes = []
    state.push.mockClear()
    client.from.mockClear()
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ invite_codes: state.inviteCodes }) } as Response)
    ))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Test 1: progress is one continuous fill by count (2 of 5, 40%)', async () => {
    renderLiveForever()

    expect(await screen.findByText('2 of 5 steps done')).toBeInTheDocument()

    const progressbars = screen.getAllByRole('progressbar')
    expect(progressbars).toHaveLength(1)
    const progress = progressbars[0]
    expect(progress).toHaveAttribute('aria-valuenow', '2')
    expect(progress).toHaveAttribute('aria-valuemax', '5')
    expect(progress).toHaveAttribute('aria-valuetext', '2 of 5 steps done')
    expect(progress.children).toHaveLength(1)
    expect((progress.children[0] as HTMLElement).style.width).toBe('40%')
  })

  it('Test 2: done rows are readable, not buttons, no strikethrough/opacity, sr-only done text', async () => {
    const { container } = renderLiveForever()
    await screen.findByText('2 of 5 steps done')

    expect(screen.getByText('Create your character')).toBeInTheDocument()
    expect(screen.getByText('Set your raid schedule')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create your character/ })).not.toBeInTheDocument()
    expect(container.querySelector('.line-through')).toBeNull()
    expect(container.querySelector('.opacity-40')).toBeNull()

    const srOnlyEls = Array.from(container.querySelectorAll('.sr-only'))
    const doneAnnouncements = srOnlyEls.filter(el => el.textContent === ', done')
    expect(doneAnnouncements).toHaveLength(2)
  })

  it('Test 3: current row is expanded with its description and CTA', async () => {
    renderLiveForever()
    await screen.findByText('2 of 5 steps done')

    const currentButton = screen.getByRole('button', { name: 'Invite your raiders' })
    expect(currentButton).toHaveAttribute('aria-current', 'step')
    expect(currentButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Create an invite link so your raiders can join.')).toBeInTheDocument()

    const cta = screen.getByRole('button', { name: 'Create invite' })
    expect(cta).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(cta)
    expect(state.push).toHaveBeenCalledWith('/guild-settings')
  })

  it('Test 4: waiting rows show the clock, exact note, no chevron, not clickable', async () => {
    renderLiveForever()
    await screen.findByText('2 of 5 steps done')

    expect(screen.getAllByText('Not available for WoW Forever yet')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Get your first loot lists/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Log your first raid/ })).not.toBeInTheDocument()

    const currentEls = document.querySelectorAll('[aria-current]')
    expect(currentEls).toHaveLength(1)
    expect(currentEls[0]).toHaveAccessibleName('Invite your raiders')
  })

  // Orchestrator override (2026-09-27): the current-step number disc sits on
  // the mid-tone accent background, which fails WCAG AA at 11px with a white
  // foreground (~2.5-3:1). It must use the dark foreground already proven on
  // the success disc's check (text-success-foreground, ~5-6:1 on accent in
  // both themes), not text-accent-foreground.
  it('Contrast override: current-step disc uses the dark AA foreground, not white', async () => {
    renderLiveForever()
    await screen.findByText('2 of 5 steps done')

    const currentButton = screen.getByRole('button', { name: 'Invite your raiders' })
    const disc = currentButton.querySelector('[aria-hidden="true"]')
    expect(disc).not.toBeNull()
    expect(disc).toHaveClass('bg-accent')
    expect(disc).toHaveClass('text-success-foreground')
    expect(disc).not.toHaveClass('text-accent-foreground')
  })

  it('Test 5: all non-waiting steps done shows no current row and no celebration', async () => {
    renderGuide({
      game: 'forever',
      raidTierStatus: 'none',
      hasExpansion: true,
      memberCount: 2,
      firstRaidDay: 'monday',
    })

    expect(await screen.findByText('3 of 5 steps done')).toBeInTheDocument()
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
    expect(screen.getAllByText('Not available for WoW Forever yet')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: /is ready for loot/ })).not.toBeInTheDocument()
  })

  it('Test 6: waiting steps become normal upcoming steps once raids exist', async () => {
    renderGuide({
      game: 'forever',
      raidTierStatus: 'available',
      hasExpansion: true,
      memberCount: 1,
      firstRaidDay: 'monday',
    })

    await screen.findByText('2 of 5 steps done')
    expect(screen.queryByText('Not available for WoW Forever yet')).not.toBeInTheDocument()

    const submissionsButton = screen.getByRole('button', { name: 'Get your first loot lists' })
    expect(submissionsButton).toHaveAttribute('aria-expanded', 'false')
    const raidButton = screen.getByRole('button', { name: 'Log your first raid' })
    expect(raidButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('Test 7: renders nothing while Forever raid tiers are loading, never flips on load', async () => {
    state.guild = { id: 'guild-1', game: 'forever' }
    state.activeCharacter = { name: 'Thrall' }
    state.memberCount = 1
    state.firstRaidDay = 'monday'

    const { rerender } = render(
      <SetupGuide
        guildId="guild-1"
        guildName="Test Guild"
        guildIconUrl={null}
        hasExpansion={true}
        raidTierStatus="loading"
      />
    )

    await waitFor(() => {
      expect(client.from).toHaveBeenCalledWith('raid_events')
    })

    expect(screen.queryByRole('heading', { name: /Set up/ })).not.toBeInTheDocument()

    rerender(
      <SetupGuide
        guildId="guild-1"
        guildName="Test Guild"
        guildIconUrl={null}
        hasExpansion={true}
        raidTierStatus="none"
      />
    )

    expect(await screen.findByRole('heading', { name: /Set up/ })).toBeInTheDocument()
    expect(screen.getAllByText('Not available for WoW Forever yet')).toHaveLength(2)
  })

  it('Test 8: Classic guilds render unaffected by raidTierStatus', async () => {
    for (const raidTierStatus of ['none', 'loading'] as const) {
      const { unmount } = renderGuide({
        game: 'classic',
        raidTierStatus,
        hasExpansion: false,
        memberCount: 1,
        firstRaidDay: null,
      })

      expect(await screen.findByText('Choose your expansion')).toBeInTheDocument()
      expect(screen.queryByText('Not available for WoW Forever yet')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Get your first loot lists/ })).toBeInTheDocument()

      unmount()
    }

    renderGuide({
      game: 'classic',
      raidTierStatus: 'none',
      hasExpansion: true,
      memberCount: 1,
      firstRaidDay: null,
    })

    expect(await screen.findByText('2 of 6 steps done')).toBeInTheDocument()
    const progress = screen.getByRole('progressbar')
    const expectedWidth = `${(2 / 6) * 100}%`
    expect((progress.children[0] as HTMLElement).style.width).toBe(expectedWidth)
  })

  it('Test 9: upcoming rows expand via native button keyboard handling', async () => {
    renderGuide({
      game: 'classic',
      raidTierStatus: 'none',
      hasExpansion: true,
      memberCount: 1,
      firstRaidDay: null,
    })

    const currentButton = await screen.findByRole('button', { name: 'Invite your raiders' })
    expect(currentButton).toHaveAttribute('aria-expanded', 'true')

    const scheduleButton = screen.getByRole('button', { name: 'Set your raid schedule' })
    scheduleButton.focus()
    const user = userEvent.setup()
    await user.keyboard('{Enter}')

    expect(scheduleButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Set raid days' })).toBeInTheDocument()
    expect(currentButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('Test 10: no em dash anywhere in the rendered guide', async () => {
    renderLiveForever()
    await screen.findByText('2 of 5 steps done')
    expect(document.body.textContent).not.toContain(EM_DASH)
  })
})
