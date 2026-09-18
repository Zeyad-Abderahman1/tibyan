import { describe, it, expect } from 'vitest';
import { parseBarcodeBuffer, isScannerSpeed } from '../src/hooks/useUsbScanner.js';

describe('useUsbScanner timing and buffer logic', () => {
  it('identifies scanner speed when interval is under 35ms', () => {
    expect(isScannerSpeed(10, 35)).toBe(true);
    expect(isScannerSpeed(25, 35)).toBe(true);
    expect(isScannerSpeed(40, 35)).toBe(false);
    expect(isScannerSpeed(100, 35)).toBe(false);
  });

  it('parses valid barcode and student code buffers', () => {
    expect(parseBarcodeBuffer('TB-0042')).toBe('TB-0042');
    expect(parseBarcodeBuffer('  TB-0001  ')).toBe('TB-0001');
    expect(parseBarcodeBuffer('42')).toBe('42');
    expect(parseBarcodeBuffer('A')).toBe(null); // too short
    expect(parseBarcodeBuffer('')).toBe(null);
  });

  it('extracts student code from JSON QR payload if present', () => {
    expect(parseBarcodeBuffer('{"studentCode":"TB-0099"}')).toBe('TB-0099');
    expect(parseBarcodeBuffer('{"code":"TB-0088"}')).toBe('TB-0088');
  });
});
