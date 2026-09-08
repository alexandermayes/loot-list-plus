import { MetadataRoute } from 'next'
import * as contentDates from '@/lib/content-dates'

// Every lastModified value below is read from data/content-dates.json via
// lib/content-dates.ts. See lib/CONTENT-DATES.md for the rule on what
// bumps a date and what does not. This file restates no date of its own.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.getlootlist.com',
      lastModified: contentDates.contentDate('/'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://www.getlootlist.com/compare',
      lastModified: contentDates.contentDate('/compare'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/about',
      lastModified: contentDates.contentDate('/about'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.getlootlist.com/pricing',
      lastModified: contentDates.contentDate('/pricing'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/premium',
      lastModified: contentDates.contentDate('/premium'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.getlootlist.com/blog',
      lastModified: contentDates.latestBlogDate(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://www.getlootlist.com/blog/guild-recruitment-guide-find-raiders-who-stay',
      lastModified: contentDates.blogPostDate('guild-recruitment-guide-find-raiders-who-stay'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders',
      lastModified: contentDates.blogPostDate('how-to-handle-loot-drama-without-losing-raiders'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet',
      lastModified: contentDates.blogPostDate('how-to-run-loot-without-a-spreadsheet'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council',
      lastModified: contentDates.blogPostDate('loot-priority-lists-vs-loot-council'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/the-officer-burnout-problem-and-how-to-fix-it',
      lastModified: contentDates.blogPostDate('the-officer-burnout-problem-and-how-to-fix-it'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-onboard-new-raiders-without-killing-morale',
      lastModified: contentDates.blogPostDate('how-to-onboard-new-raiders-without-killing-morale'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild',
      lastModified: contentDates.blogPostDate('how-to-set-up-a-fair-loot-system-for-your-wow-guild'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026',
      lastModified: contentDates.blogPostDate('dkp-is-dead-what-classic-guilds-use-in-2026'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules',
      lastModified: contentDates.blogPostDate('why-attendance-tracking-matters-more-than-loot-rules'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
      lastModified: contentDates.contentDate('/research/wow-classic-loot-systems-2026'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/changelog',
      lastModified: contentDates.latestChangelogDate(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: 'https://www.getlootlist.com/terms',
      lastModified: contentDates.contentDate('/terms'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.getlootlist.com/privacy',
      lastModified: contentDates.contentDate('/privacy'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
