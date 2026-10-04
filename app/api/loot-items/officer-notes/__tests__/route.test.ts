// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
//
// Quick task 261004-gxi: officer notes on loot items are readable only
// through this route, after the Manage loot permission check, for the
// caller's guild's active expansion.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const EXPANSION_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const TIER_1 = 'cccccccc-0000-0000-0000-000000000001'
const TIER_2 = 'cccccccc-0000-0000-0000-000000000002'
const ITEM_1 = 'dddddddd-0000-0000-0000-000000000001'
const ITEM_2 = 'dddddddd-0000-0000-0000-000000000002'
const C1_TEXT = 'guild_id and expansion_id are required'
const C2_TEXT = 'Expansion not found in this guild'

type Op = { method: string; args: unknown[] }
type Call = { table: string; ops: Op[] }

type ResultRow = { id: string; officer_notes: string | null }
type QueryResult<T> = { data: T | null; error: { message: string } | null }

/**
 * Recording fake client. Resolves expansions, raid_tiers and loot_items
 * queries from the test's fixtures; every chained call (select, eq, in,
 * not, order, range, maybeSingle) is recorded on the table's Call entry.
 */
function makeClient(opts: {
  expansion?: QueryResult<{ id: string }>
  raidTiers?: QueryResult<Array<{ id: string }>>
  lootItemsPages?: Array<QueryResult<ResultRow[]>>
} = {}) {
  const calls: Call[] = []

  function from(table: string) {
    const call: Call = { table, ops: [] }
    calls.push(call)
    const record = (method: string) => (...args: unknown[]) => {
      call.ops.push({ method, args })
      return builder
    }
    const resolve = (): QueryResult<unknown> => {
      if (table === 'expansions') {
        return opts.expansion ?? { data: null, error: null }
      }
      if (table === 'raid_tiers') {
        return opts.raidTiers ?? { data: [], error: null }
      }
      if (table === 'loot_items') {
        const rangeOp = call.ops.find((o) => o.method === 'range')
        const [start] = (rangeOp?.args ?? [0, 999]) as [number, number]
        const pageIndex = Math.floor(start / 1000)
        return opts.lootItemsPages?.[pageIndex] ?? { data: [], error: null }
      }
      return { data: null, error: null }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: record('select'),
      eq: record('eq'),
      in: record('in'),
      not: record('not'),
      order: record('order'),
      range: record('range'),
      maybeSingle: record('maybeSingle'),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(res, rej),
    }
    return builder
  }

  const callsFor = (table: string) => calls.filter((c) => c.table === table)
  const filtersOf = (call: Call) =>
    call.ops.filter((o) => o.method === 'eq' || o.method === 'in' || o.method === 'not').map((o) => [o.method, ...o.args])

  return { client: { from }, calls, callsFor, filtersOf }
}

function get(params: Record<string, string>) {
  const search = new URLSearchParams(params).toString()
  return GET(new NextRequest(`http://localhost/api/loot-items/officer-notes?${search}`))
}

describe('GET /api/loot-items/officer-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('R1: no user: 401, and createServiceRoleClient is never called', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: null } as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('R2: missing guild_id or expansion_id: 400 with the required-params text', async () => {
    const resNoExpansion = await get({ guild_id: GUILD_ID })
    expect(resNoExpansion.status).toBe(400)
    expect(await resNoExpansion.json()).toEqual({ error: C1_TEXT })

    const resNoGuild = await get({ expansion_id: EXPANSION_ID })
    expect(resNoGuild.status).toBe(400)
    expect(await resNoGuild.json()).toEqual({ error: C1_TEXT })
  })

  it('R3: no manage_loot permission: 403 with the permission error, verifyPermission called once, no other query', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false, error: 'Insufficient permissions' } as never)
    const fake = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Insufficient permissions' })
    expect(verifyPermission).toHaveBeenCalledTimes(1)
    expect(verifyPermission).toHaveBeenCalledWith(fake.client, 'user-1', GUILD_ID, 'manage_loot')
    expect(fake.calls).toEqual([])
  })

  it('R4: the expansion is not the guild\'s: 404, the lookup recorded both filters, no loot_items query', async () => {
    const fake = makeClient({ expansion: { data: null, error: null } })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: C2_TEXT })
    expect(fake.callsFor('expansions')).toHaveLength(1)
    expect(fake.filtersOf(fake.callsFor('expansions')[0])).toEqual([
      ['eq', 'id', EXPANSION_ID],
      ['eq', 'guild_id', GUILD_ID],
    ])
    expect(fake.callsFor('loot_items')).toEqual([])
  })

  it('R5: happy path, a blank note skipped, Cache-Control set, loot_items filtered and ordered', async () => {
    const fake = makeClient({
      expansion: { data: { id: EXPANSION_ID }, error: null },
      raidTiers: { data: [{ id: TIER_1 }, { id: TIER_2 }], error: null },
      lootItemsPages: [
        {
          data: [
            { id: ITEM_1, officer_notes: 'Note one' },
            { id: ITEM_2, officer_notes: 'Note two' },
            { id: 'eeeeeeee-0000-0000-0000-000000000003', officer_notes: '' },
          ],
          error: null,
        },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ notes: { [ITEM_1]: 'Note one', [ITEM_2]: 'Note two' } })
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')

    const lootItemsCall = fake.callsFor('loot_items')[0]
    expect(fake.filtersOf(lootItemsCall)).toEqual([
      ['in', 'raid_tier_id', [TIER_1, TIER_2]],
      ['not', 'officer_notes', 'is', null],
    ])
    expect(lootItemsCall.ops.find((o) => o.method === 'order')?.args).toEqual(['id', { ascending: true }])
    expect(lootItemsCall.ops.find((o) => o.method === 'range')?.args).toEqual([0, 999])
  })

  it('R6: no raid tiers: 200 with empty notes, no loot_items query', async () => {
    const fake = makeClient({
      expansion: { data: { id: EXPANSION_ID }, error: null },
      raidTiers: { data: [], error: null },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ notes: {} })
    expect(fake.callsFor('loot_items')).toEqual([])
  })

  it('R7: the loot_items query errors: 500 with the generic text', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = makeClient({
      expansion: { data: { id: EXPANSION_ID }, error: null },
      raidTiers: { data: [{ id: TIER_1 }], error: null },
      lootItemsPages: [{ data: null, error: { message: 'boom' } }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(trackApiError).toHaveBeenCalled()
  })

  it('R8: a full first page (1000 rows) and a 1-row second page: 2 range calls, 1001 notes', async () => {
    const firstPage: ResultRow[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `ffffffff-0000-0000-0000-${String(i).padStart(12, '0')}`,
      officer_notes: `Note ${i}`,
    }))
    const secondPage: ResultRow[] = [{ id: 'ffffffff-0000-0000-0000-999999999999', officer_notes: 'Note last' }]

    const fake = makeClient({
      expansion: { data: { id: EXPANSION_ID }, error: null },
      raidTiers: { data: [{ id: TIER_1 }], error: null },
      lootItemsPages: [
        { data: firstPage, error: null },
        { data: secondPage, error: null },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await get({ guild_id: GUILD_ID, expansion_id: EXPANSION_ID })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body.notes)).toHaveLength(1001)

    const rangeArgs = fake.callsFor('loot_items').map((c) => c.ops.find((o) => o.method === 'range')?.args)
    expect(rangeArgs).toEqual([[0, 999], [1000, 1999]])
  })
})

