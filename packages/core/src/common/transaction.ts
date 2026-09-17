import { type SystemDrizzle, getSystemDatabase } from '@tibyan/db';

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
