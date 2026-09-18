import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, protocol } from 'electron';
import {
  SECURE_WEB_PREFERENCES,
  configureWindowSecurity,
  configureSessionSecurity,
} from './security.js';
import { Runtime } from './runtime.js';
import { registerAllIpcHandlers, unregisterAllIpcHandlers } from './ipc/index.js';
import { registerMediaProtocol } from './media-protocol.js';

// Register privileged scheme for managed media (student photos)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'tibyan-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
(globalThis as any).__filename = __filename;
(globalThis as any).__dirname = __dirname;

// Single instance lock enforcement
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
export const runtime = new Runtime();

async function createWindow(): Promise<BrowserWindow> {
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'تِبيان — نظام إدارة المعلم',
    backgroundColor: '#0B3D3D',
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: preloadPath,
    },
  });

  // Apply hardened window & session security
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  configureWindowSecurity(mainWindow, { allowedDevOrigin: devUrl });
  configureSessionSecurity(mainWindow.webContents.session);

  // Register typed IPC bridge with mainWindow sender validation
  registerAllIpcHandlers(runtime, mainWindow);

  // Load renderer
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  unregisterAllIpcHandlers();
  runtime.close();
});

// Bootstrap application when ready
if (gotTheLock) {
  app.whenReady().then(async () => {
    runtime.initialize();

    // Register media handler for safe, sandboxed student photo serving
    registerMediaProtocol(runtime);

    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });
}
