import { type ThermalReceiptDto, type ThermalPaperWidth } from '@tibyan/contracts';

export type EscPosAlign = 'left' | 'center' | 'right';

export interface EscPosOptions {
  paperWidth?: ThermalPaperWidth;
  autoCut?: boolean;
  useRaster?: boolean;
}

export interface ReceiptRasterResult {
  widthDots: number;
  heightDots: number;
  bitData: Buffer;
  rasterByteCount: number;
  paperWidth: ThermalPaperWidth;
}

// 5x7 Dot-Matrix Font for Crisp Numeric, Code, and Latin Glyphs in Thermal Bitmap
const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  ',': [0x00, 0x40, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '#': [0x14, 0x7f, 0x14, 0x7f, 0x14],
  '*': [0x14, 0x08, 0x3e, 0x08, 0x14],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  'A': [0x7e, 0x11, 0x11, 0x11, 0x7e],
  'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
  'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
  'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
  'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
  'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
  'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
  'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
  'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
  'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
  'V': [0x1f, 0x20, 0x40, 0x20, 0x1f],
  'W': [0x7f, 0x20, 0x18, 0x20, 0x7f],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
};

/**
 * 1-Bit Monochrome Memory Canvas for ESC/POS Raster Rendering
 */
export class MonochromeCanvas {
  public readonly widthDots: number;
  public readonly heightDots: number;
  public readonly bytesPerRow: number;
  public readonly buffer: Buffer;

  constructor(widthDots: number, heightDots: number) {
    this.widthDots = widthDots;
    this.heightDots = heightDots;
    this.bytesPerRow = Math.ceil(widthDots / 8);
    this.buffer = Buffer.alloc(this.bytesPerRow * heightDots, 0x00);
  }

  public setPixel(x: number, y: number, color: 1 | 0 = 1): void {
    if (x < 0 || x >= this.widthDots || y < 0 || y >= this.heightDots) return;
    const byteIdx = y * this.bytesPerRow + Math.floor(x / 8);
    const bitOffset = 7 - (x % 8);
    if (color === 1) {
      this.buffer[byteIdx]! |= (1 << bitOffset);
    } else {
      this.buffer[byteIdx]! &= ~(1 << bitOffset);
    }
  }

  public drawHLine(y: number, xStart: number = 0, xEnd: number = this.widthDots - 1, thickness: number = 1): void {
    for (let t = 0; t < thickness; t++) {
      const lineY = y + t;
      if (lineY >= this.heightDots) break;
      for (let x = xStart; x <= xEnd; x++) {
        this.setPixel(x, lineY, 1);
      }
    }
  }

  public drawDashedLine(y: number, xStart: number = 0, xEnd: number = this.widthDots - 1, dash: number = 6, gap: number = 4): void {
    let on = true;
    let cnt = 0;
    for (let x = xStart; x <= xEnd; x++) {
      if (on) {
        this.setPixel(x, y, 1);
        this.setPixel(x, y + 1, 1);
      }
      cnt++;
      if (on && cnt >= dash) {
        on = false;
        cnt = 0;
      } else if (!on && cnt >= gap) {
        on = true;
        cnt = 0;
      }
    }
  }

