import { ZodError } from 'zod';
import {
  type IpcResult,
  successResult,
  errorResult,
} from '@tibyan/contracts';
import {
  AuthError,
  StudentError,
  GroupError,
  EnrollmentError,
  SessionError,
  DashboardError,
  BackupError,
  FinanceError,
  OwnerPasswordError,
} from '@tibyan/core';

/**
 * Maps known domain errors and validation failures to safe, sanitized IpcResult objects.
 * Prevents any leakage of stack traces, raw SQLite error strings, or internal filesystem paths.
 */
export function mapErrorToIpcResult(err: unknown): IpcResult<never> {
  if (err instanceof OwnerPasswordError) return errorResult(err.code, err.message);
  // 1. Zod schema validation errors
  if (err instanceof ZodError) {
    const sanitizedIssues = err.issues.map((issue) => {
      const fieldPath = issue.path.join('.');
      return {
        path: fieldPath,
        message: issue.message,
      };
    });

    return errorResult(
      'VALIDATION_ERROR',
      'Input validation failed. Please verify submitted data.',
      sanitizedIssues
    );
  }

  // 2. Auth errors (preserves retryAfterSeconds for ACCOUNT_LOCKED)
  if (err instanceof AuthError) {
    const details = err.retryAfterSeconds !== undefined ? { retryAfterSeconds: err.retryAfterSeconds } : undefined;
    return errorResult(err.code, err.message, details);
  }

  // 3. Student errors
  if (err instanceof StudentError) {
    return errorResult(err.code, err.message);
  }

  // 4. Group errors
  if (err instanceof GroupError) {
    return errorResult(err.code, err.message);
  }

  // 5. Enrollment errors
  if (err instanceof EnrollmentError) {
    return errorResult(err.code, err.message);
  }

  // 6. Session errors
  if (err instanceof SessionError) {
    return errorResult(err.code, err.message);
  }

  // 7. Dashboard errors
  if (err instanceof DashboardError) {
    return errorResult(err.code, err.message);
  }

  // 8. Backup errors
  if (err instanceof BackupError) {
    return errorResult(err.code, err.message);
  }

  // 9. Finance errors
  if (err instanceof FinanceError) {
    return errorResult(err.code, err.message);
  }

  // 9. Specific known operational exceptions
  if (err instanceof Error) {
    if ((err as any).code === 'PERMISSION_DENIED' || err.message.includes('PERMISSION_DENIED')) {
      return errorResult('PERMISSION_DENIED', err.message);
    }
    if (err.message.includes('NO_ACTIVE_ACADEMIC_YEAR')) {
      return errorResult('NO_ACTIVE_ACADEMIC_YEAR', 'No active academic year is currently loaded.');
    }
    if (err.message.includes('INVALID_PHOTO_TOKEN')) {
      return errorResult('INVALID_PHOTO_TOKEN', err.message);
    }
    if (err.message.includes('PHOTO_TOKEN_EXPIRED')) {
      return errorResult('PHOTO_TOKEN_EXPIRED', err.message);
    }
    if (err.message.includes('NOT_FOUND') || err.message.includes('not found')) {
      return errorResult('NOT_FOUND', 'The requested resource was not found.');
    }
    if (err.message.includes('DATABASE_FILE_COLLISION')) {
      return errorResult('DATABASE_FILE_COLLISION', 'An academic year database file already exists on disk.');
    }
    if (err.message.includes('already exists') || err.message.includes('already registered')) {
      return errorResult('ACADEMIC_YEAR_ALREADY_EXISTS', err.message);
    }
    if (err.message.includes('SECURITY_ERROR')) {
      return errorResult('SECURITY_ERROR', 'A security restriction prevented this operation.');
    }
  }

  // 10. Fallback: completely sanitized internal error (never leaks stack or host paths)
  return errorResult('INTERNAL_ERROR', 'An unexpected internal error occurred. Please try again.');
}

/**
 * Safely executes an IPC handler action within a comprehensive error boundary.
 */
export async function safeIpcCall<T>(action: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    const data = await action();
    return successResult(data);
  } catch (error) {
    return mapErrorToIpcResult(error);
  }
}
