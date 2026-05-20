import { redirect } from 'next/navigation'

/**
 * /loot-settings was renamed to /loot-management on 2026-05-19 to match the
 * sidebar label. This thin page preserves bookmarks.
 */
export default function LootSettingsRedirect() {
  redirect('/loot-management')
}
