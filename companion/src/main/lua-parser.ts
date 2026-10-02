/**
 * Parse WoW SavedVariables Lua tables into JSON
 *
 * SavedVariables format:
 * LootListPlusDB = {
 *   ["profiles"] = {
 *     ["Default"] = {
 *       ["guildData"] = { ... },
 *       ["pendingAwards"] = { ... },
 *     },
 *   },
 * }
 *
 * Lua tells [20928] (a number key) from ["20928"] (a string key), but a JS
 * object key is always a string. So every parsed non-array table records
 * which of its keys were numbers under LUA_NUMBER_KEYS, and lua-writer.ts
 * writes those back as [n]. The addon looks items up by number and member
 * ranks by string, so the difference matters.
 */

/** Hidden marker: the keys of a table that are Lua numbers, as strings. */
export const LUA_NUMBER_KEYS: unique symbol = Symbol('luaNumberKeys')

/**
 * Records keys of obj as Lua number keys, adding to any keys already
 * recorded. The marker is a non-enumerable Symbol property, so it is
 * invisible to Object.keys, JSON.stringify and object spread.
 */
export function markLuaNumberKeys(obj: object, keys: Iterable<string>): void {
  const holder = obj as { [LUA_NUMBER_KEYS]?: Set<string> }
  let set = holder[LUA_NUMBER_KEYS]
  if (!set) {
    set = new Set<string>()
    Object.defineProperty(obj, LUA_NUMBER_KEYS, { value: set, enumerable: false, configurable: true })
  }
  for (const key of keys) set.add(key)
}

export function parseLuaTable(lua: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Find the top-level assignments
  const assignmentPattern = /^(\w+)\s*=\s*/gm
  let match

  while ((match = assignmentPattern.exec(lua)) !== null) {
    const varName = match[1]
    const valueStart = match.index + match[0].length
    const value = parseLuaValue(lua, valueStart)
    if (value !== undefined) {
      result[varName] = value.value
    }
  }

  return result
}

interface ParseResult {
  value: unknown
  endIndex: number
}

function parseLuaValue(lua: string, start: number): ParseResult | undefined {
  const pos = skipWhitespace(lua, start)
  if (pos >= lua.length) return undefined

  const ch = lua[pos]

  if (ch === '{') {
    return parseLuaTableValue(lua, pos)
  } else if (ch === '"' || ch === "'") {
    return parseLuaString(lua, pos)
  } else if (ch === '[' && lua[pos + 1] === '[') {
    return parseLuaLongString(lua, pos)
  } else if (ch === 't' && lua.slice(pos, pos + 4) === 'true') {
    return { value: true, endIndex: pos + 4 }
  } else if (ch === 'f' && lua.slice(pos, pos + 5) === 'false') {
    return { value: false, endIndex: pos + 5 }
  } else if (ch === 'n' && lua.slice(pos, pos + 3) === 'nil') {
    return { value: null, endIndex: pos + 3 }
  } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
    return parseLuaNumber(lua, pos)
  }

  return undefined
}

