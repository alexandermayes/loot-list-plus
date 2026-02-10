import type { NextConfig } from "next";

const securityHeaders = [
  {
    // Content Security Policy - prevent XSS and injection attacks
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://wow.zamimg.com https://us-assets.i.posthog.com",
      "style-src 'self' 'unsafe-inline' https://wow.zamimg.com",
      "img-src 'self' data: blob: https://cdn.discordapp.com https://wow.zamimg.com https://*.akamaihd.net https://static.wikia.nocookie.net",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.linear.app https://discord.com https://wow.zamimg.com https://nether.wowhead.com https://us.i.posthog.com https://us-assets.i.posthog.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
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
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Strict Transport Security - enforce HTTPS
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
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
};

export default nextConfig;
