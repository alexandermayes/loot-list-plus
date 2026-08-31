import type { Metadata } from 'next'

// The changelog page itself is a client component ('use client'), so it can't
// export metadata. This server layout supplies a unique title/description and
// canonical for the route (previously it fell back to the generic site default).
export const metadata: Metadata = {
  title: 'LootList+ Changelog: Recent Updates',
  description:
    'Recent LootList+ releases: new features, fixes, and improvements. See what shipped and when.',
  alternates: {
    canonical: '/changelog',
  },
  openGraph: {
    title: 'LootList+ Changelog',
    description:
      'New features, improvements, and fixes across LootList+ for World of Warcraft guild loot management.',
    url: 'https://www.getlootlist.com/changelog',
    type: 'website',
  },
}

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children
}
