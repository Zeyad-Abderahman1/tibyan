import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, Menu, protocol } from 'electron';
import {
  SECURE_WEB_PREFERENCES,
  configureWindowSecurity,
  configureSessionSecurity,
} from './security.js';
import { Runtime } from './runtime.js';
import { registerAllIpcHandlers, unregisterAllIpcHandlers } from './ipc/index.js';
import { registerMediaProtocol } from './media-protocol.js';
import { showWhenReady, toStartupDataUrl } from './startup-splash.js';

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
    show: false,
    backgroundColor: '#0C1422',
    autoHideMenuBar: true,
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: preloadPath,
    },
  });

  // Strip native Electron menu row in production (File / Edit / View / Window / Help)
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  // Apply hardened window & session security
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  configureWindowSecurity(mainWindow, { allowedDevOrigin: devUrl });
  configureSessionSecurity(mainWindow.webContents.session, mainWindow);

  // Display meaningful local UI before migrations and session bootstrap begin.
  showWhenReady(mainWindow);
  await mainWindow.loadURL(toStartupDataUrl({ theme: 'dark' }));

  // Register typed IPC bridge with mainWindow sender validation
  try {
    runtime.initialize();
    registerMediaProtocol(runtime);
    registerAllIpcHandlers(runtime, mainWindow);

    // Replace splash in the same hardened window as soon as bootstrap is ready.
    if (devUrl) {
      await mainWindow.loadURL(devUrl);
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء التهيئة.';
    console.error('Tibyan startup failed:', error);
    await mainWindow.loadURL(toStartupDataUrl({ theme: 'dark', error: message }));
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
    // Disable default native Electron application menu bar across production UI
    Menu.setApplicationMenu(null);

    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });
}
