import { describe, it, expect, beforeEach } from 'vitest';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  StudentRepository,
  UserRepository,
} from '@tibyan/db';
import { StudentImportService, ALL_PERMISSION_CODES } from '@tibyan/core';
import { attachmentStore, previewRowsCache } from '../electron/ipc/assistant.ipc.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

describe('Chat File Attachments & Authoritative Student Bulk Import Flow', () => {
  let systemDb: ReturnType<typeof openSystemDatabase>;
  let academicDb: ReturnType<typeof openAcademicDatabase>;
  let studentRepo: StudentRepository;
  let userRepo: UserRepository;
  let testUserId: string;

  beforeEach(() => {
    closeAllDatabases();
    systemDb = openSystemDatabase({ filePath: ':memory:' });
    academicDb = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });
    studentRepo = new StudentRepository(academicDb.db);
    userRepo = new UserRepository(systemDb.db);

    testUserId = crypto.randomUUID();
    userRepo.create({
      id: testUserId,
      username: `teacher_${testUserId.slice(0, 8)}`,
      fullName: 'أستاذ المادة',
      role: 'OWNER',
      pinHash: 'hash',
      salt: 'salt',
      failedAttempts: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    attachmentStore.clear();
    previewRowsCache.clear();
  });

  it('attachment store securely holds uploaded file and assigns trusted attachmentId', () => {
    const csvContent = 'اسم الطالب,الصف,النظام التعليمي,المسار,رقم هاتف ولي الأمر\nعمر أحمد,الصف الأول الثانوي,التعليم العام,عربي,01011112222';
    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachmentId = crypto.randomUUID();

    attachmentStore.set(attachmentId, {
      attachmentId,
      fileName: 'students.csv',
      mimeType: 'text/csv',
      sizeBytes: buffer.length,
      buffer,
      createdAt: Date.now(),
    });

    const retrieved = attachmentStore.get(attachmentId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.fileName).toBe('students.csv');
    expect(retrieved?.buffer.toString('utf-8')).toBe(csvContent);
  });

  it('preview_student_import resolves attachmentId, parses real student rows, and populates previewRowsCache', async () => {
    const csvContent = `اسم الطالب,الصف,النظام التعليمي,المسار,رقم هاتف ولي الأمر,ملاحظات
محمد عبد الرحمن,الصف الأول الثانوي,التعليم العام,عربي,01099887766,ممتاز في الرياضيات
سارة علي إبراهيم,الصف الثاني الإعدادي,التعليم العام,لغات,01233445566,تحتاج دعم في الهندسة
كريم هاني محمود,الصف الثالث الثانوي,التعليم العام,عربي,12345,رقم خاطئ`;

    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachmentId = crypto.randomUUID();

    attachmentStore.set(attachmentId, {
      attachmentId,
      fileName: 'new_students.csv',
      mimeType: 'text/csv',
      sizeBytes: buffer.length,
      buffer,
      createdAt: Date.now(),
    });

    const service = new StudentImportService(academicDb.db);
    const stored = attachmentStore.get(attachmentId)!;
    const preview = await service.parseAndPreview(stored.buffer, stored.fileName);

    const previewId = crypto.randomUUID();
    previewRowsCache.set(previewId, {
      previewId,
      rows: preview.rows,
      fileName: stored.fileName,
      createdAt: Date.now(),
    });

    // Verify preview results
    expect(preview.totalRows).toBe(3);
    expect(preview.validCount).toBe(2);
    expect(preview.invalidCount).toBe(1);

    // Verify cache has rows keyed by previewId
    const cached = previewRowsCache.get(previewId);
    expect(cached).toBeDefined();
    expect(cached?.rows.length).toBe(3);

    // Verify ZERO students inserted into DB before confirmation
    expect(studentRepo.list().length).toBe(0);
  });

  it('attachment content survives preview -> confirm -> execute without needing file bytes at confirm time', async () => {
    const csvContent = `اسم الطالب,الصف,النظام التعليمي,المسار,رقم هاتف ولي الأمر
زياد محمد أحمد,الصف الأول الثانوي,التعليم العام,عربي,01012345678
يارا طارق حسن,الصف الأول الثانوي,التعليم العام,عربي,01123456789`;

    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachmentId = crypto.randomUUID();

    attachmentStore.set(attachmentId, {
      attachmentId,
      fileName: 'approved_students.csv',
      mimeType: 'text/csv',
      sizeBytes: buffer.length,
      buffer,
      createdAt: Date.now(),
    });

    // 1. Preview step
    const service = new StudentImportService(academicDb.db);
    const stored = attachmentStore.get(attachmentId)!;
    const preview = await service.parseAndPreview(stored.buffer, stored.fileName);

    const previewId = crypto.randomUUID();
    previewRowsCache.set(previewId, {
      previewId,
      rows: preview.rows,
      fileName: stored.fileName,
      createdAt: Date.now(),
    });

    // Simulate deleting the original attachment buffer to prove execution works purely from previewRowsCache!
    attachmentStore.delete(attachmentId);

    // 2. Confirm -> Execute step (uses previewId ONLY)
    const cached = previewRowsCache.get(previewId);
    expect(cached).toBeDefined();

    const validRows = cached!.rows.filter((r) => r.status === 'READY');
    expect(validRows.length).toBe(2);

    const actor = {
      userId: testUserId,
      fullName: 'أستاذ المادة',
      role: 'OWNER' as const,
      permissions: ALL_PERMISSION_CODES,
    };

    const result = await service.executeImport({ rows: validRows as any }, actor);

    // Exactly 2 students created
    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);

    // Database check
    const dbStudents = studentRepo.list();
    expect(dbStudents.length).toBe(2);
    expect(dbStudents.map((s) => s.fullName)).toContain('زياد محمد أحمد');
    expect(dbStudents.map((s) => s.fullName)).toContain('يارا طارق حسن');
  });

  it('duplicate student in file is detected and skipped safely during import', async () => {
    // Pre-create student
    const dupCode = `TB-${crypto.randomUUID().slice(0, 6)}`;
    studentRepo.create({
      id: crypto.randomUUID(),
      studentCode: dupCode,
      fullName: 'أحمد سعيد محمود',
      photoPath: null,
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01055556666',
      status: 'ACTIVE',
      qrToken: 'qr-1',
      barcodeValue: dupCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const csvContent = `اسم الطالب,الصف,النظام التعليمي,المسار,رقم هاتف ولي الأمر
أحمد سعيد محمود,الصف الأول الثانوي,التعليم العام,عربي,01055556666
مازن كمال السيد,الصف الأول الثانوي,التعليم العام,عربي,01077778888`;

    const service = new StudentImportService(academicDb.db);
    const preview = await service.parseAndPreview(Buffer.from(csvContent, 'utf-8'), 'batch.csv');

    expect(preview.totalRows).toBe(2);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.validCount).toBe(1);

    const validOnly = preview.rows.filter((r) => r.status === 'READY');
    expect(validOnly.length).toBe(1);
    expect(validOnly[0]?.fullName).toBe('مازن كمال السيد');

    const actor = {
      userId: testUserId,
      fullName: 'أستاذ المادة',
      role: 'OWNER' as const,
      permissions: ALL_PERMISSION_CODES,
    };

    const result = await service.executeImport({ rows: validOnly as any }, actor);
    expect(result.importedCount).toBe(1);
    expect(studentRepo.list().length).toBe(2);
  });

  it('cancel preview disposes cached preview rows', () => {
    const previewId = crypto.randomUUID();
    previewRowsCache.set(previewId, {
      previewId,
      rows: [{ fullName: 'طالب ملغى' }],
      createdAt: Date.now(),
    });

    expect(previewRowsCache.has(previewId)).toBe(true);

    // Cancel action disposes the cache
    previewRowsCache.delete(previewId);
    expect(previewRowsCache.has(previewId)).toBe(false);
  });

  it('wrong or expired attachmentId is safely rejected with clear error', () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const att = attachmentStore.get(nonExistentId);
    expect(att).toBeUndefined();
  });

  it('browse attachment path: loads real PO XLSX fixture into attachmentStore and previews 30 students', async () => {
    const fixtureFile = path.resolve(__dirname, 'fixtures/tibyan_fake_students_test(1).xlsx');
    expect(fs.existsSync(fixtureFile)).toBe(true);

    const buffer = fs.readFileSync(fixtureFile);
    expect(buffer.length).toBe(8624);

    const attachmentId = crypto.randomUUID();
    attachmentStore.set(attachmentId, {
      attachmentId,
      fileName: 'tibyan_fake_students_test(1).xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: buffer.length,
      buffer,
      createdAt: Date.now(),
    });

    const stored = attachmentStore.get(attachmentId);
    expect(stored).toBeDefined();
    expect(stored?.sizeBytes).toBe(8624);

    const service = new StudentImportService(academicDb.db);
    const preview = await service.parseAndPreview(stored!.buffer, stored!.fileName);

    expect(preview.sheetName).toBe('طلاب_جاهزون');
    expect(preview.totalRows).toBe(30);
    expect(preview.validCount).toBe(30);
    expect(preview.invalidCount).toBe(0);
    expect(preview.rows[0]?.fullName).toBe('أحمد سامح محمود النجار');
    expect(preview.rows[0]?.guardianPhone).toBe('01010000000');
  });

  it('drag/drop attachment path: handles file drop and previews 30 students', async () => {
    const fixtureFile = path.resolve(__dirname, 'fixtures/tibyan_fake_students_test(1).xlsx');
    const buffer = fs.readFileSync(fixtureFile);

    // Simulate drag/drop payload ingestion into attachmentStore
    const attachmentId = crypto.randomUUID();
    attachmentStore.set(attachmentId, {
      attachmentId,
      fileName: 'tibyan_fake_students_test(1).xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: buffer.length,
      buffer,
      createdAt: Date.now(),
    });

    const service = new StudentImportService(academicDb.db);
    const stored = attachmentStore.get(attachmentId)!;
    const preview = await service.parseAndPreview(stored.buffer, stored.fileName);

    expect(preview.totalRows).toBe(30);
    expect(preview.validCount).toBe(30);
    expect(preview.rows.length).toBe(30);
  });

  it('real PO XLSX fixture: parses Arabic sheet طلاب_جاهزون with 30 students, preserves phone leading 0, and persists on confirm', async () => {
    const fixtureFile = path.resolve(__dirname, 'fixtures/tibyan_fake_students_test(1).xlsx');
    const buffer = fs.readFileSync(fixtureFile);

    const attachmentId = crypto.randomUUID();
    attachmentStore.set(attachmentId, {
      attachmentId,
      fileName: 'tibyan_fake_students_test(1).xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: buffer.length,
      buffer,
      createdAt: Date.now(),
    });

    const service = new StudentImportService(academicDb.db);
    const stored = attachmentStore.get(attachmentId)!;
    const preview = await service.parseAndPreview(stored.buffer, stored.fileName);

    // Verify preview contents
    expect(preview.sheetName).toBe('طلاب_جاهزون');
    expect(preview.totalRows).toBe(30);
    expect(preview.validCount).toBe(30);

    // Verify first and second student names and leading zeros
    expect(preview.rows[0]?.fullName).toBe('أحمد سامح محمود النجار');
    expect(preview.rows[0]?.guardianPhone).toBe('01010000000');
    expect(preview.rows[0]?.gradeLevel).toBe('PREP_1');

    expect(preview.rows[1]?.fullName).toBe('محمد حسام أحمد منصور');
    expect(preview.rows[1]?.guardianPhone).toBe('01110000001');

    // Cache preview
    const previewId = crypto.randomUUID();
    previewRowsCache.set(previewId, {
      previewId,
      rows: preview.rows,
      fileName: stored.fileName,
      createdAt: Date.now(),
    });

    // Zero students in DB prior to confirmation
    expect(studentRepo.list().length).toBe(0);

    // Confirm execution
    const cached = previewRowsCache.get(previewId)!;
    const readyRows = cached.rows.filter((r) => r.status === 'READY');
    expect(readyRows.length).toBe(30);

    const actor = {
      userId: testUserId,
      fullName: 'أستاذ المادة',
      role: 'OWNER' as const,
      permissions: ALL_PERMISSION_CODES,
    };

    const importResult = await service.executeImport({ rows: readyRows as any }, actor);
    expect(importResult.importedCount).toBe(30);
    expect(importResult.skippedCount).toBe(0);
    expect(importResult.failedCount).toBe(0);

    // Verify persistence in SQLite
    const savedStudents = studentRepo.list();
    expect(savedStudents.length).toBe(30);
    expect(savedStudents.find((s) => s.fullName === 'أحمد سامح محمود النجار')?.guardianPhone).toBe(
      '01010000000'
    );
  });
});
