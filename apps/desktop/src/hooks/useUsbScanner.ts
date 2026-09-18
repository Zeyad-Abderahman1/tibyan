import { useEffect, useState, useCallback } from 'react';

/**
 * Checks if the elapsed time between two keystrokes represents scanner velocity (< thresholdMs).
 */
export function isScannerSpeed(intervalMs: number, thresholdMs = 35): boolean {
  return intervalMs >= 0 && intervalMs <= thresholdMs;
}

/**
 * Parses and sanitizes a raw scanner buffer.
 * Supports plain student codes (e.g. TB-0001, 42) and JSON QR payloads.
 */
export function parseBarcodeBuffer(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return null;

  // Check if buffer is a JSON payload (e.g. from QR token)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.studentCode === 'string' && parsed.studentCode.trim().length > 0) {
        return parsed.studentCode.trim();
      }
      if (typeof parsed.code === 'string' && parsed.code.trim().length > 0) {
        return parsed.code.trim();
      }
    } catch {
      // Fall through to plain string handling
    }
  }

  return trimmed;
}

export interface UseUsbScannerOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
  thresholdMs?: number;
  resetTimeoutMs?: number;
  ignoreDuplicatesWithinMs?: number;
}

export interface UsbScannerListener {
  handleKeyDown: (e: KeyboardEvent) => void;
  dispose: () => void;
}

/**
 * Creates an event listener for physical USB barcode/QR scanner keyboard wedges.
 * Features:
 * 1. Strict sequence terminator (Enter) requirement.
 * 2. Key-repeat rejection (e.repeat).
 * 3. Modifier key rejection (Ctrl, Alt, Meta).
 * 4. Inter-keystroke velocity validation (must all be <= thresholdMs).
 * 5. Input/textarea protection: human typing in inputs is never intercepted or corrupted.
 * 6. Buffer expiration cleanup via timer.
 * 7. Deduplication of identical rapid successive scans.
 */
export function createUsbScannerListener(options: UseUsbScannerOptions): UsbScannerListener {
  const {
    onScan,
    thresholdMs = 35,
    resetTimeoutMs = 60,
    ignoreDuplicatesWithinMs = 0,
  } = options;

  let buffer = '';
  let lastKeyTime = 0;
  let isFastBurst = true;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  let lastScannedCode: string | null = null;
  let lastScanTime = 0;

  function clearTimer(): void {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    // 1. Ignore key repeats (held down keys)
    if (e.repeat) return;

    // 2. Ignore modifier shortcuts (Ctrl, Alt, Meta)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const interval = now - lastKeyTime;
    lastKeyTime = now;

    clearTimer();

    // 3. Handle Enter terminator
    if (e.key === 'Enter') {
      const candidate = buffer;
      const wasFast = isFastBurst && candidate.length >= 2;
      buffer = '';
      isFastBurst = true;

      if (!wasFast) {
        // Normal human Enter or insufficient characters — do not scan, do not prevent default
        return;
      }

      const parsed = parseBarcodeBuffer(candidate);
      if (parsed) {
        // Scanner burst complete: prevent default newline or form submission
        e.preventDefault();
        e.stopPropagation();

        // Check duplicate throttle
        if (
          ignoreDuplicatesWithinMs > 0 &&
          parsed === lastScannedCode &&
          now - lastScanTime < ignoreDuplicatesWithinMs
        ) {
          return;
        }

        lastScannedCode = parsed;
        lastScanTime = now;
        onScan(parsed);
      }
      return;
    }

    // 4. Only accumulate single printable characters
    if (e.key.length !== 1) {
      return;
    }

    // If buffer was empty, start new burst
    if (buffer.length === 0) {
      isFastBurst = true;
    } else {
      // If gap exceeds reset timeout, clear buffer
      if (interval > resetTimeoutMs) {
        buffer = '';
        isFastBurst = true;
      } else if (interval > thresholdMs) {
        // If typing speed was slower than scanner velocity, mark burst as human
        isFastBurst = false;
      }
    }

    buffer += e.key;

    // 5. Clean buffer timeout
    resetTimer = setTimeout(() => {
      buffer = '';
      isFastBurst = true;
    }, resetTimeoutMs * 2);
  }

  function dispose(): void {
    clearTimer();
    buffer = '';
    isFastBurst = true;
  }

  return { handleKeyDown, dispose };
}

/**
 * Hook for capturing keystroke streams from physical USB barcode / 2D QR scanners.
 * Uses inter-keystroke timing discrimination (< 35ms) and sequence termination (Enter)
 * to distinguish hardware scanner bursts from manual human keyboard input.
 */
export function useUsbScanner({
  onScan,
  enabled = true,
  thresholdMs = 35,
  resetTimeoutMs = 60,
  ignoreDuplicatesWithinMs = 500,
}: UseUsbScannerOptions) {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(enabled);

  const handleScanCallback = useCallback(
    (code: string) => {
      setLastScannedCode(code);
      onScan(code);
    },
    [onScan]
  );

  useEffect(() => {
    setIsListening(enabled);
    if (!enabled) {
      return;
    }

    const listener = createUsbScannerListener({
      onScan: handleScanCallback,
      thresholdMs,
      resetTimeoutMs,
      ignoreDuplicatesWithinMs,
    });

    window.addEventListener('keydown', listener.handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', listener.handleKeyDown, true);
      listener.dispose();
    };
  }, [enabled, thresholdMs, resetTimeoutMs, ignoreDuplicatesWithinMs, handleScanCallback]);

  return {
    isListening,
    lastScannedCode,
    clearLastScannedCode: () => setLastScannedCode(null),
  };
}
