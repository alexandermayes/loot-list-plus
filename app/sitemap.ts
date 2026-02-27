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
      url: 'https://www.getlootlist.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.getlootlist.com/terms',
      lastModified: new Date('2026-02-06'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.getlootlist.com/privacy',
      lastModified: new Date('2026-02-06'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
