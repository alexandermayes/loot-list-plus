import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('companion', {
  // Auth
  auth: {
    login: (apiUrl: string) => ipcRenderer.invoke('auth:login', apiUrl),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },

  // WoW path
  wow: {
    detect: () => ipcRenderer.invoke('wow:detect'),
    setPath: (path: string) => ipcRenderer.invoke('wow:setPath', path),
  },

  // Sync
  sync: {
    start: (config: { apiUrl: string; guildId: string; wowPath: string; interval: number }) =>
      ipcRenderer.invoke('sync:start', config),
    stop: () => ipcRenderer.invoke('sync:stop'),
    now: () => ipcRenderer.invoke('sync:now'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    onStatus: (callback: (status: unknown) => void) => {
      ipcRenderer.on('sync:status', (_, status) => callback(status))
      return () => ipcRenderer.removeAllListeners('sync:status')
    },
  },
})
