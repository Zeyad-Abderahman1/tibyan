import fs from 'fs';
import path from 'path';
import { protocol } from 'electron';
import { hasPermission } from '@tibyan/core';
import type { Runtime } from './runtime.js';

/**
 * Authoritative request handler for the custom tibyan-media:// protocol.
 * Enforces session authentication, STUDENTS_READ authorization (or OWNER),
 * strict sandboxing to the active academic year's student media directory,
 * path traversal protection, and whitelisted image MIME handling.
 */
export async function handleMediaProtocolRequest(
  request: { url: string },
  runtime: Runtime
): Promise<Response> {
  try {
    // 1. Session authentication
    if (!runtime.currentSession) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Authorization check: requires STUDENTS_READ (OWNER retains implicit access)
    if (!hasPermission(runtime.currentSession.role, runtime.currentSession.permissions, 'STUDENTS_READ')) {
      return new Response('Forbidden', { status: 403 });
    }

    // 3. Service availability
    if (!runtime.studentService) {
      return new Response('Service Unavailable', { status: 503 });
    }

    // 4. URL format and security validation
    const rawUrl = request.url;
    if (
      typeof rawUrl !== 'string' ||
      rawUrl.includes('..') ||
      rawUrl.includes('\\') ||
      /%2e/i.test(rawUrl) ||
      /%5c/i.test(rawUrl) ||
      /%2f/i.test(rawUrl)
    ) {
      return new Response('Forbidden', { status: 403 });
    }

    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    if (url.protocol !== 'tibyan-media:') {
      return new Response('Bad Request', { status: 400 });
    }

    // Normalize path components
    const rawPath = (url.host ? `${url.host}${url.pathname}` : url.pathname).replace(/^\/+/, '');
    const decodedPath = decodeURIComponent(rawPath);

    // Traversal, null-byte, and backslash escape checks
    if (
      decodedPath.includes('..') ||
      decodedPath.includes('\\') ||
      decodedPath.includes('\0') ||
      path.isAbsolute(decodedPath)
    ) {
      return new Response('Forbidden', { status: 403 });
    }

    // Strictly restrict to the managed student media namespace
    if (!decodedPath.startsWith('students/')) {
      return new Response('Forbidden', { status: 403 });
    }

    // 5. Resolve relative path via PhotoService.resolveFullPath
    const fullPath = runtime.studentService.photoService.resolveFullPath(decodedPath);
    const normalizedFullPath = path.resolve(fullPath);

    // Ensure resolved path is strictly within the active media students directory
    if (runtime.activeAcademicYear) {
      const activeStudentsDir = path.resolve(
        runtime.paths.mediaRootDir,
        runtime.activeAcademicYear.name,
        'students'
      );
      if (!normalizedFullPath.startsWith(activeStudentsDir)) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    // 6. Check file existence and type
    if (!fs.existsSync(normalizedFullPath)) {
      return new Response('Not Found', { status: 404 });
    }

    const stat = await fs.promises.stat(normalizedFullPath);
    if (!stat.isFile()) {
      return new Response('Bad Request', { status: 400 });
    }

    // 7. MIME handling strictly limited to formats accepted by PhotoService
    const ext = path.extname(normalizedFullPath).toLowerCase();
    let mimeType: string;
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    } else {
      return new Response('Unsupported Media Type', { status: 415 });
    }

    const buffer = await fs.promises.readFile(normalizedFullPath);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
}

/**
 * Registers the custom tibyan-media protocol with Electron's protocol module.
 */
export function registerMediaProtocol(runtime: Runtime): void {
  protocol.handle('tibyan-media', (request) => handleMediaProtocolRequest(request, runtime));
}
