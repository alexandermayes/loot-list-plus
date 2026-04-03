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
          '/profile',
          '/characters',
          '/loot-list',
          '/master-sheet',
          '/attendance',
          '/loot-submissions',
          '/master-loot',
          '/loot-settings',
          '/loot-management',
          '/guild-settings',
          '/raid-tracking',
          '/raid-teams',
          '/audit-log',
          '/expansions',
          '/sheet-import',
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
