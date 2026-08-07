import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path from 'path'
import { SyncEngine } from './sync-engine'
import { WowFinder } from './wow-finder'
import { AuthManager } from './auth'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let syncEngine: SyncEngine | null = null

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 400,
    minHeight: 500,
    title: 'LootList+ Companion',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#141416',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  // electron-vite's dev server publishes its address here; the port is not
  // fixed, so reading it beats hardcoding one that drifts.
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of quitting
    e.preventDefault()
    mainWindow?.hide()
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show LootList+ Companion',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: () => syncEngine?.syncNow(),
    },
    {
      label: `Status: ${syncEngine?.getStatusText() || 'Not connected'}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        mainWindow?.destroy()
        app.quit()
      },
    },
  ])

  tray.setToolTip('LootList+ Companion')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
  })
}

function setupIPC() {
  // Auth
  ipcMain.handle('auth:login', async (_, apiUrl: string) => {
    return AuthManager.startLogin(apiUrl)
  })

  ipcMain.handle('auth:getToken', () => {
    return AuthManager.getToken()
  })

  ipcMain.handle('auth:logout', () => {
    AuthManager.logout()
    syncEngine?.stop()
  })

  // WoW path detection
  ipcMain.handle('wow:detect', async () => {
    return WowFinder.detect()
  })

  ipcMain.handle('wow:setPath', async (_, wowPath: string) => {
    return WowFinder.validate(wowPath)
  })

  // Sync control
  ipcMain.handle('sync:start', async (_, config: { apiUrl: string; guildId: string; wowPath: string; interval: number }) => {
    if (syncEngine) syncEngine.stop()
    syncEngine = new SyncEngine(config)
    syncEngine.on('status', (status) => {
      mainWindow?.webContents.send('sync:status', status)
    })
    syncEngine.start()
    return true
  })

  ipcMain.handle('sync:stop', () => {
    syncEngine?.stop()
    return true
  })

  ipcMain.handle('sync:now', async () => {
    return syncEngine?.syncNow()
  })

  ipcMain.handle('sync:getStatus', () => {
    return syncEngine?.getStatus()
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  setupIPC()
})

app.on('window-all-closed', () => {
  // Don't quit on window close, stay in tray
})

app.on('activate', () => {
  mainWindow?.show()
})
