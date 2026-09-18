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
    // Prevent credentials injection or non-standard ports
    if (parsed.username !== '' || parsed.password !== '' || (parsed.port !== '' && parsed.port !== '443')) {
      return false;
    }
    // Strict Egyptian mobile path: /201[0125]\d{8}
    return /^\/201[0125]\d{8}$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export interface SessionSecurityOptions {
  allowedDevOrigin?: string;
}

/**
 * Hardens Electron session by denying permission requests by default,
 * while strictly allowing 'media' (video/camera only) for the trusted main window.
 * Strictly denies audio/microphone, subframes, untrusted origins, and all other permissions.
 */
export function configureSessionSecurity(
  session: Session,
  expectedWindow?: BrowserWindow | null,
  options?: SessionSecurityOptions
): void {
  session.setPermissionRequestHandler((webContents, permission, callback, details?: any) => {
    // 1. Strictly require the expected main BrowserWindow
    if (!expectedWindow || (typeof expectedWindow.isDestroyed === 'function' && expectedWindow.isDestroyed())) {
      callback(false);
      return;
    }

    if (webContents && typeof webContents.id === 'number') {
      if (webContents.id !== expectedWindow.webContents.id) {
        callback(false);
        return;
      }
    }

    // 2. Deny subframes / iframes
    if (details && typeof details.isMainFrame === 'boolean' && !details.isMainFrame) {
      callback(false);
      return;
    }

    // 3. Deny unexpected requesting origins
    if (details?.requestingUrl) {
      if (!isAllowedNavigationUrl(details.requestingUrl, options?.allowedDevOrigin)) {
        callback(false);
        return;
      }
    }

    // 4. Deny all permissions except 'media'
    if (permission !== 'media') {
      callback(false);
      return;
    }

    // 5. Strictly allow camera/video only; require explicit video-only mediaTypes array and deny microphone/audio
    if (!details || !Array.isArray(details.mediaTypes) || details.mediaTypes.length === 0) {
      callback(false);
      return;
    }

    const hasAudio = details.mediaTypes.includes('audio');
    const hasVideo = details.mediaTypes.includes('video');
    if (hasAudio || !hasVideo) {
      callback(false);
      return;
    }

    callback(true);
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
