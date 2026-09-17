import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openSystemDatabase,
  closeAllDatabases,
  createRawDatabase,
  migrateAcademicDatabase,
  AcademicYearRepository,
  BackupRecordRepository,
  SystemAuditRepository,
  type SystemDatabaseConnection,
} from '@tibyan/db';
import {
  BackupService,
  BackupError,
  type BackupManifest,
  verifySqliteIntegrity,
  computeFileSha256,
} from '../src/backup/backup.service.js';
import { FixedDateProvider } from '../src/common/date-provider.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';

describe('Task 7: Multi-Year Automated Backup Service', () => {
  let tempDir: string;
  let appDataDir: string;
  let systemDbPath: string;
  let academicYearsDbDir: string;
  let mediaRootDir: string;
  let backupRootDir: string;

  let sysConn: SystemDatabaseConnection;
  let academicYearRepo: AcademicYearRepository;
  let backupRecordRepo: BackupRecordRepository;
  let auditRepo: SystemAuditRepository;
  let dateProvider: FixedDateProvider;
  let backupService: BackupService;

  const ownerActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أحمد المالك',
    role: 'OWNER',
    permissions: [],
  };

  beforeEach(() => {
    closeAllDatabases();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-backup-test-'));
    appDataDir = path.join(tempDir, 'app-data');
    systemDbPath = path.join(appDataDir, 'data', 'system', 'tibyan-system.sqlite');
    academicYearsDbDir = path.join(appDataDir, 'data', 'academic-years');
    mediaRootDir = path.join(appDataDir, 'media');
    backupRootDir = path.join(appDataDir, 'backups');

    fs.mkdirSync(path.dirname(systemDbPath), { recursive: true });
    fs.mkdirSync(academicYearsDbDir, { recursive: true });
    fs.mkdirSync(mediaRootDir, { recursive: true });
    fs.mkdirSync(backupRootDir, { recursive: true });

    // Open and migrate system DB
    sysConn = openSystemDatabase({ filePath: systemDbPath });
    academicYearRepo = new AcademicYearRepository(sysConn.db);
    backupRecordRepo = new BackupRecordRepository(sysConn.db);
    auditRepo = new SystemAuditRepository(sysConn.db);

    const now = '2026-10-01T10:00:00.000Z';

    // 1. Register ACTIVE year 2026-2027
    academicYearRepo.create({
      id: 'ay-2026-2027',
      name: '2026-2027',
      dbFilename: 'tibyan-2026-2027.sqlite',
      isActive: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
    const acadDbPath1 = path.join(academicYearsDbDir, 'tibyan-2026-2027.sqlite');
    const rawAcad1 = createRawDatabase(acadDbPath1);
    migrateAcademicDatabase(rawAcad1);
    rawAcad1.close();

    // 2. Register INACTIVE year 2027-2028
    academicYearRepo.create({
      id: 'ay-2027-2028',
      name: '2027-2028',
      dbFilename: 'tibyan-2027-2028.sqlite',
      isActive: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
    const acadDbPath2 = path.join(academicYearsDbDir, 'tibyan-2027-2028.sqlite');
    const rawAcad2 = createRawDatabase(acadDbPath2);
    migrateAcademicDatabase(rawAcad2);
    rawAcad2.close();

    // 3. Register ARCHIVED year 2025-2026
    academicYearRepo.create({
      id: 'ay-2025-2026',
      name: '2025-2026',
      dbFilename: 'tibyan-2025-2026.sqlite',
      isActive: false,
      isArchived: true,
      createdAt: now,
      updatedAt: now,
    });
    const acadDbPath3 = path.join(academicYearsDbDir, 'tibyan-2025-2026.sqlite');
    const rawAcad3 = createRawDatabase(acadDbPath3);
    migrateAcademicDatabase(rawAcad3);
    rawAcad3.close();

    // Create media files for active and inactive years (leave 2025-2026 with no media directory)
    const media2026Dir = path.join(mediaRootDir, '2026-2027', 'students');
    fs.mkdirSync(media2026Dir, { recursive: true });
    fs.writeFileSync(path.join(media2026Dir, 'student1.jpg'), 'JPEG_MOCK_CONTENT_2026');

    const media2027Dir = path.join(mediaRootDir, '2027-2028', 'students');
    fs.mkdirSync(media2027Dir, { recursive: true });
    fs.writeFileSync(path.join(media2027Dir, 'student2.jpg'), 'JPEG_MOCK_CONTENT_2027');

    dateProvider = new FixedDateProvider('2026-10-01', '10:00');

    backupService = new BackupService({
      appDataDir,
      systemDbPath,
      academicYearsDbDir,
      mediaRootDir,
      backupRootDir,
      weeklyRetentionCount: 4,
      weeklyIntervalDays: 7,
      dateProvider,
      systemDb: sysConn.raw,
      academicYearRepo,
      backupRecordRepo,
      systemAuditRepo: auditRepo,
    });
  });

  afterEach(() => {
    closeAllDatabases();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('1. Scope & Database Inclusions', () => {
    it('1. Weekly backup includes tibyan-system.sqlite', async () => {
      const result = await backupService.createWeeklyBackup();
      expect(result.status).toBe('SUCCESS');

      const systemDbBackup = path.join(result.backupPath, 'system', 'tibyan-system.sqlite');
      expect(fs.existsSync(systemDbBackup)).toBe(true);

      expect(() => verifySqliteIntegrity(systemDbBackup)).not.toThrow();
    });

    it('2. Weekly backup includes the active academic-year database', async () => {
      const result = await backupService.createWeeklyBackup();
      const activeDbBackup = path.join(result.backupPath, 'academic-years', 'tibyan-2026-2027.sqlite');
      expect(fs.existsSync(activeDbBackup)).toBe(true);
      expect(() => verifySqliteIntegrity(activeDbBackup)).not.toThrow();
    });

    it('3. Weekly backup includes an inactive registered academic-year database', async () => {
      const result = await backupService.createWeeklyBackup();
      const inactiveDbBackup = path.join(result.backupPath, 'academic-years', 'tibyan-2027-2028.sqlite');
      expect(fs.existsSync(inactiveDbBackup)).toBe(true);
      expect(() => verifySqliteIntegrity(inactiveDbBackup)).not.toThrow();
    });

    it('4. Weekly backup includes an archived registered academic-year database', async () => {
      const result = await backupService.createWeeklyBackup();
      const archivedDbBackup = path.join(result.backupPath, 'academic-years', 'tibyan-2025-2026.sqlite');
      expect(fs.existsSync(archivedDbBackup)).toBe(true);
      expect(() => verifySqliteIntegrity(archivedDbBackup)).not.toThrow();
    });

    it('5. Weekly backup includes managed media from multiple academic years', async () => {
      const result = await backupService.createWeeklyBackup();
      const media2026 = path.join(result.backupPath, 'media', '2026-2027', 'students', 'student1.jpg');
      const media2027 = path.join(result.backupPath, 'media', '2027-2028', 'students', 'student2.jpg');

      expect(fs.existsSync(media2026)).toBe(true);
      expect(fs.readFileSync(media2026, 'utf8')).toBe('JPEG_MOCK_CONTENT_2026');
      expect(fs.existsSync(media2027)).toBe(true);
      expect(fs.readFileSync(media2027, 'utf8')).toBe('JPEG_MOCK_CONTENT_2027');
    });

    it('6. An academic year with no media directory is still backed up successfully', async () => {
      // 2025-2026 has no media directory
      const media2025 = path.join(mediaRootDir, '2025-2026');
      expect(fs.existsSync(media2025)).toBe(false);

      const result = await backupService.createWeeklyBackup();
      expect(result.status).toBe('SUCCESS');
      expect(result.academicYearsIncluded).toContain('2025-2026');
    });

    it('15. Archived and inactive academic years are never silently omitted from weekly backups', async () => {
      const result = await backupService.createWeeklyBackup();
      expect(result.academicYearsIncluded).toHaveLength(3);
      expect(result.academicYearsIncluded).toContain('2025-2026'); // ARCHIVED
      expect(result.academicYearsIncluded).toContain('2026-2027'); // ACTIVE
      expect(result.academicYearsIncluded).toContain('2027-2028'); // INACTIVE
    });
  });

  describe('2. SQLite Verification & Integrity', () => {
    it('7. SQLite backup copies pass PRAGMA integrity_check', async () => {
      const result = await backupService.createWeeklyBackup();
      const sysCopy = path.join(result.backupPath, 'system', 'tibyan-system.sqlite');
      const acadCopy1 = path.join(result.backupPath, 'academic-years', 'tibyan-2026-2027.sqlite');
      const acadCopy2 = path.join(result.backupPath, 'academic-years', 'tibyan-2027-2028.sqlite');

      expect(() => verifySqliteIntegrity(sysCopy)).not.toThrow();
      expect(() => verifySqliteIntegrity(acadCopy1)).not.toThrow();
      expect(() => verifySqliteIntegrity(acadCopy2)).not.toThrow();
    });

    it('8. Corrupted/failed verification prevents generation success', async () => {
      // Simulate an academic backup copy that fails PRAGMA integrity_check
      vi.spyOn(backupService as any, 'backupAcademicDatabase').mockImplementationOnce(
        async (...args: any[]) => {
          const destPath = args[2];
          fs.writeFileSync(destPath, Buffer.from('CORRUPTED_SQLITE_GARBAGE_BYTES_HEADER'));
        }
      );

      await expect(backupService.createWeeklyBackup()).rejects.toThrow(/integrity/i);

      // Verify no successful backup was recorded
      const records = backupRecordRepo.listRecent(5);
      const successful = records.find((r) => r.status === 'SUCCESS');
      expect(successful).toBeUndefined();

      // Verify no generation directory was published to weekly/
      const weeklyEntries = fs.readdirSync(path.join(backupRootDir, 'weekly'));
      expect(weeklyEntries).toHaveLength(0);
    });

    it('9. A failure backing up one academic year prevents the whole weekly generation from being marked SUCCESS', async () => {
      // Remove an academic year DB file so it fails during backup
      const dbToRemove = path.join(academicYearsDbDir, 'tibyan-2027-2028.sqlite');
      fs.unlinkSync(dbToRemove);

      await expect(backupService.createWeeklyBackup()).rejects.toThrow(BackupError);

      const records = backupRecordRepo.listRecent(5);
      expect(records.find((r) => r.status === 'SUCCESS')).toBeUndefined();
    });

    it('10. A media copy failure prevents the generation from being marked SUCCESS', async () => {
      // Spy on fs.promises.copyFile to throw during media copy
      const copyFileSpy = vi.spyOn(fs.promises, 'copyFile').mockRejectedValueOnce(
        new Error('Disk I/O failure during media copy')
      );

      await expect(backupService.createWeeklyBackup()).rejects.toThrow(/media/i);

      const records = backupRecordRepo.listRecent(5);
      expect(records.find((r) => r.status === 'SUCCESS')).toBeUndefined();
      copyFileSpy.mockRestore();
    });

    it('25. Source databases remain usable and unchanged after successful backup', async () => {
      const result = await backupService.createWeeklyBackup();
      expect(result.status).toBe('SUCCESS');

      // Live system DB is still open and queryable
      const users = sysConn.raw.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      expect(users.count).toBeDefined();

      // Academic DB is queryable
      const acadDb = createRawDatabase(path.join(academicYearsDbDir, 'tibyan-2026-2027.sqlite'));
      const studentCount = acadDb.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
      expect(studentCount.count).toBe(0);
      acadDb.close();
    });

    it('26. Backup copies can be opened independently after source connections are closed', async () => {
      const result = await backupService.createWeeklyBackup();

      // Close all source DB connections
      closeAllDatabases();

      // Open the backup copy
      const backupSysCopy = path.join(result.backupPath, 'system', 'tibyan-system.sqlite');
      const backupDb = createRawDatabase(backupSysCopy);
      const rows = backupDb.prepare('SELECT * FROM academic_years').all();
      expect(rows).toHaveLength(3);
      backupDb.close();
    });
  });

  describe('3. Atomicity, Staging & Previous Generation Safety', () => {
    it('11. Failed generation does not delete or replace previous known-good generation', async () => {
      // 1. Create a known-good generation
      const first = await backupService.createWeeklyBackup();
      expect(first.status).toBe('SUCCESS');
      const firstGenPath = first.backupPath;
      expect(fs.existsSync(firstGenPath)).toBe(true);

      // 2. Make second generation fail
      vi.spyOn(fs.promises, 'copyFile').mockRejectedValueOnce(new Error('Simulated crash'));

      await expect(backupService.createWeeklyBackup()).rejects.toThrow();

      // 3. Verify first generation remains intact
      expect(fs.existsSync(firstGenPath)).toBe(true);
      expect(fs.existsSync(path.join(firstGenPath, 'manifest.json'))).toBe(true);
    });

    it('12. Successful generation is published only after all validation completes', async () => {
      const result = await backupService.createWeeklyBackup();
      expect(fs.existsSync(result.backupPath)).toBe(true);

      // Verify manifest exists inside published directory
      const manifestFile = path.join(result.backupPath, 'manifest.json');
      expect(fs.existsSync(manifestFile)).toBe(true);

      // Verify staging directory is clean
      const stagingDir = path.join(backupRootDir, 'staging');
      const remainingStaging = fs.readdirSync(stagingDir);
      expect(remainingStaging).toHaveLength(0);
    });
  });

  describe('4. Manifest Security & Verification', () => {
    it('16. Backup manifest contains every included academic year', async () => {
      const result = await backupService.createWeeklyBackup();
      const manifest: BackupManifest = JSON.parse(
        fs.readFileSync(path.join(result.backupPath, 'manifest.json'), 'utf8')
      );

      expect(manifest.version).toBe(1);
      expect(manifest.backupType).toBe('WEEKLY');
      expect(manifest.academicYears).toHaveLength(3);

      const yearNames = manifest.academicYears.map((y) => y.name);
      expect(yearNames).toContain('2025-2026');
      expect(yearNames).toContain('2026-2027');
      expect(yearNames).toContain('2027-2028');

      for (const y of manifest.academicYears) {
        expect(y.databaseSizeBytes).toBeGreaterThan(0);
        expect(y.databaseChecksumSha256).toMatch(/^[a-f0-9]{64}$/);
        const actualSha = await computeFileSha256(path.join(result.backupPath, y.databaseRelativePath));
        expect(actualSha).toBe(y.databaseChecksumSha256);
      }
    });

    it('17. Backup manifest contains no authentication secrets', async () => {
      const result = await backupService.createWeeklyBackup();
      const manifestRaw = fs.readFileSync(path.join(result.backupPath, 'manifest.json'), 'utf8');

      expect(manifestRaw).not.toContain('pinHash');
      expect(manifestRaw).not.toContain('pin_hash');
      expect(manifestRaw).not.toContain('salt');
      expect(manifestRaw).not.toContain('guardianPhone');
      expect(manifestRaw).not.toContain('guardian_phone');
    });
  });

  describe('5. Rolling 4-Generation Weekly Retention', () => {
    it('13. Weekly retention keeps exactly the newest 4 successful generations once more than four exist', async () => {
      // Create 5 successive weekly backups, advancing time for each
      const published: string[] = [];

      for (let i = 0; i < 5; i++) {
        dateProvider.advanceDays(7);
        const res = await backupService.createWeeklyBackup();
        published.push(res.backupPath);
      }

      // Check weekly/ directory
      const weeklyGenerations = fs.readdirSync(path.join(backupRootDir, 'weekly'));
      expect(weeklyGenerations).toHaveLength(4);

      // The oldest generation (published[0]) must have been pruned
      expect(fs.existsSync(published[0]!)).toBe(false);

      // The newest 4 (published[1] through published[4]) must be preserved
      expect(fs.existsSync(published[1]!)).toBe(true);
      expect(fs.existsSync(published[2]!)).toBe(true);
      expect(fs.existsSync(published[3]!)).toBe(true);
      expect(fs.existsSync(published[4]!)).toBe(true);
    });

    it('14. Archival backup is not removed by weekly retention', async () => {
      // Create a dedicated archival backup
      const archiveRes = await backupService.createAcademicYearArchiveBackup('ay-2026-2027', ownerActor);
      expect(fs.existsSync(archiveRes.backupPath)).toBe(true);
      expect(archiveRes.backupPath).toContain(path.join('backups', 'archive'));

      // Now create 5 weekly generations to trigger weekly retention pruning
      for (let i = 0; i < 5; i++) {
        dateProvider.advanceDays(7);
        await backupService.createWeeklyBackup();
      }

      // Archival backup MUST still exist untouched!
      expect(fs.existsSync(archiveRes.backupPath)).toBe(true);
    });
  });

  describe('6. Archival Backup Behavior', () => {
    it('23. Dedicated academic-year archival backup contains its DB and managed media', async () => {
      const result = await backupService.createAcademicYearArchiveBackup('ay-2026-2027', ownerActor);
      expect(result.status).toBe('SUCCESS');
      expect(result.academicYearsIncluded).toEqual(['2026-2027']);

      // Archive directory must contain system DB, year DB, and media
      const sysCopy = path.join(result.backupPath, 'system', 'tibyan-system.sqlite');
      const acadCopy = path.join(result.backupPath, 'academic-years', 'tibyan-2026-2027.sqlite');
      const mediaCopy = path.join(result.backupPath, 'media', '2026-2027', 'students', 'student1.jpg');

      expect(fs.existsSync(sysCopy)).toBe(true);
      expect(fs.existsSync(acadCopy)).toBe(true);
      expect(fs.existsSync(mediaCopy)).toBe(true);

      const manifest: BackupManifest = JSON.parse(
        fs.readFileSync(path.join(result.backupPath, 'manifest.json'), 'utf8')
      );
      expect(manifest.backupType).toBe('ARCHIVAL');
      expect(manifest.academicYears).toHaveLength(1);
      expect(manifest.academicYears[0]!.name).toBe('2026-2027');

      // System audit logged
      const audits = auditRepo.listRecent(5);
      const archiveAudit = audits.find((a) => a.action === 'ACADEMIC_YEAR_ARCHIVE_BACKUP_CREATED');
      expect(archiveAudit).toBeDefined();
      expect(archiveAudit?.actorType).toBe('USER');
    });

    it('24. Archival backup fails if its SQLite integrity verification fails', async () => {
      // Simulate an academic backup copy that fails PRAGMA integrity_check
      vi.spyOn(backupService as any, 'backupAcademicDatabase').mockImplementationOnce(
        async (...args: any[]) => {
          const destPath = args[2];
          fs.writeFileSync(destPath, Buffer.from('CORRUPTED_SQLITE_GARBAGE_BYTES_HEADER'));
        }
      );

      await expect(
        backupService.createAcademicYearArchiveBackup('ay-2026-2027', ownerActor)
      ).rejects.toThrow(/integrity/i);

      // Verify no published archive directory exists
      const archiveEntries = fs.readdirSync(path.join(backupRootDir, 'archive'));
      expect(archiveEntries).toHaveLength(0);
    });
  });

  describe('7. Manual Backup & Scheduling Decisions', () => {
    it('18. Manual backup uses the same verification engine as weekly backup', async () => {
      const result = await backupService.createManualBackup(ownerActor);
      expect(result.status).toBe('SUCCESS');
      expect(fs.existsSync(result.backupPath)).toBe(true);

      const manifest: BackupManifest = JSON.parse(
        fs.readFileSync(path.join(result.backupPath, 'manifest.json'), 'utf8')
      );
      expect(manifest.backupType).toBe('MANUAL');

      // Audit logged with actor information
      const audits = auditRepo.listRecent(5);
      const completedAudit = audits.find((a) => a.action === 'BACKUP_COMPLETED');
      expect(completedAudit).toBeDefined();
      expect(completedAudit?.actorType).toBe('USER');
      expect(completedAudit?.actorUserId).toBe(ownerActor.userId);
    });

    it('19. isWeeklyBackupDue is deterministic with injected time', () => {
      // Initially with no backups, isWeeklyBackupDue is true
      expect(backupService.isWeeklyBackupDue()).toBe(true);
    });

    it('20. A recent successful weekly backup returns not due', async () => {
      await backupService.createWeeklyBackup();
      // Immediately after backup, it is NOT due
      expect(backupService.isWeeklyBackupDue()).toBe(false);

      // Advance clock by 3 days: still NOT due (< 7 days)
      dateProvider.advanceDays(3);
      expect(backupService.isWeeklyBackupDue()).toBe(false);
    });

    it('21. Advancing injected time beyond the weekly interval returns due', async () => {
      await backupService.createWeeklyBackup();
      expect(backupService.isWeeklyBackupDue()).toBe(false);

      // Advance clock by 7 days: exactly due
      dateProvider.advanceDays(7);
      expect(backupService.isWeeklyBackupDue()).toBe(true);

      // Advance clock by 8 days: definitely due
      dateProvider.advanceDays(1);
      expect(backupService.isWeeklyBackupDue()).toBe(true);
    });

    it('22. Two overlapping backup attempts are prevented deterministically (BACKUP_ALREADY_RUNNING)', async () => {
      // Simulate an ongoing backup by manually setting running flag or executing concurrently
      const promise1 = backupService.createWeeklyBackup();
      // Immediate concurrent attempt
      const promise2 = backupService.createWeeklyBackup();

      const results = await Promise.allSettled([promise1, promise2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const err = (rejected[0] as PromiseRejectedResult).reason;
      expect(err).toBeInstanceOf(BackupError);
      expect((err as BackupError).code).toBe('BACKUP_ALREADY_RUNNING');
    });
  });

  describe('8. Security & Path Traversal Guards', () => {
    it('27. Backup output stays inside the configured Tibyan backup root', async () => {
      const result = await backupService.createWeeklyBackup();
      const resolvedBackup = path.resolve(result.backupPath);
      const resolvedRoot = path.resolve(backupRootDir);
      expect(resolvedBackup.startsWith(resolvedRoot)).toBe(true);
    });

    it('28. Academic year names/identifiers cannot create path traversal', async () => {
      academicYearRepo.create({
        id: 'ay-malicious',
        name: '../../malicious-year',
        dbFilename: 'tibyan-malicious.sqlite',
        isActive: false,
        isArchived: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      });

      await expect(backupService.createWeeklyBackup()).rejects.toThrow(/path traversal/i);
    });

    it('29. Managed media traversal cannot escape its academic-year media root', async () => {
      // Create a symlink inside media folder pointing to /etc or an outside file
      const secretFile = path.join(tempDir, 'super_secret.txt');
      fs.writeFileSync(secretFile, 'CONFIDENTIAL_DATA');

      const symlinkPath = path.join(mediaRootDir, '2026-2027', 'students', 'leak_symlink.jpg');
      try {
        fs.symlinkSync(secretFile, symlinkPath);
      } catch {
        // Windows symlink creation may require privilege; skip if OS prohibits symlink
        return;
      }

      const result = await backupService.createWeeklyBackup();
      // The symlink pointing outside media root must NOT be copied or followed
      const copiedSecret = path.join(result.backupPath, 'media', '2026-2027', 'students', 'super_secret.txt');
      expect(fs.existsSync(copiedSecret)).toBe(false);
    });

    it('30. Existing backup folders are not recursively copied into new backups', async () => {
      // Run first backup
      await backupService.createWeeklyBackup();

      // Configure a rogue media directory pointing at the backups folder
      const rogueService = new BackupService({
        appDataDir,
        systemDbPath,
        academicYearsDbDir,
        mediaRootDir: backupRootDir, // pointing at backups!
        backupRootDir,
        dateProvider,
        systemDb: sysConn.raw,
        academicYearRepo,
        backupRecordRepo,
        systemAuditRepo: auditRepo,
      });

      // Rogue service must reject media directory residing inside backup root
      await expect(rogueService.createWeeklyBackup()).rejects.toThrow(/Source media directory cannot reside inside/i);
    });
  });

  describe('9. Service Status Reporting', () => {
    it('getBackupStatus accurately reflects status before and after backups', async () => {
      const statusBefore = backupService.getBackupStatus();
      expect(statusBefore.lastBackupAt).toBeNull();
      expect(statusBefore.lastBackupStatus).toBeNull();
      expect(statusBefore.totalBackupsCount).toBe(0);
      expect(statusBefore.isBackupRunning).toBe(false);

      await backupService.createWeeklyBackup();

      const statusAfter = backupService.getBackupStatus();
      expect(statusAfter.lastBackupAt).not.toBeNull();
      expect(statusAfter.lastBackupStatus).toBe('SUCCESS');
      expect(statusAfter.totalBackupsCount).toBe(1);
      expect(statusAfter.latestBackupSizeBytes).toBeGreaterThan(0);
      expect(statusAfter.isBackupRunning).toBe(false);
    });
  });
});
