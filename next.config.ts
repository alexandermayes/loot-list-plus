import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  // Default: only allow same-origin resources
  "default-src 'self'",

  // Scripts: allow self, Wowhead tooltips, PostHog assets
  // - unsafe-inline needed for Next.js inline scripts and Wowhead config
  // - unsafe-eval only in dev for hot reload (stripped in production)
  [
    "script-src 'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : '',
    'https://wow.zamimg.com',
    'https://us-assets.i.posthog.com',
    'https://va.vercel-scripts.com',
  ].filter(Boolean).join(' '),

  // Styles: allow self and inline (Next.js injects inline styles)
  "style-src 'self' 'unsafe-inline' https://wow.zamimg.com",

  // Images: allow self, data URIs, blobs, and external CDNs for game assets
  "img-src 'self' data: blob: https://cdn.discordapp.com https://wow.zamimg.com https://*.akamaihd.net https://static.wikia.nocookie.net",

  // Fonts: self-hosted by Next.js via next/font, plus data URIs for inline fonts
  "font-src 'self' data:",

  // API connections: only domains the browser actually connects to
  // Server-side-only domains (api.anthropic.com, api.linear.app, discord.com) are excluded
  // since CSP only governs browser-initiated requests
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://wow.zamimg.com https://nether.wowhead.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.battle.net https://us.api.blizzard.com https://eu.api.blizzard.com https://va.vercel-scripts.com",

  // Prevent embedding in iframes (clickjacking protection)
  "frame-ancestors 'none'",

  // Restrict <base> tag to same origin
  "base-uri 'self'",

  // Restrict form submissions to same origin
  "form-action 'self'",

  // Disallow plugins (Flash, Java applets, etc.)
  "object-src 'none'",

  // Workers and service workers: allow same-origin and blob URLs
  "worker-src 'self' blob:",

  // Block all <frame>, <iframe>, <object>, <embed> content
  "frame-src 'none'",

  // Enforce HTTPS in production
  ...(isDev ? [] : ['upgrade-insecure-requests']),
];

const securityHeaders = [
  {
    // Content Security Policy - prevent XSS and injection attacks
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    // Prevent clickjacking attacks
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Prevent MIME type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Control referrer information
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Enable XSS protection in older browsers
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Control browser features and APIs
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    // Strict Transport Security - enforce HTTPS
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  // Redirect non-www to www on both domains (canonical).
  // Without this, cookies set on lootlistplus.com aren't sent to
  // www.lootlistplus.com, which breaks auth after the OAuth callback.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'getlootlist.com' }],
        destination: 'https://www.getlootlist.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'lootlistplus.com' }],
        destination: 'https://www.lootlistplus.com/:path*',
        permanent: true,
      },
    ]
  },
  // Proxy PostHog requests through our domain to bypass ad blockers
  // Using /a/ prefix (looks like API) instead of /ingest which is in filter lists
  async rewrites() {
    return [
      {
        source: '/a/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/a/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/icons/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/embed/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    // Reduce App Router client cache to prevent stale RSC payloads after deployments.
    // dynamic: 0 means navigating to a page always fetches fresh server data instead
    // of serving a cached response from a previous visit in this session.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
    // Tree-shake large icon and animation libraries for smaller bundles
    optimizePackageImports: [
      '@hugeicons/core-free-icons',
      '@hugeicons-pro/core-solid-rounded',
      '@hugeicons/react',
      'framer-motion',
      'posthog-js',
    ],
  },
};

export default nextConfig;