// ---------------------------------------------------------------------------
// Guard tests: no session-client query anywhere in the app may select
// officer_notes, and only the allowlisted files may reference it at all.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../../../..')
const SCAN_ROOTS = ['app', 'components', 'lib', 'utils', 'domain']
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])

function collectFiles(dir: string): string[] {
  const out: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectFiles(full))
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
      out.push(full)
    }
  }
  return out
}

function allScannedFiles(): string[] {
  return SCAN_ROOTS.flatMap((root) => collectFiles(path.join(REPO_ROOT, root)))
}

/** Imports createClient specifically from the browser or server session
 * client modules (not the service role, which is exempt from RLS by
 * design). */
function importsSessionClient(text: string): boolean {
  return /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*['"]@\/utils\/supabase\/(client|server)['"]/.test(text)
}

/** Finds `.select(` calls (single-quoted, double-quoted, or template
 * literal, which may span lines) whose text contains officer_notes. */
function selectsOfficerNotes(text: string): boolean {
  const re = /\.select\(\s*(`[\s\S]*?`|'[^']*'|"[^"]*")/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match[1].includes('officer_notes')) return true
  }
  return false
}

function readsLootItems(text: string): boolean {
  return /\.from\(\s*['"]loot_items['"]\s*\)/.test(text)
}

describe('guard: no session-client query names officer_notes (G1 to G3)', () => {
  it('G1: no session-client file selects officer_notes', () => {
    const flagged = allScannedFiles().filter((f) => {
      const text = fs.readFileSync(f, 'utf8')
      return importsSessionClient(text) && selectsOfficerNotes(text)
    })
    expect(flagged).toEqual([])
  })

  it('G1 self-test: the scanner flags a synthetic multi-line snippet', () => {
    const synthetic = [
      "import { createClient } from '@/utils/supabase/client'",
      'const supabase = createClient()',
      "supabase.from('loot_items').select(`",
      '  id,',
      '  officer_notes',
      '`)',
    ].join('\n')
    expect(importsSessionClient(synthetic) && selectsOfficerNotes(synthetic)).toBe(true)
  })

  it('G2: finds at least one session-client file that reads loot_items (the scan is not vacuous)', () => {
    const sessionReaders = allScannedFiles().filter((f) => {
      const text = fs.readFileSync(f, 'utf8')
      return importsSessionClient(text) && readsLootItems(text)
    })
    expect(sessionReaders.length).toBeGreaterThan(0)
    expect(sessionReaders.some((f) => f.endsWith('LootSettingsContent.tsx'))).toBe(true)
  })

  it('G3: exactly the allowlisted files name officer_notes; any new reader must go through a server route after the loot permission check', () => {
    const named = allScannedFiles().filter((f) => fs.readFileSync(f, 'utf8').includes('officer_notes'))
    const relative = named
      .map((f) => path.relative(REPO_ROOT, f).split(path.sep).join('/'))
      .filter((f) => f !== 'lib/database.types.ts')
      .sort()

    const expected = [
      'app/(app)/loot-management/components/LootSettingsContent.tsx',
      'app/(app)/loot-management/components/types.ts',
      'app/api/loot-items/officer-notes/route.ts',
      'app/api/loot-items/route.ts',
    ].sort()

    expect(relative).toEqual(expected)
  })
})
