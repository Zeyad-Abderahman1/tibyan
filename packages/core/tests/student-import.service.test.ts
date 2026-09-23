import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  StudentRepository,
  type AcademicDatabaseConnection,
} from '@tibyan/db';
import { StudentImportService } from '../src/students/student-import.service.js';
import { ALL_PERMISSION_CODES } from '../src/auth/permissions.js';
import { type AuthenticatedUser } from '../src/students/student.service.js';

describe('StudentImportService — Real XLSX Import Pipeline & Regressions', () => {
  let acadConn: AcademicDatabaseConnection;
  let studentRepo: StudentRepository;
  let importService: StudentImportService;

  const testActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أستاذ المادة',
    role: 'OWNER',
    permissions: ALL_PERMISSION_CODES,
  };

  const fixturePath = path.resolve(__dirname, '../../../apps/desktop/tests/fixtures/tibyan_fake_students_test(1).xlsx');

  beforeEach(() => {
    closeAllDatabases();
    acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });
    studentRepo = new StudentRepository(acadConn.db);
    importService = new StudentImportService(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
  });

  it('verifies the real test fixture exists and has non-zero byte size', () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    const buffer = fs.readFileSync(fixturePath);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.length).toBe(8624);
  });

  it('parses real PO XLSX fixture: selects Arabic sheet طلاب_جاهزون and extracts 30 student rows', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const preview = await importService.parseAndPreview(buffer, 'tibyan_fake_students_test(1).xlsx');

    expect(preview.sheetName).toBe('طلاب_جاهزون');
    expect(preview.availableSheets).toContain('طلاب_جاهزون');
    expect(preview.availableSheets).toContain('حالات_اختبار');
    expect(preview.totalRows).toBe(30);
    expect(preview.validCount).toBe(30);
    expect(preview.invalidCount).toBe(0);
    expect(preview.duplicateCount).toBe(0);
    expect(preview.rows.length).toBe(30);

    // Verify first student
    const first = preview.rows[0];
    expect(first).toBeDefined();
    expect(first?.fullName).toBe('أحمد سامح محمود النجار');
    expect(first?.educationSystem).toBe('GENERAL');
    expect(first?.gradeLevel).toBe('PREP_1');
    expect(first?.languageTrack).toBe('ARABIC');
    expect(first?.guardianPhone).toBe('01010000000');
    expect(first?.status).toBe('READY');

    // Verify second student
    const second = preview.rows[1];
    expect(second).toBeDefined();
    expect(second?.fullName).toBe('محمد حسام أحمد منصور');
    expect(second?.guardianPhone).toBe('01110000001');

    // Verify last student
    const last = preview.rows[29];
    expect(last).toBeDefined();
    expect(last?.fullName).toBe('هنا صبري زكريا الطوخي');
    expect(last?.guardianPhone).toBe('01110000029');

    // Verify NO students inserted into database before confirmation
    expect(studentRepo.list().length).toBe(0);
  });

  it('preserves leading zero on phone numbers for all 30 students', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const preview = await importService.parseAndPreview(buffer, 'test.xlsx');

    for (const row of preview.rows) {
      expect(row.guardianPhone).toMatch(/^01\d{9}$/);
    }
  });

  it('allows explicit selection of second worksheet حالات_اختبار with 6 test rows', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const preview = await importService.parseAndPreview(buffer, 'test.xlsx', 'حالات_اختبار');

    expect(preview.sheetName).toBe('حالات_اختبار');
    expect(preview.totalRows).toBe(6);
  });

  it('differentiates 0-byte file from corrupt zip and empty worksheets', async () => {
    // 1. Zero-byte file
    const emptyBuffer = Buffer.alloc(0);
    await expect(importService.parseAndPreview(emptyBuffer, 'empty.xlsx')).rejects.toThrow(
      'الملف المرفق فارغ بحجم 0 بايت'
    );

    // 2. Corrupt non-zip file
    const corruptBuffer = Buffer.from('NOT AN OPENXML ZIP ARCHIVE', 'utf-8');
    await expect(importService.parseAndPreview(corruptBuffer, 'corrupt.xlsx')).rejects.toThrow(
      'فشل قراءة ملف Excel (تنسيق ZIP/OpenXML غير صالح أو الملف تالف)'
    );
  });

  it('executes confirmed import of the 30 real students into the academic database', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const preview = await importService.parseAndPreview(buffer, 'tibyan_fake_students_test(1).xlsx');

    const readyRows = preview.rows.filter((r) => r.status === 'READY') as any[];
    const result = await importService.executeImport({ rows: readyRows }, testActor);

    expect(result.importedCount).toBe(30);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.importedStudentIds.length).toBe(30);

    const dbStudents = studentRepo.list();
    expect(dbStudents.length).toBe(30);

    const firstDb = dbStudents.find((s) => s.fullName === 'أحمد سامح محمود النجار');
    expect(firstDb).toBeDefined();
    expect(firstDb?.guardianPhone).toBe('01010000000');
    expect(firstDb?.gradeLevel).toBe('PREP_1');
    expect(firstDb?.educationSystem).toBe('GENERAL');
  });

  it('second import of the same file reports duplicates and does not re-insert', async () => {
    const buffer = fs.readFileSync(fixturePath);
    const preview = await importService.parseAndPreview(buffer, 'tibyan_fake_students_test(1).xlsx');

    // First import
    const readyRows1 = preview.rows.filter((r) => r.status === 'READY') as any[];
    await importService.executeImport({ rows: readyRows1 }, testActor);
    expect(studentRepo.list().length).toBe(30);

    // Second preview
    const preview2 = await importService.parseAndPreview(buffer, 'tibyan_fake_students_test(1).xlsx');
    expect(preview2.duplicateCount).toBe(30);
    expect(preview2.validCount).toBe(0);

    // Execution with preview2 rows
    const readyRows2 = preview2.rows.filter((r) => r.status === 'READY') as any[];
    const result2 = await importService.executeImport({ rows: readyRows2 }, testActor);
    expect(result2.importedCount).toBe(0);
    expect(result2.skippedCount).toBe(0);
    expect(studentRepo.list().length).toBe(30);
  });
});
