import type { CaseStudy } from './types'

// ---------------------------------------------------------------------------
// Dev and test only. Never a customer.
//
// This entry is filtered out of every production build by
// `isFixtureRouteEnabled()` in `./index.ts` and never enters
// `publishedCaseStudies`, so it can never reach `app/sitemap.ts` or a
// reachable production URL. Every string below is plainly placeholder
// wording, chosen at a realistic length so wrapping and hierarchy can be
// judged under `npm run dev` and in tests, and every number is plausibly
// shaped rather than a claim about any real guild (D-09).
// ---------------------------------------------------------------------------

export const exampleGuildFixture: CaseStudy = {
  slug: 'example-guild-fixture',
  isFixture: true,
  title: {
    variant: 'preferred',
    beforeAdminTime: '6 hours a week',
    afterAdminTime: '45 minutes a week',
  },
  proofStrip: {
    rosterSize: '28 raiders',
    expansionTier: 'Cataclysm Classic, Tier 11',
    adminTimeDelta: '6 hours to 45 minutes a week',
    monthsUsing: '5 months using LootList+',
  },
  guild: 'Example Guild (Fixture)',
  size: '28',
  expansionTier: 'Cataclysm Classic Tier 11',
  oldProcess: 'a shared spreadsheet with manually typed loot council notes',
  oldProcessCost: 'about six hours a week of officer time reconciling who was owed what',
  oldProcessFailure: 'raiders arguing that the spreadsheet had been quietly edited after the fact',
  timePeriod: 'five months',
  verifiedResult: 'cut its weekly loot administration from six hours to well under an hour',
  beforeNarrative:
    'Before LootList+, Example Guild (Fixture) tracked every raider\'s priority in a shared spreadsheet that the loot council updated by hand after each raid. Officers spent most of a Sunday afternoon reconciling who still had priority on which item, and raiders who missed a session often could not tell whether their spot on the list had changed until loot was already being called. Disagreements about past awards were common because nobody outside the loot council could see the history that led to a decision.',
  afterNarrative:
    'After adopting LootList+, every raider submits and can see their own ranked list, and the Loot Score for each item is visible before the item ever drops. Officers no longer reconcile a spreadsheet by hand: the system carries attendance and rank forward automatically, so a raider who missed one night can still see exactly where they stand the next time an item comes up. The guild reports that loot-related disputes in raid chat have nearly disappeared since the switch.',
  quote:
    'We used to spend an entire Sunday afternoon just making sure the spreadsheet matched what actually happened in raid. Now every raider can see their own priority before we even pull the boss, and nobody argues about it anymore because the reasoning is right there on the screen.',
  limitation:
    'The one thing we would still like is a faster way to bulk-import Warcraft Logs history from before we started using LootList+, so older raiders did not have to manually confirm a few early attendance records by hand.',
  interviewedMonthYear: 'March 2026',
  publishedIso: '2026-03-15T00:00:00Z',
  author: {
    name: 'Fixture Officer',
    guild: 'Example Guild (Fixture)',
    verification: { type: 'verified_customer_dated', monthYear: 'March 2026' },
  },
}
