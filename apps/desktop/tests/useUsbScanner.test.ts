import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseBarcodeBuffer,
  isScannerSpeed,
  createUsbScannerListener,
} from '../src/hooks/useUsbScanner.js';

describe('useUsbScanner timing and buffer logic', () => {
  it('identifies scanner speed when interval is under threshold', () => {
    expect(isScannerSpeed(10)).toBe(true);
    expect(isScannerSpeed(25)).toBe(true);
    expect(isScannerSpeed(40)).toBe(true);
    expect(isScannerSpeed(50)).toBe(true);
    expect(isScannerSpeed(70)).toBe(true);
    expect(isScannerSpeed(100)).toBe(false);
  });

  it('parses valid barcode and student code buffers', () => {
    expect(parseBarcodeBuffer('TB-0042')).toBe('TB-0042');
    expect(parseBarcodeBuffer('  TB-0001  ')).toBe('TB-0001');
    expect(parseBarcodeBuffer('42')).toBe('42');
    expect(parseBarcodeBuffer('A')).toBe(null); // too short
    expect(parseBarcodeBuffer('')).toBe(null);
  });

  it('rejects arbitrary fast prose or text with spaces', () => {
    expect(parseBarcodeBuffer('hello world')).toBe(null);
    expect(parseBarcodeBuffer('fast human text here')).toBe(null);
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

  it('accepts valid scanner sequence at 20ms interval', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    for (const k of ['T', 'B', '-', '0', '2', '0']) {
      currentTime += 20;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 20;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('TB-020');
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('accepts valid scanner sequence at 40ms interval', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    for (const k of ['T', 'B', '-', '0', '4', '0']) {
      currentTime += 40;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 40;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('TB-040');
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('accepts valid scanner sequence at 50ms interval', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    for (const k of ['T', 'B', '-', '0', '5', '0']) {
      currentTime += 50;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 50;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('TB-050');
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('accepts valid scanner sequence at 70ms interval', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    for (const k of ['T', 'B', '-', '0', '7', '0']) {
      currentTime += 70;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 70;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('TB-070');
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('rejects ordinary slow human typing at 150ms intervals', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    for (const k of ['T', 'B', '-', '0', '0', '1']) {
      currentTime += 150;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 150;
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('rejects sequence without Enter terminator', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    for (const k of ['T', 'B', '0', '1']) {
      currentTime += 20;
      listener.handleKeyDown(createMockEvent(k));
    }

    expect(onScan).not.toHaveBeenCalled();
  });

  it('does not produce scan for paste followed by Enter', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    // On paste, characters do not come through keydown
    const enterEvent = createMockEvent('Enter');
    listener.handleKeyDown(enterEvent);

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('protects active input, textarea, and contenteditable controls', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    // Input element target
    const inputTarget = { tagName: 'INPUT' };
    for (const k of ['T', 'B', '1']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k, { target: inputTarget }));
    }
    currentTime += 10;
    const enterInput = createMockEvent('Enter', { target: inputTarget });
    listener.handleKeyDown(enterInput);
    expect(onScan).not.toHaveBeenCalled();
    expect(enterInput.preventDefault).not.toHaveBeenCalled();

    // Textarea element target
    const textareaTarget = { tagName: 'TEXTAREA' };
    for (const k of ['T', 'B', '2']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k, { target: textareaTarget }));
    }
    currentTime += 10;
    const enterTextarea = createMockEvent('Enter', { target: textareaTarget });
    listener.handleKeyDown(enterTextarea);
    expect(onScan).not.toHaveBeenCalled();
    expect(enterTextarea.preventDefault).not.toHaveBeenCalled();

    // Contenteditable target
    const editableTarget = { tagName: 'DIV', isContentEditable: true };
    for (const k of ['T', 'B', '3']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k, { target: editableTarget }));
    }
    currentTime += 10;
    const enterEditable = createMockEvent('Enter', { target: editableTarget });
    listener.handleKeyDown(enterEditable);
    expect(onScan).not.toHaveBeenCalled();
    expect(enterEditable.preventDefault).not.toHaveBeenCalled();
  });

  it('rejects modifier-assisted keystrokes (Ctrl, Alt, Meta)', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    listener.handleKeyDown(createMockEvent('T', { ctrlKey: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('B', { altKey: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('0', { metaKey: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('1'));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('rejects key repeat events', () => {
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan });

    listener.handleKeyDown(createMockEvent('T', { repeat: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('B', { repeat: true }));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('clears buffer on timeout so stale prefix does not merge into subsequent scan', () => {
    vi.useFakeTimers();
    const onScan = vi.fn();
    const listener = createUsbScannerListener({ onScan, resetTimeoutMs: 120 });

    currentTime += 10;
    listener.handleKeyDown(createMockEvent('T'));
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('B'));

    // Stale pause past reset timeout
    vi.advanceTimersByTime(300);

    currentTime += 300;
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

    // Scan 1: TB1
    for (const k of ['T', 'B', '1']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenLastCalledWith('TB1');

    // Duplicate scan 100ms later: TB1
    currentTime += 100;
    for (const k of ['T', 'B', '1']) {
      currentTime += 10;
      listener.handleKeyDown(createMockEvent(k));
    }
    currentTime += 10;
    listener.handleKeyDown(createMockEvent('Enter'));
    expect(onScan).toHaveBeenCalledTimes(1); // Ignored as duplicate

    // Different scan: TB2
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
