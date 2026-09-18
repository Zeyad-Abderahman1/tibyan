import { useRef, useState, useEffect, useCallback } from 'react';
import { Modal, Button } from '@tibyan/design-system';
import { CameraOff, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  initCameraDecoder,
  createBarcodeDetector,
} from './cameraDecoder.js';
import { parseBarcodeBuffer } from '../../hooks/useUsbScanner.js';

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (code: string) => void;
  initialDecoderError?: string | null;
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  initialDecoderError = null,
}: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [decoderStatus, setDecoderStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>(
    initialDecoderError ? 'error' : 'idle'
  );
  const [decoderError, setDecoderError] = useState<string | null>(initialDecoderError);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const isDetectingRef = useRef<boolean>(false);

  const startScanner = useCallback(async () => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    let scanInterval: ReturnType<typeof setInterval> | null = null;

    try {
      setDecoderStatus('initializing');
      setDecoderError(null);
      setCameraError(null);

      // 1. Initialize offline WASM decoder
      await initCameraDecoder();
      setDecoderStatus('ready');

      // 2. Request camera stream only after decoder is ready
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('كاميرا الجهاز غير مدعومة في هذه البيئة.');
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 3. Create BarcodeDetector instance for QR and Code128
      const detector = createBarcodeDetector();

      // 4. Start controlled scan loop (200ms cadence) with overlap protection
      scanInterval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        if (isDetectingRef.current) return; // Prevent overlapping detect() calls

        isDetectingRef.current = true;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0]) {
            const raw = barcodes[0].rawValue?.trim();
            const validatedCode = parseBarcodeBuffer(raw);

            // Student identifier rule: decoded rawValue must pass student-code validation
            if (validatedCode) {
              const now = Date.now();
              if (
                validatedCode !== lastScannedCodeRef.current ||
                now - lastScanTimeRef.current > 2000
              ) {
                lastScannedCodeRef.current = validatedCode;
                lastScanTimeRef.current = now;
                setLastScannedCode(validatedCode);
                setFlashSuccess(true);
                setTimeout(() => setFlashSuccess(false), 800);
                onScan?.(validatedCode);
              }
            }
          }
        } catch {
          // Ignore transient frame recognition misses
        } finally {
          isDetectingRef.current = false;
        }
      }, 200);
    } catch (err: any) {
      if (err.message && err.message.includes('WASM')) {
        setDecoderStatus('error');
        setDecoderError(err.message || 'تعذر تهيئة محرك مسح الباركود.');
      } else {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'تم رفض إذن الوصول للكاميرا من قِبل نظام التشغيل أو التطبيق.'
            : err.message || 'تعذر تشغيل كاميرا الجهاز.'
        );
      }
    }

    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      isDetectingRef.current = false;
    };
  }, [isOpen, onScan]);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    if (isOpen) {
      startScanner().then((cleanup) => {
        cleanupFn = cleanup;
      });
    } else {
      setDecoderStatus('idle');
      setCameraError(null);
      setDecoderError(null);
      setLastScannedCode(null);
    }

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [isOpen, startScanner]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ماسح الكاميرا للـ QR والباركود"
      size="md"
    >
      <div className="space-y-4 text-center" dir="rtl">
        {decoderStatus === 'error' ? (
          <div
            className="p-8 text-center space-y-3 rounded-xl bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]"
            data-testid="camera-decoder-unavailable"
          >
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
              محرك مسح الباركود عبر الكاميرا غير مفعل في النظام
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-md mx-auto">
              {decoderError ||
                'محرك التعرف على الباركود المدمج غير متاح في بيئة سطح المكتب الحالية دون حزمة فك تشفير برمجية. يرجى استخدام ماسح الباركود الخارجي (USB) أو تسجيل الحضور يدويًا عبر الجدول.'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={startScanner}
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 ml-1" />
              إعادة المحاولة
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--color-text-secondary)]">
              وجّه كاميرا الجهاز نحو بطاقة الطالب لمسح رمز الـ QR أو الباركود تلقائيًا.
            </p>

            <div className="relative w-full aspect-video rounded-xl bg-black/90 overflow-hidden flex items-center justify-center border border-[var(--color-border-subtle)]">
              {cameraError ? (
                <div className="p-6 text-center space-y-2 text-[var(--color-status-danger)]">
                  <CameraOff className="w-8 h-8 mx-auto" />
                  <p className="text-xs font-semibold">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    data-testid="camera-scanner-video"
                  />
                  {/* Viewfinder Target Frame */}
                  <div
                    className={`absolute inset-8 border-2 rounded-lg pointer-events-none transition-all duration-300 flex items-center justify-center ${
                      flashSuccess
                        ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                        : 'border-dashed border-[var(--color-brand-accent)] animate-pulse'
                    }`}
                  >
                    {flashSuccess && (
                      <span className="text-emerald-300 font-bold text-sm bg-black/60 px-3 py-1 rounded-full">
                        تم المسح بنجاح ✓
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {lastScannedCode && (
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/20">
                <span>آخر رمز تم مسحه:</span>
                <span dir="ltr" className="font-mono font-bold">{lastScannedCode}</span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            data-testid="close-camera-scanner-btn"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
