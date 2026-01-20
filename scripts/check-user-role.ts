import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔍 Checking guild_members table structure...\n')

  // Get a sample guild member to see the role column
  const { data: members, error } = await supabase
    .from('guild_members')
    .select('*')
    .limit(5)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('Sample guild_members data:')
  console.log(JSON.stringify(members, null, 2))

  if (members && members.length > 0) {
    console.log('\nColumn names:', Object.keys(members[0]))
    console.log('\nRole values found:', [...new Set(members.map(m => m.role))])
  }
}

main()
