// jsdom (the global vitest.config.ts environment) — this exercises the
// server component tree directly, not through Next's server runtime.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'fs'
import path from 'path'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { makeFakeAddonDb } from '@/lib/addon/__tests__/fake-addon-db'
import { COMPANION_REDIRECT_URI } from '@/lib/addon/companion-auth'
import { buildSignInPath } from '@/lib/post-auth-redirect'
import Page, { metadata } from '../page'
import { COMPANION_AUTHORIZE_COPY } from '../GuildPicker'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))

class RedirectSignal extends Error {
  url: string
  constructor(url: string) {
    super('NEXT_REDIRECT')
    this.url = url
  }
}

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url)
  },
}))

const USER_ID = 'user-1'
const CHALLENGE = 'A'.repeat(43)
const VALID_PARAMS = {
  response_type: 'code',
  code_challenge: CHALLENGE,
  code_challenge_method: 'S256',
  redirect_uri: COMPANION_REDIRECT_URI,
}
const CANONICAL_QUERY = new URLSearchParams(VALID_PARAMS).toString()

function allText(container: HTMLElement): string[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const out: string[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim()
    if (text) out.push(text)
  }
  return out
}

describe('GH #300: /companion/authorize picker page', () => {
  let fake: ReturnType<typeof makeFakeAddonDb>

  beforeEach(() => {
    vi.clearAllMocks()
    fake = makeFakeAddonDb()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
  })

  it('metadata title equals the signed-off C-01 copy', () => {
    expect(metadata.title).toEqual({ absolute: COMPANION_AUTHORIZE_COPY.title })
  })

  it('invalid params render C-08 and C-09, with no DB call', async () => {
    const element = await Page({ searchParams: Promise.resolve({}) })
    render(element)

    expect(screen.getByText(COMPANION_AUTHORIZE_COPY.invalidHeading)).toBeInTheDocument()
    expect(screen.getByText(COMPANION_AUTHORIZE_COPY.invalidBody)).toBeInTheDocument()
    expect(getAuthenticatedUser).not.toHaveBeenCalled()
    expect(fake.tables.addon_auth_codes).toHaveLength(0)
  })

  it('signed-out with valid params redirects to buildSignInPath of the canonical authorize path', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)

    let caught: RedirectSignal | null = null
    try {
      await Page({ searchParams: Promise.resolve(VALID_PARAMS) })
    } catch (err) {
      caught = err as RedirectSignal
    }

    expect(caught).toBeInstanceOf(RedirectSignal)
    expect(caught?.url).toBe(buildSignInPath(`/api/addon/auth?${CANONICAL_QUERY}`))
    expect(fake.tables.addon_auth_codes).toHaveLength(0)
  })

  it('zero officer guilds render C-06 and C-07', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false } as never)

    const element = await Page({ searchParams: Promise.resolve(VALID_PARAMS) })
    render(element)

    expect(screen.getByText(COMPANION_AUTHORIZE_COPY.noGuildsHeading)).toBeInTheDocument()
    expect(screen.getByText(COMPANION_AUTHORIZE_COPY.noGuildsBody)).toBeInTheDocument()
    expect(fake.tables.addon_auth_codes).toHaveLength(0)
  })

  it('mixed memberships list only officer guilds (plus a creator-only guild), sorted by name, as submit buttons in one form', async () => {
    const GUILD_ZEPHYR = 'guild-zephyr' // active membership, officer: true
    const GUILD_ALPHA = 'guild-alpha' // active membership, officer: false — must not render
    const GUILD_MID = 'guild-mid' // creator-only, no membership row, officer: true

    fake = makeFakeAddonDb({
      characters: [{ id: 'char-1', user_id: USER_ID }],
      character_guild_memberships: [
        { character_id: 'char-1', guild_id: GUILD_ZEPHYR, is_active: true },
        { character_id: 'char-1', guild_id: GUILD_ALPHA, is_active: true },
      ],
      guilds: [
        { id: GUILD_ZEPHYR, name: 'Zephyr Raiders', realm: 'Faerlina', created_by: null },
        { id: GUILD_ALPHA, name: 'Alpha Raiders', realm: null, created_by: null },
        { id: GUILD_MID, name: 'Mid Raiders', realm: null, created_by: USER_ID },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockImplementation(async (_supabase, _userId, guildId) => {
      return { hasPermission: guildId === GUILD_ZEPHYR || guildId === GUILD_MID } as never
    })

    const element = await Page({ searchParams: Promise.resolve(VALID_PARAMS) })
    const { container } = render(element)

    expect(screen.getByText(COMPANION_AUTHORIZE_COPY.chooseGuildHeading)).toBeInTheDocument()
    expect(screen.queryByText('Alpha Raiders')).not.toBeInTheDocument()

    const form = container.querySelector('form')!
    expect(form.getAttribute('method')).toBe('post')
    expect(form.getAttribute('action')).toBe(`/api/addon/auth?${CANONICAL_QUERY}`)

    const buttons = Array.from(form.querySelectorAll('button[type="submit"]')) as HTMLButtonElement[]
    expect(buttons.map((b) => b.getAttribute('name'))).toEqual(['guild_id', 'guild_id'])
    expect(buttons.map((b) => b.getAttribute('value'))).toEqual([GUILD_MID, GUILD_ZEPHYR])
    expect(buttons[0].textContent).toContain('Mid Raiders')
    expect(buttons[1].textContent).toContain('Zephyr Raiders')
    expect(buttons[1].textContent).toContain('Faerlina')

    expect(fake.tables.addon_auth_codes).toHaveLength(0)
  })

  it('renders only the signed-off copy, with no em dash anywhere', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false } as never)

    const element = await Page({ searchParams: Promise.resolve(VALID_PARAMS) })
    const { container } = render(element)

    const rendered = allText(container)
    const allowed = new Set<string>(Object.values(COMPANION_AUTHORIZE_COPY))
    for (const text of rendered) {
      expect(allowed.has(text)).toBe(true)
    }
    expect(container.textContent).not.toContain('—')
  })
})

describe('GH #300: CSP form-action allows the companion scheme exactly once', () => {
  it("next.config.ts's form-action directive reads \"form-action 'self' lootlistplus:\"", () => {
    const configPath = path.resolve(__dirname, '../../../../next.config.ts')
    const contents = readFileSync(configPath, 'utf8')
    const nonCommentLines = contents.split('\n').filter((line) => !line.trim().startsWith('//'))
    const matches = nonCommentLines.filter((line) => line.includes("form-action 'self' lootlistplus:"))
    expect(matches).toHaveLength(1)
  })
})
