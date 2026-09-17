import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  BackupRecordDto,
  BackupStatusDto,
} from '@tibyan/contracts';
import {
  type DatabaseType,
  type SystemDrizzle,
  createRawDatabase,
  type AcademicYearRow,
  type NewBackupRecordRow,
  AcademicYearRepository,
  BackupRecordRepository,
  SystemAuditRepository,
  isSystemDatabaseOpen,
  getSystemDatabase,
  isAcademicDatabaseOpen,
  getAcademicDatabase,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { type DateProvider, DefaultDateProvider } from '../common/date-provider.js';
import type { AuthenticatedUser } from '../students/student.service.js';

export type BackupErrorCode =
  | 'BACKUP_ALREADY_RUNNING'
  | 'BACKUP_FAILED'
  | 'BACKUP_SOURCE_MISSING'
  | 'BACKUP_INTEGRITY_FAILED'
  | 'BACKUP_MEDIA_COPY_FAILED'
  | 'ACADEMIC_YEAR_NOT_FOUND'
  | 'INVALID_BACKUP_PATH'
  | 'PERMISSION_DENIED';

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode, message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export interface AcademicYearBackupEntry {
  id: string;
  name: string;
  dbFilename: string;
  databaseRelativePath: string;
  databaseSizeBytes: number;
  databaseChecksumSha256: string;
  mediaRelativePath: string | null;
  mediaFilesCount: number;
}

export interface BackupManifest {
  version: number;
  createdAt: string;
  backupType: 'WEEKLY' | 'MANUAL' | 'ARCHIVAL';
  systemDatabase: {
    relativePath: string;
    sizeBytes: number;
    checksumSha256: string;
  };
  academicYears: AcademicYearBackupEntry[];
  totalSizeBytes: number;
}

export interface BackupServiceConfig {
  appDataDir: string;
  systemDbPath?: string;
  academicYearsDbDir?: string;
  mediaRootDir?: string;
  backupRootDir?: string;
  weeklyRetentionCount?: number;
  weeklyIntervalDays?: number;
  dateProvider?: DateProvider;
  systemDb?: DatabaseType;
  systemDrizzle?: SystemDrizzle;
  academicYearRepo?: AcademicYearRepository;
  backupRecordRepo?: BackupRecordRepository;
  systemAuditRepo?: SystemAuditRepository;
  getAcademicYearDbPath?: (year: AcademicYearRow) => string;
  getAcademicYearMediaDir?: (year: AcademicYearRow) => string;
}

/**
 * Computes SHA-256 cryptographic hash of a file.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Verifies SQLite database file integrity via PRAGMA integrity_check.
 * Throws BackupError('BACKUP_INTEGRITY_FAILED') if not exactly 'ok'.
 */
export function verifySqliteIntegrity(sqliteFilePath: string): void {
  let db: DatabaseType | null = null;
  try {
    db = createRawDatabase(sqliteFilePath);
    const rows = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    if (!rows || rows.length === 0 || rows[0]?.integrity_check !== 'ok') {
      const detail = rows && rows[0] ? rows[0].integrity_check : 'Corrupted or unreadable database';
      throw new Error(detail);
    }
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError(
      'BACKUP_INTEGRITY_FAILED',
      `PRAGMA integrity_check failed for ${path.basename(sqliteFilePath)}: ${(err as Error).message}`
    );
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // ignore close error
      }
    }
  }
}

export class BackupService {
  private readonly appDataDir: string;
  private readonly systemDbPath: string;
  private readonly academicYearsDbDir: string;
  private readonly mediaRootDir: string;
  private readonly backupRootDir: string;
  private readonly weeklyRetentionCount: number;
  private readonly weeklyIntervalDays: number;
  private readonly dateProvider: DateProvider;
  private readonly systemDb?: DatabaseType;
  private readonly systemDrizzle?: SystemDrizzle;
  private readonly academicYearRepo: AcademicYearRepository;
  private readonly backupRecordRepo: BackupRecordRepository;
  private readonly systemAuditRepo?: SystemAuditRepository;
  private readonly getAcademicYearDbPath: (year: AcademicYearRow) => string;
  private readonly getAcademicYearMediaDir: (year: AcademicYearRow) => string;

