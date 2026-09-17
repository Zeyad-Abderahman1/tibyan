import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type PhotoErrorCode =
  | 'INVALID_PHOTO'
  | 'PHOTO_TOO_LARGE'
  | 'PHOTO_COPY_FAILED'
  | 'INVALID_INPUT';

export class PhotoError extends Error {
  constructor(public readonly code: PhotoErrorCode, message: string) {
    super(message);
    this.name = 'PhotoError';
  }
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB limit

export interface SavedPhotoResult {
  relativePath: string;
  fullPath: string;
}

export class PhotoService {
  private readonly mediaBaseDir: string;
  private readonly studentsDir: string;

  constructor(mediaBaseDir: string) {
    this.mediaBaseDir = path.resolve(mediaBaseDir);
    this.studentsDir = path.join(this.mediaBaseDir, 'students');
    this.ensureDirectoryExists(this.studentsDir);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Detects image format based on magic bytes.
   * Returns 'jpg', 'png', 'webp', or null if unsupported.
   */
  detectImageType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
    if (buffer.length < 12) {
      return null;
    }

    // JPEG: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpg';
    }

    // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    // WebP: RIFF ... WEBP
    if (
      buffer[0] === 0x52 && // R
      buffer[1] === 0x49 && // I
      buffer[2] === 0x46 && // F
      buffer[3] === 0x46 && // F
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50 // P
    ) {
      return 'webp';
    }

    return null;
  }

  /**
   * Copies an external image into Tibyan-managed student media storage.
   * Enforces file existence, size limits, content magic-bytes verification,
   * non-user-controlled destination naming, and path traversal rejection.
   */
  async saveStudentPhoto(studentId: string, sourcePath: string): Promise<SavedPhotoResult> {
    if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0 || /[\/\\]|\.\./.test(studentId)) {
      throw new PhotoError('INVALID_INPUT', 'Invalid student ID or path traversal attempt');
    }

    if (!sourcePath || typeof sourcePath !== 'string' || sourcePath.trim().length === 0) {
      throw new PhotoError('INVALID_INPUT', 'Source photo path cannot be empty');
    }

    // Path traversal / sanity checks on input
    const resolvedSource = path.resolve(sourcePath);

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(resolvedSource);
    } catch {
      throw new PhotoError('INVALID_PHOTO', `Source photo file not found or inaccessible: ${sourcePath}`);
    }

    if (!stat.isFile()) {
      throw new PhotoError('INVALID_PHOTO', 'Source photo path is not a regular file');
    }

    if (stat.size > MAX_PHOTO_BYTES) {
      throw new PhotoError(
        'PHOTO_TOO_LARGE',
        `Photo size (${stat.size} bytes) exceeds maximum allowed limit (${MAX_PHOTO_BYTES} bytes)`
      );
    }

    // Read header magic bytes
    let headerBuffer: Buffer;
    try {
      const handle = await fs.promises.open(resolvedSource, 'r');
      headerBuffer = Buffer.alloc(16);
      await handle.read(headerBuffer, 0, 16, 0);
      await handle.close();
    } catch (err) {
      throw new PhotoError('INVALID_PHOTO', `Failed to read photo header: ${(err as Error).message}`);
    }

    const imageExt = this.detectImageType(headerBuffer);
    if (!imageExt) {
      throw new PhotoError(
        'INVALID_PHOTO',
        'Unsupported or corrupted image format. Only JPEG, PNG, and WebP are allowed.'
      );
    }

    // Generate safe, non-user-controlled filename: <studentId>-<randomUUID>.<ext>
    const safeStudentId = studentId.replace(/[^a-zA-Z0-9_-]/g, '');
    const randomSuffix = crypto.randomUUID();
    const fileName = `${safeStudentId}-${randomSuffix}.${imageExt}`;
    const destinationPath = path.join(this.studentsDir, fileName);

    // Guard against path traversal
    const normalizedDestination = path.resolve(destinationPath);
    if (!normalizedDestination.startsWith(path.resolve(this.studentsDir))) {
      throw new PhotoError('INVALID_PHOTO', 'Path traversal attempt detected in photo destination');
    }

    try {
      this.ensureDirectoryExists(this.studentsDir);
      await fs.promises.copyFile(resolvedSource, normalizedDestination);
    } catch (err) {
      throw new PhotoError('PHOTO_COPY_FAILED', `Failed to copy photo into managed storage: ${(err as Error).message}`);
    }

    const relativePath = path.join('students', fileName).replace(/\\/g, '/');

    return {
      relativePath,
      fullPath: normalizedDestination,
    };
  }

  /**
   * Safely deletes a previously managed student photo.
   * Strictly prevents deletion of files outside the managed students directory.
   */
  async deleteManagedPhoto(managedRelativePath: string | null | undefined): Promise<void> {
    if (!managedRelativePath) return;

    const fullPath = path.resolve(this.mediaBaseDir, managedRelativePath);
    const resolvedStudentsDir = path.resolve(this.studentsDir);

    // Security check: Must reside strictly inside the managed students directory
    if (!fullPath.startsWith(resolvedStudentsDir)) {
      throw new PhotoError(
        'INVALID_INPUT',
        'Cannot delete file outside of managed student media storage'
      );
    }

    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch {
      // Cleanup failures must not abort student mutations
    }
  }

  /**
   * Resolves a relative managed photo path to an absolute filesystem path.
   */
  resolveFullPath(managedRelativePath: string): string {
    const fullPath = path.resolve(this.mediaBaseDir, managedRelativePath);
    const resolvedStudentsDir = path.resolve(this.studentsDir);
    if (!fullPath.startsWith(resolvedStudentsDir)) {
      throw new PhotoError(
        'INVALID_INPUT',
        'Cannot resolve path outside of managed student media storage'
      );
    }
    return fullPath;
  }
}
