import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import type { UserSessionDto } from '@tibyan/contracts';
import {
  openSystemDatabase,
  closeSystemDatabase,
  openAcademicDatabase,
  closeAcademicDatabase,
  closeAllDatabases,
  type SystemDatabaseConnection,
  type AcademicDatabaseConnection,
  AcademicYearRepository,
  BackupRecordRepository,
  SystemAuditRepository,
  type AcademicYearRow,
} from '@tibyan/db';
import {
  AuthService,
  AuthError,
  seedPermissions,
  StudentService,
  PhotoService,
  GroupService,
  EnrollmentService,
  SessionService,
  DashboardService,
  BackupService,
  type AuthenticatedUser,
} from '@tibyan/core';

export interface RuntimePaths {
  appDataDir: string;
  systemDbDir: string;
  systemDbPath: string;
  academicYearsDbDir: string;
  mediaRootDir: string;
  backupRootDir: string;
}

export interface RuntimeOptions {
  customAppDataDir?: string;
  inMemory?: boolean;
}

/**
 * Resolves canonical application data paths adhering to the Tibyan storage specification.
 */
export function resolveRuntimePaths(customAppDataDir?: string, inMemory: boolean = false): RuntimePaths {
  const baseDir = customAppDataDir ?? process.env.TIBYAN_APP_DATA_DIR ?? (app?.getPath ? app.getPath('userData') : path.resolve('./app-data'));
  const appDataDir = path.resolve(baseDir);
  const systemDbDir = path.join(appDataDir, 'data', 'system');
  const systemDbPath = inMemory ? ':memory:' : path.join(systemDbDir, 'tibyan-system.sqlite');
  const academicYearsDbDir = path.join(appDataDir, 'data', 'academic-years');
  const mediaRootDir = path.join(appDataDir, 'media');
  const backupRootDir = path.join(appDataDir, 'backups');

  return {
    appDataDir,
    systemDbDir,
    systemDbPath,
    academicYearsDbDir,
    mediaRootDir,
    backupRootDir,
  };
}

/**
 * Central composition root and runtime lifecycle coordinator for the Electron MAIN process.
 * Owns database connections, migrations, filesystem paths, service instances,
 * and authoritative authenticated desktop session state.
 */
export class Runtime {
  public readonly paths: RuntimePaths;
  public readonly inMemory: boolean;

  // Authoritative MAIN session
  private _currentSession: UserSessionDto | null = null;

  // System-level persistence & services
  public systemDb!: SystemDatabaseConnection;
  public academicYearRepo!: AcademicYearRepository;
  public backupRecordRepo!: BackupRecordRepository;
  public systemAuditRepo!: SystemAuditRepository;
  public authService!: AuthService;
  public backupService!: BackupService;

  // Academic-year scoped persistence & services
  public activeAcademicYear: AcademicYearRow | null = null;
  public academicDb: AcademicDatabaseConnection | null = null;
  public studentService: StudentService | null = null;
  public groupService: GroupService | null = null;
  public enrollmentService: EnrollmentService | null = null;
  public sessionService: SessionService | null = null;
  public dashboardService: DashboardService | null = null;

  constructor(options: RuntimeOptions = {}) {
    this.inMemory = options.inMemory ?? false;
    this.paths = resolveRuntimePaths(options.customAppDataDir, this.inMemory);
  }

  /**
   * Initializes application storage, system database, and discovers active academic year.
   */
  public initialize(): void {
    if (!this.inMemory) {
      fs.mkdirSync(this.paths.systemDbDir, { recursive: true });
      fs.mkdirSync(this.paths.academicYearsDbDir, { recursive: true });
      fs.mkdirSync(this.paths.mediaRootDir, { recursive: true });
      fs.mkdirSync(this.paths.backupRootDir, { recursive: true });
    }

    // 1. Open persistent system database and apply migrations
    this.systemDb = openSystemDatabase({
      filePath: this.paths.systemDbPath,
      autoMigrate: true,
    });

    seedPermissions(this.systemDb.db);
    this.academicYearRepo = new AcademicYearRepository(this.systemDb.db);
    this.backupRecordRepo = new BackupRecordRepository(this.systemDb.db);
    this.systemAuditRepo = new SystemAuditRepository(this.systemDb.db);
    this.authService = new AuthService(this.systemDb.db);

    this.backupService = new BackupService({
      appDataDir: this.paths.appDataDir,
      systemDbPath: this.paths.systemDbPath,
      academicYearsDbDir: this.paths.academicYearsDbDir,
      mediaRootDir: this.paths.mediaRootDir,
      backupRootDir: this.paths.backupRootDir,
      systemDb: this.systemDb.raw,
      systemDrizzle: this.systemDb.db,
      academicYearRepo: this.academicYearRepo,
      systemAuditRepo: this.systemAuditRepo,
    });

    // 2. Discover active academic year
    const activeYear = this.academicYearRepo.findActive();
    if (activeYear) {
      this.mountAcademicYear(activeYear);
    }
  }

