import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface ScannedPdfInfo {
  fileName: string;
  fileSizeBytes: number;
  sha256Hash: string;
  pageCount: number;
}

export class PdfScanner {
  /**
   * Validates that the file exists, is a valid PDF, and calculates its metadata.
   */
  static scanFile(filePath: string): ScannedPdfInfo {
    if (!fs.existsSync(filePath)) {
      throw new Error(`ملف PDF غير موجود في المسار المحدد: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      throw new Error(`المسار المحدد ليس ملفاً صالحاً: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    return this.scanBuffer(buffer, path.basename(filePath));
  }

  /**
   * Scans a PDF buffer for magic bytes, SHA-256 hash, and page count.
   */
  static scanBuffer(buffer: Buffer, originalFileName: string): ScannedPdfInfo {
    // 1. Check PDF Magic Header (%PDF-)
    if (buffer.length < 5 || buffer.toString('utf-8', 0, 5) !== '%PDF-') {
      throw new Error('الملف المحدد ليس ملف PDF صالح (غياب الترويسة القياسية %PDF-)');
    }

    // 2. Compute SHA-256
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 3. Deterministic Page Count Scanning
    const pageCount = this.extractPageCount(buffer);

    return {
      fileName: this.sanitizeFileName(originalFileName),
      fileSizeBytes: buffer.length,
      sha256Hash: hash,
      pageCount,
    };
  }

  /**
   * Deterministically extracts page count from the PDF binary structure.
   */
  private static extractPageCount(buffer: Buffer): number {
    const content = buffer.toString('binary');

    // Strategy 1: Look for the root /Pages dictionary with /Count
    // e.g. /Type /Pages ... /Count 142
    const pagesCountRegex = /\/Type\s*\/Pages\b[^>]*\/Count\s+(\d+)/g;
    let match: RegExpExecArray | null;
    let maxCount = 0;

    while ((match = pagesCountRegex.exec(content)) !== null) {
      const count = parseInt(match[1]!, 10);
      if (!isNaN(count) && count > maxCount) {
        maxCount = count;
      }
    }

    if (maxCount > 0) {
      return maxCount;
    }

    // Strategy 2: Count individual /Type /Page objects (not /Pages)
    const pageObjRegex = /\/Type\s*\/Page\b(?!\s*s)/g;
    let pageObjCount = 0;
    while (pageObjRegex.exec(content) !== null) {
      pageObjCount++;
    }

    if (pageObjCount > 0) {
      return pageObjCount;
    }

    // Fallback for valid PDF structure
    return 1;
  }

  /**
   * Sanitizes filename to prevent directory traversal and illegal characters.
   */
  static sanitizeFileName(name: string): string {
    const base = path.basename(name);
    return base.replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, '_');
  }

  /**
   * Prevents directory traversal by verifying resolved path remains within baseDir.
   */
  static assertWithinBase(targetPath: string, baseDir: string): void {
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error('محاولة وصول غير مصرح بها خارج المجلد المخصص للمصادر (Directory Traversal Detected)');
    }
  }
}
