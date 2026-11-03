// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// Execute the real CommonJS modules with isolated env/network dependencies.
// No Discord client, database, credentials, or live API calls are needed.
function loadBot(file, env = {}, fetch = vi.fn()) {
  const context = vm.createContext({
    module: { exports: {} }, process: { env }, fetch,
    console: { warn: vi.fn(), error: vi.fn(), log: vi.fn() },
    require(name) {
      if (name === 'discord.js') return { PermissionFlagsBits: {} }
      if (name === '@supabase/supabase-js') return { createClient: vi.fn() }
      if (name === './feedback') return { getSupabase: () => null }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  vm.runInContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context)
  return { context, call: (name) => vm.runInContext(name, context) }
}

const model = 'claude-haiku-4-5-20251001'
const env = { ANTHROPIC_API_KEY: 'test-only', GITHUB_TOKEN: 'test-only', GITHUB_REPO: 'test/repo' }
const reply = (text) => ({ ok: true, json: async () => ({ content: [{ type: 'text', text }] }) })

function expectRequest(fetch, tokens, expectedModel = model) {
  const [url, options] = fetch.mock.calls.find(([url]) => url.includes('api.anthropic.com'))
  expect(url).toBe('https://api.anthropic.com/v1/messages')
  expect(options.method).toBe('POST')
  expect(options.headers['anthropic-version']).toBe('2023-06-01')
  expect(options.headers['x-api-key']).toBe('test-only')
  const body = JSON.parse(options.body)
  expect(Object.keys(body).sort()).toEqual(['max_tokens', 'messages', 'model'])
  expect(body.model).toBe(expectedModel)
  expect(body.max_tokens).toBe(tokens)
  expect(body.messages).toHaveLength(1)
  expect(body.messages[0].role).toBe('user')
  expect(body.messages[0].content).toEqual(expect.any(String))
}

describe('Discord Anthropic requests', () => {
  it('generates a title with Haiku 4.5 and the Messages API contract', async () => {
    const fetch = vi.fn().mockResolvedValue(reply('  Fix missing loot  '))
    const { call } = loadBot('./feedback.js', env, fetch)
    expect(await call('generateTitle')('Missing loot')).toBe('Fix missing loot')
    expectRequest(fetch, 100)
  })

  for (const [name, response] of [
    ['HTTP failure', { ok: false, status: 404 }],
    ['empty content', { ok: true, json: async () => ({ content: [] }) }],
    ['oversized title', reply('x'.repeat(100))],
  ]) {
    it(`preserves the title fallback on ${name}`, async () => {
      const fetch = vi.fn().mockResolvedValue(response)
      const { call, context } = loadBot('./feedback.js', env, fetch)
      expect(await call('generateTitle')('x'.repeat(90))).toBe('x'.repeat(80) + '...')
      if (!response.ok) expect(context.console.warn).toHaveBeenCalledWith('[feedback] title generation failed: 404')
    })
  }

  it('preserves title fallback on network failure and skips requests without a key', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await loadBot('./feedback.js', env, fetch).call('generateTitle')('Bug')).toBe('Bug')
    fetch.mockClear()
    expect(await loadBot('./feedback.js', {}, fetch).call('generateTitle')('Bug')).toBe('Bug')
    expect(fetch).not.toHaveBeenCalled()
  })

  for (const [text, expected] of [['42', 42], ['none', null], ['999', null], ['', null]]) {
    it(`validates duplicate result ${JSON.stringify(text)} against candidates`, async () => {
      const issue = { number: 42, title: 'Missing loot', body: '## Description\nMissing loot' }
      const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [issue] }).mockResolvedValueOnce(reply(text))
      const result = await loadBot('./feedback.js', env, fetch).call('findDuplicate')({ title: 'Missing loot', body: 'Missing loot', labels: ['bug'] })
      expect(result?.number ?? null).toBe(expected)
      expectRequest(fetch, 20)
    })
  }

  it('soft-fails duplicate detection on a retired-model HTTP error', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [{ number: 42 }] }).mockResolvedValueOnce({ ok: false, status: 404 })
    expect(await loadBot('./feedback.js', env, fetch).call('findDuplicate')({ title: 'Bug', body: 'Bug', labels: ['bug'] })).toBeNull()
  })

  for (const override of [undefined, 'claude-sonnet-5']) {
    it(`answers help with ${override ? 'the explicit override' : 'the supported default'}`, async () => {
      const fetch = vi.fn().mockResolvedValue(reply('COVERAGE: covered\n===ANSWER===\nUse your loot list.'))
      const { call } = loadBot('./help.js', { ANTHROPIC_API_KEY: 'test-only', HELP_MODEL: override }, fetch)
      expect((await call('answerQuestion')('How?')).text).toBe('Use your loot list.')
      expectRequest(fetch, 1500, override || model)
    })
  }

  it('defers help to a human on HTTP failure or without a key', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    expect(await loadBot('./help.js', { ANTHROPIC_API_KEY: 'test-only' }, fetch).call('answerQuestion')('How?')).toEqual({ answered: false })
    fetch.mockClear()
    expect(await loadBot('./help.js', {}, fetch).call('answerQuestion')('How?')).toEqual({ answered: false })
    expect(fetch).not.toHaveBeenCalled()
  })
})
