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
}: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

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
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

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
              <div className="absolute inset-8 border-2 border-dashed border-[var(--color-brand-accent)] rounded-lg pointer-events-none animate-pulse" />
            </>
          )}
        </div>

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
