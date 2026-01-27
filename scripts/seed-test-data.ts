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

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
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

    // Create expansion for the guild
    const { data: expansion, error: expError } = await supabase
      .from('expansions')
      .insert({
        guild_id: guild.id,
        name: 'Classic WoW',
      })
      .select('id')
      .single()

    if (expError || !expansion) {
      console.error('Failed to create expansion:', expError)
      continue
    }

    // Update guild with active expansion
    await supabase
      .from('guilds')
      .update({ active_expansion_id: expansion.id })
      .eq('id', guild.id)

    // Create raid tier
    const { data: raidTier, error: tierError } = await supabase
      .from('raid_tiers')
      .insert({
        expansion_id: expansion.id,
        name: 'Molten Core',
        is_active: true,
      })
      .select('id')
      .single()

    if (tierError || !raidTier) {
      console.error('Failed to create raid tier:', tierError)
      continue
    }

    // Create some loot items for the raid
    const lootItems = [
      { raid_tier_id: raidTier.id, name: 'Perdition\'s Blade', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 18816 },
      { raid_tier_id: raidTier.id, name: 'Brutality Blade', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 18832 },
      { raid_tier_id: raidTier.id, name: 'Thunderfury', boss_name: 'Geddon', item_slot: 'Weapon', wowhead_id: 19019 },
      { raid_tier_id: raidTier.id, name: 'Sulfuras', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 17182 },
      { raid_tier_id: raidTier.id, name: 'Staff of Dominance', boss_name: 'Golemagg', item_slot: 'Weapon', wowhead_id: 18842 },
    ]

    const { data: items } = await supabase
      .from('loot_items')
      .insert(lootItems)
      .select('id')

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
    if (items && items.length > 0 && characters.length > 0) {
      const submissions = []
      for (let s = 0; s < CONFIG.submissionsPerGuild; s++) {
        const character = randomElement(characters)
        const item = randomElement(items)
        submissions.push({
          guild_id: guild.id,
          raid_tier_id: raidTier.id,
          item_id: item.id,
          character_id: character.id,
          rank: Math.floor(Math.random() * 5) + 1,
          notes: s % 10 === 0 ? 'Test submission note' : null,
        })
      }

      // Insert in batches
      const submissionBatchSize = 50
      for (let i = 0; i < submissions.length; i += submissionBatchSize) {
        const batch = submissions.slice(i, i + submissionBatchSize)
        const { error: subError } = await supabase
          .from('loot_submissions')
          .insert(batch)

        if (subError) {
          console.warn('Error creating submissions batch:', subError.message)
        } else {
          stats.submissions += batch.length
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
