const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')
const { resolve } = require('path')

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
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running guild_item_priorities migration...\n')

  // Check if table already exists
  const { data: existing, error: checkError } = await supabase
    .from('guild_item_priorities')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('✅ Table guild_item_priorities already exists!')
    return
  }

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log('Table check error:', checkError.message)
  }

  console.log('Table does not exist. Please run the migration manually in Supabase SQL Editor:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Click on "SQL Editor"')
  console.log('3. Copy and paste the contents of: migrations/create_guild_item_priorities.sql')
  console.log('4. Click "Run"')
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