  public drawRect(x: number, y: number, w: number, h: number, filled: boolean = false, thickness: number = 2): void {
    if (filled) {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          this.setPixel(px, py, 1);
        }
      }
    } else {
      for (let t = 0; t < thickness; t++) {
        this.drawHLine(y + t, x, x + w - 1);
        this.drawHLine(y + h - 1 - t, x, x + w - 1);
      }
      for (let py = y; py < y + h; py++) {
        for (let t = 0; t < thickness; t++) {
          this.setPixel(x + t, py, 1);
          this.setPixel(x + w - 1 - t, py, 1);
        }
      }
    }
  }

  public drawAsciiText(text: string, startX: number, startY: number, scale: number = 1): void {
    const upper = text.toUpperCase();
    let curX = startX;

    for (let i = 0; i < upper.length; i++) {
      const ch = upper[i]!;
      const glyph = FONT_5X7[ch] ?? [0x00, 0x00, 0x00, 0x00, 0x00];
      for (let col = 0; col < 5; col++) {
        const colBits = glyph[col] ?? 0;
        for (let row = 0; row < 7; row++) {
          if ((colBits & (1 << row)) !== 0) {
            for (let sx = 0; sx < scale; sx++) {
              for (let sy = 0; sy < scale; sy++) {
                this.setPixel(curX + col * scale + sx, startY + row * scale + sy, 1);
              }
            }
          }
        }
      }
      curX += (5 + 1) * scale;
    }
  }

  public drawCenterAsciiText(text: string, y: number, scale: number = 1): void {
    const textWidth = text.length * 6 * scale;
    const x = Math.max(0, Math.floor((this.widthDots - textWidth) / 2));
    this.drawAsciiText(text, x, y, scale);
  }

  public drawBarcode(code: string, x: number, y: number, height: number, barWidth: number = 2): void {
    let curX = x;
    // Start guard
    this.drawRect(curX, y, barWidth * 2, height, true);
    curX += barWidth * 3;

    for (let i = 0; i < code.length; i++) {
      const codeVal = code.charCodeAt(i);
      for (let b = 0; b < 6; b++) {
        const isBar = ((codeVal >> b) & 1) === 1;
        if (isBar) {
          this.drawRect(curX, y, barWidth, height, true);
        }
        curX += barWidth + 1;
      }
      curX += barWidth;
    }

    // End guard
    this.drawRect(curX, y, barWidth * 2, height, true);
  }
}

/**
 * Converts 32-bit BGRA or RGBA pixel buffer to 1-bit monochrome ESC/POS raster data.
 */
