/**
 * Write JSON data as WoW SavedVariables Lua table format
 *
 * Generates output like:
 * LootListPlusDB = {
 *   ["profiles"] = {
 *     ["Default"] = {
 *       ["guildData"] = { ... },
 *     },
 *   },
 * }
 */

import { parseLuaTable } from './lua-parser'

export function toLuaTable(varName: string, data: unknown): string {
  return `${varName} = ${toLuaValue(data, 0)}\n`
}

function toLuaValue(value: unknown, indent: number): string {
  if (value === null || value === undefined) {
    return 'nil'
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) return 'nil'
    if (Number.isInteger(value)) return value.toString()
    return value.toString()
  }

  if (typeof value === 'string') {
    return toLuaString(value)
  }

  if (Array.isArray(value)) {
    return toLuaArray(value, indent)
  }

  if (typeof value === 'object') {
    return toLuaObject(value as Record<string, unknown>, indent)
  }

  return 'nil'
}

function toLuaString(str: string): string {
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
  return `"${escaped}"`
}

function toLuaArray(arr: unknown[], indent: number): string {
  if (arr.length === 0) return '{}'

  const prefix = '\t'.repeat(indent + 1)
  const closePrefix = '\t'.repeat(indent)
  const parts: string[] = []

  for (const item of arr) {
    parts.push(`${prefix}${toLuaValue(item, indent + 1)},`)
  }

  return `{\n${parts.join('\n')}\n${closePrefix}}`
}

function toLuaObject(obj: Record<string, unknown>, indent: number): string {
  const keys = Object.keys(obj)
  if (keys.length === 0) return '{}'

  const prefix = '\t'.repeat(indent + 1)
  const closePrefix = '\t'.repeat(indent)
  const parts: string[] = []

  for (const key of keys) {
    const value = obj[key]
    if (value === undefined) continue

    // Use ["key"] = value format for all keys
    const luaKey = isValidLuaIdent(key) ? key : `[${toLuaString(key)}]`
    parts.push(`${prefix}${luaKey} = ${toLuaValue(value, indent + 1)},`)
  }

  return `{\n${parts.join('\n')}\n${closePrefix}}`
}

function isValidLuaIdent(str: string): boolean {
  return /^[a-zA-Z_]\w*$/.test(str)
}

/**
 * Update a specific field in existing SavedVariables content
 * without overwriting the entire file.
 *
 * This reads the existing file, parses it, updates the specified path,
 * and writes it back.
 */
export function updateSavedVarsField(
  existingContent: string,
  varName: string,
  fieldPath: string[],
  value: unknown
): string {
  // For simplicity, we regenerate the entire variable assignment.
  // A more sophisticated approach would patch in-place,
  // but for our use case the file is small enough.
  const data = parseLuaTable(existingContent)

  let target = data[varName] as Record<string, unknown>
  if (!target || typeof target !== 'object') {
    target = {}
    data[varName] = target
  }

  // Navigate to the parent of the target field
  let current: Record<string, unknown> = target
  for (let i = 0; i < fieldPath.length - 1; i++) {
    const key = fieldPath[i]
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  // Set the value
  const lastKey = fieldPath[fieldPath.length - 1]
  current[lastKey] = value

  // Regenerate
  return toLuaTable(varName, target)
}
