import { describe, expect, it } from 'vitest';
import { GeminiCredentialInputSchema, GeminiConfigurationStatusSchema } from '../src/index.js';

describe('Gemini configuration contracts', () => {
  it('requires an owner password for a credential update and exposes only a masked suffix', () => {
    const input = GeminiCredentialInputSchema.parse({ apiKey: 'AIza-example-credential', ownerPassword: 'test-password' });
    const status = GeminiConfigurationStatusSchema.parse({ configured: true, maskedKey: '****tial' });

    expect(input.apiKey).toBe('AIza-example-credential');
    expect(status).toEqual({ configured: true, maskedKey: '****tial' });
    expect(Object.keys(status)).toEqual(['configured', 'maskedKey']);
  });

  it('rejects blank credential updates before they reach Main', () => {
    expect(() => GeminiCredentialInputSchema.parse({ apiKey: '   ' })).toThrow();
    expect(() => GeminiCredentialInputSchema.parse({ apiKey: 'test' })).toThrow();
  });
});
