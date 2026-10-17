/**
 * Owner-run sync: give every existing Forever guild the manifest raid tiers
 * (Barrow Deeps, Hyjal Summit, Onyxia's Lair) that guilds created before the
 * onboarding manifest do not have yet. Insert-only and idempotent, so a second
 * run changes nothing, and re-running it after a manifest addition is how new
 * tiers reach existing guilds (D-08, D-10; EXPN-05).
 *
 * SAFE BY DEFAULT: dry-run unless you pass --apply.
 *
 *   npm run sync:forever               # dry run, lists what would be inserted
 *   npm run sync:forever -- --apply    # inserts the missing tiers
 *   npm run sync:forever -- --help
 *
 * Run from the repo root with .env.local present. Prints expansion ids, guild
 * ids, manifest tier names and counts only: no guild names, player names or
 * environment values. Exits 1 on any per-expansion failure or duplicate tier
 * name; duplicates are reported, never deleted.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'
import {
  ForeverSyncArgError,
  formatForeverSyncReport,
  parseForeverSyncArgs,
  runForeverSync,
  syncExitCode,
} from './lib/forever-sync'

const USAGE = [
  'Usage:',
  '  npm run sync:forever               dry run (default): lists the tiers each Forever expansion would get',
  '  npm run sync:forever -- --apply    inserts the missing tiers',
  '  npm run sync:forever -- --help     prints this message',
  '',
  'Prints expansion ids, guild ids, tier names and counts only. Requires .env.local.',
].join('\n')

// Load .env.local, falling back to the main clone when run inside a worktree
// (.env.local is gitignored and not copied into .claude/worktrees/<name>/).
function loadEnvLocal(): boolean {
  const cwd = process.cwd()
  const mainRoot = cwd.includes('/.claude/worktrees/') ? cwd.split('/.claude/worktrees/')[0] : cwd
  const envPath = existsSync(resolve(cwd, '.env.local'))
    ? resolve(cwd, '.env.local')
    : resolve(mainRoot, '.env.local')
  if (!existsSync(envPath)) return false
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
      }
    })
  return true
}

async function main(): Promise<void> {
  let options
  try {
    options = parseForeverSyncArgs(process.argv.slice(2))
  } catch (error) {
    if (error instanceof ForeverSyncArgError) {
      console.error(error.message)
      console.error(USAGE)
      process.exitCode = 1
      return
    }
    throw error
  }

  // --help exits before any file or network access.
  if (options.help) {
    console.log(USAGE)
    return
  }

  if (!loadEnvLocal()) {
    console.error('Could not find .env.local. Run from the repo root with .env.local present.')
    process.exitCode = 1
    return
  }

  const client = createTypedServiceRoleClient()
  const report = await runForeverSync(client, { apply: options.apply })
  console.log(formatForeverSyncReport(report))
  process.exitCode = syncExitCode(report)
}

main().catch(error => {
  // Message only: never print the client or environment values.
  console.error(`Forever sync failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
