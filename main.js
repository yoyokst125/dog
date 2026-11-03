// Electron main process: a small transparent, always-on-top window that holds the cat.
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const WIN_W = 220; // must match renderer/app.js
const WIN_H = 170;
const CLICK_THROUGH = process.platform !== 'linux'; // forwarding mouse moves is not supported on Linux

let win = null;
let tray = null;
let lastState = null;
let saveTimer = null;

const statePath = () => path.join(app.getPath('userData'), 'cat-state.json');

function homePosition() {
  const area = screen.getPrimaryDisplay().workArea;
  return { x: area.x + area.width - WIN_W - 80, y: area.y + area.height - WIN_H };
}

function createWindow() {
  const { x, y } = homePosition();
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x,
    y,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('像素貓');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '叫貓咪回來', click: recallCat },
      { type: 'separator' },
      { label: '離開', click: () => app.quit() },
    ]),
  );
  tray.on('click', recallCat);
}

function recallCat() {
  if (!win) return;
  const { x, y } = homePosition();
  win.setBounds({ x, y, width: WIN_W, height: WIN_H });
  win.showInactive();
  win.webContents.send('cat:reset');
}

// ---- Saving --------------------------------------------------------------
function writeState() {
  if (!lastState) return;
  try {
    fs.mkdirSync(path.dirname(statePath()), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(lastState));
  } catch (err) {
    console.error('Could not save cat state:', err);
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8'));
  } catch (_) {
    return null;
  }
}

// ---- IPC -----------------------------------------------------------------
ipcMain.handle('cat:get-bounds', () => {
  const b = win.getBounds();
  const area = screen.getDisplayNearestPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 }).workArea;
  return { x: b.x, y: b.y, width: b.width, height: b.height, area };
});

ipcMain.handle('cat:area-at', (_e, x, y) => screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea);

ipcMain.on('cat:set-pos', (_e, x, y) => {
  if (!win) return;
  // setBounds (not setPosition) keeps the size fixed on scaled displays.
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: WIN_W, height: WIN_H });
});

ipcMain.on('cat:ignore-mouse', (_e, ignore) => {
  if (win && CLICK_THROUGH) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.handle('cat:load-state', () => readState());

ipcMain.on('cat:save-state', (_e, state) => {
  lastState = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeState, 500);
});

ipcMain.on('cat:show-menu', (_e, info) => {
  if (!win) return;
  const send = (action) => () => win && win.webContents.send('cat:menu-action', action);
  Menu.buildFromTemplate([
    { label: `飽足度 ${info.fullness}/100`, enabled: false },
    { label: `心情 ${info.mood}/100`, enabled: false },
    { type: 'separator' },
    { label: '餵食', click: send('feed') },
    { label: '陪玩', click: send('play') },
    info.sleeping ? { label: '叫醒', click: send('wake') } : { label: '睡覺', click: send('sleep') },
    {
      label: '顏色',
      submenu: (info.colors || []).map((c) => ({
        label: c.name,
        type: 'radio',
        checked: c.id === info.color,
        click: send('color:' + c.id),
      })),
    },
    { type: 'separator' },
    {
      label: '永遠在最上層',
      type: 'checkbox',
      checked: win.isAlwaysOnTop(),
      click: (item) => win.setAlwaysOnTop(item.checked, 'floating'),
    },
    { label: '離開', click: () => app.quit() },
  ]).popup({ window: win });
});

// ---- App lifecycle -------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', recallCat);
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
  app.on('before-quit', () => {
    clearTimeout(saveTimer);
    writeState();
  });
  app.on('window-all-closed', () => app.quit());
}
