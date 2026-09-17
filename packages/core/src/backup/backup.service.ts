import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  BackupRecordDto,
  BackupStatusDto,
} from '@tibyan/contracts';
import {
  type DatabaseType,
  createRawDatabase,
  type AcademicYearRow,
  AcademicYearRepository,
  BackupRecordRepository,
  SystemAuditRepository,
  isSystemDatabaseOpen,
  getSystemDatabase,
  isAcademicDatabaseOpen,
  getAcademicDatabase,
} from '@tibyan/db';
import { type DateProvider, DefaultDateProvider } from '../common/date-provider.js';
import type { AuthenticatedUser } from '../students/student.service.js';

export type BackupErrorCode =
  | 'BACKUP_ALREADY_RUNNING'
  | 'BACKUP_FAILED'
  | 'BACKUP_SOURCE_MISSING'
  | 'BACKUP_INTEGRITY_FAILED'
  | 'BACKUP_MEDIA_COPY_FAILED'
  | 'ACADEMIC_YEAR_NOT_FOUND'
  | 'INVALID_BACKUP_PATH';

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
   * Returns true if no successful backup exists or if the last successful backup is >= 7 days ago.
   */
  isWeeklyBackupDue(): boolean {
    const records = this.backupRecordRepo.listRecent(20);
    const lastSuccess = records.find((r) => r.status === 'SUCCESS');
    if (!lastSuccess) {
      return true;
    }

    const lastBackupTime = new Date(lastSuccess.backupDate || lastSuccess.createdAt).getTime();
    const nowTime = this.dateProvider.nowDate ? this.dateProvider.nowDate().getTime() : Date.now();

    const intervalMs = this.weeklyIntervalDays * 24 * 60 * 60 * 1000;
    return nowTime - lastBackupTime >= intervalMs;
  }

  /**
   * Executes a scheduled weekly backup.
   */
  async createWeeklyBackup(actor?: AuthenticatedUser): Promise<BackupRecordDto> {
    return this.executeBackupGeneration({ backupType: 'WEEKLY', actor });
  }

  /**
   * Executes an explicit manual backup using the identical verified multi-year engine.
   */
  async createManualBackup(actor: AuthenticatedUser): Promise<BackupRecordDto> {
    return this.executeBackupGeneration({ backupType: 'MANUAL', actor });
  }

  /**
   * Creates a dedicated archival backup for a specific academic year before or during archiving.
   * Archival backups are placed in the separate 'archive' root and are never pruned by weekly retention.
   */
  async createAcademicYearArchiveBackup(
    academicYearId: string,
    actor?: AuthenticatedUser
  ): Promise<BackupRecordDto> {
    if (this.isRunning) {
      throw new BackupError('BACKUP_ALREADY_RUNNING', 'A backup operation is already in progress');
    }

    this.isRunning = true;
    const backupId = crypto.randomUUID();
    const nowIso = this.dateProvider.nowIso ? this.dateProvider.nowIso() : new Date().toISOString();
    const stagingDir = path.join(this.backupRootDir, 'staging', `staging_${backupId}`);

    // Audit START
    this.logAudit('BACKUP_STARTED', backupId, { backupType: 'ARCHIVAL', academicYearId }, actor);

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

      // 7. Persist record in system DB
      const record = this.backupRecordRepo.create({
        id: backupId,
        backupPath: finalArchiveDir,
        backupDate: nowIso,
        status: 'SUCCESS',
        sizeBytes: totalSizeBytes,
        academicYearsIncludedJson: JSON.stringify([year.name]),
        createdAt: nowIso,
      });

      this.logAudit(
        'ACADEMIC_YEAR_ARCHIVE_BACKUP_CREATED',
        backupId,
        { academicYearId: year.id, academicYearName: year.name, backupPath: finalArchiveDir },
        actor
      );

      return {
        id: record.id,
        backupPath: record.backupPath,
        backupDate: record.backupDate,
        status: record.status,
        sizeBytes: record.sizeBytes,
        academicYearsIncluded: [year.name],
        createdAt: record.createdAt,
      };
    } catch (err) {
      // Clean up staging directory on failure
      if (fs.existsSync(stagingDir)) {
        try {
          fs.rmSync(stagingDir, { recursive: true, force: true });
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
   * Applies rolling weekly retention policy: keeps exactly the newest 4 successful weekly generations.
   * Archival backups are excluded. Returns paths of deleted directories.
   */
  applyWeeklyRetention(): string[] {
    const weeklyDir = path.join(this.backupRootDir, 'weekly');
    if (!fs.existsSync(weeklyDir)) return [];

    const entries = fs.readdirSync(weeklyDir, { withFileTypes: true });
    const generations: Array<{ fullPath: string; mtimeMs: number }> = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(weeklyDir, entry.name);
        const manifestFile = path.join(fullPath, 'manifest.json');
        if (fs.existsSync(manifestFile)) {
          const stat = fs.statSync(fullPath);
          generations.push({ fullPath, mtimeMs: stat.mtimeMs });
        }
      }
    }

    // Sort newest first
    generations.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const deletedPaths: string[] = [];
    if (generations.length > this.weeklyRetentionCount) {
      const toDelete = generations.slice(this.weeklyRetentionCount);
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

    this.logAudit('BACKUP_STARTED', backupId, { backupType: options.backupType }, options.actor);

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

      // 5. Apply rolling weekly retention (new generation published, now safely prune older than 4)
      this.applyWeeklyRetention();

      // 6. Record SUCCESS in system DB
      const record = this.backupRecordRepo.create({
        id: backupId,
        backupPath: finalWeeklyDir,
        backupDate: nowIso,
        status: 'SUCCESS',
        sizeBytes: totalSizeBytes,
        academicYearsIncludedJson: JSON.stringify(includedYearNames),
        createdAt: nowIso,
      });

      this.logAudit(
        'BACKUP_COMPLETED',
        backupId,
        {
          backupType: options.backupType,
          backupPath: finalWeeklyDir,
          sizeBytes: totalSizeBytes,
          academicYearsCount: academicYearEntries.length,
        },
        options.actor
      );

      return {
        id: record.id,
        backupPath: record.backupPath,
        backupDate: record.backupDate,
        status: record.status,
        sizeBytes: record.sizeBytes,
        academicYearsIncluded: includedYearNames,
        createdAt: record.createdAt,
      };
    } catch (err) {
      // Failure atomicity: remove incomplete staging directory immediately
      if (fs.existsSync(stagingDir)) {
        try {
          fs.rmSync(stagingDir, { recursive: true, force: true });
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
