// The single WCAG contrast implementation for this milestone (COLOR-01,
// COLOR-02). Every contrast number cited in a Phase 07 commit message, this
// plan's SUMMARY, or Phase 12's DESIGN.md is computed by the functions in
// this file, parsed straight out of app/globals.css's HSL token blocks.
// Nothing in this milestone reads contrast back from a browser, a
// screenshot, or a rendered stylesheet, and no second implementation of the
// WCAG formula is allowed to exist alongside this one.

import * as fs from 'node:fs'
import * as path from 'node:path'

export type Hsl = { h: number; s: number; l: number }

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extracts the CSS block whose opening line is `selector` followed by an
 * opening brace, by counting braces to find the matching close. Shared by
 * `parseTokens` and `parseTokenAlphas` so both walk the identical block
 * (12-03 Task 1) -- neither re-implements brace matching, and a future
 * selector-resolution fix only has one call site to change.
 *
 * Throws naming the selector when the opening brace is never found, and
 * throws naming the selector when the block is unterminated (unbalanced
 * braces). Error messages are prefixed `parseTokens:` to keep `parseTokens`
 * itself byte-identical to its pre-refactor behaviour; `parseTokenAlphas`
 * reuses the same messages rather than inventing a second wording for the
 * same two failure modes.
 */
function extractBlock(css: string, selector: string): string {
  const openPattern = new RegExp(`${escapeRegExp(selector)}\\s*\\{`)
  const openMatch = openPattern.exec(css)
  if (!openMatch) {
    throw new Error(`parseTokens: selector "${selector}" was not found in the provided CSS`)
  }

  let depth = 1
  let i = openMatch.index + openMatch[0].length
  const start = i
  while (depth > 0) {
    if (i >= css.length) {
      throw new Error(
        `parseTokens: block for selector "${selector}" is unterminated (unbalanced braces)`
      )
    }
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return css.slice(start, i - 1)
}

/**
 * Parses every `--name: H S% L%` declaration inside the `selector` block
 * into an Hsl triplet. Tolerates and ignores a trailing `/ <alpha>`
 * component so alpha-suffixed tokens like `--accent-subtle: 30 100% 50% /
 * 0.2` parse cleanly -- the alpha itself is dropped here by design; use
 * `parseTokenAlphas` to recover it.
 *
 * Throws naming the selector when the block is absent, and throws naming
 * the selector when the extracted block yields zero tokens, because an
 * empty or whitespace-only block would otherwise produce an empty token map
 * that makes every later contrast assertion vacuously true.
 */
export function parseTokens(css: string, selector: string): Record<string, Hsl> {
  const block = extractBlock(css, selector)

  const tokenPattern = /--([a-zA-Z0-9-]+):\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%(?:\s*\/\s*[\d.]+)?\s*;/g
  const tokens: Record<string, Hsl> = {}
  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(block)) !== null) {
    const [, name, h, s, l] = match
    tokens[`--${name}`] = { h: Number(h), s: Number(s), l: Number(l) }
  }

  if (Object.keys(tokens).length === 0) {
    throw new Error(
      `parseTokens: block for selector "${selector}" yielded zero HSL tokens (an empty or ` +
        `whitespace-only block would make every later contrast assertion vacuously true)`
    )
  }

  return tokens
}

/**
 * Returns a map from token name to its declared alpha, for every
 * declaration in the `selector` block that carries a trailing `/ <alpha>`
 * component. `parseTokens`'s own token map silently drops this alpha (its
 * trailing group is non-capturing) -- that is exactly the trap that makes
 * `--accent-subtle` convert to the same hex as `--accent` in both themes
 * (Phase 12 measured trap 1). A body table documenting only the hex would
 * pass the parity guard and misinform every reader; this function exists so
 * the alpha gets its own, separately-asserted column.
 *
 * Tokens with no `/ <alpha>` suffix are simply absent from the returned
 * map -- this is the normal case for the large majority of tokens, not an
 * error, so (unlike `parseTokens`) an empty result does not throw.
 */
