const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');
const { fork } = require('node:child_process');

let mainWindow = null;
let tray = null;
let hostServerProcess = null;

// Single instance lock: Ensure only one instance of OpsDeck Enterprise runs
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Start Host Agent daemon (:8620) in background for Wi-Fi / USB / Cloud mobile pairing
function startHostAgentServer() {
  try {
    const serverScript = path.join(__dirname, '../host-agent/server.mjs');
    hostServerProcess = fork(serverScript, [], {
      silent: true,
      env: { ...process.env, OPSDECK_PORT: '8620' },
    });

    hostServerProcess.on('error', (err) => {
      console.error('[HostAgent Fork Error]:', err);
    });
  } catch (err) {
    console.error('[Start Host Agent Failed]:', err);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'OpsDeck Enterprise v2.5 — Centro de Mando Local',
    icon: iconPath,
    backgroundColor: '#06141B',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load local production bundle directly
  const localIndex = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(localIndex, {
    query: { mode: 'pc', lang: 'es' },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      // Optional: keep running in tray if desired, or let close fully
    }
  });

  createTray(iconPath);
}

function createTray(iconPath) {
  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir OpsDeck Enterprise',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Modo Simulador Móvil (APK)',
        click: () => {
          if (mainWindow) {
            const localIndex = path.join(__dirname, '../dist/index.html');
            mainWindow.loadFile(localIndex, { query: { mode: 'apk-sim', lang: 'es' } });
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Salir de OpsDeck',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('OpsDeck Enterprise v2.5 (Local PC Cockpit)');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('Tray creation failed:', err);
  }
}

app.whenReady().then(() => {
  startHostAgentServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (hostServerProcess) {
    try {
      hostServerProcess.kill();
    } catch { }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
