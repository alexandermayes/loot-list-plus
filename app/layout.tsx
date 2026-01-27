import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { GuildContextProvider } from "./contexts/GuildContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationContainer from "./components/NotificationContainer";
import "./globals.css";

export const dynamic = 'force-dynamic'

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LootList+ | WoW Classic Loot Management",
  description: "The ultimate loot council tool for WoW Classic guilds. Track attendance, manage loot lists, and streamline your raid's loot distribution.",
  keywords: ["WoW Classic", "loot council", "guild management", "raid loot", "loot tracking", "World of Warcraft"],
  authors: [{ name: "LootList+" }],
  metadataBase: new URL("https://www.lootlistplus.com"),
  openGraph: {
    title: "LootList+ | WoW Classic Loot Management",
    description: "The ultimate loot council tool for WoW Classic guilds. Track attendance, manage loot lists, and streamline your raid's loot distribution.",
    url: "https://www.lootlistplus.com",
    siteName: "LootList+",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LootList+ | WoW Classic Loot Management",
    description: "The ultimate loot council tool for WoW Classic guilds. Track attendance, manage loot lists, and streamline your raid's loot distribution.",
  },
  icons: {
    icon: "/lootlist-icon.svg",
    apple: "/lootlist-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Wowhead Tooltip Configuration */}
        <Script id="wowhead-config" strategy="beforeInteractive">
          {`
            var wowhead_tooltips = {
              colorlinks: true,
              iconizelinks: true,
              renamelinks: true
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
        <NotificationProvider>
          <GuildContextProvider>
            <NotificationContainer />
            {children}
          </GuildContextProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