export function parseTokenAlphas(css: string, selector: string): Record<string, number> {
  const block = extractBlock(css, selector)

  const alphaPattern =
    /--([a-zA-Z0-9-]+):\s*-?[\d.]+\s+-?[\d.]+%\s+-?[\d.]+%\s*\/\s*([\d.]+)\s*;/g
  const alphas: Record<string, number> = {}
  let match: RegExpExecArray | null
  while ((match = alphaPattern.exec(block)) !== null) {
    const [, name, alpha] = match
    alphas[`--${name}`] = Number(alpha)
  }
  return alphas
}

/**
 * Reads app/globals.css relative to process.cwd() and returns the `:root`
 * (light) and `.dark` theme token maps. Throws naming the resolved path
 * when the file is absent.
 */
export function loadThemeTokens(): { light: Record<string, Hsl>; dark: Record<string, Hsl> } {
  const cssPath = path.resolve(process.cwd(), 'app/globals.css')
  if (!fs.existsSync(cssPath)) {
    throw new Error(`loadThemeTokens: globals.css not found at "${cssPath}"`)
  }
  const css = fs.readFileSync(cssPath, 'utf-8')
  return {
    light: parseTokens(css, ':root'),
    dark: parseTokens(css, '.dark'),
  }
}

/** Converts an Hsl triplet to an sRGB [r, g, b] triple in the 0-255 range. */
export function hslToRgb(hsl: Hsl): [number, number, number] {
  const h = hsl.h
  const s = hsl.s / 100
  const l = hsl.l / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r: number, g: number, b: number
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/**
 * Converts an sRGB [r, g, b] triple (0-255, may be fractional from
 * `hslToRgb`) to a lowercase six-digit hex literal with a leading `#`.
 * Rounds each channel with `Math.round` and clamps to 0-255 before
 * formatting, so a Phase 12 DESIGN.md colour value can be computed straight
 * from `hslToRgb(light['--token'])` and compared byte-for-byte against a
 * hand-typed frontmatter value (never the trailing hex comments in
 * globals.css, which are not authoritative -- see the file header).
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const toHex = (channel: number): string => {
    const clamped = Math.max(0, Math.min(255, Math.round(channel)))
    return clamped.toString(16).padStart(2, '0')
  }
  return `#${rgb.map(toHex).join('')}`
}

/**
 * Converts a 6-digit hex literal (with or without a leading `#`) to an
 * [r, g, b] triple, so a Tailwind palette literal (e.g. `orange-500`) can be
 * compared against a token without converting it by hand.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`hexToRgb: expected a 6-digit hex color, received "${hex}"`)
  }
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

/** WCAG 2.x relative luminance over an sRGB [r, g, b] triple in 0-255. */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * WCAG 2.x contrast ratio between two sRGB [r, g, b] triples:
 * `(lighter + 0.05) / (darker + 0.05)`. Reproduces the reference values
 * exactly: white on black is 21, any colour against itself is 1.
 */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const lumA = relativeLuminance(a)
  const lumB = relativeLuminance(b)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Looks up two token names in a parsed theme map and returns their contrast
 * ratio. Throws an Error naming the missing property (and the optional
 * label, so a failure names the pair under test) rather than returning NaN
 * or undefined when either token is absent.
 */
export function ratio(
  tokens: Record<string, Hsl>,
  a: string,
  b: string,
  label?: string
): number {
  const suffix = label ? ` (${label})` : ''
  if (!(a in tokens)) {
    throw new Error(`ratio: missing token "${a}"${suffix}`)
  }
  if (!(b in tokens)) {
    throw new Error(`ratio: missing token "${b}"${suffix}`)
  }
  return contrastRatio(hslToRgb(tokens[a]), hslToRgb(tokens[b]))
}
