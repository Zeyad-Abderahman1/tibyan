import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PhotoService } from '../src/students/photo.service.js';

describe('PhotoService', () => {
  let tempMediaDir: string;
  let tempSourceDir: string;
  let photoService: PhotoService;

  const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validWebpHeader = Buffer.concat([
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF
    Buffer.from([0x24, 0x00, 0x00, 0x00]), // size
    Buffer.from([0x57, 0x45, 0x42, 0x50]), // WEBP
    Buffer.from([0x56, 0x50, 0x38, 0x20]), // VP8
  ]);

  beforeEach(() => {
    tempMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-media-test-'));
    tempSourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-source-test-'));
    photoService = new PhotoService(tempMediaDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempMediaDir, { recursive: true, force: true });
      fs.rmSync(tempSourceDir, { recursive: true, force: true });
    } catch {}
  });

  it('detects valid JPEG, PNG, and WebP image formats', () => {
    expect(photoService.detectImageType(validJpegHeader)).toBe('jpg');
    expect(photoService.detectImageType(validPngHeader)).toBe('png');
    expect(photoService.detectImageType(validWebpHeader)).toBe('webp');
    expect(photoService.detectImageType(Buffer.from('plain-text-file'))).toBeNull();
  });

  it('Valid JPEG photo import copies into the managed academic-year media directory', async () => {
    const srcFile = path.join(tempSourceDir, 'source.jpg');
    fs.writeFileSync(srcFile, validJpegHeader);

    const studentId = 'test-student-123';
    const result = await photoService.saveStudentPhoto(studentId, srcFile);

    expect(result.relativePath).toMatch(/^students\/test-student-123-\d+\.jpg$/);
    expect(result.fullPath).toBe(path.resolve(tempMediaDir, result.relativePath));
    expect(fs.existsSync(result.fullPath)).toBe(true);

    const copiedContent = fs.readFileSync(result.fullPath);
    expect(copiedContent.subarray(0, validJpegHeader.length)).toEqual(validJpegHeader);
  });

  it('Valid PNG and WebP photos import with correct extensions', async () => {
    const pngFile = path.join(tempSourceDir, 'source.png');
    fs.writeFileSync(pngFile, validPngHeader);

    const webpFile = path.join(tempSourceDir, 'source.webp');
    fs.writeFileSync(webpFile, validWebpHeader);

    const pngRes = await photoService.saveStudentPhoto('std-png', pngFile);
    expect(pngRes.relativePath).toMatch(/^students\/std-png-\d+\.png$/);
    expect(fs.existsSync(pngRes.fullPath)).toBe(true);

    const webpRes = await photoService.saveStudentPhoto('std-webp', webpFile);
    expect(webpRes.relativePath).toMatch(/^students\/std-webp-\d+\.webp$/);
    expect(fs.existsSync(webpRes.fullPath)).toBe(true);
  });

  it('Unsupported or corrupted image input is rejected', async () => {
    const badFile = path.join(tempSourceDir, 'malicious.exe');
    fs.writeFileSync(badFile, Buffer.from('MZ\x90\x00\x03\x00\x00\x00'));

    await expect(photoService.saveStudentPhoto('std-bad', badFile)).rejects.toThrowError(
      expect.objectContaining({ code: 'INVALID_PHOTO' })
    );
  });

  it('Non-existent source path is rejected with INVALID_PHOTO', async () => {
    const missing = path.join(tempSourceDir, 'does-not-exist.jpg');
    await expect(photoService.saveStudentPhoto('std-missing', missing)).rejects.toThrowError(
      expect.objectContaining({ code: 'INVALID_PHOTO' })
    );
  });

  it('Destination filename never concatenates unsanitized user filenames', async () => {
    const maliciousSource = path.join(tempSourceDir, 'user-secret-name-evil.jpg');
    fs.writeFileSync(maliciousSource, validJpegHeader);

    const studentId = 'test-student-123';
    const result = await photoService.saveStudentPhoto(studentId, maliciousSource);
    // Path must stay strictly inside managed students directory
    expect(result.fullPath.startsWith(path.join(tempMediaDir, 'students'))).toBe(true);
    expect(result.relativePath).not.toContain('user-secret-name-evil');
    expect(result.relativePath).not.toContain('..');
  });

  it('Rejects path traversal in studentId', async () => {
    const srcFile = path.join(tempSourceDir, 'source.jpg');
    fs.writeFileSync(srcFile, validJpegHeader);

    await expect(photoService.saveStudentPhoto('../../../etc/passwd', srcFile)).rejects.toThrowError(
      expect.objectContaining({ code: 'INVALID_INPUT' })
    );
  });

  it('Stored photo path points only to managed application storage', () => {
    const managedRel = 'students/std-1-123456.jpg';
    const full = photoService.resolveFullPath(managedRel);
    expect(full).toBe(path.join(tempMediaDir, 'students', 'std-1-123456.jpg'));

    // Attempting to resolve path traversal throws
    expect(() => photoService.resolveFullPath('../system.sqlite')).toThrowError(
      expect.objectContaining({ code: 'INVALID_INPUT' })
    );
  });

  it('deleteManagedPhoto removes file and rejects path traversal', async () => {
    const srcFile = path.join(tempSourceDir, 'to-delete.jpg');
    fs.writeFileSync(srcFile, validJpegHeader);

    const saved = await photoService.saveStudentPhoto('std-del', srcFile);
    expect(fs.existsSync(saved.fullPath)).toBe(true);

    await photoService.deleteManagedPhoto(saved.relativePath);
    expect(fs.existsSync(saved.fullPath)).toBe(false);

    // Attempting to delete file outside of managed directory throws
    await expect(photoService.deleteManagedPhoto('../../../some-file.txt')).rejects.toThrowError(
      expect.objectContaining({ code: 'INVALID_INPUT' })
    );
  });
});