  private isRunning: boolean = false;

  constructor(config: BackupServiceConfig) {
    this.appDataDir = path.resolve(config.appDataDir);
    this.systemDbPath = path.resolve(
      config.systemDbPath ?? path.join(this.appDataDir, 'data', 'system', 'tibyan-system.sqlite')
    );
    this.academicYearsDbDir = path.resolve(
      config.academicYearsDbDir ?? path.join(this.appDataDir, 'data', 'academic-years')
    );
    this.mediaRootDir = path.resolve(
      config.mediaRootDir ?? path.join(this.appDataDir, 'media')
    );
    this.backupRootDir = path.resolve(
      config.backupRootDir ?? path.join(this.appDataDir, 'backups')
    );
    this.weeklyRetentionCount = config.weeklyRetentionCount ?? 4;
    this.weeklyIntervalDays = config.weeklyIntervalDays ?? 7;
    this.dateProvider = config.dateProvider ?? new DefaultDateProvider();
    this.systemDb = config.systemDb;
    this.systemDrizzle = config.systemDrizzle;
    this.academicYearRepo = config.academicYearRepo ?? new AcademicYearRepository();
    this.backupRecordRepo = config.backupRecordRepo ?? new BackupRecordRepository();
    this.systemAuditRepo = config.systemAuditRepo ?? new SystemAuditRepository();

    this.getAcademicYearDbPath =
      config.getAcademicYearDbPath ??
      ((year: AcademicYearRow) => path.join(this.academicYearsDbDir, year.dbFilename));

    this.getAcademicYearMediaDir =
      config.getAcademicYearMediaDir ??
      ((year: AcademicYearRow) => path.join(this.mediaRootDir, year.name));

    // Ensure root backup directories exist
    fs.mkdirSync(path.join(this.backupRootDir, 'weekly'), { recursive: true });
    fs.mkdirSync(path.join(this.backupRootDir, 'archive'), { recursive: true });
    fs.mkdirSync(path.join(this.backupRootDir, 'staging'), { recursive: true });
  }

  /**
   * Returns current status of local backups.
   */
  getBackupStatus(): BackupStatusDto {
    const records = this.backupRecordRepo.listRecent(10);
    const latest = records[0] ?? null;
    return {
      lastBackupAt: latest ? latest.backupDate : null,
      lastBackupStatus: latest ? latest.status : null,
      totalBackupsCount: records.length,
      latestBackupSizeBytes: latest ? latest.sizeBytes : null,
      isBackupRunning: this.isRunning,
    };
  }

  /**
   * Determines if a weekly backup is due based on the configured weekly interval (7 days).
   * - Only confirmed SUCCESS weekly or manual backups satisfy the interval.
   * - FAILED records NEVER suppress a due weekly backup.
   * - ARCHIVAL records NEVER suppress a due weekly backup.
   * - A successful manual backup resets the 7-day interval because it creates an identical full multi-year generation.
   */
  isWeeklyBackupDue(): boolean {
    const records = this.backupRecordRepo.listRecent(50);
    const archiveRoot = path.resolve(path.join(this.backupRootDir, 'archive'));

    const lastSuccessWeekly = records.find((r) => {
      if (r.status !== 'SUCCESS') return false;
      const resolvedPath = path.resolve(r.backupPath);
      // Exclude archival backups
      if (
        resolvedPath.startsWith(archiveRoot) ||
        r.backupPath.includes('/archive/') ||
        r.backupPath.includes('\\archive\\')
      ) {
        return false;
      }
      return fs.existsSync(r.backupPath);
    });

    if (!lastSuccessWeekly) {
      return true;
    }

    const lastBackupTime = new Date(lastSuccessWeekly.backupDate || lastSuccessWeekly.createdAt).getTime();
    const nowTime = this.dateProvider.nowDate ? this.dateProvider.nowDate().getTime() : Date.now();

    const intervalMs = this.weeklyIntervalDays * 24 * 60 * 60 * 1000;
    return nowTime - lastBackupTime >= intervalMs;
  }

