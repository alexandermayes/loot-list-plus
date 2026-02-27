import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/admin/',
          '/overview',
          '/dashboard',
          '/profile',
          '/characters',
          '/loot-list',
          '/master-sheet',
          '/attendance',
          '/loot-submissions',
          '/master-loot',
          '/loot-settings',
          '/guild-select',
          '/dev-login',
          '/help',
          '/updates',
        ],
      },
    ],
    sitemap: 'https://www.getlootlist.com/sitemap.xml',
  }
}
