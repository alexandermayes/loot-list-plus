# UX Research Context

Use this skill when making product decisions, planning features, or evaluating UX improvements for LootList+. This provides context from 20 years of WoW loot distribution research.

## Quick Reference

Read the full research at `/docs/research/ux-research-loot-distribution.md`

## Core Insight

**Every loot system fails in predictable ways.** The question isn't which system is "fair"—it's which failure modes a guild can tolerate.

| System | Failure Mode |
|--------|-------------|
| DKP | Hoarding, inflation |
| EPGP | Complexity, decay confusion |
| Loot Council | Corruption accusations, trust deficits |
| Soft Reserve | Gaming (waiting to see others' picks) |
| LootList/Priority | Strategic passing to save priority for BiS |

## 47 Pain Points by Severity

### Critical (System-breaking)
1. Loot Council corruption perception ("8 out of 10 guilds are corrupt")
2. Conflict resolution time sink (30+ min post-raid on disputes)
3. New member disadvantage (trials "5th or worse for everything")
4. Strategic gaming undermines fairness (passing minor upgrades)

### High Severity
5. Addon installation requirements
6. **Mobile inaccessibility** ← Major opportunity
7. Setup complexity (3-8 hours)
8. Trust deficit from opaque decisions
9. Spreadsheet complexity
10. Onboarding failure

### Medium Severity
11. Multi-difficulty tracking gaps
12. Localization/character encoding
13. Data integrity fragility
14. Great Vault confusion
15. Tool fragmentation

## Our Competitive Position

**What LootList+ does well:**
- Web-based (no addon required) ← Huge differentiator
- Full transparency (score breakdowns visible)
- Trial system with configurable penalties
- Multi-expansion/phase support
- Attendance integration with raid schedules
- Priority bonuses for role/spec customization

**Gaps vs research recommendations:**
- Mobile optimization (limited)
- Bad luck tracking (TODO in code)
- Discord bot automation (no notifications)
- Manipulation/gaming detection (none)
- Warcraft Logs integration (none)
- Cross-difficulty item tracking (none)

## Feature Opportunity Matrix

When evaluating new features, use this framework:

| Opportunity | Pain Point Addressed | Effort | Impact |
|-------------|---------------------|--------|--------|
| Mobile PWA | Mobile inaccessibility (High severity) | Medium | High |
| Bad luck tracking | Strategic gaming (Critical) | Low | Medium |
| Discord notifications | Tool fragmentation (Medium) | Medium | Medium |
| Gaming pattern alerts | Strategic passing (Critical) | High | High |
| WCL parse integration | Trust deficit (High) | High | Medium |
| Auto-promote trials | Onboarding (High) | Low | Low |

## Design Principles (from research)

A modern loot system should:
1. Require minimal installation (we do this ✓)
2. Provide complete transparency (we do this ✓)
3. Support multiple philosophies (partial ✓)
4. Connect to performance data (gap)
5. Offer mobile access (gap)
6. Auto-sync with external tools (gap)
7. Include manipulation detection (gap)
8. Handle trade windows gracefully (N/A for web)
9. Work across all WoW versions (we do this ✓)
10. Acknowledge fairness is subjective (we do this ✓)

## Key Quotes for Context

On trust:
> "8 out of 10 guilds on average are corrupt, from what I've seen."

On complexity:
> "Sooooo much less crap going on than other 'Mega Sheets' I have found."

On mobile:
> "I may look deeper at it when I get home and not on mobile."

On the fundamental tension:
> "Do you as a player look at your raid as a cooperative effort or as a competition? Different loot systems fit these different interpretations."

On the truth:
> "There's no such thing as a perfect Guild Loot Distribution System...anything could be said to be 'fair' as long as the entire guild's behind it."

## Usage

When working on LootList+, consider:
1. Does this feature address a critical/high severity pain point?
2. Are we maintaining our competitive advantages (web-based, transparent)?
3. Could this feature introduce a new failure mode?
4. Does it align with our voice (knowledgeable, direct, fair)?
