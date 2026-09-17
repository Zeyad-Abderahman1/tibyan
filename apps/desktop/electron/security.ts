import type { BrowserWindow, IpcMainInvokeEvent, Session, WebPreferences } from 'electron';

/**
 * Hardened WebPreferences enforcing strict process isolation and sandboxing.
 */
export const SECURE_WEB_PREFERENCES: Readonly<WebPreferences> = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
};

/**
 * Validates whether a navigation URL is trusted (local file:// or authorized local dev origin).
 */
export function isAllowedNavigationUrl(targetUrl: string, allowedDevOrigin?: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol === 'file:') {
      return true;
    }
    if (allowedDevOrigin) {
      const allowed = new URL(allowedDevOrigin);
      if (parsed.origin === allowed.origin) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Attaches navigation guards and window creation blockers to the given BrowserWindow.
 */
export function configureWindowSecurity(
  browserWindow: BrowserWindow,
  options?: { allowedDevOrigin?: string }
): void {
  // 1. Deny arbitrary new window creation (window.open, target="_blank")
  browserWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // 2. Prevent untrusted navigation away from the Tibyan renderer
  browserWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigationUrl(navigationUrl, options?.allowedDevOrigin)) {
      event.preventDefault();
    }
  });
}

/**
 * Hardens Electron session by denying all permission requests by default.
 */
export function configureSessionSecurity(session: Session): void {
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

/**
 * Validates that an incoming IPC message originates strictly from the main BrowserWindow frame.
 */
export function validateIpcSender(
  event: IpcMainInvokeEvent,
  expectedWindow: BrowserWindow | null
): boolean {
  if (!expectedWindow || expectedWindow.isDestroyed()) {
    return false;
  }

  // Ensure sender webContents matches expected window
  if (event.sender.id !== expectedWindow.webContents.id) {
    return false;
  }

  // Ensure message originates from the top-level main frame, never a child iframe or foreign frame
  if (event.senderFrame && event.senderFrame.parent !== null) {
    return false;
  }

  return true;
}