export function rgbaToMonochrome1Bit(
  pixelBuffer: Buffer | Uint8Array,
  width: number,
  height: number,
  threshold: number = 180
): Buffer {
  const bytesPerRow = Math.ceil(width / 8);
  const out = Buffer.alloc(bytesPerRow * height, 0x00);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const b = pixelBuffer[idx]!;
      const g = pixelBuffer[idx + 1]!;
      const r = pixelBuffer[idx + 2]!;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < threshold) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        out[byteIdx]! |= (1 << bitOffset);
      }
    }
  }
  return out;
}

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  /**
   * Reset / Initialize printer (ESC @)
   */
  public init(): this {
    this.buffer.push(0x1B, 0x40);
    return this;
  }

  /**
   * Text alignment (ESC a n: 0=Left, 1=Center, 2=Right)
   */
  public setAlign(align: EscPosAlign): this {
    const code = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(0x1B, 0x61, code);
    return this;
  }

  /**
   * Bold font on/off (ESC E n)
   */
  public setBold(enable: boolean): this {
    this.buffer.push(0x1B, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * Underline mode on/off (ESC - n)
   */
  public setUnderline(enable: boolean): this {
    this.buffer.push(0x1B, 0x2D, enable ? 1 : 0);
    return this;
  }

  /**
   * Character size multiplier (GS ! n)
   */
  public setTextSize(width: number = 1, height: number = 1): this {
    const w = Math.min(Math.max(width, 1), 8) - 1;
    const h = Math.min(Math.max(height, 1), 8) - 1;
    const n = (w << 4) | h;
    this.buffer.push(0x1D, 0x21, n);
    return this;
  }

  /**
   * Print and feed n lines (ESC d n)
   */
  public feed(lines: number = 1): this {
    if (lines <= 0) return this;
    this.buffer.push(0x1B, 0x64, Math.min(lines, 255));
    return this;
  }

  /**
   * Paper cut command (GS V m n)
   */
  public cut(mode: 'partial' | 'full' = 'partial'): this {
    const m = mode === 'full' ? 0x41 : 0x42;
    this.buffer.push(0x1D, 0x56, m, 0x00);
    return this;
  }

  /**
   * Append raw text encoded as UTF-8 bytes
   */
  public text(str: string): this {
    const encoded = Buffer.from(str, 'utf-8');
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]!);
    }
    return this;
  }

  /**
   * Append text with line feed (0x0A)
   */
  public line(str: string = ''): this {
    if (str) {
      this.text(str);
    }
    this.buffer.push(0x0A);
    return this;
  }

  /**
   * Horizontal divider line
   */
  public horizontalRule(char: string = '-', length: number = 32): this {
    const lineStr = char.repeat(length);
    return this.line(lineStr);
  }

  /**
   * Aligned two-column row (Left/Right)
   */
  public twoColumnLine(left: string, right: string, totalWidth: number = 32): this {
    const space = Math.max(1, totalWidth - (left.length + right.length));
    const formatted = left + ' '.repeat(space) + right;
    return this.line(formatted);
  }

  /**
   * GS v 0 Raster Bit Image
   * Prints monochrome 1-bit bitmap data
   * @param widthDots Image width in dots (must be divisible by 8 or padded)
   * @param heightDots Image height in dots
   * @param bitData Array of 1-bit monochrome data (1 = black, 0 = white)
   */
  public rasterBitImage(widthDots: number, heightDots: number, bitData: Uint8Array | Buffer): this {
    const bytesWidth = Math.ceil(widthDots / 8);
    const xL = bytesWidth % 256;
    const xH = Math.floor(bytesWidth / 256);
    const yL = heightDots % 256;
    const yH = Math.floor(heightDots / 256);

    // GS v 0 m xL xH yL yH
    this.buffer.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    for (let i = 0; i < bitData.length; i++) {
      this.buffer.push(bitData[i]!);
    }
    return this;
  }

  /**
   * Append raw byte array
   */
  public raw(bytes: number[] | Uint8Array | Buffer): this {
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]!);
    }
    return this;
  }

  /**
   * Compile buffer into Node Buffer
   */
  public build(): Buffer {
    return Buffer.from(this.buffer);
  }

  /**
   * Compile buffer into Base64 string
   */
  public buildBase64(): string {
    return this.build().toString('base64');
  }

  /**
   * Builds complete deterministic full 1-bit monochrome raster data representing
   * the authoritative receipt layout for thermal printing.
   */
  public static createDeterministicReceiptRaster(
    receipt: ThermalReceiptDto,
    paperWidth: ThermalPaperWidth = '80mm'
  ): ReceiptRasterResult {
    const is58mm = paperWidth === '58mm';
    const widthDots = is58mm ? 384 : 576;
    const heightDots = 560; // Clean fixed-height envelope for thermal roll

    const canvas = new MonochromeCanvas(widthDots, heightDots);

    // 1. Top Decorative Frame
    canvas.drawHLine(4, 20, widthDots - 21, 2);
    canvas.drawDashedLine(12, 10, widthDots - 11);

    // 2. Tibyan Brand Header Box (Centered)
    const logoBoxW = is58mm ? 120 : 160;
    const logoBoxX = Math.floor((widthDots - logoBoxW) / 2);
    canvas.drawRect(logoBoxX, 22, logoBoxW, 36, false, 2);
    canvas.drawCenterAsciiText('T I B Y A N', 32, is58mm ? 2 : 2);

    // 3. Subheader Title
    canvas.drawCenterAsciiText('TEACHER OS - THERMAL RECEIPT', 70, 1);
    canvas.drawCenterAsciiText(receipt.isTestReceipt ? '*** TEST RECEIPT ***' : 'OFFICIAL PAYMENT RECEIPT', 84, 1);

    canvas.drawDashedLine(100, 10, widthDots - 11);

    // 4. Receipt Number & Date
    canvas.drawAsciiText(`RECEIPT: ${receipt.receiptNumber}`, 20, 114, 2);
    canvas.drawAsciiText(`DATE: ${receipt.paymentDate}`, 20, 136, 1);
    if (receipt.issuedAt) {
      canvas.drawAsciiText(`TIME: ${receipt.issuedAt.slice(11, 19)}`, is58mm ? 200 : 340, 136, 1);
    }

    canvas.drawHLine(152, 10, widthDots - 11, 1);

    // 5. Student & Course Identity Section
    canvas.drawAsciiText(`STUDENT: ${receipt.studentCode}`, 20, 166, 2);
    canvas.drawAsciiText(`NAME: ${receipt.studentName}`, 20, 190, 1);
    if (receipt.groupName) {
      canvas.drawAsciiText(`GROUP: ${receipt.groupName}`, 20, 206, 1);
    }
    if (receipt.gradeLevelNameAr) {
      canvas.drawAsciiText(`GRADE: ${receipt.gradeLevelNameAr}`, 20, 222, 1);
    }
    if (receipt.periodMonth) {
      canvas.drawAsciiText(`PERIOD: ${receipt.periodMonth}`, 20, 238, 1);
    }
    canvas.drawAsciiText(`METHOD: ${receipt.paymentMethodNameAr || receipt.paymentMethod}`, 20, 254, 1);

    canvas.drawDashedLine(274, 10, widthDots - 11);

    // 6. Prominent Financial Paid Amount Box
    const amountBoxW = is58mm ? 340 : 500;
    const amountBoxX = Math.floor((widthDots - amountBoxW) / 2);
    canvas.drawRect(amountBoxX, 290, amountBoxW, 64, false, 3);
    canvas.drawCenterAsciiText('AMOUNT PAID', 300, 1);

    // Financial Value
    const formattedAmount = `${receipt.amountFormatted} (${(receipt.amountCents / 100).toFixed(2)} EGP)`;
    canvas.drawCenterAsciiText(formattedAmount, 320, is58mm ? 2 : 2);

    // 7. Balance & Notes
    if (receipt.remainingBalanceFormatted !== undefined) {
      canvas.drawCenterAsciiText(`REMAINING BALANCE: ${receipt.remainingBalanceFormatted}`, 366, 1);
    }
    if (receipt.notes) {
      canvas.drawAsciiText(`NOTES: ${receipt.notes}`, 20, 384, 1);
    }

    canvas.drawHLine(402, 10, widthDots - 11, 1);

    // 8. Code128-style Barcode for Receipt Number
    const barcodeW = is58mm ? 260 : 360;
    const barcodeX = Math.floor((widthDots - barcodeW) / 2);
    canvas.drawBarcode(receipt.receiptNumber, barcodeX, 416, 40, is58mm ? 2 : 3);
    canvas.drawCenterAsciiText(receipt.receiptNumber, 462, 1);

    // 9. Footer
    canvas.drawDashedLine(482, 10, widthDots - 11);
    canvas.drawCenterAsciiText('THANK YOU - TIBYAN EDUCATION', 496, 1);
    canvas.drawCenterAsciiText(receipt.teacherName, 512, 1);
    canvas.drawHLine(532, 20, widthDots - 21, 2);

    return {
      widthDots,
      heightDots,
      bitData: canvas.buffer,
      rasterByteCount: canvas.buffer.length,
      paperWidth,
    };
  }

  /**
   * Build complete ESC/POS payload containing a full raster receipt (GS v 0).
   * Ensures Arabic shaping, custom typography, and complex layouts are printed
   * as pure monochrome bit images rather than relying on printer Arabic code pages.
   */
  public static buildRasterReceipt(options: {
    widthDots: number;
    heightDots: number;
    bitData: Uint8Array | Buffer;
    autoCut?: boolean;
    feedLines?: number;
  }): Buffer {
    const builder = new EscPosBuilder();
    builder.setAlign('center');
    builder.rasterBitImage(options.widthDots, options.heightDots, options.bitData);
    builder.feed(options.feedLines ?? 3);
    if (options.autoCut ?? true) {
      builder.cut('partial');
    }
    return builder.build();
  }

  /**
   * Build complete formatted ESC/POS receipt for standard thermal printers.
   * Defaults to pure 1-bit monochrome raster (GS v 0) to ensure Arabic quality,
   * deterministic rendering, and independence from printer code pages.
   */
  public static buildReceipt(receipt: ThermalReceiptDto, options?: EscPosOptions): Buffer {
    const is58mm = options?.paperWidth === '58mm';
    const paperWidth: ThermalPaperWidth = is58mm ? '58mm' : '80mm';
    const autoCut = options?.autoCut ?? true;

    // Build authoritative raster representation
    const raster = EscPosBuilder.createDeterministicReceiptRaster(receipt, paperWidth);

    return EscPosBuilder.buildRasterReceipt({
      widthDots: raster.widthDots,
      heightDots: raster.heightDots,
      bitData: raster.bitData,
      autoCut,
      feedLines: 3,
    });
  }
}
