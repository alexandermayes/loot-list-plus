/**
 * Decide which characters survive the active-team scope on the master sheet
 * and the Gargul export.
 *
 * When a guild runs multiple raid teams, an officer can scope the master sheet
 * to one team. Historically that scope dropped every character who wasn't on
 * the selected team — including brand-new raiders who had submitted and been
 * approved but hadn't been rostered onto a team yet. Those raiders still
 * appeared in the team-agnostic "Summary" aggregate view, so officers saw them
 * on the website but they silently vanished from the Gargul export, and thus
 * from the in-game prio tooltip. See issue #165.
 *
 * The rule here keeps a character when EITHER:
 *   - they belong to the active team, OR
 *   - they belong to no team at all (unassigned / new members).
 *
 * Characters rostered onto a *different* team are still excluded, so multi-team
 * guilds keep their separation. Unassigned raiders ride along with whichever
 * team is selected until an officer explicitly rosters them somewhere.
 */

export interface RaidTeamMembership {
  character_id: string
  raid_team_id: string
}

/**
 * Build a predicate that answers "should this character be visible under the
 * active team scope?" from the guild's full set of raid-team memberships.
 *
 * @param memberships  Every `raid_team_members` row in the guild (all teams).
 * @param activeTeamId The team currently selected in the UI.
 */
export function buildTeamVisibility(
  memberships: readonly RaidTeamMembership[],
  activeTeamId: string,
): (characterId: string) => boolean {
  const onActiveTeam = new Set<string>()
  const onAnyTeam = new Set<string>()
  for (const m of memberships) {
    onAnyTeam.add(m.character_id)
    if (m.raid_team_id === activeTeamId) onActiveTeam.add(m.character_id)
  }
  return (characterId: string) =>
    onActiveTeam.has(characterId) || !onAnyTeam.has(characterId)
}
