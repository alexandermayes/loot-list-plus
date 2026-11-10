// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Scan guard (FIX-06). The FIX-02 defect (the companion and bot read tables
 * that do not exist, bad_luck_protection and item_priorities) shipped because
 * addon and bot routes used the untyped service-role client, so a wrong table
 * name compiled. Every route.ts under app/api/addon and app/api/bot must
 * create its client with createTypedServiceRoleClient so `npm run typecheck`
 * rejects nonexistent tables and filter columns. New addon or bot routes must
 * use the typed factory too.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')
const ROUTE_ROOTS = ['app/api/addon', 'app/api/bot']
const MIN_ROUTE_FILES = 10

// Exact specifier of the untyped factory module. The typed module path
// (@/utils/supabase/typed-service-role) does not contain this string followed
// by a closing quote, so it is not matched.
const UNTYPED_SPECIFIER = /from\s+['"]@\/utils\/supabase\/service-role['"]/
const UNTYPED_CALL = /\bcreateServiceRoleClient\(/

/** Returns one message per way the source uses the untyped service-role client. */
function findUntypedClientUse(source: string): string[] {
  const violations: string[] = []
  if (UNTYPED_SPECIFIER.test(source)) {
    violations.push('imports the untyped module @/utils/supabase/service-role')
  }
  if (UNTYPED_CALL.test(source)) {
    violations.push('calls createServiceRoleClient(')
  }
  return violations
}

function collectRouteFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...collectRouteFiles(full))
    } else if (entry.isFile() && entry.name === 'route.ts') {
      found.push(full)
    }
  }
  return found
}

const routeFiles = ROUTE_ROOTS.flatMap((root) =>
  collectRouteFiles(path.join(REPO_ROOT, root)),
).sort()

describe('typed service-role client usage in addon and bot routes', () => {
  it(`finds at least ${MIN_ROUTE_FILES} route.ts files, so the scan is not vacuous`, () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(MIN_ROUTE_FILES)
  })

  it('no addon or bot route imports or calls the untyped service-role client', () => {
    const offenders = routeFiles.flatMap((file) =>
      findUntypedClientUse(fs.readFileSync(file, 'utf8')).map(
        (violation) => `${path.relative(REPO_ROOT, file)}: ${violation}`,
      ),
    )
    expect(offenders).toEqual([])
  })

  it('flags a synthetic route that uses the untyped factory', () => {
    const violating = [
      "import { createServiceRoleClient } from '@/utils/supabase/service-role'",
      'export async function GET() {',
      '  const supabase = createServiceRoleClient()',
      '  return supabase',
      '}',
    ].join('\n')
    expect(findUntypedClientUse(violating)).toHaveLength(2)
  })

  it('accepts a synthetic route that uses the typed factory', () => {
    const clean = [
      "import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'",
      'export async function GET() {',
      '  const supabase = createTypedServiceRoleClient()',
      '  return supabase',
      '}',
    ].join('\n')
    expect(findUntypedClientUse(clean)).toEqual([])
  })
})
