// Electron main process: one small transparent, always-on-top window per pet.
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const WIN_W = 220; // must match renderer/app.js
const WIN_H = 170;
const CLICK_THROUGH = process.platform !== 'linux'; // forwarding mouse moves is not supported on Linux

// Each pet lives in its own window. `species` must exist in renderer/sprites.js.
// homeOffset: distance of the pet's home spot from the right edge of the screen.
const PETS = [
  { id: 'cat', name: '貓咪', species: 'cat', homeOffset: 80 },
  { id: 'shihtzu', name: '西施犬', species: 'shihtzu', homeOffset: 330 },
].map((def) => ({ ...def, win: null, lastState: null, saveTimer: null }));

let tray = null;
let settings = { visible: {} };

const dataPath = (file) => path.join(app.getPath('userData'), file);
const statePath = (pet) => dataPath(`${pet.id}-state.json`);
const isVisible = (pet) => settings.visible[pet.id] !== false;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  } catch (err) {
    console.error(`Could not save ${file}:`, err);
  }
}

function homePosition(pet) {
  const area = screen.getPrimaryDisplay().workArea;
  const x = Math.max(area.x, area.x + area.width - WIN_W - pet.homeOffset);
  return { x, y: area.y + area.height - WIN_H };
}

function createWindow(pet) {
  const { x, y } = homePosition(pet);
  const win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x,
    y,
    show: isVisible(pet),
    title: pet.name,
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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query: { pet: pet.species } });
  win.on('closed', () => { pet.win = null; });
  pet.win = win;
}

// ---- Show / hide / recall -------------------------------------------------
function setVisible(pet, visible) {
  settings.visible[pet.id] = visible;
  writeJson(dataPath('settings.json'), settings);
  if (pet.win) {
    if (visible) {
      recall(pet);
    } else {
      pet.win.hide();
    }
  }
  refreshTray();
}

function recall(pet) {
  if (!pet.win) return;
  const { x, y } = homePosition(pet);
  pet.win.setBounds({ x, y, width: WIN_W, height: WIN_H });
  pet.win.showInactive();
  pet.win.webContents.send('cat:reset');
}

function recallAll() {
  for (const pet of PETS) if (isVisible(pet)) recall(pet);
}

function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...PETS.map((pet) => ({
        label: pet.name,
        type: 'checkbox',
        checked: isVisible(pet),
        click: (item) => setVisible(pet, item.checked),
      })),
      { type: 'separator' },
      { label: '叫大家回來', click: recallAll },
      { type: 'separator' },
      { label: '離開', click: () => app.quit() },
    ]),
  );
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  tray.setToolTip('像素寵物');
  tray.on('click', recallAll);
  refreshTray();
}

// ---- Saving --------------------------------------------------------------
function writeState(pet) {
  if (pet.lastState) writeJson(statePath(pet), pet.lastState);
}

// ---- IPC -----------------------------------------------------------------
// Every message comes from one pet's window; find which.
const petOf = (e) => PETS.find((p) => p.win && p.win.webContents === e.sender);

ipcMain.handle('cat:get-bounds', (e) => {
  const pet = petOf(e);
  const b = pet.win.getBounds();
  const area = screen.getDisplayNearestPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 }).workArea;
  return { x: b.x, y: b.y, width: b.width, height: b.height, area };
});

ipcMain.handle('cat:area-at', (_e, x, y) => screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea);

ipcMain.on('cat:set-pos', (e, x, y) => {
  const pet = petOf(e);
  if (!pet) return;
  // setBounds (not setPosition) keeps the size fixed on scaled displays.
  pet.win.setBounds({ x: Math.round(x), y: Math.round(y), width: WIN_W, height: WIN_H });
});

ipcMain.on('cat:ignore-mouse', (e, ignore) => {
  const pet = petOf(e);
  if (pet && CLICK_THROUGH) pet.win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.handle('cat:load-state', (e) => {
  const pet = petOf(e);
  return pet ? readJson(statePath(pet)) : null;
});

ipcMain.on('cat:save-state', (e, state) => {
  const pet = petOf(e);
  if (!pet) return;
  pet.lastState = state;
  clearTimeout(pet.saveTimer);
  pet.saveTimer = setTimeout(() => writeState(pet), 500);
});

ipcMain.on('cat:show-menu', (e, info) => {
  const pet = petOf(e);
  if (!pet) return;
  const win = pet.win;
  const send = (action) => () => pet.win && pet.win.webContents.send('cat:menu-action', action);
  Menu.buildFromTemplate([
    { label: `${pet.name}`, enabled: false },
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
    ...PETS.filter((p) => p !== pet).map((p) => ({
      label: `顯示${p.name}`,
      type: 'checkbox',
      checked: isVisible(p),
      click: (item) => setVisible(p, item.checked),
    })),
    { label: `收起${pet.name}`, click: () => setVisible(pet, false) },
    {
      label: '永遠在最上層',
      type: 'checkbox',
      checked: win.isAlwaysOnTop(),
      click: (item) => {
        for (const p of PETS) if (p.win) p.win.setAlwaysOnTop(item.checked, 'floating');
      },
    },
    { label: '離開', click: () => app.quit() },
  ]).popup({ window: win });
});

// ---- App lifecycle -------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', recallAll);
  app.whenReady().then(() => {
    settings = Object.assign({ visible: {} }, readJson(dataPath('settings.json')));
    PETS.forEach(createWindow);
    createTray();
  });
  app.on('before-quit', () => {
    for (const pet of PETS) {
      clearTimeout(pet.saveTimer);
      writeState(pet);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
