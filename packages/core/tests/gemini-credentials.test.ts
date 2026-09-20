import { describe, expect, it } from 'vitest';
import { GeminiCredentialService } from '../src/index.js';

describe('GeminiCredentialService', () => {
  it('stores only encrypted credential payloads and never returns the stored cipher', () => {
    const store = new Map<string, string>();
    const service = new GeminiCredentialService(store, {
      isEncryptionAvailable: () => true,
      encryptString: (value) => `cipher:${value}`,
      decryptString: (value) => value.slice(7),
    });
    service.save('temporary-key');
    expect(store.get('ai.gemini.credential')).toBe('cipher:temporary-key');
    expect(service.get()).toBe('temporary-key');
  });

  it('reports configuration state without revealing a credential representation', () => {
    const store = new Map<string, string>();
    const service = new GeminiCredentialService(store, { isEncryptionAvailable: () => true, encryptString: (value) => `cipher:${value}`, decryptString: (value) => value.slice(7) });
    expect(service.status()).toEqual({ configured: false });
    service.save('temporary-key');
    expect(service.status()).toEqual({ configured: true });
  });
});
