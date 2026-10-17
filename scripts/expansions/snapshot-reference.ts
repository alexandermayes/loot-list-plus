/**
 * Refresh the committed wago reference snapshot (EXPN-06; D-13, D-15).
 *
 * Re-pulls the pinned tables for the newest build under the manifest's prefix,
 * trims them to what the manifest references, and rewrites
 * data/expansions/forever/reference/wago.json only when the build or the
 * canonical data hash changed. A refresh of unchanged data touches nothing.
 *
 *   npx tsx scripts/expansions/snapshot-reference.ts
 *   npx tsx scripts/expansions/snapshot-reference.ts --help
 *
 * Run from the repo root; the scheduled refresh workflow is the intended caller.
 * When GITHUB_OUTPUT is set, appends outage, changed, promotable_count and
 * promotable lines for the workflow to read.
 *
 * Outage set (D-13 as amended 2026-10-14): after 5 attempts with exponential
 * backoff, a 403, 429, 500, 502, 503 or 504, a network error or a timeout is a
 * wago outage. The script prints a ::notice:: line, writes outage=true and
 * changed=false to GITHUB_OUTPUT, writes no file and exits 0, so an outage never
 * turns CI red.
 *
 * Failure set: a 404 or other non-2xx, a missing expected CSV header, no build
 * under the manifest prefix, an unrecognised builds list or a snapshot that
 * fails the schema prints an ::error:: line and exits 1.
 *
 * Only the identifying User-Agent is ever sent, on every attempt; a persistent
 * 403 is never retried under a different or browser-style identity. The owner
 * confirmed the outage set and the single identity on 2026-10-14.
 *
 * Exit codes: 0 on success or outage, 1 on any failure.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import type { ProvisionalAllowlistEntry } from '@/data/expansions/forever/reference-check'
import {
  ReferenceSnapshotSchema,
  type ReferenceSnapshot,
} from '@/domain/expansion/reference-snapshot-schema'
import { refreshSnapshot } from '../lib/wago-snapshot'

const USAGE = [
  'Usage: npx tsx scripts/expansions/snapshot-reference.ts [--help]',
  '',
  'snapshot-reference refreshes data/expansions/forever/reference/wago.json from',
  'the wago tables for the newest build under the manifest buildPrefix. It writes',
  'only when the build or the canonical data hash changed.',
  '',
  'With GITHUB_OUTPUT set it appends outage, changed, promotable_count and',
  'promotable lines. Run it from the repo root.',
].join('\n')

const SNAPSHOT_PATH = resolve(process.cwd(), 'data/expansions/forever/reference/wago.json')
const ALLOWLIST_PATH = resolve(process.cwd(), 'data/expansions/forever/provisional-allowlist.json')

const AllowlistSchema = z.array(z.strictObject({ raid: z.string(), bossKey: z.string(), name: z.string() }))

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readCommitted(): ReferenceSnapshot {
  return ReferenceSnapshotSchema.parse(readJson(SNAPSHOT_PATH))
}

function writeSnapshot(snapshot: ReferenceSnapshot): void {
  // Two-space JSON with a trailing newline matches how the file is committed.
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`)
}

function setOutputs(outputs: Record<string, string>): void {
  const target = process.env.GITHUB_OUTPUT
  if (!target) return
  appendFileSync(target, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''))
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE)
    return
  }

  const allowlist: ProvisionalAllowlistEntry[] = AllowlistSchema.parse(readJson(ALLOWLIST_PATH))
  // Fail on a malformed committed file before any network call.
  readCommitted()

  const result = await refreshSnapshot({
    fetchImpl: globalThis.fetch,
    sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
    random: Math.random,
    now: () => new Date().toISOString(),
    readCommitted,
    writeSnapshot,
    manifest: FOREVER_MANIFEST,
    allowlist,
    log: (line) => console.log(line),
  })

  if (result.outcome === 'outage') {
    // A green notice, but the attempts and last status stay visible in the run summary.
    console.log(
      `::notice::wago unavailable after ${result.attempts} attempts (last status ${result.lastStatus ?? 'none'}); snapshot not refreshed`,
    )
    setOutputs({ outage: 'true', changed: 'false' })
    return
  }

  const promotable = result.promotable.map((boss) => `${boss.raid}/${boss.bossKey} (encounter ${boss.encounterId})`)
  setOutputs({
    outage: 'false',
    changed: String(result.outcome === 'updated'),
    promotable_count: String(promotable.length),
    promotable: promotable.join('; '),
  })
  console.log(`snapshot ${result.outcome}: build ${result.build}`)
  console.log(promotable.length === 0 ? 'promotable bosses: none' : `promotable bosses: ${promotable.join('; ')}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`::error::snapshot refresh failed: ${message.replace(/\r?\n/g, ' ')}`)
  process.exit(1)
})
