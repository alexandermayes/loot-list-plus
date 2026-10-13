// @vitest-environment node
//
// Source-scan guard for the analytics privacy rules.
//
// Hard Constraint 3 forbids player and guild names in analytics, and owner
// decision 4 (2026-10-13) removed email from person properties. This test reads
// every .ts and .tsx file under app, lib, utils and components, pulls out the
// argument text of every analytics call, and fails if a call passes a player
// or guild name, or if an identify call passes an email.
//
// Item names, realms and factions are not personal names and are allowed. To
// send a new property, use an id or a count.
//
// The scan is textual. It reads the arguments written at the call, so a
// properties object built in a variable elsewhere is only caught where it is
// passed literally. Route tests that assert exact properties cover the server
// events that have route tests.
//
// If this test reports a site, fix it when it is a player or guild name. If it
// is a true false positive (not a person or guild name), narrow the pattern
// below and explain why in a comment next to the pattern.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const SCAN_DIRS = ['app', 'lib', 'utils', 'components']
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])

/** A call to an analytics function, with the text between its parentheses. */
interface AnalyticsCall {
  callee: string
  args: string
}

// Callee names whose arguments are scanned.
const CALLEE_PATTERN =
  /\b(trackClientEvent|trackEvent|posthog\.(?:capture|register|unregister|group|identify)|client\.(?:capture|identify))\s*\(/g

// Identifiers that only ever hold a player or guild name. Word boundaries keep
// event names such as 'guild_name_changed' from matching.
const NAME_IDENTIFIER =
  /\b(character_name|characterName|guild_name|guildName|player_name|playerName|display_name|displayName|preferred_display_name|current_guild)\b/

// A name property read off a person or guild object, such as activeGuild?.name.
// Only these receivers are listed so item.name and realm.name stay allowed.
const NAME_PROPERTY_READ =
  /\b(?:guild|activeGuild|character|char|member|raider|player|user)\s*\??\s*\.\s*name\b/

// A bare name key, such as { name: g.name }. The preceding character rules out
// keys like item_name and guild_name.
const BARE_NAME_KEY = /(?:^|[{,\s])name\s*:/

// An email key (also the shorthand { email }) or an .email property read.
const EMAIL_KEY = /(?:^|[{,\s])email\??\s*:/
const EMAIL_SHORTHAND = /(?:^|[{,])\s*email\s*(?=[,}])/
const EMAIL_PROPERTY_READ = /\.\s*email\b/

const IDENTIFY_CALLEES = new Set(['posthog.identify', 'client.identify'])
// unregister removes a property, so its argument ('guild_name') is allowed.
const NAME_EXEMPT_CALLEES = new Set(['posthog.unregister'])

/**
 * Returns the text between the parenthesis at `openIndex` and its match, or
 * null when the parentheses never balance. Strings, template literals and
 * comments are skipped so a bracket inside them does not count.
 */
function readBalanced(source: string, openIndex: number): string | null {
  let depth = 0
  let i = openIndex
  while (i < source.length) {
    const ch = source[i]
    const next = source[i + 1]
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i)
      if (end === -1) return null
      i = end
      continue
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      if (end === -1) return null
      i = end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') j++
        j++
      }
      if (j >= source.length) return null
      i = j + 1
      continue
    }
    if (ch === '(') depth++
    if (ch === ')') {
      depth--
      if (depth === 0) return source.slice(openIndex + 1, i)
    }
    i++
  }
  return null
}

/** True when the match sits on a comment line or is a function declaration. */
function isNotACall(source: string, matchIndex: number): boolean {
  const lineStart = source.lastIndexOf('\n', matchIndex - 1) + 1
  const before = source.slice(lineStart, matchIndex)
  const trimmed = before.trimStart()
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true
  return /\bfunction\s+$/.test(before)
}

/**
 * Finds every analytics call in `source`. An unbalanced call is returned with
 * args set to the marker below so the scan reports it instead of skipping it.
 */
const UNBALANCED = '<<unbalanced parentheses>>'
function extractAnalyticsCalls(source: string): AnalyticsCall[] {
  const calls: AnalyticsCall[] = []
  for (const match of source.matchAll(CALLEE_PATTERN)) {
    const index = match.index ?? 0
    if (isNotACall(source, index)) continue
    const openIndex = index + match[0].length - 1
    const args = readBalanced(source, openIndex)
    calls.push({ callee: match[1], args: args ?? UNBALANCED })
  }
  return calls
}

/** Reasons a call passes a player or guild name (empty when it does not). */
function findNameViolations(call: AnalyticsCall): string[] {
  if (call.args === UNBALANCED) return ['could not read the call arguments']
  if (NAME_EXEMPT_CALLEES.has(call.callee)) return []
  const reasons: string[] = []
  if (NAME_IDENTIFIER.test(call.args)) reasons.push('name identifier')
  if (NAME_PROPERTY_READ.test(call.args)) reasons.push('name property read')
  if (BARE_NAME_KEY.test(call.args)) reasons.push('bare name key')
  return reasons
}

/** Reasons an identify call passes an email (empty for other callees). */
function findEmailViolations(call: AnalyticsCall): string[] {
  if (!IDENTIFY_CALLEES.has(call.callee)) return []
  const reasons: string[] = []
  if (EMAIL_KEY.test(call.args)) reasons.push('email key')
  if (EMAIL_SHORTHAND.test(call.args)) reasons.push('email shorthand')
  if (EMAIL_PROPERTY_READ.test(call.args)) reasons.push('email property read')
  return reasons
}

function listSourceFiles(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      files.push(...listSourceFiles(path.join(dir, entry.name)))
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      files.push(path.join(dir, entry.name))
    }
  }
  return files
}

