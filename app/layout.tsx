import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { GuildContextProvider } from "./contexts/GuildContext";
import { ExpansionProvider } from "./contexts/ExpansionContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { SWRProvider } from "./components/SWRProvider";
import { PostHogProviderDeferred } from "./components/PostHogProviderDeferred";
import { ChunkErrorReload } from "./components/ChunkErrorReload";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import NotificationContainer from "./components/NotificationContainer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const frizQuadrata = localFont({
  src: "../public/fonts/FrizQuadrata.woff",
  variable: "--font-wow",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "LootList+ - Loot Management for WoW Classic Guilds",
    template: "%s | LootList+",
  },
  // The one definitive product description — keep identical across the
  // homepage, About page, GitHub README, JSON-LD, and directory listings.
  // Never claim "completely free" or "no paid tier": say "free core plan".
  description: "LootList+ is a transparent loot-management system for World of Warcraft Classic guilds. Raiders submit ranked loot lists, officers track attendance, and Loot Scores show who has priority for each item and why. Core features are free; Premium adds multi-team support, an officer activity feed, and reserve runs for $4.99 per month or $39 per year per guild.",
  keywords: ["WoW Classic", "loot management", "guild management", "raid loot", "loot tracking", "World of Warcraft", "loot council", "DKP alternative", "TBC Classic", "WotLK Classic"],
  authors: [{ name: "LootList+" }],
  creator: "LootList+",
  publisher: "LootList+",
  metadataBase: new URL("https://www.getlootlist.com"),
  openGraph: {
    siteName: "LootList+",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 2400,
        height: 1264,
        alt: "LootList+ - Loot Management for WoW Classic Guilds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here if you have one
    // google: "your-verification-code",
  },
  category: "gaming",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.getlootlist.com/#website",
      "url": "https://www.getlootlist.com",
      "name": "LootList+",
      "description": "LootList+ combines ranked loot lists, attendance, and transparent item-priority scores for WoW Classic guilds.",
      "publisher": {
        "@id": "https://www.getlootlist.com/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://www.getlootlist.com/#organization",
      "name": "LootList+",
      "url": "https://www.getlootlist.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.getlootlist.com/lootlist-icon.svg",
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://discord.gg/JNJewThYAB",
        "https://github.com/alexandermayes/loot-list-plus",
        "https://www.lootlistplus.com"
      ]
    },
    {
      "@type": "SoftwareApplication",
      "name": "LootList+",
      "operatingSystem": "Web",
      "applicationCategory": "GameApplication",
      "url": "https://www.getlootlist.com",
      "sameAs": ["https://www.lootlistplus.com"],
      "installUrl": "https://www.lootlistplus.com",
      "description": "LootList+ combines ranked loot lists, attendance, and transparent item-priority scores for WoW Classic guilds.",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free",
          "price": "0",
          "priceCurrency": "USD",
          "url": "https://www.getlootlist.com/pricing"
        },
        {
          "@type": "Offer",
          "name": "Premium monthly",
          "price": "4.99",
          "priceCurrency": "USD",
          "url": "https://www.getlootlist.com/pricing"
        },
        {
          "@type": "Offer",
          "name": "Premium annual",
          "price": "39.00",
          "priceCurrency": "USD",
          "url": "https://www.getlootlist.com/pricing"
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical third-party origins to shave ~100-300ms off
            the first Supabase/PostHog request by completing DNS+TCP+TLS early */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="dns-prefetch" href="https://us.i.posthog.com" />
        <link rel="dns-prefetch" href="https://wow.zamimg.com" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Wowhead Tooltip Configuration */}
        <Script id="wowhead-config" strategy="afterInteractive">
          {`
            var wowhead_tooltips = {
              colorlinks: false,
              iconizelinks: false,
              renamelinks: false
            };
          `}
        </Script>
        {/* Wowhead Tooltip Script */}
        <Script
          src="https://wow.zamimg.com/widgets/power.js"
          strategy="lazyOnload"
        />
      </head>
      <body
        className={`${poppins.variable} ${frizQuadrata.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SWRProvider>
            <NotificationProvider>
              <GuildContextProvider>
                <ExpansionProvider>
                  <PostHogProviderDeferred>
                    <ChunkErrorReload />
                    <NotificationContainer />
                    {children}
                    <SpeedInsights />
                    <Analytics />
                  </PostHogProviderDeferred>
                </ExpansionProvider>
              </GuildContextProvider>
            </NotificationProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
