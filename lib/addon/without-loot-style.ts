/**
 * The addon payload stays byte-identical for Known guilds (D-30), so the
 * loot_style column added for the web app is dropped before a guild_settings
 * row is spread or serialised. Copying and deleting keeps the remaining key
 * order, which the export string depends on.
 *
 * One copy for both addon routes (IN-05, Phase 4 review). This is a denylist:
 * a column added to guild_settings later reaches the addon payload unless it
 * is dropped here. An allowlist of the fields the Lua side reads is the
 * stronger shape and is a follow-up.
 */
export function withoutLootStyle<T extends Record<string, unknown>>(row: T): Omit<T, 'loot_style'> {
  const copy: Record<string, unknown> = { ...row }
  delete copy.loot_style
  return copy as Omit<T, 'loot_style'>
}
