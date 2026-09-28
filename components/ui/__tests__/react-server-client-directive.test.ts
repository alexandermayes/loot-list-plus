import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

/**
 * Regression guard for the `c.createContext is not a function` build failure
 * (debug session: blog-build-createcontext).
 *
 * React ships two builds. Under the `react-server` export condition -- which
 * Next.js applies to the React Server Components layer -- `react` resolves to
 * react/react.react-server.js, which exports NO createContext, useContext,
 * useState, useEffect or useRef. A module that calls one of those and does not
 * declare itself a client module gets compiled into the RSC layer, and
 * `next build` dies during "Collecting page data" with a TypeError that names
 * only a minified chunk offset.
 *
 * Nothing else catches this: tsc sees one merged React type surface and is
 * blind to export conditions, eslint-config-next has no rule for it, and the
 * unit suite renders every component in the client build where the APIs exist.
 * Only a full production build surfaces it, and only for whichever route the
 * RSC layer happens to reach first.
 *
 * The forbidden list below is derived from the installed React at test time,
 * not hardcoded, so it stays correct across React upgrades.
 */

const repoRoot = path.resolve(__dirname, '../../..')
const nodeRequire = createRequire(import.meta.url)

// Loaded by absolute file path on purpose: react's package.json "exports" map
// does not expose ./react.react-server.js by subpath, but the file is a plain
// CJS module and is the exact artifact Next.js hands the RSC layer.
const reactServerExports: Set<string> = (() => {
  const entry = path.join(repoRoot, 'node_modules/react/react.react-server.js')
  return new Set(Object.keys(nodeRequire(entry) as Record<string, unknown>))
})()

/** Directories whose modules may legitimately be reached from a Server Component. */
const SCANNED_DIRS = ['components/ui', 'app/components', 'app/contexts']

function listSourceFiles(dir: string): string[] {
  const abs = path.join(repoRoot, dir)
  if (!fs.existsSync(abs)) return []
  return fs
    .readdirSync(abs, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath ?? abs, e.name))
    .filter((p) => /\.tsx?$/.test(p))
    .filter((p) => !/__tests__|\.test\.tsx?$/.test(p))
    .map((p) => path.relative(repoRoot, p))
}

/** True when the file opens with a "use client" directive (comments/blanks allowed before it). */
function hasUseClientDirective(source: string): boolean {
  const withoutComments = source
    .replace(/^﻿/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  return /^\s*['"]use client['"]/.test(withoutComments)
}

/** Every React API the file uses as a *value* (type-only usage is erased at build time). */
function reactValueApisUsed(source: string): string[] {
  const used = new Set<string>()

  // import * as React from 'react'  ->  React.createContext(...)
  //
  // Only lowercase-initial members count. React's type surface lives in the same
  // namespace (React.HTMLAttributes<T>, React.ReactNode) and is erased at build
  // time, so it can never throw; every React export that CAN throw at module
  // scope is either a hook or a lowercase factory. The capitalised value exports
  // (Children, Fragment, Profiler, StrictMode, Suspense) all exist in the
  // react-server build anyway, so excluding them costs no coverage.
  const ns = source.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]react['"]/)
  if (ns) {
    for (const m of source.matchAll(new RegExp(`\\b${ns[1]}\\.([a-z]\\w*)\\s*[(<]`, 'g'))) {
      used.add(m[1])
    }
  }

  // import React, { useState } from 'react'  /  import { createContext } from 'react'
  for (const m of source.matchAll(/import\s+([^;]*?)\s+from\s+['"]react['"]/g)) {
    const clause = m[1]
    if (/^\s*type\b/.test(clause)) continue // `import type { ... }` is erased
    const braces = clause.match(/\{([^}]*)\}/)
    if (!braces) continue
    for (const raw of braces[1].split(',')) {
      const spec = raw.trim()
      if (!spec || /^type\s/.test(spec)) continue // inline `type Foo` is erased
      const name = spec.split(/\s+as\s+/)[0].trim()
      // Types share the namespace (ReactNode, FC). Only hooks/factories can crash
      // at module scope, and they all start lowercase.
      if (/^[a-z]/.test(name)) used.add(name)
    }
  }

  return [...used]
}

/** React APIs the file uses that simply do not exist in the react-server build. */
function serverUnsafeApis(source: string): string[] {
  return reactValueApisUsed(source).filter((api) => !reactServerExports.has(api))
}

const scanned = SCANNED_DIRS.flatMap(listSourceFiles).map((file) => {
  const source = fs.readFileSync(path.join(repoRoot, file), 'utf8')
  return { file, unsafe: serverUnsafeApis(source), isClient: hasUseClientDirective(source) }
})

describe('react-server client-directive contract', () => {
  // --- Guards on the oracle itself. A scanner that silently matches nothing
  // --- would make every assertion below vacuously true.
  it('resolves the react-server build and sees it omit the client-only APIs while keeping the server-safe ones', () => {
    expect(reactServerExports.size).toBeGreaterThan(5)
    // The exact API from the reported defect, plus its nearest neighbours.
    for (const absent of ['createContext', 'useContext', 'useState', 'useEffect', 'useRef']) {
      expect(reactServerExports.has(absent)).toBe(false)
    }
    // Boundary: these ARE exported, so using them must NOT require the directive.
    for (const present of ['forwardRef', 'memo', 'useMemo', 'useCallback', 'useId', 'createElement']) {
      expect(reactServerExports.has(present)).toBe(true)
    }
  })

  it('actually scans a meaningful number of files and detects unsafe usage in some of them', () => {
    expect(scanned.length).toBeGreaterThan(20)
    expect(scanned.filter((f) => f.unsafe.length > 0).length).toBeGreaterThan(5)
  })

  // --- The contract.
  it('every scanned module using a React API absent from the react-server build declares "use client"', () => {
    const violations = scanned
      .filter((f) => f.unsafe.length > 0 && !f.isClient)
      .map((f) => `${f.file} uses ${f.unsafe.sort().join(', ')} without a "use client" directive`)

    expect(violations).toEqual([])
  })

  // --- The reported defect, pinned directly.
  it('components/ui/card.tsx is a client module (it calls React.createContext)', () => {
    const card = scanned.find((f) => f.file === 'components/ui/card.tsx')
    expect(card, 'components/ui/card.tsx should be scanned').toBeDefined()
    expect(card!.unsafe).toContain('createContext')
    expect(card!.isClient).toBe(true)
  })

  // --- Differential control: the sibling primitive that was already correct.
  // On origin/main (GH #300 branch) modal.tsx uses useState/useRef/useEffect
  // but not createContext; the design-system workstream's version also calls
  // createContext. Either way it uses client-only React, so the control
  // asserts that plus the directive, which holds on both lines of history.
  it('components/ui/modal.tsx stays a client module (it uses client-only React too)', () => {
    const modal = scanned.find((f) => f.file === 'components/ui/modal.tsx')
    expect(modal, 'components/ui/modal.tsx should be scanned').toBeDefined()
    expect(modal!.unsafe.length).toBeGreaterThan(0)
    expect(modal!.isClient).toBe(true)
  })

  // --- Negative boundary: server-safe primitives are not dragged into the client.
  it('does not flag a primitive whose only React usage is server-safe', () => {
    const badge = scanned.find((f) => f.file === 'components/ui/badge.tsx')
    expect(badge, 'components/ui/badge.tsx should be scanned').toBeDefined()
    expect(badge!.unsafe).toEqual([])
  })
})
