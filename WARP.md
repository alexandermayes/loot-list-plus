# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core commands

Use any supported package manager; examples below use `npm`.

- Development server: `npm run dev` (starts Next.js on http://localhost:3000)
- Production build: `npm run build`
- Start production server (after build): `npm start`
- Lint entire project: `npm run lint`
- Lint specific files: `npx eslint app/page.tsx app/layout.tsx` (or `npm run lint -- app/page.tsx`)

There is currently no test runner or `test` script configured in `package.json`.

## High-level architecture

### Framework and tooling

- Next.js App Router project (see `next.config.ts` and `app/` directory).
- TypeScript is enabled with strict settings (`tsconfig.json`).
- Styling is handled via Tailwind CSS v4 using the new `@import "tailwindcss";` entrypoint and theme primitives in `app/globals.css`.
- ESLint is configured via `eslint.config.mjs`, extending `eslint-config-next` presets for Core Web Vitals and TypeScript.

### Application structure

- `app/layout.tsx` defines `RootLayout`, which:
  - Sets global metadata via the exported `metadata` object.
  - Imports `app/globals.css` for global styles.
  - Configures Geist sans and mono fonts via `next/font/google` and exposes them as CSS variables used by Tailwind (`--font-geist-sans`, `--font-geist-mono`).
  - Wraps all pages in the `<html>` and `<body>` shells.

- `app/page.tsx` is the main root route (`/`):
  - Renders a centered marketing-style landing section that currently shows the default Create Next App content.
  - Uses `next/image` for the Next.js and Vercel logos.
  - Relies on Tailwind utility classes for layout, color, and responsive behavior.

- `app/globals.css`:
  - Defines light/dark theme CSS variables for background and foreground colors.
  - Bridges those variables into Tailwind’s design tokens via an inline `@theme` block.
  - Sets base body styles (background, text color, fallback font family).

### TypeScript and path aliases

- `tsconfig.json` defines a path alias `@/*` that resolves to the project root:
  - You can import from anywhere in the repo using `@/app/...` rather than relative paths.
  - This alias is not heavily used yet but should be preferred as the project grows.

### Linting behavior

- `eslint.config.mjs` uses `eslint/config`’s `defineConfig` with `eslint-config-next` presets and `globalIgnores`.
- Build artifacts and Next.js generated types are ignored (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`).

## Additional notes for Warp agents

- For general usage and additional Next.js-specific documentation, refer to `README.md`, which contains the standard Create Next App instructions.
- When adding new routes or components, follow the App Router conventions by placing them under `app/` and exporting server or client components as appropriate.
