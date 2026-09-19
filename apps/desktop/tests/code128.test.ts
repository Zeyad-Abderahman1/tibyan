import { describe, it, expect } from 'vitest';
import { encodeCode128B, CODE128_PATTERNS } from '../src/features/students/cards/code128.js';

describe('Code128 Subset B Encoder (TDD)', () => {
  it('has exactly 107 valid patterns with correct module widths', () => {
    expect(CODE128_PATTERNS.length).toBe(107);
    for (let i = 0; i < 106; i++) {
      const p = CODE128_PATTERNS[i]!;
      expect(p).toBeDefined();
      expect(p.length).toBe(6);
      const sum = p.split('').reduce((acc, c) => acc + parseInt(c, 10), 0);
      expect(sum).toBe(11); // standard 11 modules per symbol
    }
    // Stop pattern (index 106) has 7 widths summing to 13
    const stopPattern = CODE128_PATTERNS[106]!;
    expect(stopPattern.length).toBe(7);
    const stopSum = stopPattern.split('').reduce((acc, c) => acc + parseInt(c, 10), 0);
    expect(stopSum).toBe(13);
  });

  it('rejects empty string or invalid non-ASCII characters', () => {
    expect(() => encodeCode128B('')).toThrow();
    expect(() => encodeCode128B('طالب')).toThrow(/Invalid text/);
    expect(() => encodeCode128B('TB 001\n')).toThrow(/Invalid text/);
  });

  it('correctly encodes golden vector TB-0042 with verified checksum 35', () => {
    const res = encodeCode128B('TB-0042');
    // Start B (104), 'T'(52), 'B'(34), '-'(13), '0'(16), '0'(16), '4'(20), '2'(18)
    // Checksum: (104 + 1*52 + 2*34 + 3*13 + 4*16 + 5*16 + 6*20 + 7*18) % 103 = 653 % 103 = 35
    expect(res.values).toEqual([104, 52, 34, 13, 16, 16, 20, 18, 35, 106]);
    expect(res.checksum).toBe(35);
    expect(res.pattern.startsWith('211214')).toBe(true); // Start B
    expect(res.pattern.endsWith('23311122')).toBe(true); // Stop + final termination bar '2'
  });

  it('correctly encodes other canonical student codes', () => {
    const codes = ['TB-0001', 'TB-0010', 'TB-0100', 'TB-1234', 'TB-9999'];
    for (const code of codes) {
      const res = encodeCode128B(code);
      expect(res.values[0]).toBe(104);
      expect(res.values[res.values.length - 1]).toBe(106);
      expect(res.checksum).toBeGreaterThanOrEqual(0);
      expect(res.checksum).toBeLessThan(103);
      expect(res.pattern.length).toBeGreaterThan(50);
    }
  });

  it('golden vector test for known standard string "TEST"', () => {
    // 'T'=52, 'E'=37, 'S'=51, 'T'=52
    // Checksum: (104 + 1*52 + 2*37 + 3*51 + 4*52) % 103 = (104 + 52 + 74 + 153 + 208) % 103 = 591 % 103 = 76
    const res = encodeCode128B('TEST');
    expect(res.values).toEqual([104, 52, 37, 51, 52, 76, 106]);
    expect(res.checksum).toBe(76);
  });
});
