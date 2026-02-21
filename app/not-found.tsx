import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/ui/typography'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-border/50 bg-background-subtle">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <nav className="flex items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image
                src="/logo.svg"
                alt="LootList+"
                width={100}
                height={16}
                className="h-4 w-auto"
                priority
              />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          {/* Gnome Image */}
          <div className="mb-8">
            <img
              src="/images/404-gnome.png"
              alt="Gnome engineer scratching his head at a broken monitor"
              className="w-full max-w-md mx-auto"
              draggable={false}
              loading="lazy"
            />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <Heading level={1}>404: Nothing to loot here</Heading>
            <Text color="muted" size="lg">
              Our gnomish engineers are on it, but in the meantime...
            </Text>
          </div>

          {/* Action Button */}
          <div className="mt-8">
            <Link href="/">
              <Button variant="outline" size="lg">
                <img
                  src="/images/hearthstone-icon.png"
                  alt=""
                  className="w-5 h-5"
                  loading="lazy"
                />
                Hearth back home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
