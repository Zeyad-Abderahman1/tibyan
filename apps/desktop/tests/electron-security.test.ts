import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SECURE_WEB_PREFERENCES,
  isAllowedNavigationUrl,
  configureWindowSecurity,
  configureSessionSecurity,
  validateIpcSender,
} from '../electron/security.js';
import { tibyanApi } from '../electron/preload.js';
import { IPC_CHANNELS } from '@tibyan/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Task 10 — Electron BrowserWindow Security Configuration', () => {
  it('enforces contextIsolation=true', () => {
    expect(SECURE_WEB_PREFERENCES.contextIsolation).toBe(true);
  });

  it('enforces nodeIntegration=false', () => {
    expect(SECURE_WEB_PREFERENCES.nodeIntegration).toBe(false);
  });

  it('enforces sandbox=true', () => {
    expect(SECURE_WEB_PREFERENCES.sandbox).toBe(true);
  });

  it('enforces webSecurity=true', () => {
    expect(SECURE_WEB_PREFERENCES.webSecurity).toBe(true);
  });

  it('enforces allowRunningInsecureContent=false', () => {
    expect(SECURE_WEB_PREFERENCES.allowRunningInsecureContent).toBe(false);
  });

  it('enforces webviewTag=false', () => {
    expect(SECURE_WEB_PREFERENCES.webviewTag).toBe(false);
  });
});

