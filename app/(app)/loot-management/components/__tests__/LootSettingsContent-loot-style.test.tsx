import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import LootSettingsContent from '../LootSettingsContent'
import { LOOT_STYLE_PRESETS } from '@/domain/guild/loot-style-presets'

// One stable object: the page reloads its data whenever activeGuild changes
// identity, so a fresh object per render would loop forever.
vi.mock('@/app/contexts/GuildContext', () => {
  const value = {
    activeGuild: { id: 'guild-1', active_expansion_id: null },
    activeMember: { id: 'member-1' },
    loading: false,
    isOfficer: true,
    hasPermission: () => true,
  }
  return { useGuildContext: () => value }
})
vi.mock('@/app/contexts/NotificationContext', () => {
  const value = { showNotification: vi.fn() }
  return { useNotification: () => value }
})
vi.mock('@/app/components/ExpansionGuard', () => ({
  ExpansionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/utils/analytics/client', () => ({ trackClientEvent: vi.fn() }))
vi.mock('@/lib/wowhead', () => ({ refreshWowheadTooltips: vi.fn() }))

// The page lazy-loads its modals and tabs. Run each loader on first render so
// the real SettingsModal mounts, without importing the tabs this test never opens.
vi.mock('next/dynamic', async () => {
  const React = await import('react')
  return {
    default: (loader: () => Promise<unknown>) => {
      function Lazy(props: Record<string, unknown>) {
        const [Component, setComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null)
        React.useEffect(() => {
          let live = true
          void loader().then((mod) => {
            const resolved = (typeof mod === 'function' ? mod : (mod as { default: unknown }).default) as React.ComponentType<Record<string, unknown>>
            if (live) setComponent(() => resolved)
          })
          return () => {
            live = false
          }
        }, [])
        return Component ? <Component {...props} /> : null
      }
      return Lazy
    },
  }
})

// Every table read resolves to an empty result; the page only needs the
// settings route and the empty class, spec and role lists.
vi.mock('@/utils/supabase/client', () => {
  function from() {
    const result = { data: [], error: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (onResolve: (v: unknown) => unknown, onReject: (e: unknown) => unknown) =>
        Promise.resolve(result).then(onResolve, onReject),
    }
    return chain
  }
  return { createClient: () => ({ from }) }
})

interface Recorded {
  url: string
  method: string
  body: { guild_id: string; settings: Record<string, unknown> } | undefined
}

let requests: Recorded[] = []

// An existing guild: no preset chosen and one knob moved off every preset.
const STORED_SETTINGS = {
  ...LOOT_STYLE_PRESETS.reward_attendance.knobs,
  max_attendance_bonus: 3,
  loot_style: null,
  decimal_places: 2,
  rank_modifiers: {},
  role_modifiers: {},
}

function installFetch(settingsStatus = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      requests.push({ url, method, body })

      if (url.startsWith('/api/guild-settings') && method === 'GET') {
        return {
          ok: settingsStatus === 200,
          status: settingsStatus,
          statusText: '',
          json: async () => ({ settings: STORED_SETTINGS }),
        }
      }
      if (url === '/api/guild-settings' && method === 'PUT') {
        return { ok: true, status: 200, json: async () => ({ success: true }) }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    }),
  )
}

beforeEach(() => {
  requests = []
  installFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function openSettingsModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Loot settings/ }))
}

describe('LootSettingsContent loot style autosave', () => {
  it('sends the preset knobs and loot_style in one autosaved PUT after the officer confirms', async () => {
    const user = userEvent.setup()
    render(<LootSettingsContent />)

    // Autosave stays off until 100 ms after the settings load, so it does not
    // fire during hydration; wait that out before editing.
    await screen.findByRole('button', { name: /Loot settings/ })
    await new Promise((resolve) => setTimeout(resolve, 200))
    await openSettingsModal(user)

    await user.click(await screen.findByRole('radio', { name: /Officers decide/ }))
    await user.click(await screen.findByRole('button', { name: 'Use Officers decide, score advises' }))

    await waitFor(() => expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(1))
    const put = requests.find((r) => r.method === 'PUT')!
    expect(put.url).toBe('/api/guild-settings')
    expect(put.body?.guild_id).toBe('guild-1')
    expect(put.body?.settings.loot_style).toBe('officers_decide')
    for (const [key, value] of Object.entries(LOOT_STYLE_PRESETS.officers_decide.knobs)) {
      expect(put.body?.settings[key], key).toBe(value)
    }
  })
})
