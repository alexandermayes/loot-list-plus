import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { GuildContextProvider } from "./contexts/GuildContext";
import "./globals.css";

export const dynamic = 'force-dynamic'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LootList+",
  description: "WoW Classic loot management system for <Big Yikes>",
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
        className={`${inter.variable} antialiased font-sans`}
      >
        <GuildContextProvider>
          {children}
        </GuildContextProvider>
      </body>
    </html>
  );
}