  /**
   * Executes a scheduled or automated weekly backup.
   * If initiated by a USER actor, requires BACKUP_MANAGE permission.
   * Automatic SYSTEM weekly backups (actor undefined/null) require no human permission.
   */
  async createWeeklyBackup(actor?: AuthenticatedUser): Promise<BackupRecordDto> {
    if (actor) {
      requirePermission(actor.role, actor.permissions ?? [], 'BACKUP_MANAGE');
    }
    return this.executeBackupGeneration({ backupType: 'WEEKLY', actor });
  }

  /**
   * Executes an explicit manual backup using the identical verified multi-year engine.
   * Requires BACKUP_MANAGE permission.
   */
  async createManualBackup(actor: AuthenticatedUser): Promise<BackupRecordDto> {
    requirePermission(actor.role, actor.permissions ?? [], 'BACKUP_MANAGE');
    return this.executeBackupGeneration({ backupType: 'MANUAL', actor });
  }

  /**
   * Creates a dedicated archival backup for a specific academic year before or during archiving.
   * If initiated by a USER, requires BACKUP_MANAGE permission.
   * Archival backups are placed in the separate 'archive' root and are never pruned by weekly retention.
   */
  async createAcademicYearArchiveBackup(
    academicYearId: string,
    actor?: AuthenticatedUser
  ): Promise<BackupRecordDto> {
    if (actor) {
      requirePermission(actor.role, actor.permissions ?? [], 'BACKUP_MANAGE');
    }

    if (this.isRunning) {
      throw new BackupError('BACKUP_ALREADY_RUNNING', 'A backup operation is already in progress');
    }

    this.isRunning = true;
    const backupId = crypto.randomUUID();
    const nowIso = this.dateProvider.nowIso ? this.dateProvider.nowIso() : new Date().toISOString();
    const stagingDir = path.join(this.backupRootDir, 'staging', `staging_${backupId}`);
    let publishedDir: string | null = null;

    try {
      // 1. Locate academic year
      const year =
        this.academicYearRepo.findById(academicYearId) ??
        this.academicYearRepo.findByName(academicYearId);

      if (!year) {
        throw new BackupError(
          'ACADEMIC_YEAR_NOT_FOUND',
          `Academic year not found for id/name: ${academicYearId}`
        );
      }

      this.validateSafeName(year.name);

      fs.mkdirSync(stagingDir, { recursive: true });
      const stagedSystemDir = path.join(stagingDir, 'system');
      const stagedAcadDir = path.join(stagingDir, 'academic-years');
      const stagedMediaDir = path.join(stagingDir, 'media', year.name);
      fs.mkdirSync(stagedSystemDir, { recursive: true });
      fs.mkdirSync(stagedAcadDir, { recursive: true });

      // 2. Backup system DB for system context
      const stagedSystemDbPath = path.join(stagedSystemDir, 'tibyan-system.sqlite');
      await this.backupSystemDatabase(stagedSystemDbPath);
      verifySqliteIntegrity(stagedSystemDbPath);
      const systemDbSize = fs.statSync(stagedSystemDbPath).size;
      const systemDbChecksum = await computeFileSha256(stagedSystemDbPath);

      // 3. Backup the academic year database
      const sourceDbPath = this.getAcademicYearDbPath(year);
      const stagedAcadDbPath = path.join(stagedAcadDir, year.dbFilename);
      await this.backupAcademicDatabase(year, sourceDbPath, stagedAcadDbPath);
      verifySqliteIntegrity(stagedAcadDbPath);
      const acadDbSize = fs.statSync(stagedAcadDbPath).size;
      const acadDbChecksum = await computeFileSha256(stagedAcadDbPath);

      // 4. Copy managed media for this year
      const sourceMediaDir = this.getAcademicYearMediaDir(year);
      const mediaFilesCount = await this.copyManagedMediaSafely(sourceMediaDir, stagedMediaDir);

      // 5. Build manifest
      const totalSizeBytes =
        systemDbSize +
        acadDbSize +
        (fs.existsSync(stagedMediaDir) ? this.computeDirSize(stagedMediaDir) : 0);

      const manifest: BackupManifest = {
        version: 1,
        createdAt: nowIso,
        backupType: 'ARCHIVAL',
        systemDatabase: {
          relativePath: 'system/tibyan-system.sqlite',
          sizeBytes: systemDbSize,
          checksumSha256: systemDbChecksum,
        },
        academicYears: [
          {
            id: year.id,
            name: year.name,
            dbFilename: year.dbFilename,
            databaseRelativePath: `academic-years/${year.dbFilename}`,
            databaseSizeBytes: acadDbSize,
            databaseChecksumSha256: acadDbChecksum,
            mediaRelativePath: mediaFilesCount > 0 ? `media/${year.name}` : null,
            mediaFilesCount,
          },
        ],
        totalSizeBytes,
      };

      fs.writeFileSync(
        path.join(stagingDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
      );

      // 6. Atomically publish to archive directory
      const timestampSafe = nowIso.replace(/[:.]/g, '-');
      const finalDirName = `archive_${year.name}_${timestampSafe}_${backupId.slice(0, 8)}`;
      const finalArchiveDir = path.join(this.backupRootDir, 'archive', finalDirName);

      if (fs.existsSync(finalArchiveDir)) {
        throw new BackupError(
          'BACKUP_FAILED',
          `Target archival backup directory already exists: ${finalArchiveDir}`
        );
      }

      fs.renameSync(stagingDir, finalArchiveDir);
      publishedDir = finalArchiveDir;

      // 7. Atomically commit SUCCESS backup record and system audit in one transaction
      const recordDto = this.commitSuccess(
        {
          id: backupId,
          backupPath: finalArchiveDir,
          backupDate: nowIso,
          status: 'SUCCESS',
          sizeBytes: totalSizeBytes,
          academicYearsIncludedJson: JSON.stringify([year.name]),
          createdAt: nowIso,
        },
        {
          action: 'ACADEMIC_YEAR_ARCHIVE_BACKUP_CREATED',
          entityId: backupId,
          metadata: {
            academicYearId: year.id,
            academicYearName: year.name,
            backupPath: finalArchiveDir,
            sizeBytes: totalSizeBytes,
          },
        },
        actor
      );

      return recordDto;
    } catch (err) {
      // Compensating cleanup of staging directory
      if (fs.existsSync(stagingDir)) {
        try {
          fs.rmSync(stagingDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup error
        }
      }

      // Compensating cleanup of published directory if metadata commit failed during this process
      if (publishedDir && fs.existsSync(publishedDir)) {
        try {
          fs.rmSync(publishedDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup error
        }
      }

      this.logAudit(
        'BACKUP_FAILED',
        backupId,
        { backupType: 'ARCHIVAL', academicYearId, error: (err as Error).message },
        actor
      );

      try {
        this.backupRecordRepo.create({
          id: backupId,
          backupPath: stagingDir,
          backupDate: nowIso,
          status: 'FAILED',
          sizeBytes: 0,
          academicYearsIncludedJson: JSON.stringify([academicYearId]),
          createdAt: nowIso,
        });
      } catch {
        // ignore DB write failure
      }

      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Applies rolling weekly retention policy:
   * - Authoritative success definition: Requires BOTH a published directory with manifest.json
   *   AND a matching SUCCESS record in system backup_records.
   * - Directories in weekly/ lacking a SUCCESS backup record are orphans; they are safely quarantined/removed
   *   and NEVER counted toward the 4 known-good generations.
   * - Retains exactly the newest 4 confirmed successful generations.
   * - Archival backups are placed in 'archive/' and are strictly excluded from weekly retention.
   */
  applyWeeklyRetention(): string[] {
    const weeklyDir = path.join(this.backupRootDir, 'weekly');
    if (!fs.existsSync(weeklyDir)) return [];

    // 1. Fetch all SUCCESS records from backupRecordRepo
    const records = this.backupRecordRepo.listRecent(100);
    const successRecordMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      if (r.status === 'SUCCESS') {
        successRecordMap.set(path.resolve(r.backupPath), r);
      }
    }

    const entries = fs.readdirSync(weeklyDir, { withFileTypes: true });
    const confirmedGenerations: Array<{ fullPath: string; mtimeMs: number }> = [];
    const orphanDirectories: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.resolve(path.join(weeklyDir, entry.name));
        const manifestFile = path.join(fullPath, 'manifest.json');

        const matchingSuccess = successRecordMap.get(fullPath);

        if (fs.existsSync(manifestFile) && matchingSuccess) {
          const stat = fs.statSync(fullPath);
          confirmedGenerations.push({ fullPath, mtimeMs: stat.mtimeMs });
        } else {
          // Published directory without matching SUCCESS record in DB (orphan)
          orphanDirectories.push(fullPath);
        }
      }
    }

    const deletedPaths: string[] = [];

    // Safely remove orphan directories so they never count as known-good generations
    for (const orphan of orphanDirectories) {
      try {
        fs.rmSync(orphan, { recursive: true, force: true });
        deletedPaths.push(orphan);
      } catch {
        // ignore cleanup error
      }
    }

    // 2. Retain exactly the newest 4 confirmed successful generations
    confirmedGenerations.sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (confirmedGenerations.length > this.weeklyRetentionCount) {
      const toDelete = confirmedGenerations.slice(this.weeklyRetentionCount);
      for (const gen of toDelete) {
        try {
          fs.rmSync(gen.fullPath, { recursive: true, force: true });
          deletedPaths.push(gen.fullPath);
        } catch {
          // ignore cleanup errors
        }
      }
    }
    return deletedPaths;
  }

  /**
   * Internal execution engine for weekly and manual generations.
   */
  private async executeBackupGeneration(options: {
    backupType: 'WEEKLY' | 'MANUAL';
    actor?: AuthenticatedUser;
  }): Promise<BackupRecordDto> {
    if (this.isRunning) {
      throw new BackupError('BACKUP_ALREADY_RUNNING', 'A backup operation is already in progress');
    }

    this.isRunning = true;
    const backupId = crypto.randomUUID();
    const nowIso = this.dateProvider.nowIso ? this.dateProvider.nowIso() : new Date().toISOString();
    const stagingDir = path.join(this.backupRootDir, 'staging', `staging_${backupId}`);
    let publishedDir: string | null = null;

    try {
      fs.mkdirSync(stagingDir, { recursive: true });
      const stagedSystemDir = path.join(stagingDir, 'system');
      const stagedAcadDir = path.join(stagingDir, 'academic-years');
      const stagedMediaBaseDir = path.join(stagingDir, 'media');
      fs.mkdirSync(stagedSystemDir, { recursive: true });
      fs.mkdirSync(stagedAcadDir, { recursive: true });
      fs.mkdirSync(stagedMediaBaseDir, { recursive: true });

      // 1. Back up system database
      const stagedSystemDbPath = path.join(stagedSystemDir, 'tibyan-system.sqlite');
      await this.backupSystemDatabase(stagedSystemDbPath);
      verifySqliteIntegrity(stagedSystemDbPath);
      const systemDbSize = fs.statSync(stagedSystemDbPath).size;
      const systemDbChecksum = await computeFileSha256(stagedSystemDbPath);

      // 2. Enumerate ALL registered academic years (ACTIVE, INACTIVE, and ARCHIVED)
      const allYears = this.academicYearRepo.listAll();
      const academicYearEntries: AcademicYearBackupEntry[] = [];
      const includedYearNames: string[] = [];

      for (const year of allYears) {
        this.validateSafeName(year.name);
        includedYearNames.push(year.name);

        const sourceDbPath = this.getAcademicYearDbPath(year);
        const stagedAcadDbPath = path.join(stagedAcadDir, year.dbFilename);

        // Backup academic database
        await this.backupAcademicDatabase(year, sourceDbPath, stagedAcadDbPath);
        verifySqliteIntegrity(stagedAcadDbPath);
        const dbSize = fs.statSync(stagedAcadDbPath).size;
        const dbChecksum = await computeFileSha256(stagedAcadDbPath);

        // Backup managed media
        const sourceMediaDir = this.getAcademicYearMediaDir(year);
        const stagedYearMediaDir = path.join(stagedMediaBaseDir, year.name);
        const mediaFilesCount = await this.copyManagedMediaSafely(sourceMediaDir, stagedYearMediaDir);

        academicYearEntries.push({
          id: year.id,
          name: year.name,
          dbFilename: year.dbFilename,
          databaseRelativePath: `academic-years/${year.dbFilename}`,
          databaseSizeBytes: dbSize,
          databaseChecksumSha256: dbChecksum,
          mediaRelativePath: mediaFilesCount > 0 ? `media/${year.name}` : null,
          mediaFilesCount,
        });
      }

      // 3. Compute total generation size and write manifest
      const totalSizeBytes = this.computeDirSize(stagingDir);

      const manifest: BackupManifest = {
        version: 1,
        createdAt: nowIso,
        backupType: options.backupType,
        systemDatabase: {
          relativePath: 'system/tibyan-system.sqlite',
          sizeBytes: systemDbSize,
          checksumSha256: systemDbChecksum,
        },
        academicYears: academicYearEntries,
        totalSizeBytes,
      };

      fs.writeFileSync(
        path.join(stagingDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
      );

      // 4. Atomically publish staged directory to weekly generations root
      const timestampSafe = nowIso.replace(/[:.]/g, '-');
      const finalDirName = `generation_${timestampSafe}_${backupId.slice(0, 8)}`;
      const finalWeeklyDir = path.join(this.backupRootDir, 'weekly', finalDirName);

      if (fs.existsSync(finalWeeklyDir)) {
        throw new BackupError(
          'BACKUP_FAILED',
          `Target weekly backup directory already exists: ${finalWeeklyDir}`
        );
      }

      fs.renameSync(stagingDir, finalWeeklyDir);
      publishedDir = finalWeeklyDir;

      // 5. Write SUCCESS backup record and system audit in one SQLite transaction
      const recordDto = this.commitSuccess(
        {
          id: backupId,
          backupPath: finalWeeklyDir,
          backupDate: nowIso,
          status: 'SUCCESS',
          sizeBytes: totalSizeBytes,
          academicYearsIncludedJson: JSON.stringify(includedYearNames),
          createdAt: nowIso,
        },
        {
          action: 'BACKUP_COMPLETED',
          entityId: backupId,
          metadata: {
            backupType: options.backupType,
            backupPath: finalWeeklyDir,
            sizeBytes: totalSizeBytes,
            academicYearsCount: academicYearEntries.length,
          },
        },
        options.actor
      );

      // 6. Apply rolling weekly retention only after success is confirmed
      this.applyWeeklyRetention();

      return recordDto;
    } catch (err) {
      // Failure atomicity: remove incomplete staging directory immediately
      if (fs.existsSync(stagingDir)) {
        try {
          fs.rmSync(stagingDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup error
        }
      }

      // Compensating cleanup of published directory if metadata commit failed during this process
      if (publishedDir && fs.existsSync(publishedDir)) {
        try {
          fs.rmSync(publishedDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup error
        }
      }

      this.logAudit(
        'BACKUP_FAILED',
        backupId,
        { backupType: options.backupType, error: (err as Error).message },
        options.actor
      );

      try {
        this.backupRecordRepo.create({
          id: backupId,
          backupPath: stagingDir,
          backupDate: nowIso,
          status: 'FAILED',
          sizeBytes: 0,
          academicYearsIncludedJson: JSON.stringify([]),
          createdAt: nowIso,
        });
      } catch {
        // ignore DB write failure
      }

      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Commits the SUCCESS backup_record and system_audit_log entry in ONE system SQLite transaction.
   */
  private commitSuccess(
    record: NewBackupRecordRow,
    auditData: {
      action: string;
      entityId: string;
      metadata?: Record<string, any>;
    },
    actor?: AuthenticatedUser
  ): BackupRecordDto {
    const nowIso = this.dateProvider.nowIso ? this.dateProvider.nowIso() : new Date().toISOString();
    const actorType = actor ? 'USER' : 'SYSTEM';
    const actorUserId = actor ? actor.userId : null;
    const actorNameSnapshot = actor ? actor.fullName : 'Automated Backup Engine';

    const executeInTx = (drizzleClient: SystemDrizzle) => {
      const recordRepo = new BackupRecordRepository(drizzleClient);
      const auditRepo = new SystemAuditRepository(drizzleClient);

      const created = recordRepo.create(record);
      auditRepo.insert({
        id: crypto.randomUUID(),
        actorType,
        actorUserId,
        actorNameSnapshot,
        action: auditData.action,
        entityType: 'BACKUP',
        entityId: auditData.entityId,
        beforeJson: null,
        afterJson: null,
        metadataJson: auditData.metadata ? JSON.stringify(auditData.metadata) : null,
        createdAt: nowIso,
      });
      return created;
    };

    let resultRecord: any;
    if (this.systemDrizzle) {
      resultRecord = this.systemDrizzle.transaction((tx) => executeInTx(tx));
    } else if (isSystemDatabaseOpen()) {
      resultRecord = getSystemDatabase().db.transaction((tx) => executeInTx(tx));
    } else if (this.systemDb && this.systemDb.open) {
      const tx = this.systemDb.transaction(() => {
        resultRecord = this.backupRecordRepo.create(record);
        if (this.systemAuditRepo) {
          this.systemAuditRepo.insert({
            id: crypto.randomUUID(),
            actorType,
            actorUserId,
            actorNameSnapshot,
            action: auditData.action,
            entityType: 'BACKUP',
            entityId: auditData.entityId,
            beforeJson: null,
            afterJson: null,
            metadataJson: auditData.metadata ? JSON.stringify(auditData.metadata) : null,
            createdAt: nowIso,
          });
        }
      });
      tx();
    } else {
      resultRecord = this.backupRecordRepo.create(record);
      if (this.systemAuditRepo) {
        this.systemAuditRepo.insert({
          id: crypto.randomUUID(),
          actorType,
          actorUserId,
          actorNameSnapshot,
          action: auditData.action,
          entityType: 'BACKUP',
          entityId: auditData.entityId,
          beforeJson: null,
          afterJson: null,
          metadataJson: auditData.metadata ? JSON.stringify(auditData.metadata) : null,
          createdAt: nowIso,
        });
      }
    }

    return {
      id: resultRecord.id,
      backupPath: resultRecord.backupPath,
      backupDate: resultRecord.backupDate,
      status: resultRecord.status,
      sizeBytes: resultRecord.sizeBytes,
      academicYearsIncluded: JSON.parse(resultRecord.academicYearsIncludedJson),
      createdAt: resultRecord.createdAt,
    };
  }

  /**
   * Backs up system database via better-sqlite3 native backup API.
   */
  private async backupSystemDatabase(destPath: string): Promise<void> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    if (this.systemDb && this.systemDb.open) {
      await this.systemDb.backup(destPath);
      return;
    }

    if (isSystemDatabaseOpen()) {
      const activeSys = getSystemDatabase();
      if (activeSys.raw.open) {
        await activeSys.raw.backup(destPath);
        return;
      }
    }

    if (!fs.existsSync(this.systemDbPath)) {
      throw new BackupError(
        'BACKUP_SOURCE_MISSING',
        `System database source not found: ${this.systemDbPath}`
      );
    }

    const raw = createRawDatabase(this.systemDbPath);
    try {
      await raw.backup(destPath);
    } catch (err) {
      throw new BackupError(
        'BACKUP_FAILED',
        `System database SQLite backup failed: ${(err as Error).message}`
      );
    } finally {
      try {
        raw.close();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Backs up an academic database via better-sqlite3 native backup API.
   */
  private async backupAcademicDatabase(
    year: AcademicYearRow,
    sourceDbPath: string,
    destPath: string
  ): Promise<void> {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // Check if the academic year is currently active and open
    if (isAcademicDatabaseOpen()) {
      const activeAcad = getAcademicDatabase();
      if (activeAcad.academicYearName === year.name && activeAcad.raw.open) {
        await activeAcad.raw.backup(destPath);
        return;
      }
    }

    if (!fs.existsSync(sourceDbPath)) {
      throw new BackupError(
        'BACKUP_SOURCE_MISSING',
        `Academic database source not found for year '${year.name}': ${sourceDbPath}`
      );
    }

    const raw = createRawDatabase(sourceDbPath);
    try {
      await raw.backup(destPath);
    } catch (err) {
      throw new BackupError(
        'BACKUP_FAILED',
        `Academic database SQLite backup failed for year '${year.name}': ${(err as Error).message}`
      );
    } finally {
      try {
        raw.close();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Copies managed media for an academic year, strictly preventing symbolic link escapes.
   */
  private async copyManagedMediaSafely(sourceDir: string, destDir: string): Promise<number> {
    // Safety guard: Source media directory must not point inside backup roots or vice versa
    const resolvedSource = path.resolve(sourceDir);
    const resolvedBackupRoot = path.resolve(this.backupRootDir);
    if (resolvedSource.startsWith(resolvedBackupRoot) || resolvedBackupRoot.startsWith(resolvedSource)) {
      throw new BackupError(
        'INVALID_BACKUP_PATH',
        'Source media directory cannot reside inside the backup directory'
      );
    }

    if (!fs.existsSync(sourceDir)) {
      return 0; // Empty/nonexistent media folder is valid and does not fail
    }

    let fileCount = 0;

    const copyRecursive = async (src: string, dst: string): Promise<void> => {
      const entries = await fs.promises.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const dstPath = path.join(dst, entry.name);

        const lstat = await fs.promises.lstat(srcPath);

        // Reject or skip symlinks that escape the managed root
        if (lstat.isSymbolicLink()) {
          const realTarget = await fs.promises.realpath(srcPath);
          if (!realTarget.startsWith(resolvedSource)) {
            // Reparse point escapes managed root - skip safely
            continue;
          }
        }

        if (entry.isDirectory()) {
          await fs.promises.mkdir(dstPath, { recursive: true });
          await copyRecursive(srcPath, dstPath);
        } else if (entry.isFile()) {
          await fs.promises.mkdir(path.dirname(dstPath), { recursive: true });
          await fs.promises.copyFile(srcPath, dstPath);
          fileCount++;
        }
      }
    };

    try {
      await fs.promises.mkdir(destDir, { recursive: true });
      await copyRecursive(resolvedSource, destDir);
      return fileCount;
    } catch (err) {
      if (err instanceof BackupError) throw err;
      throw new BackupError(
        'BACKUP_MEDIA_COPY_FAILED',
        `Failed to copy managed media from ${sourceDir}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Validates that an academic year name does not contain path traversal characters.
   */
  private validateSafeName(name: string): void {
    if (!name || /[\/\\]|\.\./.test(name)) {
      throw new BackupError(
        'INVALID_BACKUP_PATH',
        `Invalid academic year name containing illegal path traversal characters: ${name}`
      );
    }
  }

  /**
   * Recursively computes the total size in bytes of a directory.
   */
  private computeDirSize(dirPath: string): number {
    let totalBytes = 0;
    const walk = (current: string) => {
      if (!fs.existsSync(current)) return;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(entryPath);
        } else if (entry.isFile()) {
          totalBytes += fs.statSync(entryPath).size;
        }
      }
    };
    walk(dirPath);
    return totalBytes;
  }

  /**
   * Logs system audit events without exposing sensitive metadata.
   */
  private logAudit(
    action: string,
    entityId: string,
    metadata?: Record<string, any>,
    actor?: AuthenticatedUser
  ): void {
    if (!this.systemAuditRepo) return;
    const now = this.dateProvider.nowIso ? this.dateProvider.nowIso() : new Date().toISOString();
    const actorType = actor ? 'USER' : 'SYSTEM';
    const actorUserId = actor ? actor.userId : null;
    const actorNameSnapshot = actor ? actor.fullName : 'Automated Backup Engine';

    try {
      this.systemAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType,
        actorUserId,
        actorNameSnapshot,
        action,
        entityType: 'BACKUP',
        entityId,
        beforeJson: null,
        afterJson: null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
        createdAt: now,
      });
    } catch {
      // Audit persistence failure should not crash backup engine
    }
  }
}
