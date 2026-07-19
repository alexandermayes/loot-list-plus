import type { Metadata } from 'next'

// The changelog page itself is a client component ('use client'), so it can't
// export metadata. This server layout supplies a unique title/description and
// canonical for the route (previously it fell back to the generic site default).
export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Every LootList+ update: new features, improvements, and fixes for WoW guild loot management, attendance tracking, and Discord integration.',
  alternates: {
    canonical: '/changelog',
  },
  openGraph: {
    title: 'LootList+ Changelog',
    description:
      'New features, improvements, and fixes across LootList+ for WoW guild loot management.',
    url: 'https://www.getlootlist.com/changelog',
    type: 'website',
  },
}

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children
}
