/**
 * Shared CSV parser for Google Sheets and file imports.
 * Handles quoted fields, commas within values, and escaped quotes.
 */

export function parseCSV(text: string): string[][] {
  const lines = text.split('\n')
  return lines
    .map(line => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote inside quoted field
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
    .filter(row => row.some(cell => cell !== ''))
}

/**
 * Extract Google Sheets file key from a URL.
 * Supports:
 *   https://docs.google.com/spreadsheets/d/FILE_KEY/...
 */
function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Fetch a Google Sheet tab as CSV using the public gviz endpoint.
 * Sheet must be public or link-shared. No API key needed.
 */
export async function fetchGoogleSheetCSV(url: string, gid?: string): Promise<string> {
  const sheetId = extractSheetId(url)
  if (!sheetId) {
    throw new Error('Could not extract sheet ID from URL. Make sure it\'s a Google Sheets URL.')
  }

  const gidParam = gid ? `&gid=${gid}` : ''
  const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`

  const response = await fetch(fetchUrl, { redirect: 'follow' })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Sheet not found. Check the URL and make sure the sheet is shared publicly.')
    }
    throw new Error(`Couldn't fetch sheet (${response.status}). Make sure the sheet is shared publicly.`)
  }

  return response.text()
}
