import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseBarcodeBuffer,
  isScannerSpeed,
  createUsbScannerListener,
} from '../src/hooks/useUsbScanner.js';

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

describe('createUsbScannerListener — Hardware Wedge Security & Boundaries', () => {
  let currentTime = 1000;

  beforeEach(() => {
    currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockEvent(key: string, options: any = {}): any {
    return {
      key,
      repeat: options.repeat ?? false,
      ctrlKey: options.ctrlKey ?? false,
      altKey: options.altKey ?? false,
      metaKey: options.metaKey ?? false,
      target: options.target ?? { tagName: 'BODY' },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
  }

  it('produces one scan for fast scanner-like sequence + Enter', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan, thresholdMs: 35 });

    const keys = ['T', 'B', '-', '0', '4', '2'];
    for (const k of keys) {
      currentTime += 10; // 10ms velocity
      listener.handleKeyDown(createMockEvent(k));
    }

    currentTime += 10;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('TB-042');
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('does not produce scan for normal human typing in an input field', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan, thresholdMs: 35, resetTimeoutMs: 60 });
    const inputTarget = { tagName: 'INPUT' };

    // Human typing at ~120ms intervals
    const keys = ['T', 'B', '-', '0', '1'];
    for (const k of keys) {
      currentTime += 120;
      listener.handleKeyDown(createMockEvent(k, { target: inputTarget }));
    }

    currentTime += 120;
    const enterEvent = createMockEvent('Enter', { target: inputTarget });
    listener.handleKeyDown(enterEvent);

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('does not produce scan when keystroke intervals exceed scanner threshold', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan, thresholdMs: 35, resetTimeoutMs: 100 });

    // Typing at 50ms interval (exceeds 35ms threshold but within 100ms reset)
    listener.handleKeyDown(createMockEvent('T'));
    currentTime += 50;
    listener.handleKeyDown(createMockEvent('B'));
    currentTime += 50;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('does not produce scan for pasted text followed by Enter', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    // On paste, keydown for characters does NOT occur; only Enter is pressed
    const enterEvent = createMockEvent('Enter', { target: { tagName: 'INPUT' } });
    listener.handleKeyDown(enterEvent);

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('does not produce scan when sequence lacks Enter terminator', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    // High velocity burst without Enter
    for (const k of ['T', 'B', '0', '1']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }

    expect(onScan).not.toHaveBeenCalled();
  });

  it('ignores key repeat events', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    // Repeated key
    listener.handleKeyDown(createMockEvent('T', { repeat: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('T', { repeat: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('clears buffer on timeout so stale prefix does not merge into subsequent scan', () => {
    vi.useFakeTimers();
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan, resetTimeoutMs: 60 });

    // Partial prefix
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('T'));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('B'));

    // Stale pause: fast-forward timers past resetTimeoutMs * 2
    vi.advanceTimersByTime(200);

    // New valid scan
    currentTime += 200;
    for (const k of ['9', '9']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));

    expect(onScan).toHaveBeenCalledWith('99');
    vi.useRealTimers();
  });

  it('deduplicates rapid identical scans within duplicate window', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({
      onScan,
      ignoreDuplicatesWithinMs: 500,
    });

    // Scan 1: TB-0001
    for (const k of ['T', 'B', '1']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenLastCalledWith('TB1');

    // Duplicate scan 100ms later: TB-0001
    currentTime += 100;
    for (const k of ['T', 'B', '1']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));
    expect(onScan).toHaveBeenCalledTimes(1); // Ignored as duplicate

    // Different scan: TB-0002
    currentTime += 50;
    for (const k of ['T', 'B', '2']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));
    expect(onScan).toHaveBeenCalledTimes(2);
    expect(onScan).toHaveBeenLastCalledWith('TB2');
  });
});
