import { type ThermalReceiptDto, type ThermalPaperWidth } from '@tibyan/contracts';

export type EscPosAlign = 'left' | 'center' | 'right';

export interface EscPosOptions {
  paperWidth?: ThermalPaperWidth;
  autoCut?: boolean;
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
   * width: 1-8, height: 1-8
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
   * mode: 'partial' (default) or 'full'
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
   * Build complete formatted ESC/POS receipt for standard thermal printers
   */
  public static buildReceipt(receipt: ThermalReceiptDto, options?: EscPosOptions): Buffer {
    const is58mm = options?.paperWidth === '58mm';
    const colWidth = is58mm ? 32 : 42;
    const autoCut = options?.autoCut ?? true;

    const builder = new EscPosBuilder();

    // 1. Header (Centered)
    builder.setAlign('center');
    builder.setTextSize(2, 2);
    builder.setBold(true);
    builder.line('تِبيان');
    builder.setTextSize(1, 1);
    builder.setBold(false);
    builder.line('مساعد المدرس الذكي');
    builder.line(receipt.teacherName);
    builder.feed(1);

    // 2. Receipt Title & Number
    builder.setBold(true);
    builder.line(receipt.isTestReceipt ? '*** إيصال اختبار تجريبي ***' : 'إيصال استلام رسوم');
    builder.line(`رقم الإيصال: ${receipt.receiptNumber}`);
    builder.setBold(false);
    builder.line(`التاريخ: ${receipt.paymentDate}`);
    builder.horizontalRule('-', colWidth);

    // 3. Student Details
    builder.setAlign('right');
    builder.line(`الطالب: ${receipt.studentName}`);
    builder.line(`كود الطالب: ${receipt.studentCode}`);
    if (receipt.gradeLevelNameAr) {
      builder.line(`المرحلة: ${receipt.gradeLevelNameAr}`);
    }
    if (receipt.groupName) {
      builder.line(`المجموعة: ${receipt.groupName}`);
    }
    if (receipt.periodMonth) {
      builder.line(`الشهر: ${receipt.periodMonth}`);
    }
    builder.line(`طريقة الدفع: ${receipt.paymentMethodNameAr}`);
    builder.horizontalRule('-', colWidth);

    // 4. Financial Breakdown
    builder.setAlign('center');
    builder.setTextSize(1, 2);
    builder.setBold(true);
    builder.line(`المبلغ المدفوع: ${receipt.amountFormatted}`);
    builder.setTextSize(1, 1);
    builder.setBold(false);

    if (receipt.remainingBalanceFormatted !== undefined) {
      builder.feed(1);
      builder.line(`الرصيد المتبقي: ${receipt.remainingBalanceFormatted}`);
    }
    builder.horizontalRule('-', colWidth);

    // 5. Notes & Footer
    if (receipt.notes) {
      builder.setAlign('right');
      builder.line(`ملاحظات: ${receipt.notes}`);
      builder.horizontalRule('-', colWidth);
    }

    builder.setAlign('center');
    builder.line('شكراً لثقتكم بنا');
    builder.line('تِبيان — نظام إدارة المعلم');
    builder.feed(2);

    // 6. Paper Cut (if enabled)
    if (autoCut) {
      builder.cut('partial');
    }

    return builder.build();
  }
}
