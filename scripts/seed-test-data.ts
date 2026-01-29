/**
 * Seed Test Data Script
 * Creates realistic test data for development and load testing
 *
 * Usage: npx tsx scripts/seed-test-data.ts [--guilds N] [--members N] [--submissions N]
 *
 * Options:
 *   --guilds N      Number of test guilds to create (default: 3)
 *   --members N     Members per guild (default: 40)
 *   --submissions N Loot submissions per guild (default: 100)
 *   --clean         Delete existing test data before seeding
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { seedExpansionForGuild } from '../app/services/expansionSeeder'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key.trim()] = value
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
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

// Parse CLI arguments
const args = process.argv.slice(2)
const getArg = (name: string, defaultValue: number): number => {
  const index = args.indexOf(`--${name}`)
  if (index !== -1 && args[index + 1]) {
    return parseInt(args[index + 1], 10)
  }
  return defaultValue
}
const shouldClean = args.includes('--clean')

const CONFIG = {
  guilds: getArg('guilds', 3),
  membersPerGuild: getArg('members', 40),
  submissionsPerGuild: getArg('submissions', 100),
}

// WoW class data
const WOW_CLASSES = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest',
  'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Druid'
]

const REALMS = [
  'Faerlina', 'Benediction', 'Whitemane', 'Grobbulus', 'Mankrik',
  'Pagle', 'Westfall', 'Atiesh', 'Old Blanchy', 'Sulfuras'
]

const GUILD_NAMES = [
  'Eternal Fury', 'Shadow Council', 'Iron Legion', 'Crimson Dawn',
  'Frostbane', 'Stormwind Legends', 'Darkspear Elite', 'Phoenix Rising',
  'Silver Hand', 'Blood Guard', 'Twilight Hammer', 'Black Dragon Flight'
]

const CHARACTER_PREFIXES = [
  'Shadow', 'Storm', 'Fire', 'Ice', 'Dark', 'Light', 'Iron', 'Steel',
  'Thunder', 'Moon', 'Sun', 'Star', 'Wind', 'Earth', 'Blood', 'Death'
]

const CHARACTER_SUFFIXES = [
  'blade', 'fury', 'heart', 'soul', 'strike', 'claw', 'fang', 'wing',
  'shield', 'helm', 'bane', 'slayer', 'hunter', 'walker', 'seeker', 'rage'
]

// Utility functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateCharacterName(): string {
  return randomElement(CHARACTER_PREFIXES) + randomElement(CHARACTER_SUFFIXES)
}

function generateEmail(index: number): string {
  return `testuser${index}@lootlist-test.local`
}

async function getWowClasses(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('wow_classes')
    .select('id, name')

  if (error || !data) {
    console.warn('Could not fetch wow_classes, using fallback')
    return []
  }
  return data
}

async function cleanTestData() {
  console.log('Cleaning existing test data...')

  // Delete test guilds (cascades to memberships, etc.)
  const { error: guildError } = await supabase
    .from('guilds')
    .delete()
    .like('name', 'TEST_%')

  if (guildError) {
    console.warn('Error cleaning guilds:', guildError.message)
  }

  // Delete test characters
  const { error: charError } = await supabase
    .from('characters')
    .delete()
    .like('name', 'Test%')

  if (charError) {
    console.warn('Error cleaning characters:', charError.message)
  }

  console.log('Test data cleaned')
}

async function seedTestData() {
  console.log('Starting test data seed...')
  console.log(`Config: ${CONFIG.guilds} guilds, ${CONFIG.membersPerGuild} members each, ${CONFIG.submissionsPerGuild} submissions each`)

  const wowClasses = await getWowClasses()

  // Track created data for summary
  const stats = {
    guilds: 0,
    characters: 0,
    memberships: 0,
    submissions: 0,
    lootItems: 0,
  }

  // Get an existing user to use as creator (or create a test user)
  const { data: existingUsers } = await supabase
    .from('user_preferences')
    .select('user_id')
    .limit(1)

  let creatorUserId: string

  if (existingUsers && existingUsers.length > 0) {
    creatorUserId = existingUsers[0].user_id
    console.log('Using existing user as guild creator:', creatorUserId)
  } else {
    console.error('No existing users found. Please create at least one user first.')
    process.exit(1)
  }

  // Create test guilds
  for (let g = 0; g < CONFIG.guilds; g++) {
    const guildName = `TEST_${GUILD_NAMES[g % GUILD_NAMES.length]}_${Date.now()}`
    const realm = randomElement(REALMS)
    const faction = g % 2 === 0 ? 'Alliance' : 'Horde'

    console.log(`\nCreating guild ${g + 1}/${CONFIG.guilds}: ${guildName}`)

    // Create guild
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .insert({
        name: guildName,
        realm,
        faction,
        created_by: creatorUserId,
        is_active: true,
      })
      .select('id')
      .single()

    if (guildError || !guild) {
      console.error('Failed to create guild:', guildError)
      continue
    }

    stats.guilds++
    console.log(`  Created guild: ${guild.id}`)

    // Create guild settings
    await supabase.from('guild_settings').insert({
      guild_id: guild.id,
      attendance_type: 'linear',
      rolling_attendance_weeks: 8,
    })

    // Create guild roles
    await supabase.from('guild_roles').insert([
      { guild_id: guild.id, name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
      { guild_id: guild.id, name: 'Raider', color_hex: '#3b82f6', position: 25, is_default: false },
      { guild_id: guild.id, name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
      { guild_id: guild.id, name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true },
    ])

    // Use the expansion seeder to create full expansion with all raids and loot items
    // This includes proper classifications (Reserved/Limited/Unlimited) and role assignments
    console.log(`  Seeding Classic expansion with full loot data...`)
    const { expansionId, error: seedError } = await seedExpansionForGuild(
      supabase,
      guild.id,
      'Classic',
      true, // setAsCurrent
      true  // useServiceRole - we're using service role key
    )

    if (seedError || !expansionId) {
      console.error('Failed to seed expansion:', seedError)
      continue
    }

    console.log(`  Classic expansion seeded with ID: ${expansionId}`)

    // Also seed TBC expansion
    console.log(`  Seeding TBC expansion with full loot data...`)
    const { expansionId: tbcExpansionId, error: tbcSeedError } = await seedExpansionForGuild(
      supabase,
      guild.id,
      'The Burning Crusade',
      false, // Don't set as current (Classic is current)
      true   // useServiceRole
    )

    if (tbcSeedError || !tbcExpansionId) {
      console.error('Failed to seed TBC expansion:', tbcSeedError)
    } else {
      console.log(`  TBC expansion seeded with ID: ${tbcExpansionId}`)

      // Count TBC loot items
      const { data: tbcTiers } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', tbcExpansionId)

      let tbcLootItems = 0
      if (tbcTiers) {
        for (const tier of tbcTiers) {
          const { count } = await supabase
            .from('loot_items')
            .select('id', { count: 'exact', head: true })
            .eq('raid_tier_id', tier.id)
          tbcLootItems += count || 0
        }
      }
      stats.lootItems += tbcLootItems
      console.log(`  Created ${tbcLootItems} TBC loot items across ${tbcTiers?.length || 0} raid tiers`)
    }

    // Get the first raid tier (Molten Core) for creating test submissions
    const { data: raidTier, error: tierError } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansionId)
      .eq('name', 'Molten Core')
      .single()

    if (tierError || !raidTier) {
      console.error('Failed to get raid tier:', tierError)
      continue
    }

    // Get loot items for creating test submissions
    const { data: items } = await supabase
      .from('loot_items')
      .select('id')
      .eq('raid_tier_id', raidTier.id)
      .limit(20) // Get a sample of items for submissions

    // Count total loot items created for this guild (across all raid tiers)
    const { data: allTiers } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansionId)

    let totalLootItems = 0
    if (allTiers) {
      for (const tier of allTiers) {
        const { count } = await supabase
          .from('loot_items')
          .select('id', { count: 'exact', head: true })
          .eq('raid_tier_id', tier.id)
        totalLootItems += count || 0
      }
    }
    stats.lootItems += totalLootItems
    console.log(`  Created ${totalLootItems} loot items across ${allTiers?.length || 0} raid tiers`)

    // Create test characters and memberships
    const characters: { id: string }[] = []
    const batchSize = 10

    for (let batch = 0; batch < Math.ceil(CONFIG.membersPerGuild / batchSize); batch++) {
      const batchStart = batch * batchSize
      const batchEnd = Math.min(batchStart + batchSize, CONFIG.membersPerGuild)
      const batchChars = []

      for (let m = batchStart; m < batchEnd; m++) {
        const className = randomElement(WOW_CLASSES)
        const classData = wowClasses.find(c => c.name === className)

        batchChars.push({
          user_id: creatorUserId, // All test chars owned by same user for simplicity
          name: `Test${generateCharacterName()}${g}${m}`,
          realm,
          class_id: classData?.id || null,
          is_main: m === 0,
        })
      }

      const { data: newChars, error: charError } = await supabase
        .from('characters')
        .insert(batchChars)
        .select('id')

      if (charError) {
        console.warn('Error creating characters batch:', charError.message)
        continue
      }

      if (newChars) {
        characters.push(...newChars)
        stats.characters += newChars.length
      }
    }

    console.log(`  Created ${characters.length} characters`)

    // Create memberships
    const memberships = characters.map((char, index) => ({
      character_id: char.id,
      guild_id: guild.id,
      role: index === 0 ? 'Guild Master' : index < 5 ? 'Officer' : index < 15 ? 'Raider' : 'Member',
      is_active: true,
      joined_at: new Date().toISOString(),
      joined_via: 'manual',
    }))

    const { error: memberError } = await supabase
      .from('character_guild_memberships')
      .insert(memberships)

    if (memberError) {
      console.warn('Error creating memberships:', memberError.message)
    } else {
      stats.memberships += memberships.length
    }

    // Create loot submissions if we have items and characters
    // Schema: loot_submissions (parent) -> loot_submission_items (items)
    if (items && items.length > 0 && characters.length > 0) {
      // Create submissions for a subset of characters
      const charsWithSubmissions = characters.slice(0, Math.min(CONFIG.submissionsPerGuild, characters.length))

      for (const character of charsWithSubmissions) {
        // Create the parent submission record
        const { data: submission, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            guild_id: guild.id,
            raid_tier_id: raidTier.id,
            character_id: character.id,
            status: 'pending',
            submitted_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (subError || !submission) {
          console.warn('Error creating submission:', subError?.message)
          continue
        }

        // Add 3-6 random items to this submission
        const itemCount = Math.floor(Math.random() * 4) + 3
        const shuffledItems = [...items].sort(() => Math.random() - 0.5).slice(0, itemCount)

        const submissionItems = shuffledItems.map((item, index) => ({
          submission_id: submission.id,
          loot_item_id: item.id,
          rank: (index + 1) * 10, // 10, 20, 30, etc.
          slot: 1, // slot can only be 1 or 2 per DB constraint
        }))

        const { error: itemError } = await supabase
          .from('loot_submission_items')
          .insert(submissionItems)

        if (!itemError) {
          stats.submissions++
        } else {
          console.warn('Error creating submission items:', itemError.message)
        }
      }
    }

    console.log(`  Created ${stats.memberships} memberships, ${stats.submissions} submissions`)
  }

  return stats
}

// Main execution
async function main() {
  console.log('='.repeat(60))
  console.log('LootList+ Test Data Seeder')
  console.log('='.repeat(60))

  if (shouldClean) {
    await cleanTestData()
  }

  const stats = await seedTestData()

  console.log('\n' + '='.repeat(60))
  console.log('Seeding Complete!')
  console.log('='.repeat(60))
  console.log(`Guilds created:      ${stats.guilds}`)
  console.log(`Loot items created:  ${stats.lootItems}`)
  console.log(`Characters created:  ${stats.characters}`)
  console.log(`Memberships created: ${stats.memberships}`)
  console.log(`Submissions created: ${stats.submissions}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
