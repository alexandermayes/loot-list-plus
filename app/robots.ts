import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI search crawlers, allowed explicitly. OpenAI: OAI-SearchBot
      // determines whether pages can appear in ChatGPT Search; GPTBot is the
      // separate training crawler. Anthropic: Claude-SearchBot indexes for
      // Claude's search quality, Claude-User fetches pages when Claude users
      // search, ClaudeBot is the training crawler. Only auth-only and API
      // paths are excluded.
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/'],
      },
      {
        userAgent: 'Claude-SearchBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/'],
      },
      {
        userAgent: 'Claude-User',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/'],
      },
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
          '/landing',
          '/help',
          '/updates',
        ],
      },
    ],
    sitemap: 'https://www.getlootlist.com/sitemap.xml',
  }
}
