/**
 * GET /api/help/articles
 *
 * Returns published help articles that live only in the database — i.e. the
 * self-grown ones the Discord /help bot drafted and an officer approved
 * (source auto/manual). The seeded articles already ship statically in
 * lib/help-content.ts, so we exclude them here to avoid duplicates.
 *
 * The in-app Help Center merges these into its listing/search so approved
 * community answers show up on the website too, closing the loop with Discord.
 *
 * Soft-fails to an empty list (e.g. before the help_articles migration has
 * deployed) so the Help Center never breaks.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('help_articles')
      .select('slug, title, description, content, category')
      .eq('status', 'published')
      .in('source', ['auto', 'manual'])
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ articles: [] })
    }
    return NextResponse.json({ articles: data ?? [] })
  } catch {
    return NextResponse.json({ articles: [] })
  }
}
