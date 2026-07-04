/**
 * Seed the Discord help bot's knowledge base from the shared help corpus.
 *
 * Reads lib/help-content.ts (the same articles + glossary that power the in-app
 * help center) and upserts each into the `help_articles` table so the bot's
 * `/help` search has something to find. Keyed by slug, so it's safe to re-run
 * after editing help-content.ts — existing seed rows are updated in place and
 * auto-generated rows (different slugs) are left untouched.
 *
 * Usage: npm run seed:help
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { getAllArticles, glossaryTerms } from '../lib/help-content'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env: need SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type HelpRow = {
  slug: string
  category: string
  title: string
  description: string
  content: string
  keywords: string
  source: 'seed'
  status: 'published'
  updated_at: string
}

function buildRows(): HelpRow[] {
  const now = new Date().toISOString()

  const articleRows: HelpRow[] = getAllArticles().map((a) => ({
    slug: a.slug,
    category: a.categoryId,
    title: a.title,
    description: a.description,
    content: a.content,
    // Fold the category + description into keywords so short queries still hit.
    keywords: `${a.categoryTitle} ${a.description}`,
    source: 'seed',
    status: 'published',
    updated_at: now,
  }))

  // Glossary terms become tiny articles — great for one-word lookups.
  const glossaryRows: HelpRow[] = glossaryTerms.map((g) => ({
    slug: `glossary-${slugify(g.term)}`,
    category: 'glossary',
    title: g.term,
    description: `Glossary: ${g.term}`,
    content: g.definition,
    keywords: g.term,
    source: 'seed',
    status: 'published',
    updated_at: now,
  }))

  return [...articleRows, ...glossaryRows]
}

async function main() {
  const rows = buildRows()
  console.log(`Seeding ${rows.length} help articles (${getAllArticles().length} articles + ${glossaryTerms.length} glossary terms)...`)

  const { error } = await supabase
    .from('help_articles')
    .upsert(rows, { onConflict: 'slug' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  const { count } = await supabase
    .from('help_articles')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'seed')

  console.log(`✅ Done. ${count ?? '?'} seed rows now in help_articles.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
