/**
 * In-memory, recording fake Supabase client for the GH #300 companion-login
 * tests (PKCE exchange, Bearer helper, guild picker, wiring). Not a test
 * file itself — imported by the ones that are.
 *
 * Tables: addon_auth_codes, addon_sync_tokens, guilds, characters,
 * character_guild_memberships. Any other table resolves { data: [], error:
 * null } so a downstream route query never throws just because this fake
 * doesn't model it. Every `.from(table)` call is recorded in `calls` so a
 * test can inspect exactly what was inserted/filtered (e.g. an
 * `awarded_by` column), matching the recording-fake pattern used by
 * app/api/addon/import-string/__tests__/route.test.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type FilterOp = 'eq' | 'in' | 'lt'

export interface RecordedCall {
  table: string
  filters: Array<{ col: string; op: FilterOp; val: unknown }>
  insertPayload?: Row | Row[]
  upsertPayload?: Row
}

export interface FakeAddonDbFixture {
  addon_auth_codes?: Row[]
  addon_sync_tokens?: Row[]
  guilds?: Row[]
  characters?: Row[]
  character_guild_memberships?: Row[]
  /** Force the next query against this table to resolve as a DB error. */
  errorOn?: string
}

export interface FakeAddonDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
  tables: {
    addon_auth_codes: Row[]
    addon_sync_tokens: Row[]
    guilds: Row[]
    characters: Row[]
    character_guild_memberships: Row[]
  }
  calls: RecordedCall[]
  setErrorOn: (table: string | undefined) => void
}

function matchesFilters(row: Row, filters: RecordedCall['filters']): boolean {
  for (const f of filters) {
    if (f.op === 'eq' && row[f.col] !== f.val) return false
    if (f.op === 'in' && !(f.val as unknown[]).includes(row[f.col])) return false
    if (f.op === 'lt' && !(row[f.col] < (f.val as string))) return false
  }
  return true
}

export function makeFakeAddonDb(fixture: FakeAddonDbFixture = {}): FakeAddonDb {
  const tables = {
    addon_auth_codes: fixture.addon_auth_codes ? [...fixture.addon_auth_codes] : [],
    addon_sync_tokens: fixture.addon_sync_tokens ? [...fixture.addon_sync_tokens] : [],
    guilds: fixture.guilds ? [...fixture.guilds] : [],
    characters: fixture.characters ? [...fixture.characters] : [],
    character_guild_memberships: fixture.character_guild_memberships ? [...fixture.character_guild_memberships] : [],
  }

  const calls: RecordedCall[] = []
  let errorOn = fixture.errorOn

  function tableRows(name: string): Row[] {
    return (tables as Record<string, Row[]>)[name] ?? []
  }

  function client_from(table: string) {
    const call: RecordedCall = { table, filters: [] }
    calls.push(call)
    let pendingDelete = false
    let upsertOnConflict: string | null = null

    function errorResult() {
      return { data: null, error: { message: `${table} boom` } }
    }

    function currentMatches(): Row[] {
      return tableRows(table).filter((row) => matchesFilters(row, call.filters))
    }

    function applyDelete(): Row[] {
      const rows = tableRows(table)
      const toDelete = rows.filter((row) => matchesFilters(row, call.filters))
      const remaining = rows.filter((row) => !matchesFilters(row, call.filters))
      ;(tables as Record<string, Row[]>)[table] = remaining
      return toDelete
    }

    function applyInsert() {
      const rows = tableRows(table)
      const payload = Array.isArray(call.insertPayload)
        ? call.insertPayload
        : call.insertPayload
          ? [call.insertPayload]
          : []
      // Enforce a primary-key-ish uniqueness for addon_auth_codes.code_hash so
      // the S5-style duplicate-code behaviour is observable in tests that want it.
      if (table === 'addon_auth_codes') {
        for (const row of payload) {
          if (rows.some((r) => r.code_hash === row.code_hash)) {
            return { data: null, error: { message: 'duplicate key value violates unique constraint' } }
          }
        }
      }
      rows.push(...payload)
      return { data: payload, error: null }
    }

    function applyUpsert() {
      const rows = tableRows(table)
      const conflictCols = (upsertOnConflict ?? '').split(',').map((c) => c.trim()).filter(Boolean)
      const payload = call.upsertPayload as Row
      if (conflictCols.length > 0) {
        const idx = rows.findIndex((row) => conflictCols.every((c) => row[c] === payload[c]))
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...payload }
          return { data: [rows[idx]], error: null }
        }
      }
      rows.push(payload)
      return { data: [payload], error: null }
    }

    /** Shared resolution used by single()/maybeSingle()/then() so an insert or upsert chained straight into a single-row read (`.insert(x).select().single()`) returns the row just written, like real PostgREST does. */
    function resolveOne(): { data: Row | null; error: unknown } {
      if (pendingDelete) {
        const deleted = applyDelete()
        return { data: deleted[0] ?? null, error: null }
      }
      if (call.insertPayload !== undefined) {
        const result = applyInsert()
        const row = Array.isArray(result.data) ? result.data[0] : result.data
        return { data: row ?? null, error: result.error }
      }
      if (call.upsertPayload !== undefined) {
        const result = applyUpsert()
        const row = Array.isArray(result.data) ? result.data[0] : result.data
        return { data: row ?? null, error: result.error }
      }
      const matches = currentMatches()
      return { data: matches[0] ?? null, error: null }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select() {
        return builder
      },
      eq(col: string, val: unknown) {
        call.filters.push({ col, op: 'eq', val })
        return builder
      },
      in(col: string, val: unknown) {
        call.filters.push({ col, op: 'in', val })
        return builder
      },
      lt(col: string, val: unknown) {
        call.filters.push({ col, op: 'lt', val })
        return builder
      },
      delete() {
        pendingDelete = true
        return builder
      },
      insert(payload: Row | Row[]) {
        call.insertPayload = payload
        return builder
      },
      upsert(payload: Row, opts?: { onConflict?: string }) {
        call.upsertPayload = payload
        upsertOnConflict = opts?.onConflict ?? null
        return builder
      },
      order() {
        return builder
      },
      limit() {
        return builder
      },
      single() {
        if (errorOn === table) return Promise.resolve(errorResult())
        return Promise.resolve(resolveOne())
      },
      maybeSingle() {
        if (errorOn === table) return Promise.resolve(errorResult())
        return Promise.resolve(resolveOne())
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        try {
          if (errorOn === table) return Promise.resolve(errorResult()).then(resolve, reject)
          if (pendingDelete) {
            const deleted = applyDelete()
            return Promise.resolve({ data: deleted, error: null }).then(resolve, reject)
          }
          if (call.insertPayload !== undefined) {
            return Promise.resolve(applyInsert()).then(resolve, reject)
          }
          if (call.upsertPayload !== undefined) {
            return Promise.resolve(applyUpsert()).then(resolve, reject)
          }
          const matches = currentMatches()
          return Promise.resolve({ data: matches, error: null }).then(resolve, reject)
        } catch (err) {
          return Promise.reject(err).then(resolve, reject)
        }
      },
    }

    return builder
  }

  const client = {
    from(table: string) {
      return client_from(table)
    },
  }

  return {
    client,
    tables,
    calls,
    setErrorOn: (table: string | undefined) => {
      errorOn = table
    },
  }
}
