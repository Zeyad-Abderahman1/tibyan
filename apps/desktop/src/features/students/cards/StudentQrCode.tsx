import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

export interface StudentQrCodeProps {
  value: string;
  size?: number; // width/height in pixels
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
  quietZoneModules?: number;
}

/**
 * Renders a QR code as a pure, resolution-independent vector SVG.
 * Controlled React SVG with zero dangerouslySetInnerHTML.
 * Encodes the exact canonical studentCode (e.g. TB-0042).
 */
export function StudentQrCode({
  value,
  size = 96,
  errorCorrectionLevel = 'M',
  className = '',
  quietZoneModules = 2,
}: StudentQrCodeProps) {
  const { pathD, totalSize, isValid } = useMemo(() => {
    if (!value || typeof value !== 'string') {
      return { pathD: '', totalSize: 0, isValid: false };
    }

    try {
      // TypeNumber 0 = auto-detect minimum required version
      const qr = qrcode(0, errorCorrectionLevel);
      qr.addData(value);
      qr.make();

      const count = qr.getModuleCount();
      let path = '';

      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            // Crisp 1x1 module rect path: M x y h 1 v 1 h -1 z
            const x = c + quietZoneModules;
            const y = r + quietZoneModules;
            path += `M${x},${y}h1v1h-1z `;
          }
        }
      }

      return {
        pathD: path,
        totalSize: count + quietZoneModules * 2,
        isValid: true,
      };
    } catch {
      return { pathD: '', totalSize: 0, isValid: false };
    }
  }, [value, errorCorrectionLevel, quietZoneModules]);

  if (!isValid || totalSize === 0) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-red-50 text-red-500 text-xs p-2 border border-red-200 rounded ${className}`}
        style={{ width: size, height: size }}
        data-testid="student-qr-error"
      >
        QR Error
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-white p-1 rounded shadow-sm ${className}`}
      data-testid="student-qr-container"
    >
      <svg
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR Code for ${value}`}
        data-testid="student-qr-svg"
      >
        {/* High contrast white background for quiet zone */}
        <rect x={0} y={0} width={totalSize} height={totalSize} fill="#ffffff" />
        {/* Dark modules vector path */}
        <path d={pathD} fill="#000000" data-testid="student-qr-path" />
      </svg>
    </div>
  );
}
