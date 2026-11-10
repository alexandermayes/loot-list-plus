// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { discordFetch } from '@/lib/discord'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn().mockResolvedValue({ user: null }) }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))
vi.mock('@/lib/discord', () => ({ discordFetch: vi.fn() }))

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-only')
  vi.stubEnv('DISCORD_FEEDBACK_WEBHOOK_URL', 'https://example.com/test-webhook')
  vi.stubEnv('GITHUB_TOKEN', '')
  vi.stubEnv('GITHUB_REPO', '')
  vi.mocked(discordFetch).mockResolvedValue(new Response(null, { status: 204 }))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks() })

async function submit() {
  const response = await POST(new Request('https://example.com/api/feedback', {
    method: 'POST', body: JSON.stringify({ description: 'Loot is missing' }),
  }))
  expect(response.status).toBe(200)
  const form = vi.mocked(discordFetch).mock.calls[0][1]?.body as FormData
  return JSON.parse(form.get('payload_json') as string).embeds[0].title
}

describe('feedback title generation', () => {
  it('uses a compatible Haiku 4.5 request and sends its title to Discord', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ content: [{ type: 'text', text: 'Fix missing loot' }] }))
    vi.stubGlobal('fetch', fetch)
    expect(await submit()).toBe('[Bug Report] Fix missing loot')
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(options.method).toBe('POST')
    expect(options.headers['anthropic-version']).toBe('2023-06-01')
    expect(options.headers['x-api-key']).toBe('test-only')
    expect(JSON.parse(options.body)).toEqual({
      model: 'claude-haiku-4-5-20251001', max_tokens: 100,
      messages: [{ role: 'user', content: expect.stringContaining('Loot is missing') }],
    })
  })

  it('logs an HTTP failure without the response body and still submits feedback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private upstream error body', { status: 404 })))
    expect(await submit()).toBe('[Bug Report] Loot is missing')
    expect(console.warn).toHaveBeenCalledExactlyOnceWith('[feedback] title generation failed: 404')
  })

  it('falls back on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await submit()).toBe('[Bug Report] Loot is missing')
  })

  it('falls back on empty model output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ content: [] })))
    expect(await submit()).toBe('[Bug Report] Loot is missing')
  })

  it('does not call Anthropic without a key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await submit()).toBe('[Bug Report] Loot is missing')
    expect(fetch).not.toHaveBeenCalled()
  })
})
