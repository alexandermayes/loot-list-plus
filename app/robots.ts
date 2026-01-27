import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/overview', '/dashboard', '/profile', '/characters', '/loot-list', '/master-sheet', '/attendance', '/loot-submissions', '/master-loot', '/loot-settings'],
    },
    sitemap: 'https://lootlistplus.com/sitemap.xml',
  }
}
