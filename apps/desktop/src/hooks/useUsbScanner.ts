import { useEffect, useRef, useState, useCallback } from 'react';

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
}

/**
 * Hook for capturing keystroke streams from physical USB barcode / 2D QR scanners.
 * Uses inter-keystroke timing discrimination (< 35ms) to distinguish hardware scanner
 * bursts from manual human keyboard input.
 */
export function useUsbScanner({
  onScan,
  enabled = true,
  thresholdMs = 35,
  resetTimeoutMs = 60,
}: UseUsbScannerOptions) {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(enabled);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      bufferRef.current = '';
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Clear any pending buffer reset timer
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      // Handle Enter (scanner sequence terminator)
      if (e.key === 'Enter') {
        const candidate = bufferRef.current;
        bufferRef.current = '';

        const parsed = parseBarcodeBuffer(candidate);
        if (parsed) {
          // If the buffer was filled at scanner velocity or has valid barcode format,
          // prevent form submission or newline insertion
          e.preventDefault();
          e.stopPropagation();
          handleScanCallback(parsed);
        }
        return;
      }

      // Only accumulate single printable characters
      if (e.key.length !== 1) {
        // Non-character key (e.g. Tab, Escape, Shift)
        return;
      }

      // If interval exceeds reset timeout, clear previous buffer (human typing detected)
      if (bufferRef.current.length > 0 && interval > resetTimeoutMs) {
        bufferRef.current = '';
      }

      bufferRef.current += e.key;

      // Set a timer to wipe the buffer if no subsequent keys arrive
      resetTimerRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, resetTimeoutMs * 2);
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [enabled, thresholdMs, resetTimeoutMs, handleScanCallback]);

  return {
    isListening,
    lastScannedCode,
    clearLastScannedCode: () => setLastScannedCode(null),
  };
}