  /**
   * Mounts the specified academic-year database and initializes its services.
   */
  public mountAcademicYear(year: AcademicYearRow): void {
    // Unmount previous if any
    if (this.academicDb) {
      this.unmountAcademicYear();
    }

    if (!year.dbFilename || typeof year.dbFilename !== 'string') {
      throw new Error('INVALID_ACADEMIC_YEAR_FILENAME: Missing dbFilename in academic year registry.');
    }

    // Security guard: Authoritatively use registered dbFilename, but reject traversal or root escaping
    const normalized = path.normalize(year.dbFilename);
    if (path.isAbsolute(normalized) || normalized.includes('..') || path.basename(normalized) !== normalized) {
      throw new Error(`SECURITY_ERROR: Invalid academic year dbFilename traversal detected: ${year.dbFilename}`);
    }

    const resolvedCanonicalDir = path.resolve(this.paths.academicYearsDbDir);
    const acadDbPath = this.inMemory
      ? ':memory:'
      : path.resolve(resolvedCanonicalDir, normalized);

    if (!this.inMemory && !acadDbPath.startsWith(resolvedCanonicalDir)) {
      throw new Error(`SECURITY_ERROR: Academic year database path escaped canonical root: ${acadDbPath}`);
    }

    this.academicDb = openAcademicDatabase(year.name, {
      filePath: acadDbPath,
      autoMigrate: true,
    });

    this.activeAcademicYear = year;

    const mediaDir = this.inMemory
      ? path.join(this.paths.mediaRootDir, year.name)
      : path.join(this.paths.mediaRootDir, year.name);

    if (!this.inMemory) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const photoService = new PhotoService(mediaDir);
    this.studentService = new StudentService(this.academicDb.db, photoService);
    this.groupService = new GroupService(this.academicDb.db);
    this.enrollmentService = new EnrollmentService(this.academicDb.db);
    this.sessionService = new SessionService(this.academicDb.db);
    this.dashboardService = new DashboardService(this.academicDb.db);
  }

  /**
   * Unmounts the current academic year database and teardowns scoped services.
   */
  public unmountAcademicYear(): void {
    this.studentService = null;
    this.groupService = null;
    this.enrollmentService = null;
    this.sessionService = null;
    this.dashboardService = null;

    closeAcademicDatabase();
    this.academicDb = null;
    this.activeAcademicYear = null;
  }

  /**
   * Returns authoritative session context for current user.
   */
  public get currentSession(): UserSessionDto | null {
    return this._currentSession;
  }

  /**
   * Sets the authoritative session context upon successful authentication.
   */
  public setSession(session: UserSessionDto): void {
    this._currentSession = session;
  }

  /**
   * Clears authoritative session on logout.
   */
  public clearSession(): void {
    this._currentSession = null;
  }

  /**
   * Retrieves authenticated actor context from authoritative MAIN session.
   * Throws AuthError if session is not active.
   */
  public requireAuthenticatedActor(): AuthenticatedUser {
    if (!this._currentSession) {
      throw new AuthError('PERMISSION_DENIED', 'Authentication required. No active session.');
    }
    return {
      userId: this._currentSession.userId,
      fullName: this._currentSession.fullName,
      role: this._currentSession.role,
      permissions: this._currentSession.permissions,
    };
  }

  /**
   * Requires an active academic year to be mounted. Throws error if not mounted.
   */
  public requireActiveAcademicYear(): void {
    if (!this.activeAcademicYear || !this.academicDb) {
      throw new Error('NO_ACTIVE_ACADEMIC_YEAR: No academic year is currently active.');
    }
  }

  /**
   * Cleanly closes all database connections and resets state.
   */
  public close(): void {
    this.clearSession();
    this.unmountAcademicYear();
    closeSystemDatabase();
    closeAllDatabases();
  }
}
