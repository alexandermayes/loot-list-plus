import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { GuildContextProvider } from "./contexts/GuildContext";
import { ExpansionProvider } from "./contexts/ExpansionContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { SWRProvider } from "./components/SWRProvider";
import { PostHogProvider } from "./components/PostHogProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import NotificationContainer from "./components/NotificationContainer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "LootList+ - Loot Management for WoW Classic Guilds",
    template: "%s | LootList+",
  },
  description: "The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage loot priority lists, and streamline raid loot distribution with Discord integration.",
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
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LootList+ - Loot Management for WoW Classic Guilds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
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
      "description": "Loot management system for World of Warcraft Classic guilds",
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
        "https://discord.gg/bigyikes"
      ]
    },
    {
      "@type": "SoftwareApplication",
      "name": "LootList+",
      "operatingSystem": "Web",
      "applicationCategory": "GameApplication",
      "url": "https://www.getlootlist.com",
      "description": "The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage loot priority lists, and streamline raid loot distribution with Discord integration.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
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
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Wowhead Tooltip Configuration */}
        <Script id="wowhead-config" strategy="beforeInteractive">
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
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${poppins.variable} antialiased font-sans`}
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
                  <PostHogProvider>
                    <NotificationContainer />
                    {children}
                    <SpeedInsights />
                    <Analytics />
                  </PostHogProvider>
                </ExpansionProvider>
              </GuildContextProvider>
            </NotificationProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
