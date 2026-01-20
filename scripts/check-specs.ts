import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const { data: classSpecs } = await supabase
    .from('class_specs')
    .select('id, name, wow_classes(name)')
    .order('wow_classes(name)', { ascending: true })

  console.log('Class Specs in database:')
  classSpecs?.forEach(spec => {
    const className = (spec as any).wow_classes?.name
    const specName = spec.name
    console.log(`  - ${className} ${specName}`)
  })
}

main()