describe('Task 10 — Navigation Guards & Window Open Policy', () => {
  it('permits local file:// protocols and configured dev server origin', () => {
    const devOrigin = 'http://localhost:5173';
    expect(isAllowedNavigationUrl('file:///F:/tebyan/apps/desktop/dist/index.html', devOrigin)).toBe(true);
    expect(isAllowedNavigationUrl('http://localhost:5173/dashboard', devOrigin)).toBe(true);
    expect(isAllowedNavigationUrl('http://localhost:5173/students', devOrigin)).toBe(true);
  });

  it('denies arbitrary external, cloud, and insecure navigation URLs', () => {
    const devOrigin = 'http://localhost:5173';
    expect(isAllowedNavigationUrl('https://evil.example.com', devOrigin)).toBe(false);
    expect(isAllowedNavigationUrl('http://localhost:8080/fake', devOrigin)).toBe(false);
    expect(isAllowedNavigationUrl('javascript:alert(1)', devOrigin)).toBe(false);
    expect(isAllowedNavigationUrl('data:text/html,<html></html>', devOrigin)).toBe(false);
    expect(isAllowedNavigationUrl('about:blank', devOrigin)).toBe(false);
  });

  it('denies window.open requests by default via setWindowOpenHandler', () => {
    let windowOpenHandler: ((details: any) => { action: string }) | null = null;

    const mockBrowserWindow: any = {
      webContents: {
        setWindowOpenHandler: vi.fn((handler) => {
          windowOpenHandler = handler;
        }),
        on: vi.fn(),
      },
    };

    configureWindowSecurity(mockBrowserWindow);

    expect(mockBrowserWindow.webContents.setWindowOpenHandler).toHaveBeenCalled();
    expect(windowOpenHandler).not.toBeNull();

    const result = windowOpenHandler!({ url: 'https://evil.com/popup' });
    expect(result).toEqual({ action: 'deny' });
  });

  it('denies unexpected navigation events away from the renderer', () => {
    let willNavigateHandler: ((event: any, url: string) => void) | null = null;

    const mockBrowserWindow: any = {
      webContents: {
        setWindowOpenHandler: vi.fn(),
        on: vi.fn((event, handler) => {
          if (event === 'will-navigate') {
            willNavigateHandler = handler;
          }
        }),
      },
    };

    configureWindowSecurity(mockBrowserWindow, { allowedDevOrigin: 'http://localhost:5173' });

    expect(willNavigateHandler).not.toBeNull();

    const mockPreventDefault = vi.fn();
    const event = { preventDefault: mockPreventDefault };

    // Untrusted navigation should be blocked
    willNavigateHandler!(event, 'https://malicious-site.com');
    expect(mockPreventDefault).toHaveBeenCalled();

    // Trusted navigation should NOT be blocked
    mockPreventDefault.mockClear();
    willNavigateHandler!(event, 'http://localhost:5173/settings');
    expect(mockPreventDefault).not.toHaveBeenCalled();
  });

  it('denies all Electron permission requests by default', () => {
    let permissionHandler: ((wc: any, permission: string, callback: (granted: boolean) => void) => void) | null = null;

    const mockSession: any = {
      setPermissionRequestHandler: vi.fn((handler) => {
        permissionHandler = handler;
      }),
    };

    configureSessionSecurity(mockSession);

    expect(mockSession.setPermissionRequestHandler).toHaveBeenCalled();
    expect(permissionHandler).not.toBeNull();

    const mockCallback = vi.fn();
    permissionHandler!(null, 'geolocation', mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(false);

    mockCallback.mockClear();
    permissionHandler!(null, 'camera', mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(false);

    mockCallback.mockClear();
    permissionHandler!(null, 'notifications', mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(false);
  });
});

describe('Task 10 — IPC Sender Validation', () => {
  it('accepts IPC invocation from the expected top-level main window frame', () => {
    const mockWindow: any = {
      isDestroyed: () => false,
      webContents: { id: 42 },
    };

    const mockEvent: any = {
      sender: { id: 42 },
      senderFrame: { parent: null },
    };

    expect(validateIpcSender(mockEvent, mockWindow)).toBe(true);
  });

  it('rejects IPC invocation when sender webContents ID does not match main window', () => {
    const mockWindow: any = {
      isDestroyed: () => false,
      webContents: { id: 42 },
    };

    const mockEvent: any = {
      sender: { id: 99 },
      senderFrame: { parent: null },
    };

    expect(validateIpcSender(mockEvent, mockWindow)).toBe(false);
  });

  it('rejects IPC invocation originating from a child iframe or nested frame', () => {
    const mockWindow: any = {
      isDestroyed: () => false,
      webContents: { id: 42 },
    };

    const mockEvent: any = {
      sender: { id: 42 },
      senderFrame: { parent: { id: 'top-frame' } }, // Child iframe
    };

    expect(validateIpcSender(mockEvent, mockWindow)).toBe(false);
  });

  it('rejects IPC invocation when target window is destroyed', () => {
    const mockWindow: any = {
      isDestroyed: () => true,
      webContents: { id: 42 },
    };

    const mockEvent: any = {
      sender: { id: 42 },
      senderFrame: { parent: null },
    };

    expect(validateIpcSender(mockEvent, mockWindow)).toBe(false);
  });
});

describe('Task 10 — Preload Bridge Surface & Isolation Verification', () => {
  it('exposes only named methods and does not leak ipcRenderer directly', () => {
    expect(tibyanApi).toBeDefined();
    expect((tibyanApi as any).ipcRenderer).toBeUndefined();
    expect((tibyanApi as any).invoke).toBeUndefined();
    expect((tibyanApi as any).send).toBeUndefined();
    expect((tibyanApi as any).on).toBeUndefined();
    expect((tibyanApi as any).require).toBeUndefined();
    expect((tibyanApi as any).process).toBeUndefined();
  });

  it('exposes exactly the canonical domains in TibyanApi', () => {
    const exposedDomains = Object.keys(tibyanApi).sort();
    expect(exposedDomains).toEqual([
      'attendance',
      'auth',
      'backup',
      'dashboard',
      'enrollments',
      'groups',
      'sessions',
      'students',
      'system',
    ].sort());
  });

  it('verifies preload source does not import better-sqlite3 or @tibyan/db', () => {
    const preloadSource = fs.readFileSync(path.join(__dirname, '../electron/preload.ts'), 'utf-8');
    expect(preloadSource).not.toContain('better-sqlite3');
    expect(preloadSource).not.toContain('@tibyan/db');
    expect(preloadSource).not.toContain('child_process');
    expect(preloadSource).not.toContain('fs');
  });

  it('verifies renderer source does not import better-sqlite3 or @tibyan/db', () => {
    const srcDir = path.join(__dirname, '../src');
    if (fs.existsSync(srcDir)) {
      const files = fs.readdirSync(srcDir, { recursive: true }) as string[];
      for (const f of files) {
        if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
          const content = fs.readFileSync(path.join(srcDir, f), 'utf-8');
          expect(content).not.toContain('better-sqlite3');
          expect(content).not.toContain('@tibyan/db');
        }
      }
    }
  });

  it('confirms every IPC channel in preload maps to canonical IPC_CHANNELS', () => {
    const preloadSource = fs.readFileSync(path.join(__dirname, '../electron/preload.ts'), 'utf-8');
    const channelMatches = preloadSource.match(/IPC_CHANNELS\.[A-Z0-9_]+/g) || [];
    expect(channelMatches.length).toBeGreaterThan(20);

    const canonicalKeys = Object.keys(IPC_CHANNELS);
    for (const match of channelMatches) {
      const key = match.replace('IPC_CHANNELS.', '');
      expect(canonicalKeys).toContain(key);
    }
  });
});
