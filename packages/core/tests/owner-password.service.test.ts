import { describe, expect, it } from 'vitest';
import { OwnerPasswordService, hashOwnerPassword } from '../src/ai/owner-password.service.js';
import crypto from 'node:crypto';

describe('OwnerPasswordService', () => {
  const password = crypto.randomBytes(24).toString('hex');
  const create = () => {
    const settings = new Map<string, string>();
    settings.set('ai.ownerPasswordHash', hashOwnerPassword(password));
    return { settings, service: new OwnerPasswordService(settings) };
  };

  it('stores a salted scrypt hash and verifies the owner password', () => {
    const first = hashOwnerPassword(password);
    expect(first).not.toContain(password);
    expect(first).not.toBe(hashOwnerPassword(password));
    const { service } = create();
    expect(() => service.requireValid(password)).not.toThrow();
    expect(() => service.requireValid('wrong')).toThrow('كلمة المرور غير صحيحة');
  });

  it('fails closed when no owner hash is configured', () => {
    expect(() => new OwnerPasswordService(new Map()).requireValid(password)).toThrow();
  });

  it('temporarily blocks repeated failures and later permits retry', () => {
    let now = 1000;
    const { settings } = create();
    const service = new OwnerPasswordService(settings, () => now);
    for (let i = 0; i < 5; i++) expect(() => service.requireValid('wrong')).toThrow();
    expect(() => service.requireValid(password)).toThrow('انتظر قليلاً');
    now += 61_000;
    expect(() => service.requireValid(password)).not.toThrow();
  });

  it('retains a temporary lock across service restart', () => {
    let now = 1000;
    const { settings } = create();
    const service = new OwnerPasswordService(settings, () => now);
    for (let i = 0; i < 5; i++) expect(() => service.requireValid('wrong')).toThrow();
    const restarted = new OwnerPasswordService(settings, () => now);
    expect(() => restarted.requireValid(password)).toThrow('انتظر قليلاً');
    now += 61_000;
    expect(() => restarted.requireValid(password)).not.toThrow();
  });
});
