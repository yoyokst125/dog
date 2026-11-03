// Safe bridge between the cat page and the Electron main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('catApi', {
  getBounds: () => ipcRenderer.invoke('cat:get-bounds'),
  areaAt: (x, y) => ipcRenderer.invoke('cat:area-at', x, y),
  setPos: (x, y) => ipcRenderer.send('cat:set-pos', x, y),
  setIgnoreMouse: (ignore) => ipcRenderer.send('cat:ignore-mouse', ignore),
  loadState: () => ipcRenderer.invoke('cat:load-state'),
  saveState: (state) => ipcRenderer.send('cat:save-state', state),
  showMenu: (info) => ipcRenderer.send('cat:show-menu', info),
  onMenuAction: (cb) => ipcRenderer.on('cat:menu-action', (_e, action) => cb(action)),
  onReset: (cb) => ipcRenderer.on('cat:reset', () => cb()),
});
