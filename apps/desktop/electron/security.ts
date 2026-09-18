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
 * Validates whether a WhatsApp link is strictly an allowed Egyptian mobile wa.me URL.
 */
export function isAllowedWhatsAppUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'wa.me') {
      return false;
    }
    // Strict Egyptian mobile path: /201[0125]\d{8}
    return /^\/201[0125]\d{8}$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Hardens Electron session by denying permission requests by default,
 * while strictly allowing 'media' permission only for the trusted main window.
 */
export function configureSessionSecurity(
  session: Session,
  expectedWindow?: BrowserWindow | null
): void {
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Strictly allow 'media' permission only for the trusted main window
    if (
      permission === 'media' &&
      (!expectedWindow || webContents.id === expectedWindow.webContents.id)
    ) {
      callback(true);
      return;
    }
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
