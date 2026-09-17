import { describe, it, expect } from 'vitest';
import { PinService, SCRYPT_CONFIG } from '../src/auth/pin.service.js';

describe('PinService', () => {
  const pinService = new PinService();

  it('rejects invalid PIN formats (non-4-digit, letters, empty)', async () => {
    await expect(pinService.hashPin('123')).rejects.toThrow();
    await expect(pinService.hashPin('12345')).rejects.toThrow();
    await expect(pinService.hashPin('abcd')).rejects.toThrow();
    await expect(pinService.hashPin('')).rejects.toThrow();
    await expect(pinService.hashPin('12 4')).rejects.toThrow();

    expect(() => pinService.hashPinSync('12')).toThrow();
  });

  it('Same PIN hashed twice produces different salts/hashes', async () => {
    const pin = '1234';
    const hash1 = await pinService.hashPin(pin);
    const hash2 = await pinService.hashPin(pin);

    // 16 bytes = 32 hex chars, 64 bytes = 128 hex chars
    expect(hash1.salt).toHaveLength(SCRYPT_CONFIG.saltBytes * 2);
    expect(hash1.pinHash).toHaveLength(SCRYPT_CONFIG.keylen * 2);
    expect(hash2.salt).toHaveLength(SCRYPT_CONFIG.saltBytes * 2);
    expect(hash2.pinHash).toHaveLength(SCRYPT_CONFIG.keylen * 2);

    expect(hash1.salt).not.toBe(hash2.salt);
    expect(hash1.pinHash).not.toBe(hash2.pinHash);
  });

  it('Correct PIN verifies successfully', async () => {
    const pin = '5678';
    const { pinHash, salt } = await pinService.hashPin(pin);

    const isValid = await pinService.verifyPin(pin, pinHash, salt);
    expect(isValid).toBe(true);

    const isSyncValid = pinService.verifyPinSync(pin, pinHash, salt);
    expect(isSyncValid).toBe(true);
  });

  it('Wrong PIN fails', async () => {
    const pin = '9876';
    const wrongPin = '1234';
    const { pinHash, salt } = await pinService.hashPin(pin);

    const isValid = await pinService.verifyPin(wrongPin, pinHash, salt);
    expect(isValid).toBe(false);

    const isSyncValid = pinService.verifyPinSync(wrongPin, pinHash, salt);
    expect(isSyncValid).toBe(false);
  });

  it('Malformed candidate PIN returns false during verification without throwing', async () => {
    const { pinHash, salt } = await pinService.hashPin('0000');
    expect(await pinService.verifyPin('bad', pinHash, salt)).toBe(false);
    expect(await pinService.verifyPin('12345', pinHash, salt)).toBe(false);
    expect(await pinService.verifyPin('', pinHash, salt)).toBe(false);
  });
});
