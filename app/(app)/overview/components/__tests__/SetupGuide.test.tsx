import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fs from 'node:fs'
import path from 'node:path'
import { SetupGuide } from '../SetupGuide'
import type { ManifestRaid } from '@/domain/expansion/manifest-schema'

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

// Pass-through wrapper around the real lookup. A test sets lookupState.override
// to feed the list manifest raids the shipped manifest cannot produce today
// (raids whose opening dates differ), without touching any other test.
const lookupState = vi.hoisted(() => ({
  override: null as null | ((names: readonly unknown[]) => Array<{ raid: ManifestRaid; index: number }>),
}))

vi.mock('@/data/expansions/forever/lookup', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/expansions/forever/lookup')>()
  return {
    ...actual,
    foreverRaidsForTierNames: (names: readonly unknown[], raids?: readonly ManifestRaid[]) =>
      lookupState.override ? lookupState.override(names) : actual.foreverRaidsForTierNames(names, raids),
  }
})

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
  raidTierNames?: string[]
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
      raidTierNames={overrides.raidTierNames}
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
    lookupState.override = null
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ invite_codes: state.inviteCodes }) } as Response)
    ))
  })

  // Unmount while fetch is still stubbed: this afterEach runs before
  // vitest.setup.ts's cleanup(), and unmounting flushes any pending effect.
  // SetupGuide's checkSetupProgress effect calls fetch with a relative URL,
  // same ordering hazard as CreateReserveRunModal.test.tsx.
  afterEach(() => {
    cleanup()
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

  // Tracer for plan 02-11 (EXPN-01 visible half, D-01 to D-03, D-06, D-07).
  it('Tracer: a Forever guild with tiers lists its raids and bosses, every boss Unconfirmed', async () => {
    renderGuide({
      game: 'forever',
      raidTierStatus: 'available',
      hasExpansion: true,
      memberCount: 1,
      firstRaidDay: 'monday',
      raidTierNames: ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"],
    })
    await screen.findByText('2 of 5 steps done')

    const region = screen.getByRole('region', { name: 'Your raids' })
    const text = region.textContent ?? ''

    // Manifest size order, with size labels.
    const positions = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"].map(name => text.indexOf(name))
    expect(positions.every(p => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(within(region).getByText('10-player')).toBeInTheDocument()
    expect(within(region).getByText('20-player')).toBeInTheDocument()
    expect(within(region).getByText('40-player')).toBeInTheDocument()

    for (const boss of [
      'Deepscar Matriarch',
      'Khalith the Dreadspinner',
      'Amethrax',
      'Ravus and Darlissa',
      'Elder Tangleclaw',
      'Well of Sorrow',
      "Del'lynar Songwood",
      'Sonya Darkhallow',
      'Onyxia',
    ]) {
      expect(within(region).getByText(boss)).toBeInTheDocument()
    }

    // The word, not colour, marks provisional bosses (8 Barrow Deeps + Onyxia).
    expect(within(region).getAllByText('Unconfirmed')).toHaveLength(9)
    expect(within(region).getAllByText('Boss names are confirmed when the raid opens.')).toHaveLength(2)
    expect(within(region).getAllByText('Bosses to be announced')).toHaveLength(1)
    expect(within(region).getAllByText('Raids open Dec 9')).toHaveLength(1)

    // The steps list and the waiting-row logic are untouched.
    expect(screen.getByRole('button', { name: 'Invite your raiders' })).toBeInTheDocument()
    expect(screen.queryByText('Not available for WoW Forever yet')).not.toBeInTheDocument()
  })

  it('Test 10: no em dash anywhere in the rendered guide', async () => {
    renderLiveForever()
    await screen.findByText('2 of 5 steps done')
    expect(document.body.textContent).not.toContain(EM_DASH)
  })

  // Plan 02-11 Task 2: where and when the Forever raid list appears.
  describe('Forever raid list visibility and resolution (D-02, D-03, D-06)', () => {
    const ALL_TIERS = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]
    const forever = (overrides: Partial<Parameters<typeof renderGuide>[0]> = {}) =>
      renderGuide({
        game: 'forever',
        raidTierStatus: 'available',
        hasExpansion: true,
        memberCount: 1,
        firstRaidDay: 'monday',
        raidTierNames: ALL_TIERS,
        ...overrides,
      })
    const raidsRegion = () => screen.getByRole('region', { name: 'Your raids' })
    const queryRaidsRegion = () => screen.queryByRole('region', { name: 'Your raids' })
    // Waits until the guide has finished its progress queries, then flushes
    // effects, so a "renders nothing" assertion cannot pass while still loading.
    const settle = async () => {
      await waitFor(() => expect(client.from).toHaveBeenCalledWith('raid_events'))
      await act(async () => {})
    }

    it('lists raids in manifest size order whatever order the tier names arrive in', async () => {
      forever({ raidTierNames: [...ALL_TIERS].reverse() })
      await screen.findByText('2 of 5 steps done')

      const text = raidsRegion().textContent ?? ''
      const positions = ALL_TIERS.map(name => text.indexOf(name))
      expect(positions.every(p => p >= 0)).toBe(true)
      expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    })

    it('omits a raid whose tier was deactivated, and shows no announcement note for it', async () => {
      forever({ raidTierNames: ['Barrow Deeps', "Onyxia's Lair"] })
      await screen.findByText('2 of 5 steps done')

      const region = raidsRegion()
      expect(within(region).getByText('Barrow Deeps')).toBeInTheDocument()
      expect(within(region).getByText("Onyxia's Lair")).toBeInTheDocument()
      expect(within(region).queryByText('Hyjal Summit')).not.toBeInTheDocument()
      expect(within(region).queryByText('20-player')).not.toBeInTheDocument()
      expect(within(region).queryByText('Bosses to be announced')).not.toBeInTheDocument()
      expect(within(region).getAllByText('Raids open Dec 9')).toHaveLength(1)
    })

    it('resolves a curly apostrophe and a case change, and skips a name no manifest raid matches', async () => {
      forever({ raidTierNames: ['Onyxia’s Lair', 'barrow deeps', 'Molten Core'] })
      await screen.findByText('2 of 5 steps done')

      const region = raidsRegion()
      expect(within(region).getByText('Barrow Deeps')).toBeInTheDocument()
      expect(within(region).getByText("Onyxia's Lair")).toBeInTheDocument()
      expect(within(region).queryByText('Hyjal Summit')).not.toBeInTheDocument()
      // Tier names are used to match, never displayed.
      expect(region.textContent).not.toContain('Molten Core')
      expect(region.textContent).not.toContain('barrow deeps')
      expect(region.textContent).not.toContain('’')
    })

    it('renders no section when no tier name resolves, and the steps are unaffected', async () => {
      for (const raidTierNames of [['Molten Core'], []]) {
        const { unmount } = forever({ raidTierNames })
        expect(await screen.findByText('2 of 5 steps done')).toBeInTheDocument()
        expect(queryRaidsRegion()).not.toBeInTheDocument()
        expect(screen.queryByText('Unconfirmed')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Invite your raiders' })).toBeInTheDocument()
        unmount()
      }
    })

    it('shows no raid list to a Classic guild, even with Forever tier names and tiers available', async () => {
      renderGuide({
        game: 'classic',
        raidTierStatus: 'available',
        hasExpansion: true,
        memberCount: 1,
        firstRaidDay: 'monday',
        raidTierNames: ALL_TIERS,
      })
      // Character, expansion and schedule done out of Classic's six steps.
      expect(await screen.findByText('3 of 6 steps done')).toBeInTheDocument()
      expect(queryRaidsRegion()).not.toBeInTheDocument()
      expect(screen.queryByText('Unconfirmed')).not.toBeInTheDocument()
    })

    it("shows no raid list while a Forever guild has no tiers ('none'); the waiting rows are unchanged", async () => {
      forever({ raidTierStatus: 'none' })
      await screen.findByText('2 of 5 steps done')

      expect(queryRaidsRegion()).not.toBeInTheDocument()
      // Same assertions as Test 4: exact note, two rows, neither clickable.
      expect(screen.getAllByText('Not available for WoW Forever yet')).toHaveLength(2)
      expect(screen.queryByRole('button', { name: /Get your first loot lists/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Log your first raid/ })).not.toBeInTheDocument()
    })

    it("renders nothing at all while a Forever guild's tiers are loading", async () => {
      const { container } = forever({ raidTierStatus: 'loading' })
      await settle()

      expect(container).toBeEmptyDOMElement()
      expect(queryRaidsRegion()).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Set up/ })).not.toBeInTheDocument()
    })

    it('shows no raid list once the guide is dismissed', async () => {
      localStorage.setItem('setup-guide-dismissed-guild-1', 'true')
      const { container } = forever()
      await settle()

      expect(container).toBeEmptyDOMElement()
      expect(queryRaidsRegion()).not.toBeInTheDocument()
    })

    it('shows the celebration card, not the raid list, once every step is done', async () => {
      forever({ memberCount: 2, approvedSubmissions: 1, raidEvents: 1 })

      expect(await screen.findByRole('heading', { name: /is ready for loot/ })).toBeInTheDocument()
      expect(queryRaidsRegion()).not.toBeInTheDocument()
      expect(screen.queryByText('Unconfirmed')).not.toBeInTheDocument()
    })

    it('renders no em dash anywhere with the raid list showing', async () => {
      forever()
      await screen.findByText('2 of 5 steps done')
      expect(raidsRegion()).toBeInTheDocument()
      expect(document.body.textContent).not.toContain(EM_DASH)
    })

    it('shows the opening day as Dec 9 in any process timezone (UTC formatting, D-06)', async () => {
      const originalTz = process.env.TZ
      try {
        for (const tz of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
          process.env.TZ = tz
          // Proves the runner honours the change: west of UTC, local-time
          // formatting of Dec 9 00:00Z would read Dec 8.
          if (tz === 'America/Los_Angeles') {
            expect(new Date('2026-12-09T00:00:00Z').getDate()).toBe(8)
          }
          const { unmount } = forever()
          await screen.findByText('2 of 5 steps done')
          expect(within(raidsRegion()).getAllByText('Raids open Dec 9')).toHaveLength(1)
          unmount()
        }
      } finally {
        if (originalTz === undefined) delete process.env.TZ
        else process.env.TZ = originalTz
      }
    })

    it("shows each raid's own 'Opens' line when the opening dates differ, and none when a raid has no date", async () => {
      const real = (await vi.importActual<typeof import('@/data/expansions/forever/lookup')>(
        '@/data/expansions/forever/lookup'
      )).foreverRaidsForTierNames(ALL_TIERS)
      const opens = ['2026-12-09', '2026-12-16', null]
      lookupState.override = () =>
        real.map(({ raid, index }, i) => ({ raid: { ...raid, opens_on: opens[i] }, index }))

      forever()
      await screen.findByText('2 of 5 steps done')

      const region = raidsRegion()
      expect(within(region).queryByText(/^Raids open/)).not.toBeInTheDocument()
      expect(within(region).getAllByText('Opens Dec 9')).toHaveLength(1)
      expect(within(region).getAllByText('Opens Dec 16')).toHaveLength(1)
      expect(within(region).getAllByText(/^Opens /)).toHaveLength(2)
      expect(region.textContent).not.toContain(EM_DASH)
    })
  })

  // D-02: the raid list is reachable only through the setup guide, so the
  // lookup module has exactly two production importers.
  describe('forever/lookup importers (D-02)', () => {
    const REPO_ROOT = path.resolve(__dirname, '../../../../..')
    const SCAN_ROOTS = ['app', 'lib', 'utils', 'domain', 'components', 'data']
    const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])
    const ALLOWED = [
      'app/(app)/overview/components/SetupGuide.tsx',
      'app/services/expansionCatalogSync.ts',
    ]
    const ALIAS_IMPORT = /(?:from|import\(|require\()\s*['"][^'"]*forever\/lookup['"]/
    // data/expansions/forever files may reach it relatively.
    const SIBLING_IMPORT = /(?:from|import\(|require\()\s*['"]\.\/lookup['"]/

    function collect(dir: string, out: string[]): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) collect(full, out)
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
          out.push(full)
        }
      }
    }

    it('only SetupGuide and the catalog sync import data/expansions/forever/lookup', () => {
      const files: string[] = []
      for (const root of SCAN_ROOTS) collect(path.join(REPO_ROOT, root), files)
      // Guards against a wrong REPO_ROOT making the scan pass on nothing.
      expect(files.length).toBeGreaterThan(100)

      const importers = files
        .filter(file => {
          const source = fs.readFileSync(file, 'utf8')
          const inForeverDir = path.dirname(file) === path.join(REPO_ROOT, 'data/expansions/forever')
          return ALIAS_IMPORT.test(source) || (inForeverDir && SIBLING_IMPORT.test(source))
        })
        .map(file => path.relative(REPO_ROOT, file).split(path.sep).join('/'))
        .sort()

      expect(importers).toEqual([...ALLOWED].sort())
    })
  })
})
