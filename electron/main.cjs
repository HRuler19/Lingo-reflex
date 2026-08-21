// Electron's main process. Kept as plain CommonJS (.cjs) rather than fighting
// package.json's "type": "module" — Electron's main-process entry is loaded
// by Electron itself, not bundled by Vite, so there's no reason to make it ESM.
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    // Matches the app's light-mode --background so the window doesn't flash
    // white/dark before the first paint.
    backgroundColor: '#f6f5fa',
    title: 'LexiPulse',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    // Set by `npm run electron:dev` once the Vite dev server is up (see
    // package.json) — not hardcoded, since Vite picks a free port if 5173
    // is already taken.
    win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // The app has no external links today, but if one is ever added, it
  // should open in the user's real browser, not hijack the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // macOS convention: clicking the dock icon with no windows open should
    // reopen one instead of doing nothing.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // macOS convention: the app stays running (in the dock/menu bar) with no
  // windows open; every other platform quits, since there's no menu bar
  // presence to relaunch from.
  if (process.platform !== 'darwin') app.quit()
})
