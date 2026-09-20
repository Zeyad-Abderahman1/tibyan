import { describe, expect, it } from 'vitest';
import { GeminiCredentialInputSchema, GeminiConfigurationStatusSchema } from '../src/index.js';

describe('Gemini configuration contracts', () => {
  it('accepts a credential update but exposes only its configured state', () => {
    const input = GeminiCredentialInputSchema.parse({ apiKey: 'AIza-example-credential' });
    const status = GeminiConfigurationStatusSchema.parse({ configured: true });

    expect(input.apiKey).toBe('AIza-example-credential');
    expect(status).toEqual({ configured: true });
    expect(Object.keys(status)).toEqual(['configured']);
  });

  it('rejects blank credential updates before they reach Main', () => {
    expect(() => GeminiCredentialInputSchema.parse({ apiKey: '   ' })).toThrow();
  });
});
