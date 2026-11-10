// D-04 as amended 2026-10-14 (plan 02-13): every raid icon resolves by game
// plus name. The public join page and its OG share card take the game from the
// run's own expansion, so a Forever run never borrows Classic Onyxia art. The
// plan check found these two surfaces had no automated icon test; this file
// closes that gap by exercising the shipped modules, not a copy of the wiring.
//
// The join page is a 'use client' component, so it renders under jsdom (the
// global vitest.config.ts environment). The OG image is a plain async
// function, so the test calls it and reads a getRaidIconLarge spy.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ReserveJoinPage from '../page'
import OgImage from '../opengraph-image'
import { getRaidIcon, getRaidIconLarge } from '@/utils/raidIcons'

const { imageResponses, tableReads, fixtures } = vi.hoisted(() => ({
  imageResponses: [] as unknown[][],
  tableReads: [] as { table: string; column: string; value: unknown }[],
  fixtures: {
    reserveRun: null as Record<string, unknown> | null,
    raidTierName: "Onyxia's Lair",
    expansionNames: {} as Record<string, string>,
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'share-token' }),
}))

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}))

vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: vi.fn() }),
}))

vi.mock('@/lib/wowhead', () => ({
  refreshWowheadTooltips: vi.fn(),
}))

// Records the constructor arguments so satori never runs.
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(...args: unknown[]) {
      imageResponses.push(args)
    }
  },
}))

// Answers select, eq and single for the three tables the share card reads and
// records each read with its eq value.
vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const read = { table, column: '', value: undefined as unknown }
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          read.column = column
          read.value = value
          tableReads.push(read)
          return chain
        },
        single: () => {
          if (table === 'reserve_runs') return Promise.resolve({ data: fixtures.reserveRun, error: null })
          if (table === 'raid_tiers') return Promise.resolve({ data: { name: fixtures.raidTierName }, error: null })
          if (table === 'expansions') {
            const name = fixtures.expansionNames[String(read.value)]
            return Promise.resolve({ data: name ? { name } : null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
      }
      return chain
    },
  }),
}))

vi.mock('@/utils/raidIcons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/raidIcons')>()
  return {
    ...actual,
    getRaidIconLarge: vi.fn(actual.getRaidIconLarge),
  }
})

const ONYXIA = "Onyxia's Lair"
const CLASSIC_ONYXIA_ART = 'achievement_boss_onyxia'

function joinPayload(expansionName: string | null) {
  return {
    success: true,
    run: {
      id: 'run-1',
      title: 'Icon Test Run',
      status: 'locked',
      raid_at: '2026-10-20T19:00:00.000Z',
      lock_at: '2026-10-20T18:00:00.000Z',
      locked_at: null,
      max_reserves: 2,
      max_reserves_per_item: null,
      allow_duplicates: false,
      enforce_class_restrictions: false,
      visibility: 'public_live',
      rules_note: null,
      discord_invite_url: null,
      hard_reserves: [],
      raid_tier_name: ONYXIA,
      expansion_name: expansionName,
      guild_name: null,
    },
    items: [],
    submissions: [],
    awards: [],
    can_manage: false,
    user_characters: [],
  }
}

function allImageSources(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '')
}

function runCardIcon(container: HTMLElement): string | null {
  return container.querySelector('img.w-14')?.getAttribute('src') ?? null
}

describe('join page raid icon by the run expansion (D-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  async function renderWithExpansion(expansionName: string | null) {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve(joinPayload(expansionName)) } as Response)),
    )
    const view = render(<ReserveJoinPage />)
    await screen.findByText('Icon Test Run')
    return view
  }

  it("expansion_name 'Forever' shows the neutral icon, never the Classic Onyxia art", async () => {
    const { container } = await renderWithExpansion('Forever')

    expect(runCardIcon(container)).toBe(getRaidIcon(ONYXIA, 'forever'))
    for (const src of allImageSources(container)) {
      expect(src).not.toContain(CLASSIC_ONYXIA_ART)
    }
  })

  it("expansion_name 'Classic' keeps the Classic Onyxia icon", async () => {
    const { container } = await renderWithExpansion('Classic')

    expect(runCardIcon(container)).toContain(CLASSIC_ONYXIA_ART)
  })

  it('expansion_name null keeps the Classic Onyxia icon', async () => {
    const { container } = await renderWithExpansion(null)

    expect(runCardIcon(container)).toContain(CLASSIC_ONYXIA_ART)
  })
})

describe('OG share card raid icon by the run expansion (D-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    imageResponses.length = 0
    tableReads.length = 0
    fixtures.raidTierName = ONYXIA
    fixtures.expansionNames = { 'exp-forever': 'Forever', 'exp-classic': 'Classic' }
    // The two font requests; satori never runs because ImageResponse is mocked.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) } as Response)),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function setRun(expansionId: string | null) {
    fixtures.reserveRun = {
      id: 'run-1',
      title: 'Icon Test Run',
      raid_at: '2026-10-20T19:00:00.000Z',
      status: 'open',
      max_reserves: 2,
      raid_tier_id: 'tier-1',
      guild_id: null,
      expansion_id: expansionId,
    }
  }

  async function renderCard() {
    await OgImage({ params: Promise.resolve({ token: 'share-token' }) })
    return vi.mocked(getRaidIconLarge).mock.calls
  }

  it("a 'Forever' expansion row passes 'forever' and reads expansions by the run's expansion_id", async () => {
    setRun('exp-forever')

    const calls = await renderCard()

    expect(calls.at(-1)).toEqual([ONYXIA, 'forever'])
    expect(calls.every((call) => call.length === 2)).toBe(true)
    expect(tableReads).toContainEqual({ table: 'expansions', column: 'id', value: 'exp-forever' })
  })

  it("a 'Classic' expansion row passes 'classic'", async () => {
    setRun('exp-classic')

    const calls = await renderCard()

    expect(calls.at(-1)).toEqual([ONYXIA, 'classic'])
    expect(calls.every((call) => call.length === 2)).toBe(true)
    expect(tableReads).toContainEqual({ table: 'expansions', column: 'id', value: 'exp-classic' })
  })

  it("no expansion_id passes 'classic' and never reads the expansions table", async () => {
    setRun(null)

    const calls = await renderCard()

    expect(calls.at(-1)).toEqual([ONYXIA, 'classic'])
    expect(calls.every((call) => call.length === 2)).toBe(true)
    expect(tableReads.filter((read) => read.table === 'expansions')).toEqual([])
  })
})