/** One-line form of a call for failure output. */
function describeCall(call: AnalyticsCall): string {
  const args = call.args.replace(/\s+/g, ' ').trim()
  return `${call.callee}(${args.length > 200 ? `${args.slice(0, 200)}...` : args})`
}

// The real scan is computed once and shared by the tests below.
const scannedFiles = SCAN_DIRS.flatMap((dir) => listSourceFiles(path.join(REPO_ROOT, dir)))
const scannedCalls: { file: string; call: AnalyticsCall }[] = []
for (const file of scannedFiles) {
  const relative = path.relative(REPO_ROOT, file)
  for (const call of extractAnalyticsCalls(fs.readFileSync(file, 'utf8'))) {
    scannedCalls.push({ file: relative, call })
  }
}

describe('no player or guild names in analytics calls', () => {
  it('scans at least 50 analytics call sites', () => {
    expect(scannedFiles.length).toBeGreaterThan(0)
    expect(scannedCalls.length).toBeGreaterThanOrEqual(50)
  })

  it('finds no analytics call that passes a player or guild name', () => {
    const violations = scannedCalls
      .map(({ file, call }) => ({ file, call, reasons: findNameViolations(call) }))
      .filter((v) => v.reasons.length > 0)
      .map((v) => `${v.file}: ${describeCall(v.call)} [${v.reasons.join(', ')}]`)
    expect(violations).toEqual([])
  })

  it('finds no identify call that passes an email (owner decision 4)', () => {
    const violations = scannedCalls
      .map(({ file, call }) => ({ file, call, reasons: findEmailViolations(call) }))
      .filter((v) => v.reasons.length > 0)
      .map((v) => `${v.file}: ${describeCall(v.call)} [${v.reasons.join(', ')}]`)
    expect(violations).toEqual([])
  })

  it('scans identify calls, so the email rule is not vacuous', () => {
    const identifyCalls = scannedCalls.filter(({ call }) => IDENTIFY_CALLEES.has(call.callee))
    expect(identifyCalls.length).toBeGreaterThanOrEqual(1)
  })
})

describe('the scan flags violations (self-checks)', () => {
  const flaggedNames = [
    "trackClientEvent('x', { character_name: 'a' })",
    "posthog.group('guild', id, { name: g.name })",
    "trackEvent({ properties: { guild_name } })",
    "posthog.identify(id, { display_name: n })",
    "posthog.identify(id, { email: u.email })",
  ]

  it.each(flaggedNames)('flags %s', (snippet) => {
    const calls = extractAnalyticsCalls(snippet)
    expect(calls).toHaveLength(1)
    const reasons = [...findNameViolations(calls[0]), ...findEmailViolations(calls[0])]
    expect(reasons.length).toBeGreaterThan(0)
  })

  it('flags the name rule on the name snippets and the email rule on the email snippet', () => {
    const [character, group, guild, display, email] = flaggedNames.map((s) => extractAnalyticsCalls(s)[0])
    expect(findNameViolations(character)).toContain('name identifier')
    expect(findNameViolations(group)).toContain('bare name key')
    expect(findNameViolations(guild)).toContain('name identifier')
    expect(findNameViolations(display)).toContain('name identifier')
    expect(findEmailViolations(email)).toEqual(expect.arrayContaining(['email key', 'email property read']))
    expect(findEmailViolations(character)).toEqual([])
  })

  it('flags an email shorthand and an email property read passed to client.identify', () => {
    const shorthand = extractAnalyticsCalls('client.identify({ distinctId: id, properties: { email } })')[0]
    const read = extractAnalyticsCalls('client.identify({ distinctId: id, properties: { contact: user.email } })')[0]
    expect(findEmailViolations(shorthand)).toContain('email shorthand')
    expect(findEmailViolations(read)).toContain('email property read')
  })

  it('flags a name property read off a person or guild object', () => {
    const call = extractAnalyticsCalls("trackClientEvent('x', { who: activeGuild?.name })")[0]
    expect(findNameViolations(call)).toContain('name property read')
  })

  it('does not flag item names or an unregister of guild_name', () => {
    const item = extractAnalyticsCalls("trackClientEvent('x', { item_name: item.name, guild_id })")[0]
    const unregister = extractAnalyticsCalls("posthog.unregister('guild_name')")[0]
    expect(findNameViolations(item)).toEqual([])
    expect(findEmailViolations(item)).toEqual([])
    expect(findNameViolations(unregister)).toEqual([])
  })

  it('does not flag an event name that merely contains a name word', () => {
    const call = extractAnalyticsCalls("trackClientEvent('guild_name_changed', { guild_id })")[0]
    expect(findNameViolations(call)).toEqual([])
  })

  it('reads through nested parentheses, strings and comments', () => {
    const source = [
      'trackClientEvent("a)b", {',
      '  // a (comment',
      '  count: items.filter((i) => i.ok).length,',
      '  character_name: c,',
      '})',
    ].join('\n')
    const calls = extractAnalyticsCalls(source)
    expect(calls).toHaveLength(1)
    expect(findNameViolations(calls[0])).toContain('name identifier')
  })

  it('ignores function declarations and comment lines, and reports unbalanced calls', () => {
    expect(extractAnalyticsCalls('export async function trackEvent({ event }: P) {}')).toEqual([])
    expect(extractAnalyticsCalls('// trackEvent({ character_name })')).toEqual([])
    expect(extractAnalyticsCalls(' * trackEvent({ character_name })')).toEqual([])
    const unbalanced = extractAnalyticsCalls('trackEvent({ a: 1 ')[0]
    expect(findNameViolations(unbalanced)).toEqual(['could not read the call arguments'])
  })
})
