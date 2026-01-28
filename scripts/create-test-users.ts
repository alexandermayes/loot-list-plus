/**
 * Create Test Users Script
 * Creates a pool of test users in Supabase for load testing
 *
 * Usage: npx tsx scripts/create-test-users.ts [--count N] [--clean]
 *
 * Options:
 *   --count N   Number of test users to create (default: 20)
 *   --clean     Delete existing test users before creating new ones
 *
 * Output:
 *   Creates loadtest/test-users.json with credentials for k6
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      // Remove surrounding quotes if present
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
const userCount = getArg('count', 20)

const TEST_USER_PREFIX = 'loadtest'
const TEST_USER_DOMAIN = 'lootlist-test.local'
const TEST_USER_PASSWORD = 'TestPassword123!' // Same password for all test users

interface TestUser {
  id: string
  email: string
  password: string
}

async function cleanTestUsers(): Promise<void> {
  console.log('Cleaning existing test users...')

  // List all users and filter for test users
  const { data: users, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  })

  if (error) {
    console.error('Error listing users:', error.message)
    return
  }

  const testUsers = users.users.filter(u =>
    u.email?.endsWith(`@${TEST_USER_DOMAIN}`)
  )

  console.log(`Found ${testUsers.length} test users to delete`)

  for (const user of testUsers) {
    // First delete user data (characters, etc.)
    const { error: charError } = await supabase
      .from('characters')
      .delete()
      .eq('user_id', user.id)

    if (charError) {
      console.warn(`Error deleting characters for ${user.email}:`, charError.message)
    }

    // Delete user preferences
    const { error: prefError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)

    if (prefError) {
      console.warn(`Error deleting preferences for ${user.email}:`, prefError.message)
    }

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.warn(`Error deleting user ${user.email}:`, deleteError.message)
    } else {
      console.log(`  Deleted: ${user.email}`)
    }
  }

  console.log('Test users cleaned')
}

async function createTestUsers(): Promise<TestUser[]> {
  console.log(`Creating ${userCount} test users...`)

  const users: TestUser[] = []
  const timestamp = Date.now()

  for (let i = 1; i <= userCount; i++) {
    const email = `${TEST_USER_PREFIX}${i}_${timestamp}@${TEST_USER_DOMAIN}`

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_USER_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: `Test User ${i}`,
        is_test_user: true,
      },
    })

    if (error) {
      console.error(`Error creating user ${i}:`, error.message)
      continue
    }

    if (data.user) {
      users.push({
        id: data.user.id,
        email,
        password: TEST_USER_PASSWORD,
      })

      // Create user preferences
      await supabase.from('user_preferences').insert({
        user_id: data.user.id,
        theme: 'dark',
      })

      if (i % 5 === 0) {
        console.log(`  Created ${i}/${userCount} users`)
      }
    }
  }

  return users
}

async function saveTestUsers(users: TestUser[]): Promise<void> {
  const outputPath = resolve(process.cwd(), 'loadtest/test-users.json')

  const output = {
    created_at: new Date().toISOString(),
    supabase_url: supabaseUrl,
    user_count: users.length,
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      password: u.password,
    })),
  }

  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nTest users saved to: ${outputPath}`)
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('LootList+ Test User Creator')
  console.log('='.repeat(60))
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`User count: ${userCount}`)
  console.log()

  if (shouldClean) {
    await cleanTestUsers()
  }

  const users = await createTestUsers()

  if (users.length === 0) {
    console.error('No users were created!')
    process.exit(1)
  }

  await saveTestUsers(users)

  console.log('\n' + '='.repeat(60))
  console.log('Test User Creation Complete!')
  console.log('='.repeat(60))
  console.log(`Users created: ${users.length}`)
  console.log(`Credentials file: loadtest/test-users.json`)
  console.log()
  console.log('Next steps:')
  console.log('  1. Run: npm run seed:test:multi')
  console.log('  2. Run: npm run loadtest:auth')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
