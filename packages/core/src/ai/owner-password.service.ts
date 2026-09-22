import crypto from 'node:crypto';

const SETTING_KEY = 'ai.ownerPasswordHash';
const THROTTLE_KEY = 'ai.ownerPasswordThrottle';
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 } as const;

export interface OwnerPasswordStore { get(key: string): string | undefined | null; set(key: string, value: string): void; }
export class OwnerPasswordError extends Error {
  constructor(public readonly code: 'INVALID_OWNER_PASSWORD' | 'OWNER_PASSWORD_UNAVAILABLE' | 'OWNER_PASSWORD_LOCKED', message: string) { super(message); }
}

/** Used only during trusted, local provisioning. Never expose this through IPC. */
export function hashOwnerPassword(password: string): string {
  if (password.length < 8) throw new Error('كلمة المرور قصيرة');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export class OwnerPasswordService {
  constructor(private readonly store: OwnerPasswordStore, private readonly now: () => number = Date.now) {}

  isConfigured(): boolean { return Boolean(this.store.get(SETTING_KEY)); }

  requireValid(candidate: string): void {
    let throttle = { failedAttempts: 0, lockedUntil: 0 };
    try {
      const saved = JSON.parse(this.store.get(THROTTLE_KEY) ?? '{}');
      if (Number.isSafeInteger(saved.failedAttempts) && Number.isSafeInteger(saved.lockedUntil) && saved.failedAttempts >= 0 && saved.lockedUntil >= 0) throttle = saved;
    } catch { /* Invalid throttle state is replaced on next write. */ }
    if (this.now() < throttle.lockedUntil) throw new OwnerPasswordError('OWNER_PASSWORD_LOCKED', 'انتظر قليلاً ثم أعد المحاولة.');
    const stored = this.store.get(SETTING_KEY);
    if (!stored) throw new OwnerPasswordError('OWNER_PASSWORD_UNAVAILABLE', 'لم تتم تهيئة كلمة مرور المالك.');
    let valid = false;
    try {
      const [method, saltHex, hashHex] = stored.split('$');
      if (method === 'scrypt' && saltHex && hashHex && /^[a-f0-9]{32}$/.test(saltHex) && /^[a-f0-9]{128}$/.test(hashHex)) {
        const expected = Buffer.from(hashHex, 'hex');
        const actual = crypto.scryptSync(candidate, Buffer.from(saltHex, 'hex'), 64, SCRYPT_OPTIONS);
        valid = crypto.timingSafeEqual(expected, actual);
      }
    } catch { /* Invalid local hash fails closed. */ }
    if (valid) {
      this.store.set(THROTTLE_KEY, JSON.stringify({ failedAttempts: 0, lockedUntil: 0 }));
      return;
    }
    throttle.failedAttempts++;
    if (throttle.failedAttempts >= 5) {
      throttle.failedAttempts = 0;
      throttle.lockedUntil = this.now() + 60_000;
    }
    this.store.set(THROTTLE_KEY, JSON.stringify(throttle));
    throw new OwnerPasswordError('INVALID_OWNER_PASSWORD', 'كلمة المرور غير صحيحة.');
  }
}
