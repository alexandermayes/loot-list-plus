#!/usr/bin/env npx tsx
/**
 * Purge Test Characters
 * Removes all test characters created by seed scripts from the database.
 *
 * Test characters are identified by:
 * - Names starting with "Test" (from seed-test-data.ts)
 * - Names starting with "Gm_" or "GM_" (from fix-test-guild-characters.ts)
 * - Names matching "Zevinall" or other known test names
 *
 * Also cleans up:
 * - character_guild_memberships for deleted characters
 * - loot_submissions for deleted characters
 * - user_active_characters pointing to deleted characters
 *
 * Usage: npx tsx scripts/purge-test-characters.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key.trim()] = value
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const dryRun = process.argv.includes('--dry-run')

async function main() {
  console.log('='.repeat(60))
  console.log(dryRun ? 'PURGE TEST CHARACTERS (DRY RUN)' : 'PURGE TEST CHARACTERS')
  console.log('='.repeat(60))

  // Step 1: Find all test characters
  // Patterns from seed scripts:
  //   seed-test-data.ts: "Test" + prefix + suffix + guildIndex + memberIndex
  //   fix-test-guild-characters.ts: "GM_" + guild name part
  //   Various: "Zevinall" and other manual test names

  const { data: testCharsPrefix, error: e1 } = await supabase
    .from('characters')
    .select('id, name, user_id, is_main, class_id')
    .ilike('name', 'Test%')

  const { data: testCharsGm, error: e2 } = await supabase
    .from('characters')
    .select('id, name, user_id, is_main, class_id')
    .or('name.ilike.Gm_%,name.ilike.GM_%')

  if (e1) console.error('Error fetching Test* characters:', e1.message)
  if (e2) console.error('Error fetching Gm_* characters:', e2.message)

  // Combine and deduplicate
  const allTestChars = new Map<string, { id: string; name: string; user_id: string | null; is_main: boolean; class_id: string | null }>()
  for (const char of [...(testCharsPrefix || []), ...(testCharsGm || [])]) {
    allTestChars.set(char.id, char)
  }

  const testCharacters = Array.from(allTestChars.values())

  if (testCharacters.length === 0) {
    console.log('\nNo test characters found. Database is clean.')
    return
  }

  console.log(`\nFound ${testCharacters.length} test characters:`)

  // Group by user for display
  const byUser = new Map<string, typeof testCharacters>()
  for (const char of testCharacters) {
    const userId = char.user_id || 'unknown'
    if (!byUser.has(userId)) byUser.set(userId, [])
    byUser.get(userId)!.push(char)
  }

  for (const [userId, chars] of byUser) {
    console.log(`\n  User: ${userId}`)
    for (const char of chars.slice(0, 10)) {
      console.log(`    - ${char.name} (${char.id})`)
    }
    if (chars.length > 10) {
      console.log(`    ... and ${chars.length - 10} more`)
    }
  }

  const charIds = testCharacters.map(c => c.id)

  if (dryRun) {
    console.log(`\n[DRY RUN] Would delete ${testCharacters.length} characters and all related data.`)
    console.log('Run without --dry-run to execute.')
    return
  }

  // Step 2: Clean up related data (foreign key dependencies)
  console.log('\nCleaning up related data...')

  // Delete loot_submission_items for submissions by test characters
  const { data: submissions } = await supabase
    .from('loot_submissions')
    .select('id')
    .in('character_id', charIds)

  if (submissions && submissions.length > 0) {
    const subIds = submissions.map(s => s.id)
    const { error: siError } = await supabase
      .from('loot_submission_items')
      .delete()
      .in('submission_id', subIds)
    if (siError) console.warn('  Error deleting submission items:', siError.message)
    else console.log(`  Deleted submission items for ${subIds.length} submissions`)

    const { error: subError } = await supabase
      .from('loot_submissions')
      .delete()
      .in('character_id', charIds)
    if (subError) console.warn('  Error deleting submissions:', subError.message)
    else console.log(`  Deleted ${submissions.length} loot submissions`)
  }

  // Delete character_guild_memberships
  const { data: memberships, error: memError } = await supabase
    .from('character_guild_memberships')
    .delete()
    .in('character_id', charIds)
    .select('id')

  if (memError) console.warn('  Error deleting memberships:', memError.message)
  else console.log(`  Deleted ${memberships?.length || 0} guild memberships`)

  // Clear user_active_characters pointing to test characters
  const { data: activeRefs, error: activeError } = await supabase
    .from('user_active_characters')
    .delete()
    .in('active_character_id', charIds)
    .select('user_id')

  if (activeError) console.warn('  Error clearing active character refs:', activeError.message)
  else if (activeRefs && activeRefs.length > 0) {
    console.log(`  Cleared ${activeRefs.length} active character references`)
  }

  // Delete attendance records for test characters
  const { error: attError } = await supabase
    .from('attendance_records')
    .delete()
    .in('character_id', charIds)

  if (attError) console.warn('  Error deleting attendance records:', attError.message)
  else console.log('  Deleted attendance records')

  // Delete loot history for test characters
  const { error: lhError } = await supabase
    .from('loot_history')
    .delete()
    .in('character_id', charIds)

  if (lhError) console.warn('  Error deleting loot history:', lhError.message)
  else console.log('  Deleted loot history')

  // Step 3: Delete the characters themselves
  console.log('\nDeleting test characters...')

  // Delete in batches to avoid hitting request size limits
  const batchSize = 50
  let deleted = 0

  for (let i = 0; i < charIds.length; i += batchSize) {
    const batch = charIds.slice(i, i + batchSize)
    const { error: delError } = await supabase
      .from('characters')
      .delete()
      .in('id', batch)

    if (delError) {
      console.error(`  Error deleting batch ${i / batchSize + 1}:`, delError.message)
    } else {
      deleted += batch.length
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Purged ${deleted}/${testCharacters.length} test characters`)
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
