import React, { useMemo } from 'react';
import { encodeCode128B } from './code128.js';

export interface Code128BarcodeProps {
  value: string;
  height?: number; // bar height in pixels (default: 36)
  showText?: boolean;
  className?: string;
  quietZoneModules?: number;
}

/**
 * Renders a standard Code 128 barcode as a pure, resolution-independent vector SVG.
 * Guaranteed quiet zones and crisp edges for reliable optical scanning.
 */
export function Code128Barcode({
  value,
  height = 36,
  showText = true,
  className = '',
  quietZoneModules = 10,
}: Code128BarcodeProps) {
  const { pattern, isValid } = useMemo(() => {
    try {
      const res = encodeCode128B(value);
      return { pattern: res.pattern, isValid: true };
    } catch {
      return { pattern: '', isValid: false };
    }
  }, [value]);

  if (!isValid || !pattern) {
    return (
      <div className={`text-xs text-red-500 font-mono ${className}`} data-testid="code128-error">
        Invalid Code128: {value}
      </div>
    );
  }

  // Calculate total modules
  let dataModules = 0;
  for (let i = 0; i < pattern.length; i++) {
    dataModules += parseInt(pattern[i]!, 10);
  }

  const totalModules = dataModules + quietZoneModules * 2;
  const textHeight = showText ? 14 : 0;
  const totalHeight = height + textHeight + 6; // 6px padding

  // Build SVG bars
  let currentX = quietZoneModules;
  let isBar = true;
  const bars: React.ReactElement[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i]!, 10);
    if (isBar) {
      bars.push(
        <rect
          key={i}
          x={currentX}
          y={4}
          width={width}
          height={height}
          fill="#000000"
        />
      );
    }
    currentX += width;
    isBar = !isBar;
  }

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1 rounded ${className}`} data-testid="code128-container">
      <svg
        viewBox={`0 0 ${totalModules} ${totalHeight}`}
        className="w-full h-auto max-h-full"
        style={{ aspectRatio: `${totalModules} / ${totalHeight}` }}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Code 128 barcode: ${value}`}
        data-testid="code128-svg"
      >
        {/* Crisp white background */}
        <rect x={0} y={0} width={totalModules} height={totalHeight} fill="#ffffff" />
        {/* Rendered barcode bars */}
        {bars}
        {/* Optional text label */}
        {showText && (
          <text
            x={totalModules / 2}
            y={height + 14}
            textAnchor="middle"
            fill="#000000"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="1"
            direction="ltr"
            data-testid="code128-text"
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
}
