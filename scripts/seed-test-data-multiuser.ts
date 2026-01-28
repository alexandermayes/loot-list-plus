/**
 * Seed Test Data Script (Multi-User Version)
 * Creates realistic test data distributed across test users for load testing
 *
 * Usage: npx tsx scripts/seed-test-data-multiuser.ts [options]
 *
 * Options:
 *   --guilds N      Number of test guilds to create (default: 3)
 *   --members N     Members per guild (default: 40)
 *   --submissions N Loot submissions per guild (default: 100)
 *   --clean         Delete existing test data before seeding
 *
 * Prerequisites:
 *   Run create-test-users.ts first to create the test user pool
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
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
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Load test users
const testUsersPath = resolve(process.cwd(), 'loadtest/test-users.json')
if (!existsSync(testUsersPath)) {
  console.error('Test users file not found!')
  console.error('Run: npx tsx scripts/create-test-users.ts first')
  process.exit(1)
}

interface TestUser {
  id: string
  email: string
  password: string
}

const testUsersData = JSON.parse(readFileSync(testUsersPath, 'utf8'))
const testUsers: TestUser[] = testUsersData.users

console.log(`Loaded ${testUsers.length} test users from ${testUsersPath}`)

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

// WoW data
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

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateCharacterName(): string {
  return randomElement(CHARACTER_PREFIXES) + randomElement(CHARACTER_SUFFIXES)
}

async function getWowClasses(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('wow_classes')
    .select('id, name')

  if (error || !data) {
    console.warn('Could not fetch wow_classes')
    return []
  }
  return data
}

async function cleanTestData(): Promise<void> {
  console.log('Cleaning existing test data...')

  // Delete test guilds
  const { error: guildError } = await supabase
    .from('guilds')
    .delete()
    .like('name', 'TEST_%')

  if (guildError) {
    console.warn('Error cleaning guilds:', guildError.message)
  }

  // Delete test characters (owned by test users)
  for (const user of testUsers) {
    await supabase
      .from('characters')
      .delete()
      .eq('user_id', user.id)
  }

  console.log('Test data cleaned')
}

async function seedTestData(): Promise<void> {
  console.log('\nStarting multi-user test data seed...')
  console.log(`Config: ${CONFIG.guilds} guilds, ${CONFIG.membersPerGuild} members each`)
  console.log(`Distributing across ${testUsers.length} test users\n`)

  const wowClasses = await getWowClasses()

  const stats = {
    guilds: 0,
    characters: 0,
    memberships: 0,
    submissions: 0,
  }

  // Track which users are in which guilds for realistic distribution
  const userGuildMap: Map<string, string[]> = new Map()

  for (let g = 0; g < CONFIG.guilds; g++) {
    const guildName = `TEST_${GUILD_NAMES[g % GUILD_NAMES.length]}_${Date.now()}`
    const realm = randomElement(REALMS)
    const faction = g % 2 === 0 ? 'Alliance' : 'Horde'

    // Assign a guild master from test users
    const guildMasterIndex = g % testUsers.length
    const guildMaster = testUsers[guildMasterIndex]

    console.log(`Creating guild ${g + 1}/${CONFIG.guilds}: ${guildName}`)
    console.log(`  Guild Master: ${guildMaster.email}`)

    // Create guild
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .insert({
        name: guildName,
        realm,
        faction,
        created_by: guildMaster.id,
        is_active: true,
      })
      .select('id')
      .single()

    if (guildError || !guild) {
      console.error('Failed to create guild:', guildError)
      continue
    }

    stats.guilds++

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
      { guild_id: guild.id, name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: false },
      { guild_id: guild.id, name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: false },
    ])

    // Create expansion
    const { data: expansion } = await supabase
      .from('expansions')
      .insert({
        guild_id: guild.id,
        name: 'Classic WoW',
      })
      .select('id')
      .single()

    if (!expansion) continue

    await supabase
      .from('guilds')
      .update({ active_expansion_id: expansion.id })
      .eq('id', guild.id)

    // Create raid tier
    const { data: raidTier } = await supabase
      .from('raid_tiers')
      .insert({
        expansion_id: expansion.id,
        name: 'Molten Core',
        is_active: true,
      })
      .select('id')
      .single()

    if (!raidTier) continue

    // Create loot items
    const lootItems = [
      { raid_tier_id: raidTier.id, name: 'Perdition\'s Blade', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 18816 },
      { raid_tier_id: raidTier.id, name: 'Brutality Blade', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 18832 },
      { raid_tier_id: raidTier.id, name: 'Thunderfury', boss_name: 'Geddon', item_slot: 'Weapon', wowhead_id: 19019 },
      { raid_tier_id: raidTier.id, name: 'Sulfuras', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 17182 },
      { raid_tier_id: raidTier.id, name: 'Staff of Dominance', boss_name: 'Golemagg', item_slot: 'Weapon', wowhead_id: 18842 },
      { raid_tier_id: raidTier.id, name: 'Gutgutter', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 17075 },
      { raid_tier_id: raidTier.id, name: 'Bonereaver\'s Edge', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 17076 },
      { raid_tier_id: raidTier.id, name: 'Spinal Reaper', boss_name: 'Ragnaros', item_slot: 'Weapon', wowhead_id: 17203 },
    ]

    const { data: items } = await supabase
      .from('loot_items')
      .insert(lootItems)
      .select('id')

    // Distribute members across test users
    // Each user gets 1-3 characters in this guild
    const characters: { id: string; user_id: string }[] = []
    let memberCount = 0

    // Shuffle users for random distribution
    const shuffledUsers = [...testUsers].sort(() => Math.random() - 0.5)

    for (const user of shuffledUsers) {
      if (memberCount >= CONFIG.membersPerGuild) break

      // Each user gets 1-3 characters
      const charsForUser = Math.min(
        Math.floor(Math.random() * 3) + 1,
        CONFIG.membersPerGuild - memberCount
      )

      const userChars = []
      for (let c = 0; c < charsForUser; c++) {
        const className = randomElement(WOW_CLASSES)
        const classData = wowClasses.find(cl => cl.name === className)

        userChars.push({
          user_id: user.id,
          name: `Test${generateCharacterName()}${g}${memberCount}`,
          realm,
          class_id: classData?.id || null,
          is_main: c === 0,
        })
        memberCount++
      }

      const { data: newChars, error: charError } = await supabase
        .from('characters')
        .insert(userChars)
        .select('id, user_id')

      if (charError) {
        console.warn('Error creating characters:', charError.message)
        continue
      }

      if (newChars) {
        characters.push(...newChars)
        stats.characters += newChars.length

        // Track user -> guild mapping
        if (!userGuildMap.has(user.id)) {
          userGuildMap.set(user.id, [])
        }
        userGuildMap.get(user.id)!.push(guild.id)
      }
    }

    console.log(`  Created ${characters.length} characters across ${new Set(characters.map(c => c.user_id)).size} users`)

    // Create memberships with varied roles
    const memberships = characters.map((char, index) => {
      let role = 'Member'
      if (char.user_id === guildMaster.id && index === 0) {
        role = 'Guild Master'
      } else if (index < 5) {
        role = 'Officer'
      } else if (index < 20) {
        role = 'Raider'
      }

      return {
        character_id: char.id,
        guild_id: guild.id,
        role,
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'manual',
      }
    })

    const { error: memberError } = await supabase
      .from('character_guild_memberships')
      .insert(memberships)

    if (!memberError) {
      stats.memberships += memberships.length
    }

    // Create loot submissions
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
      for (let i = 0; i < submissions.length; i += 50) {
        const batch = submissions.slice(i, i + 50)
        const { error: subError } = await supabase
          .from('loot_submissions')
          .insert(batch)

        if (!subError) {
          stats.submissions += batch.length
        }
      }
    }

    console.log(`  Memberships: ${memberships.length}, Submissions: ${stats.submissions}`)
  }

  // Save user-guild mapping for k6
  const userGuildData = {
    updated_at: new Date().toISOString(),
    mappings: Array.from(userGuildMap.entries()).map(([userId, guildIds]) => ({
      user_id: userId,
      guild_ids: guildIds,
    })),
  }

  const { writeFileSync } = await import('fs')
  writeFileSync(
    resolve(process.cwd(), 'loadtest/user-guild-map.json'),
    JSON.stringify(userGuildData, null, 2)
  )

  console.log('\n' + '='.repeat(60))
  console.log('Seeding Complete!')
  console.log('='.repeat(60))
  console.log(`Guilds created:      ${stats.guilds}`)
  console.log(`Characters created:  ${stats.characters}`)
  console.log(`Memberships created: ${stats.memberships}`)
  console.log(`Submissions created: ${stats.submissions}`)
  console.log(`User-guild mapping:  loadtest/user-guild-map.json`)
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('LootList+ Multi-User Test Data Seeder')
  console.log('='.repeat(60))

  if (shouldClean) {
    await cleanTestData()
  }

  await seedTestData()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
