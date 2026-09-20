import path from 'path';

export type MediaBoundaryErrorCode =
  | 'INVALID_MEDIA_ID'
  | 'PATH_TRAVERSAL_DETECTED'
  | 'OUTSIDE_MEDIA_ROOT'
  | 'UNSUPPORTED_MEDIA_TYPE';

export class MediaBoundaryError extends Error {
  constructor(public readonly code: MediaBoundaryErrorCode, message: string) {
    super(message);
    this.name = 'MediaBoundaryError';
  }
}

export const ALLOWED_MEDIA_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'] as const;

/**
 * Validates media identifiers and paths to ensure they never escape
 * the application-managed media directory boundary.
 */
export class MediaBoundaryValidator {
  private readonly mediaRootDir: string;

  constructor(mediaRootDir: string) {
    this.mediaRootDir = path.resolve(mediaRootDir);
  }

  /**
   * Validates that a media identifier is safe from path traversal, null bytes,
   * absolute path prefixes, or illegal schemes.
   */
  validateMediaId(mediaId: string): string {
    if (!mediaId || typeof mediaId !== 'string' || mediaId.trim().length === 0) {
      throw new MediaBoundaryError('INVALID_MEDIA_ID', 'Media ID cannot be empty');
    }

    const trimmed = mediaId.trim();

    // 1. Detect null bytes
    if (trimmed.includes('\0') || trimmed.includes('%00')) {
      throw new MediaBoundaryError('PATH_TRAVERSAL_DETECTED', 'Null bytes are not allowed in media ID');
    }

    // 2. Detect directory traversal sequences
    if (
      trimmed.includes('..') ||
      trimmed.toLowerCase().includes('%2e%2e') ||
      trimmed.includes('../') ||
      trimmed.includes('..\\')
    ) {
      throw new MediaBoundaryError('PATH_TRAVERSAL_DETECTED', 'Path traversal sequence detected in media ID');
    }

    // 3. Detect absolute paths, drive letters, and protocol schemes
    if (
      path.isAbsolute(trimmed) ||
      /^[a-zA-Z]:[\\\/]/.test(trimmed) ||
      /^[a-zA-Z0-9]+:\/\//.test(trimmed) ||
      trimmed.startsWith('\\\\') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('\\')
    ) {
      throw new MediaBoundaryError(
        'PATH_TRAVERSAL_DETECTED',
        'Absolute paths and URLs are not permitted as media IDs'
      );
    }

    // 4. Character safety check (alphanumeric, dashes, underscores, dots, single forward slashes)
    if (!/^[a-zA-Z0-9_\-./]+$/.test(trimmed)) {
      throw new MediaBoundaryError('INVALID_MEDIA_ID', 'Media ID contains invalid characters');
    }

    // 5. Allowed extension check
    const ext = path.extname(trimmed).toLowerCase();
    if (!ALLOWED_MEDIA_EXTENSIONS.includes(ext as any)) {
      throw new MediaBoundaryError(
        'UNSUPPORTED_MEDIA_TYPE',
        `Unsupported media extension '${ext}'. Allowed extensions: ${ALLOWED_MEDIA_EXTENSIONS.join(', ')}`
      );
    }

    return trimmed;
  }

  /**
   * Safely resolves a media ID to an absolute path, confirming that the resulting
   * path is strictly confined inside the designated mediaRootDir.
   */
  resolvePath(mediaId: string): string {
    const validatedId = this.validateMediaId(mediaId);
    const resolvedPath = path.resolve(this.mediaRootDir, validatedId);

    const rootPrefix = this.mediaRootDir.endsWith(path.sep)
      ? this.mediaRootDir
      : this.mediaRootDir + path.sep;

    if (!resolvedPath.startsWith(rootPrefix)) {
      throw new MediaBoundaryError(
        'OUTSIDE_MEDIA_ROOT',
        'Resolved media path escapes the managed media directory boundary'
      );
    }

    return resolvedPath;
  }
}
