import { describe, it, expect, vi } from 'vitest';
import { isAllowedWhatsAppUrl, configureSessionSecurity } from '../electron/security.js';

describe('Attendance & System Security Scaffolding', () => {
  describe('isAllowedWhatsAppUrl', () => {
    it('allows valid Egyptian mobile WhatsApp wa.me URLs', () => {
      expect(isAllowedWhatsAppUrl('https://wa.me/201012345678?text=Hello')).toBe(true);
      expect(isAllowedWhatsAppUrl('https://wa.me/201112345678')).toBe(true);
      expect(isAllowedWhatsAppUrl('https://wa.me/201212345678?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7')).toBe(true);
      expect(isAllowedWhatsAppUrl('https://wa.me/201512345678')).toBe(true);
    });

    it('rejects invalid or non-Egyptian mobile WhatsApp URLs', () => {
      expect(isAllowedWhatsAppUrl('https://wa.me/14155552671')).toBe(false);
      expect(isAllowedWhatsAppUrl('https://wa.me/201912345678')).toBe(false); // invalid operator 9
      expect(isAllowedWhatsAppUrl('http://wa.me/201012345678')).toBe(false); // insecure http
      expect(isAllowedWhatsAppUrl('https://evil.com/wa.me/201012345678')).toBe(false);
      expect(isAllowedWhatsAppUrl('javascript:alert(1)')).toBe(false);
      expect(isAllowedWhatsAppUrl('')).toBe(false);
    });
  });

  describe('configureSessionSecurity media permission', () => {
    it('allows media permission for expected main window and denies other permissions', () => {
      let handler: (webContents: any, permission: string, callback: (allowed: boolean) => void, details?: any) => void = () => {};
      const mockSession: any = {
        setPermissionRequestHandler: vi.fn((cb) => {
          handler = cb;
        }),
      };
      const mockWindow: any = {
        webContents: { id: 42 },
      };

      configureSessionSecurity(mockSession, mockWindow);

      let mediaAllowed = false;
      handler({ id: 42 }, 'media', (res) => {
        mediaAllowed = res;
      });
      expect(mediaAllowed).toBe(true);

      let geoAllowed = true;
      handler({ id: 42 }, 'geolocation', (res) => {
        geoAllowed = res;
      });
      expect(geoAllowed).toBe(false);

      let untrustedWindowMedia = true;
      handler({ id: 99 }, 'media', (res) => {
        untrustedWindowMedia = res;
      });
      expect(untrustedWindowMedia).toBe(false);
    });

    it('strictly denies microphone/audio and allows video/camera only', () => {
      let handler: (webContents: any, permission: string, callback: (allowed: boolean) => void, details?: any) => void = () => {};
      const mockSession: any = {
        setPermissionRequestHandler: vi.fn((cb) => {
          handler = cb;
        }),
      };
      const mockWindow: any = {
        webContents: { id: 42 },
      };

      configureSessionSecurity(mockSession, mockWindow);

      // Video only: allowed
      let videoOnlyAllowed = false;
      handler({ id: 42 }, 'media', (res) => {
        videoOnlyAllowed = res;
      }, { mediaTypes: ['video'] });
      expect(videoOnlyAllowed).toBe(true);

      // Audio only: denied
      let audioOnlyAllowed = true;
      handler({ id: 42 }, 'media', (res) => {
        audioOnlyAllowed = res;
      }, { mediaTypes: ['audio'] });
      expect(audioOnlyAllowed).toBe(false);

      // Audio + Video: denied
      let bothAllowed = true;
      handler({ id: 42 }, 'media', (res) => {
        bothAllowed = res;
      }, { mediaTypes: ['video', 'audio'] });
      expect(bothAllowed).toBe(false);
    });

    it('denies requests from subframes, iframes, or untrusted origins', () => {
      let handler: (webContents: any, permission: string, callback: (allowed: boolean) => void, details?: any) => void = () => {};
      const mockSession: any = {
        setPermissionRequestHandler: vi.fn((cb) => {
          handler = cb;
        }),
      };
      const mockWindow: any = {
        webContents: { id: 42 },
      };

      configureSessionSecurity(mockSession, mockWindow, { allowedDevOrigin: 'http://localhost:5173' });

      // Subframe: denied
      let subframeAllowed = true;
      handler({ id: 42 }, 'media', (res) => {
        subframeAllowed = res;
      }, { isMainFrame: false, mediaTypes: ['video'] });
      expect(subframeAllowed).toBe(false);

      // Untrusted requestingUrl: denied
      let untrustedOriginAllowed = true;
      handler({ id: 42 }, 'media', (res) => {
        untrustedOriginAllowed = res;
      }, { isMainFrame: true, requestingUrl: 'https://evil.com/app', mediaTypes: ['video'] });
      expect(untrustedOriginAllowed).toBe(false);

      // Trusted dev requestingUrl: allowed
      let trustedDevAllowed = false;
      handler({ id: 42 }, 'media', (res) => {
        trustedDevAllowed = res;
      }, { isMainFrame: true, requestingUrl: 'http://localhost:5173/attendance', mediaTypes: ['video'] });
      expect(trustedDevAllowed).toBe(true);
    });
  });
});
