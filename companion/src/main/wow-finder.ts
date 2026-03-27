import fs from 'fs'
import path from 'path'
import os from 'os'

export interface WowInstall {
  basePath: string
  versions: WowVersion[]
}

export interface WowVersion {
  name: string
  path: string
  savedVarsPath: string | null
  addonPath: string
}

const PLATFORM_PATHS = {
  darwin: ['/Applications/World of Warcraft'],
  win32: [
    'C:\\Program Files (x86)\\World of Warcraft',
    'C:\\Program Files\\World of Warcraft',
    'D:\\World of Warcraft',
  ],
  linux: [
    path.join(os.homedir(), '.wine/drive_c/Program Files (x86)/World of Warcraft'),
    path.join(os.homedir(), 'Games/World of Warcraft'),
  ],
}

const VERSION_FOLDERS: Record<string, string> = {
  '_classic_era_': 'Classic Era',
  '_classic_': 'Classic (TBC/Wrath/Cata)',
  '_retail_': 'Retail',
}

export class WowFinder {
  /**
   * Auto-detect WoW installation path
   */
  static detect(): WowInstall | null {
    const platform = os.platform() as 'darwin' | 'win32' | 'linux'
    const searchPaths = PLATFORM_PATHS[platform] || []

    for (const basePath of searchPaths) {
      if (fs.existsSync(basePath)) {
        const versions = this.findVersions(basePath)
        if (versions.length > 0) {
          return { basePath, versions }
        }
      }
    }

    return null
  }

  /**
   * Validate a manually provided WoW path
   */
  static validate(wowPath: string): WowInstall | null {
    if (!fs.existsSync(wowPath)) return null

    const versions = this.findVersions(wowPath)
    if (versions.length === 0) return null

    return { basePath: wowPath, versions }
  }

  /**
   * Find WoW version folders within a base path
   */
  private static findVersions(basePath: string): WowVersion[] {
    const versions: WowVersion[] = []

    for (const [folder, name] of Object.entries(VERSION_FOLDERS)) {
      const versionPath = path.join(basePath, folder)
      if (fs.existsSync(versionPath)) {
        const addonPath = path.join(versionPath, 'Interface', 'AddOns')
        const savedVarsPath = this.findSavedVariables(versionPath)

        versions.push({
          name,
          path: versionPath,
          savedVarsPath,
          addonPath,
        })
      }
    }

    return versions
  }

  /**
   * Find SavedVariables path for a WoW version
   * Returns the first account's SavedVariables folder that contains LootListPlus.lua
   */
  private static findSavedVariables(versionPath: string): string | null {
    const wtfPath = path.join(versionPath, 'WTF', 'Account')
    if (!fs.existsSync(wtfPath)) return null

    try {
      const accounts = fs.readdirSync(wtfPath)
      for (const account of accounts) {
        if (account.startsWith('.')) continue
        const svPath = path.join(wtfPath, account, 'SavedVariables')
        if (fs.existsSync(svPath)) {
          // Check if our addon's SavedVariables exists
          const llpFile = path.join(svPath, 'LootListPlus.lua')
          if (fs.existsSync(llpFile)) {
            return svPath
          }
          // Even if it doesn't exist yet, return the path for the first account
          return svPath
        }
      }
    } catch {
      // Permission denied or other fs error
    }

    return null
  }

  /**
   * Get the full path to the addon's SavedVariables file
   */
  static getSavedVarsFile(savedVarsPath: string): string {
    return path.join(savedVarsPath, 'LootListPlus.lua')
  }
}
