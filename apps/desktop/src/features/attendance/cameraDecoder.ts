import {
  BarcodeDetector,
  prepareZXingModule,
  ZXING_WASM_SHA256,
  ZXING_WASM_VERSION,
} from 'barcode-detector/ponyfill';

export { BarcodeDetector, ZXING_WASM_SHA256, ZXING_WASM_VERSION };

/**
 * Returns the local URL for the offline packaged zxing_reader.wasm file.
 * NEVER resolves to an external CDN (no jsDelivr, unpkg, cdnjs).
 */
export function getLocalZxingWasmUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return new URL('assets/wasm/zxing_reader.wasm', window.location.href).href;
  }
  return 'assets/wasm/zxing_reader.wasm';
}

let initPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Prepares the ZXing WebAssembly module with strict offline-only locateFile.
 * Resolves exclusively to the local packaged WASM asset.
 */
export async function initCameraDecoder(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const wasmUrl = getLocalZxingWasmUrl();

    // Enforce offline-only: reject any external CDN URL
    if (
      wasmUrl.includes('jsdelivr.net') ||
      wasmUrl.includes('unpkg.com') ||
      wasmUrl.includes('cdnjs.cloudflare.com')
    ) {
      throw new Error(`External CDN URL strictly forbidden for ZXing WASM: ${wasmUrl}`);
    }

    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => {
          if (path.endsWith('.wasm')) {
            return wasmUrl;
          }
          return prefix + path;
        },
      },
      fireImmediately: true,
    });

    isInitialized = true;
  })();

  return initPromise;
}

/**
 * Factory for creating a BarcodeDetector instance configured strictly for QR and Code 128.
 */
export function createBarcodeDetector(): BarcodeDetector {
  return new BarcodeDetector({
    formats: ['qr_code', 'code_128'],
  });
}

// Attach to window for deterministic in-runtime packaged verification
if (typeof window !== 'undefined') {
  (window as any).__tibyanCameraDecoder = {
    initCameraDecoder,
    createBarcodeDetector,
    getLocalZxingWasmUrl,
    BarcodeDetector,
  };
}
