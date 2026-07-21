import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.getlootlist.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://www.getlootlist.com/compare',
      lastModified: new Date(2026, 3, 3),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://www.getlootlist.com/blog/guild-recruitment-guide-find-raiders-who-stay',
      lastModified: new Date(2026, 4, 21),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders',
      lastModified: new Date(2026, 4, 7),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet',
      lastModified: new Date(2026, 4, 7),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council',
      lastModified: new Date(2026, 3, 28),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/the-officer-burnout-problem-and-how-to-fix-it',
      lastModified: new Date(2026, 3, 19),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-onboard-new-raiders-without-killing-morale',
      lastModified: new Date(2026, 3, 10),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild',
      lastModified: new Date(2026, 2, 23),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026',
      lastModified: new Date(2026, 3, 2),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules',
      lastModified: new Date(2026, 2, 26),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.getlootlist.com/changelog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: 'https://www.getlootlist.com/terms',
      lastModified: new Date(2026, 1, 6),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.getlootlist.com/privacy',
      lastModified: new Date(2026, 1, 6),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
