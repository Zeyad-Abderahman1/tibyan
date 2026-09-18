import { useRef, useState, useEffect } from 'react';
import { Modal, Button } from '@tibyan/design-system';
import { CameraOff } from 'lucide-react';

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (code: string) => void;
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
}: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: any = null;

    async function startCamera() {
      if (!isOpen) return;
      try {
        setCameraError(null);
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('كاميرا الجهاز غير مدعومة في هذه البيئة.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Native BarcodeDetector loop
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window && onScan) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
            });

            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue?.trim();
                    const now = Date.now();
                    if (
                      rawValue &&
                      (rawValue !== lastScannedCodeRef.current || now - lastScanTimeRef.current > 2500)
                    ) {
                      lastScannedCodeRef.current = rawValue;
                      lastScanTimeRef.current = now;
                      setLastScannedCode(rawValue);
                      setFlashSuccess(true);
                      setTimeout(() => setFlashSuccess(false), 800);
                      onScan(rawValue);
                    }
                  }
                } catch {}
              }
            }, 200);
          } catch {}
        }
      } catch (err: any) {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'تم رفض إذن الوصول للكاميرا من قِبل نظام التشغيل أو التطبيق.'
            : err.message || 'تعذر تشغيل كاميرا الجهاز.'
        );
      }
    }

    startCamera();

    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, onScan]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ماسح الكاميرا للـ QR والباركود"
      size="md"
    >
      <div className="space-y-4 text-center" dir="rtl">
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
