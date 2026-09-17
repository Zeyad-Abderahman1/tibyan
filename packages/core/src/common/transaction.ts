import {
  type SystemDrizzle,
  getSystemDatabase,
  type AcademicDrizzle,
  getAcademicDatabase,
} from '@tibyan/db';

/**
 * Runs the given operation inside a system database transaction.
 * If an error is thrown, the transaction is automatically rolled back.
 */
export function runInSystemTransaction<T>(
  fn: (tx: SystemDrizzle) => T,
  db?: SystemDrizzle
): T {
  const client = db ?? getSystemDatabase().db;
  return client.transaction(fn);
}

/**
 * Runs the given operation inside an academic database transaction.
 * If an error is thrown, the transaction is automatically rolled back.
 */
export function runInAcademicTransaction<T>(
  fn: (tx: AcademicDrizzle) => T,
  db?: AcademicDrizzle
): T {
  const client = db ?? getAcademicDatabase().db;
  return client.transaction(fn);
}

