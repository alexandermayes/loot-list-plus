/**
 * In-memory, recording fake Supabase client for the GH #300 companion-login
 * tests (PKCE exchange, Bearer helper, guild picker, wiring). Not a test
 * file itself — imported by the ones that are.
 *
 * Tables: addon_auth_codes, addon_sync_tokens, guilds, characters,
 * character_guild_memberships. Any other table resolves { data: [], error:
 * null } so a downstream route query never throws just because this fake
 * doesn't model it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

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
  setErrorOn: (table: string | undefined) => void
}

function matchesFilters(row: Row, filters: Array<{ col: string; op: 'eq' | 'in' | 'lt'; val: unknown }>): boolean {
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

  let errorOn = fixture.errorOn

  function tableRows(name: string): Row[] {
    return (tables as Record<string, Row[]>)[name] ?? []
  }

  function client_from(table: string) {
    const filters: Array<{ col: string; op: 'eq' | 'in' | 'lt'; val: unknown }> = []
    let pendingDelete = false
    let insertPayload: Row | Row[] | null = null
    let upsertPayload: Row | null = null
    let upsertOnConflict: string | null = null

    function errorResult() {
      return { data: null, error: { message: `${table} boom` } }
    }

    function currentMatches(): Row[] {
      return tableRows(table).filter((row) => matchesFilters(row, filters))
    }

    function applyDelete(): Row[] {
      const rows = tableRows(table)
      const toDelete = rows.filter((row) => matchesFilters(row, filters))
      const remaining = rows.filter((row) => !matchesFilters(row, filters))
      ;(tables as Record<string, Row[]>)[table] = remaining
      return toDelete
    }

    function applyInsert() {
      const rows = tableRows(table)
      const payload = Array.isArray(insertPayload) ? insertPayload : insertPayload ? [insertPayload] : []
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
      const payload = upsertPayload as Row
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select() {
        return builder
      },
      eq(col: string, val: unknown) {
        filters.push({ col, op: 'eq', val })
        return builder
      },
      in(col: string, val: unknown) {
        filters.push({ col, op: 'in', val })
        return builder
      },
      lt(col: string, val: unknown) {
        filters.push({ col, op: 'lt', val })
        return builder
      },
      delete() {
        pendingDelete = true
        return builder
      },
      insert(payload: Row | Row[]) {
        insertPayload = payload
        return builder
      },
      upsert(payload: Row, opts?: { onConflict?: string }) {
        upsertPayload = payload
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
        if (pendingDelete) {
          const deleted = applyDelete()
          return Promise.resolve({ data: deleted[0] ?? null, error: null })
        }
        const matches = currentMatches()
        return Promise.resolve({ data: matches[0] ?? null, error: null })
      },
      maybeSingle() {
        if (errorOn === table) return Promise.resolve(errorResult())
        if (pendingDelete) {
          const deleted = applyDelete()
          return Promise.resolve({ data: deleted[0] ?? null, error: null })
        }
        const matches = currentMatches()
        return Promise.resolve({ data: matches[0] ?? null, error: null })
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        try {
          if (errorOn === table) return Promise.resolve(errorResult()).then(resolve, reject)
          if (pendingDelete) {
            const deleted = applyDelete()
            return Promise.resolve({ data: deleted, error: null }).then(resolve, reject)
          }
          if (insertPayload !== null) {
            return Promise.resolve(applyInsert()).then(resolve, reject)
          }
          if (upsertPayload !== null) {
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
    setErrorOn: (table: string | undefined) => {
      errorOn = table
    },
  }
}
