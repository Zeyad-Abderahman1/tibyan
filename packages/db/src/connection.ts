import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as systemSchema from './schema/system.schema.js';
import * as academicSchema from './schema/academic.schema.js';
import { migrateSystemDatabase, migrateAcademicDatabase } from './migrations/migrator.js';

export { Database, type DatabaseType };
export type SystemDrizzle = BetterSQLite3Database<typeof systemSchema>;
export type AcademicDrizzle = BetterSQLite3Database<typeof academicSchema>;

export interface DatabaseConnectionOptions {
  filePath?: string;
  autoMigrate?: boolean;
}

export interface AcademicDatabaseConnectionOptions extends DatabaseConnectionOptions {
  academicYearName: string;
}

export interface SystemDatabaseConnection {
  raw: DatabaseType;
  db: SystemDrizzle;
  filePath: string;
}

export interface AcademicDatabaseConnection {
  raw: DatabaseType;
  db: AcademicDrizzle;
  filePath: string;
  academicYearName: string;
}

let activeSystemConnection: SystemDatabaseConnection | null = null;
let activeAcademicConnection: AcademicDatabaseConnection | null = null;

/**
 * Configure standard SQLite PRAGMAs for durability, concurrency, and integrity.
 */
export function configurePragmas(rawDb: DatabaseType, isInMemory: boolean = false): void {
  // Foreign keys must always be enforced
  rawDb.pragma('foreign_keys = ON');
  
  // Timeout for concurrent locks
  rawDb.pragma('busy_timeout = 5000');

  // WAL mode and NORMAL synchronous are only valid and meaningful for on-disk file databases
  if (!isInMemory) {
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('synchronous = NORMAL');
  }
}

/**
 * Creates and configures a raw better-sqlite3 database instance with required pragmas.
 */
export function createRawDatabase(filePath: string): DatabaseType {
  const isInMemory = filePath === ':memory:' || filePath.startsWith('file::memory:');
  const db = new Database(filePath);
  configurePragmas(db, isInMemory);
  return db;
}

/**
 * Opens or retrieves the persistent global system database.
 */
export function openSystemDatabase(options: DatabaseConnectionOptions = {}): SystemDatabaseConnection {
  const filePath = options.filePath ?? ':memory:';

  // If already open with the same target, return existing
  if (activeSystemConnection) {
    if (activeSystemConnection.filePath === filePath && activeSystemConnection.raw.open) {
      return activeSystemConnection;
    }
    // Close previous if path changed or already closed
    closeSystemDatabase();
  }

  const raw = createRawDatabase(filePath);
  const db = drizzle(raw, { schema: systemSchema });

  if (options.autoMigrate !== false) {
    migrateSystemDatabase(raw);
  }

  activeSystemConnection = {
    raw,
    db,
    filePath,
  };

  return activeSystemConnection;
}

export function getSystemDatabase(): SystemDatabaseConnection {
  if (!activeSystemConnection || !activeSystemConnection.raw.open) {
    throw new Error('System database is not open. Call openSystemDatabase first.');
  }
  return activeSystemConnection;
}

export function closeSystemDatabase(): void {
  if (activeSystemConnection) {
    if (activeSystemConnection.raw.open) {
      activeSystemConnection.raw.close();
    }
    activeSystemConnection = null;
  }
}

export function isSystemDatabaseOpen(): boolean {
  return activeSystemConnection !== null && activeSystemConnection.raw.open;
}

/**
 * Opens or retrieves the academic-year scoped database.
 */
export function openAcademicDatabase(
  academicYearName: string,
  options: DatabaseConnectionOptions = {}
): AcademicDatabaseConnection {
  const filePath = options.filePath ?? ':memory:';

  // If already open with the same year and target, return existing
  if (activeAcademicConnection) {
    if (
      activeAcademicConnection.academicYearName === academicYearName &&
      activeAcademicConnection.filePath === filePath &&
      activeAcademicConnection.raw.open
    ) {
      return activeAcademicConnection;
    }
    // Close previous if switching years or path
    closeAcademicDatabase();
  }

  const raw = createRawDatabase(filePath);
  const db = drizzle(raw, { schema: academicSchema });

  if (options.autoMigrate !== false) {
    migrateAcademicDatabase(raw);
  }

  activeAcademicConnection = {
    raw,
    db,
    filePath,
    academicYearName,
  };

  return activeAcademicConnection;
}

export function getAcademicDatabase(): AcademicDatabaseConnection {
  if (!activeAcademicConnection || !activeAcademicConnection.raw.open) {
    throw new Error('Academic database is not open. Call openAcademicDatabase first.');
  }
  return activeAcademicConnection;
}

export function closeAcademicDatabase(): void {
  if (activeAcademicConnection) {
    if (activeAcademicConnection.raw.open) {
      activeAcademicConnection.raw.close();
    }
    activeAcademicConnection = null;
  }
}

export function isAcademicDatabaseOpen(): boolean {
  return activeAcademicConnection !== null && activeAcademicConnection.raw.open;
}

export function getActiveAcademicYear(): string | null {
  return activeAcademicConnection ? activeAcademicConnection.academicYearName : null;
}

/**
 * Closes all open database connections (system & academic).
 */
export function closeAllDatabases(): void {
  closeAcademicDatabase();
  closeSystemDatabase();
}
