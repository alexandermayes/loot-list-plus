import { BrowserWindow, app, safeStorage } from 'electron'
import { randomBytes, createHash } from 'crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * OAuth 2.0 PKCE flow for authenticating with LootList+ web app.
 *
 * Flow:
 * 1. User clicks "Login" in companion app
 * 2. Opens browser window to LootList+ /api/addon/auth with PKCE challenge
 * 3. User logs in on the web app
 * 4. Web app redirects back with auth code
 * 5. Companion exchanges code for sync token
 */

interface StoredAuth {
  token: string
  guildId: string
  guildName: string
  expiresAt: string
}

let storedAuth: StoredAuth | null = null
let loadedFromDisk = false

// The sync token is a guild-scoped API credential, so it goes through
// safeStorage (OS keychain on macOS/Windows, libsecret on Linux) rather than
// plaintext JSON in userData.
function authFile(): string {
  return path.join(app.getPath('userData'), 'auth.dat')
}

function persist(auth: StoredAuth | null): void {
  const file = authFile()
  if (!auth) {
    rmSync(file, { force: true })
    return
  }
  // No keychain (e.g. a Linux box with no secret service) — keep the token in
  // memory for this session instead of writing a credential out in the clear.
  if (!safeStorage.isEncryptionAvailable()) return
  writeFileSync(file, safeStorage.encryptString(JSON.stringify(auth)))
}

// Read lazily: app.getPath('userData') isn't valid until the app is ready.
function load(): StoredAuth | null {
  if (loadedFromDisk) return storedAuth
  loadedFromDisk = true

  const file = authFile()
  try {
    if (existsSync(file) && safeStorage.isEncryptionAvailable()) {
      storedAuth = JSON.parse(safeStorage.decryptString(readFileSync(file)))
    }
  } catch {
    // Corrupt, or encrypted under a key this machine no longer has. Drop it
    // and let the user log in again.
    rmSync(file, { force: true })
    storedAuth = null
  }
  return storedAuth
}

export class AuthManager {
  /**
   * Start the OAuth login flow
   */
  static async startLogin(apiUrl: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        title: 'Login to LootList+',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })

      // Generate PKCE challenge
      const verifier = randomBytes(32).toString('base64url')
      const challenge = createHash('sha256').update(verifier).digest('base64url')

      const loginUrl = `${apiUrl}/api/addon/auth?` + new URLSearchParams({
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        redirect_uri: 'lootlistplus://auth/callback',
      })

      authWindow.loadURL(loginUrl)

      // Listen for the redirect
      authWindow.webContents.on('will-redirect', async (_event, url) => {
        if (url.startsWith('lootlistplus://auth/callback')) {
          const params = new URL(url).searchParams
          const code = params.get('code')
          const error = params.get('error')

          authWindow.close()

          if (error) {
            resolve({ success: false, error })
            return
          }

          if (!code) {
            resolve({ success: false, error: 'No auth code received' })
            return
          }

          // Exchange code for token
          try {
            const res = await fetch(`${apiUrl}/api/addon/auth/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                code_verifier: verifier,
              }),
            })

            if (!res.ok) {
              resolve({ success: false, error: 'Token exchange failed' })
              return
            }

            const data = await res.json()
            storedAuth = {
              token: data.token,
              guildId: data.guild_id,
              guildName: data.guild_name,
              expiresAt: data.expires_at,
            }
            loadedFromDisk = true
            persist(storedAuth)

            resolve({ success: true })
          } catch (err) {
            resolve({ success: false, error: 'Network error during token exchange' })
          }
        }
      })

      authWindow.on('closed', () => {
        resolve({ success: false, error: 'Login window closed' })
      })
    })
  }

  static getToken(): StoredAuth | null {
    return load()
  }

  static logout() {
    storedAuth = null
    loadedFromDisk = true
    persist(null)
  }

  static isAuthenticated(): boolean {
    const auth = load()
    if (!auth) return false
    if (new Date(auth.expiresAt) < new Date()) {
      this.logout()
      return false
    }
    return true
  }
}
