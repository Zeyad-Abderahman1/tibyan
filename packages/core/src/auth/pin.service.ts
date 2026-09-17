import crypto from 'crypto';
import { PinSchema } from '@tibyan/contracts';

export const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
  keylen: 64,
  saltBytes: 16,
} as const;

export interface HashedPin {
  pinHash: string;
  salt: string;
}

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

export class PinService {
  /**
   * Hashes a 4-digit numeric PIN using Node.js crypto.scrypt with a unique 16-byte salt.
   * Throws if the PIN does not conform to the 4-digit PIN schema.
   */
  async hashPin(pin: string): Promise<HashedPin> {
    PinSchema.parse(pin);

    const salt = crypto.randomBytes(SCRYPT_CONFIG.saltBytes).toString('hex');
    const derivedKey = await scryptAsync(pin, salt, SCRYPT_CONFIG.keylen, {
      N: SCRYPT_CONFIG.N,
      r: SCRYPT_CONFIG.r,
      p: SCRYPT_CONFIG.p,
      maxmem: SCRYPT_CONFIG.maxmem,
    });

    return {
      pinHash: derivedKey.toString('hex'),
      salt,
    };
  }

  /**
   * Synchronous hash helper for transactions where async is not desired.
   */
  hashPinSync(pin: string): HashedPin {
    PinSchema.parse(pin);

    const salt = crypto.randomBytes(SCRYPT_CONFIG.saltBytes).toString('hex');
    const derivedKey = crypto.scryptSync(pin, salt, SCRYPT_CONFIG.keylen, {
      N: SCRYPT_CONFIG.N,
      r: SCRYPT_CONFIG.r,
      p: SCRYPT_CONFIG.p,
      maxmem: SCRYPT_CONFIG.maxmem,
    });

    return {
      pinHash: derivedKey.toString('hex'),
      salt,
    };
  }

  /**
   * Verifies a candidate PIN against a stored pinHash and salt in constant time.
   */
  async verifyPin(pin: string, pinHash: string, salt: string): Promise<boolean> {
    const parseResult = PinSchema.safeParse(pin);
    if (!parseResult.success) {
      return false;
    }

    try {
      const derivedKey = await scryptAsync(pin, salt, SCRYPT_CONFIG.keylen, {
        N: SCRYPT_CONFIG.N,
        r: SCRYPT_CONFIG.r,
        p: SCRYPT_CONFIG.p,
        maxmem: SCRYPT_CONFIG.maxmem,
      });

      const expectedKey = Buffer.from(pinHash, 'hex');
      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }

  /**
   * Synchronous verify helper.
   */
  verifyPinSync(pin: string, pinHash: string, salt: string): boolean {
    const parseResult = PinSchema.safeParse(pin);
    if (!parseResult.success) {
      return false;
    }

    try {
      const derivedKey = crypto.scryptSync(pin, salt, SCRYPT_CONFIG.keylen, {
        N: SCRYPT_CONFIG.N,
        r: SCRYPT_CONFIG.r,
        p: SCRYPT_CONFIG.p,
        maxmem: SCRYPT_CONFIG.maxmem,
      });

      const expectedKey = Buffer.from(pinHash, 'hex');
      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }
}