function parseLuaTableValue(lua: string, start: number): ParseResult {
  let pos = start + 1 // skip '{'
  const entries: Array<{ key: string | number; value: unknown }> = []
  let arrayIndex = 1

  while (pos < lua.length) {
    pos = skipWhitespace(lua, pos)
    if (lua[pos] === '}') {
      pos++
      break
    }

    // Check for keyed entry: ["key"] = value or [num] = value or key = value
    let key: string | number | null = null
    const savedPos = pos

    if (lua[pos] === '[') {
      pos++
      if (lua[pos] === '"' || lua[pos] === "'") {
        const strResult = parseLuaString(lua, pos)
        if (strResult) {
          key = strResult.value as string
          pos = strResult.endIndex
        }
      } else {
        const numResult = parseLuaNumber(lua, pos)
        if (numResult) {
          key = numResult.value as number
          pos = numResult.endIndex
        }
      }
      pos = skipWhitespace(lua, pos)
      if (lua[pos] === ']') pos++
      pos = skipWhitespace(lua, pos)
      if (lua[pos] === '=') pos++
    } else if (/[a-zA-Z_]/.test(lua[pos])) {
      // Try bareword key: key = value
      const wordMatch = lua.slice(pos).match(/^([a-zA-Z_]\w*)/)
      if (wordMatch) {
        const afterWord = skipWhitespace(lua, pos + wordMatch[0].length)
        if (lua[afterWord] === '=') {
          key = wordMatch[1]
          pos = afterWord + 1
        } else {
          // Not a key, restore position
          pos = savedPos
        }
      }
    }

    // Parse value
    const valueResult = parseLuaValue(lua, pos)
    if (!valueResult) {
      // Skip to next comma or closing brace
      while (pos < lua.length && lua[pos] !== ',' && lua[pos] !== '}') pos++
      if (lua[pos] === ',') pos++
      continue
    }

    if (key !== null) {
      entries.push({ key, value: valueResult.value })
    } else {
      entries.push({ key: arrayIndex++, value: valueResult.value })
    }

    pos = valueResult.endIndex
    pos = skipWhitespace(lua, pos)
    if (lua[pos] === ',') pos++
  }

  // Determine if this is an array or object
  const isArray = entries.length > 0 && entries.every((e, i) => e.key === i + 1)

  if (isArray) {
    return { value: entries.map(e => e.value), endIndex: pos }
  } else {
    const obj: Record<string, unknown> = {}
    const numberKeys = new Set<string>()
    for (const entry of entries) {
      const key = String(entry.key)
      obj[key] = entry.value
      // The last entry for a key decides its type, as it decides its value.
      if (typeof entry.key === 'number') numberKeys.add(key)
      else numberKeys.delete(key)
    }
    if (numberKeys.size > 0) markLuaNumberKeys(obj, numberKeys)
    return { value: obj, endIndex: pos }
  }
}

function parseLuaString(lua: string, start: number): ParseResult {
  const quote = lua[start]
  let pos = start + 1
  let result = ''

  while (pos < lua.length) {
    if (lua[pos] === '\\') {
      pos++
      if (lua[pos] === 'n') result += '\n'
      else if (lua[pos] === 't') result += '\t'
      else if (lua[pos] === 'r') result += '\r'
      else if (lua[pos] === '\\') result += '\\'
      else if (lua[pos] === quote) result += quote
      else result += lua[pos]
      pos++
    } else if (lua[pos] === quote) {
      pos++
      return { value: result, endIndex: pos }
    } else {
      result += lua[pos]
      pos++
    }
  }

  return { value: result, endIndex: pos }
}

function parseLuaLongString(lua: string, start: number): ParseResult {
  // [[...]] string
  const pos = start + 2
  const endMarker = ']]'
  const endIdx = lua.indexOf(endMarker, pos)
  if (endIdx === -1) {
    return { value: lua.slice(pos), endIndex: lua.length }
  }
  return { value: lua.slice(pos, endIdx), endIndex: endIdx + 2 }
}

function parseLuaNumber(lua: string, start: number): ParseResult {
  const numMatch = lua.slice(start).match(/^-?\d+\.?\d*([eE][+-]?\d+)?/)
  if (!numMatch) return { value: 0, endIndex: start }
  return {
    value: parseFloat(numMatch[0]),
    endIndex: start + numMatch[0].length,
  }
}

function skipWhitespace(lua: string, pos: number): number {
  while (pos < lua.length) {
    const ch = lua[pos]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pos++
    } else if (ch === '-' && lua[pos + 1] === '-') {
      // Skip Lua comment
      if (lua[pos + 2] === '[' && lua[pos + 3] === '[') {
        // Long comment --[[ ... ]]
        const endIdx = lua.indexOf(']]', pos + 4)
        pos = endIdx === -1 ? lua.length : endIdx + 2
      } else {
        // Line comment
        const newline = lua.indexOf('\n', pos)
        pos = newline === -1 ? lua.length : newline + 1
      }
    } else {
      break
    }
  }
  return pos
}
