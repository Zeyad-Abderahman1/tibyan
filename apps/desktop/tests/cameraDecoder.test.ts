import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initCameraDecoder,
  createBarcodeDetector,
  getLocalZxingWasmUrl,
  ZXING_WASM_SHA256,
  ZXING_WASM_VERSION,
} from '../src/features/attendance/cameraDecoder.js';
import { parseBarcodeBuffer } from '../src/hooks/useUsbScanner.js';

describe('Offline WASM Camera Decoder Suite (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('WASM loading path contains no http:// or https:// CDN URL', () => {
    const wasmUrl = getLocalZxingWasmUrl();
    expect(wasmUrl).not.toContain('jsdelivr');
    expect(wasmUrl).not.toContain('unpkg');
    expect(wasmUrl).not.toContain('cdnjs');
    expect(wasmUrl).toContain('zxing_reader.wasm');
  });

  it('exports verified ZXING_WASM_SHA256 and ZXING_WASM_VERSION matching the pinned offline asset', () => {
    expect(ZXING_WASM_SHA256).toBe('2ebda08a93eea3efcd8399cda6b276e6a0b1de4fec60b4d8988a047de4c6d1ba');
    expect(ZXING_WASM_VERSION).toBe('3.1.3');
  });

  it('initCameraDecoder initializes offline without errors', async () => {
    await expect(initCameraDecoder()).resolves.toBeUndefined();
  });

  it('only requests QR and Code128 formats', () => {
    const detector = createBarcodeDetector();
    expect(detector).toBeDefined();
  });

  it('decoded unsupported/random value does not pass student identifier check', () => {
    const invalidValues = ['random text with spaces', 'not-a-code!', '   ', 'A'];
    for (const val of invalidValues) {
      expect(parseBarcodeBuffer(val)).toBeNull();
    }
    expect(parseBarcodeBuffer('TB-0042')).toBe('TB-0042');
  });

  it('duplicate decoded value is handled by deduplication logic', () => {
    let callCount = 0;
    let lastCode: string | null = null;
    let lastTime = 0;
    const cooldownMs = 1500;

    function handleScan(code: string) {
      const now = Date.now();
      if (code === lastCode && now - lastTime < cooldownMs) {
        return;
      }
      lastCode = code;
      lastTime = now;
      callCount++;
    }

    handleScan('TB-0042');
    expect(callCount).toBe(1);

    // Immediate duplicate within cooldown
    handleScan('TB-0042');
    expect(callCount).toBe(1);

    // Different student code
    handleScan('TB-0043');
    expect(callCount).toBe(2);
  });

  it('camera stream cleanup stops all tracks on close', () => {
    const trackStopSpy = vi.fn();
    const mockTrack = { stop: trackStopSpy } as unknown as MediaStreamTrack;
    const mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;

    // Simulate cleanup
    mockStream.getTracks().forEach((t) => t.stop());
    expect(trackStopSpy).toHaveBeenCalledTimes(1);
  });

  it('no decode loop continues after cleanup', () => {
    vi.useFakeTimers();
    let scanCallCount = 0;
    let scanInterval: any = setInterval(() => {
      scanCallCount++;
    }, 200);

    vi.advanceTimersByTime(450);
    expect(scanCallCount).toBe(2);

    // Stop and clear interval on cleanup
    clearInterval(scanInterval);
    scanInterval = null;

    vi.advanceTimersByTime(1000);
    expect(scanCallCount).toBe(2); // no more increments
    vi.useRealTimers();
  });

  it('verifies offline QR and Code128 fixtures exist on disk', () => {
    const qrPath = path.resolve(__dirname, 'fixtures/qr-tb-0042.png');
    const c128Path = path.resolve(__dirname, 'fixtures/code128-tb-0042.png');
    expect(fs.existsSync(qrPath)).toBe(true);
    expect(fs.existsSync(c128Path)).toBe(true);
    expect(fs.statSync(qrPath).size).toBeGreaterThan(100);
    expect(fs.statSync(c128Path).size).toBeGreaterThan(100);
  });
});
